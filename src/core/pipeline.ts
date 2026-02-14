import 'dotenv/config';
import fsExtra from 'fs-extra';
const { readJson } = fsExtra;
import { join, resolve, parse as parsePath, format as formatPath } from 'node:path';
import chalk from 'chalk';
import { loadConfig, type AppConfig } from '../config/loader.js';
import { workflowSchema, type Workflow } from '../schemas/workflow.js';
import { AssetManager } from './asset-manager.js';
import { executeWorkflow, type WorkflowResult } from './workflow-runner.js';
import { positionNarration } from '../audio/mixer.js';
import { normalizeAudio } from '../audio/normalize.js';
import { trimSilence } from '../audio/silence.js';
import { buildSubtitleSegments, writeSRT, writeVTT, type TimedWord, type SubtitleSegment } from '../subtitles/generator.js';
import { renderComposition } from '../render/renderer.js';
import { encode } from '../post/encoder.js';
import { extractThumbnail } from '../post/thumbnail.js';
import { getEncodingProfile, getAllPlatformIds, type PlatformId } from '../platforms/profiles.js';
import { formatCostSummary } from '../utils/cost.js';
import { writeJsonFile } from '../utils/files.js';
import { createLogger } from '../utils/logger.js';
import { createSpinner } from '../utils/progress.js';
import type { PositionedSoundEffect } from '../audio/mixer.js';

const log = createLogger('pipeline');

export type GeneratePhase = 'all' | 'images' | 'videos' | 'audio' | 'render';

export interface GenerateOptions {
  workflow: string;
  template?: string;
  quality?: string;
  skipCache?: boolean;
  /** Run specific phase only */
  phase?: GeneratePhase;
  /** Enable Vision QA for generated images */
  qa?: boolean;
  /** Automatically regenerate images that fail QA */
  qaAutoFix?: boolean;
  /** Skip image generation, use existing assets */
  useExistingImages?: boolean;
  /** Skip video generation, use existing assets */
  useExistingVideos?: boolean;
  /** Regenerate specific scenes (comma-separated IDs) */
  regenerate?: string;
}

export interface RenderOptions {
  run: string;
  platform?: string;
  allPlatforms?: boolean;
}

export interface PreviewOptions {
  workflow: string;
  platform?: string;
}

export interface SetupOptions {
  reset?: boolean;
}

export async function runGenerate(options: GenerateOptions): Promise<void> {
  const config = await loadConfig();

  // 1. Load and validate workflow
  const spinner = createSpinner('Loading workflow...');
  spinner.start();

  const workflowPath = resolve(options.workflow);
  const rawWorkflow = await readJson(workflowPath);
  const workflow = workflowSchema.parse(rawWorkflow);
  const durationLabel = workflow.duration_target_seconds ? `${workflow.duration_target_seconds}s target` : 'tts-driven';
  spinner.succeed(`Workflow loaded: ${workflow.name} (${workflow.scenes.length} scenes, ${durationLabel})`);

  // 2. Initialize output directory
  const assetManager = new AssetManager(
    resolve(config.output.directory),
    workflow.name,
  );
  await assetManager.initialize();
  console.log(chalk.dim(`Output: ${assetManager.outputDir}`));
  console.log(chalk.dim(`Run ID: ${assetManager.runId}`));

  // Save workflow copy to output
  await writeJsonFile(join(assetManager.outputDir, 'workflow.json'), rawWorkflow);

  // 3. Execute workflow (generate all assets)
  const phase = (options.phase ?? 'all') as GeneratePhase;
  const enableQA = options.qa || options.qaAutoFix;
  const qaAutoFix = options.qaAutoFix ?? false;
  const regenerateIds = options.regenerate?.split(',').map((s: string) => s.trim()) ?? [];

  const result = await executeWorkflow(
    workflow,
    config,
    assetManager,
    options.skipCache,
    {
      phase,
      enableQA,
      qaAutoFix,
      useExistingImages: options.useExistingImages,
      useExistingVideos: options.useExistingVideos,
      regenerateSceneIds: regenerateIds,
    },
  );

  // If running images-only phase, stop here and report
  if (phase === 'images') {
    console.log('');
    console.log(chalk.green.bold('Image generation complete!'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(`  Output: ${assetManager.outputDir}`);
    console.log(`  Images: ${result.sceneAssets.length}`);
    if (result.qaResults && result.qaResults.length > 0) {
      const failed = result.qaResults.filter(r => !r.passed);
      if (failed.length > 0) {
        console.log(chalk.yellow(`  QA Issues: ${failed.length} scene(s) need review`));
        for (const f of failed) {
          console.log(chalk.yellow(`    - ${f.sceneId}: ${f.issues.map(i => i.description).join(', ')}`));
        }
      } else {
        console.log(chalk.green(`  QA: All images passed`));
      }
    }
    console.log('');
    console.log(chalk.dim('Run with --phase videos to continue, or --regenerate <ids> to fix issues'));
    return;
  }

  // 4. Audio post-processing
  await processAudio(workflow, result, assetManager);

  // 5. Generate subtitles
  const subtitleSegments = await generateSubtitles(workflow, result, assetManager);

  // 6. Render compositions for all target platforms
  const targetPlatforms = resolveTargetPlatforms(workflow, config);
  await renderAllPlatforms(workflow, result, assetManager, config, targetPlatforms, subtitleSegments);

  // 7. Post-process (encode + thumbnails)
  await postProcess(assetManager, targetPlatforms);

  // 8. Write cost summary with run tracking
  const costSummary = result.costTracker.getSummary();
  await writeJsonFile(join(assetManager.outputDir, 'cost.json'), {
    runId: assetManager.runId,
    ...costSummary,
  });

  // 9. Final output
  console.log('');
  console.log(chalk.green.bold('Video generation complete!'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log(`  Output: ${assetManager.outputDir}`);
  console.log(`  Scenes: ${result.sceneAssets.length}`);
  console.log(`  Platforms: ${targetPlatforms.join(', ')}`);
  if (result.soundEffects.length > 0) {
    console.log(`  Sound Effects: ${result.soundEffects.length}`);
  }
  if (result.generatedMusicPath) {
    console.log(`  Music: generated`);
  }
  console.log('');
  console.log(formatCostSummary(costSummary.total, costSummary.breakdown));
}

async function processAudio(
  workflow: Workflow,
  result: WorkflowResult,
  assetManager: AssetManager,
): Promise<void> {
  if (result.narrationSegments.length === 0) return;

  const spinner = createSpinner('Processing audio...');
  spinner.start();

  // Trim silence from each narration segment
  for (const segment of result.narrationSegments) {
    const parsed = parsePath(segment.audioPath);
    const trimmedPath = formatPath({ ...parsed, base: undefined, name: `${parsed.name}-trimmed` });
    try {
      await trimSilence(segment.audioPath, trimmedPath);
      segment.audioPath = trimmedPath;
    } catch (err) {
      log.warn('Silence trim failed, using original', { sceneId: segment.sceneId, error: String(err) });
    }
  }

  // Normalize narration audio
  for (const segment of result.narrationSegments) {
    const parsed = parsePath(segment.audioPath);
    const normalizedPath = formatPath({ ...parsed, base: undefined, name: `${parsed.name}-norm` });
    try {
      await normalizeAudio(segment.audioPath, normalizedPath, { targetLUFS: -14 });
      segment.audioPath = normalizedPath;
    } catch (err) {
      log.warn('Normalization failed, using original', { sceneId: segment.sceneId, error: String(err) });
    }
  }

  // Position narration segments at their computed scene start times
  if (result.fullNarrationPath) {
    await positionNarration(
      result.narrationSegments.map((s) => ({
        audioPath: s.audioPath,
        startTimeMs: s.computedStart * 1000,
      })),
      result.totalDuration * 1000,
      result.fullNarrationPath,
    );
  }

  // Determine music source: generated music takes priority, then file/url
  const musicConfig = workflow.audio?.music;
  let musicSource: string | undefined;
  if (result.generatedMusicPath) {
    musicSource = result.generatedMusicPath;
  } else if (musicConfig?.file) {
    musicSource = musicConfig.file;
  } else if (musicConfig?.url) {
    // Download remote music to local file to avoid SSRF via FFmpeg protocol handlers
    const musicDownloadPath = assetManager.getAssetPath('music-downloaded.mp3');
    try {
      const { downloadFile } = await import('../fal/client.js');
      await downloadFile(musicConfig.url, musicDownloadPath);
      musicSource = musicDownloadPath;
    } catch (err) {
      log.warn('Music URL download failed, skipping music', { url: musicConfig.url, error: String(err) });
    }
  }

  // Convert sound effects to PositionedSoundEffect (seconds -> ms)
  const positionedSfx: PositionedSoundEffect[] = result.soundEffects.map((sfx) => ({
    path: sfx.audioPath,
    timestampMs: sfx.absoluteTimestamp * 1000,
    volume: sfx.volume,
  }));

  // Mix narration + music + sound effects
  if ((musicSource || positionedSfx.length > 0) && result.fullNarrationPath) {
    const mixedPath = assetManager.getAssetPath('audio-mixed.mp3');
    try {
      const { mixAudio } = await import('../audio/mixer.js');
      await mixAudio(
        {
          narration: result.fullNarrationPath,
          music: musicSource,
          soundEffects: positionedSfx,
          narrationVolume: 1.0,
          musicVolume: musicConfig?.volume ?? 0.25,
          musicFadeIn: musicConfig?.fade_in,
          musicFadeOut: musicConfig?.fade_out,
          totalDuration: result.totalDuration,
        },
        mixedPath,
      );
      result.fullNarrationPath = mixedPath;
    } catch (err) {
      log.warn('Audio mixing failed, using narration only', { error: String(err) });
    }
  }

  spinner.succeed('Audio processing complete');
}

async function generateSubtitles(
  workflow: Workflow,
  result: WorkflowResult,
  assetManager: AssetManager,
): Promise<SubtitleSegment[]> {
  if (workflow.subtitles?.enabled === false) return [];
  if (result.narrationSegments.length === 0) return [];

  const spinner = createSpinner('Generating subtitles...');
  spinner.start();

  let words: TimedWord[];

  if (result.transcription?.chunks && result.transcription.chunks.length > 0) {
    words = result.transcription.chunks.map((chunk) => ({
      word: chunk.text.trim(),
      start: chunk.timestamp[0],
      end: chunk.timestamp[1],
    }));
  } else {
    words = [];
    for (const segment of result.narrationSegments) {
      const segmentWords = segment.text.split(/\s+/).filter(Boolean);
      if (segmentWords.length === 0) continue;
      const wordDuration = segment.actualDuration / segmentWords.length;
      segmentWords.forEach((word, i) => {
        words.push({
          word,
          start: segment.computedStart + i * wordDuration,
          end: segment.computedStart + (i + 1) * wordDuration,
        });
      });
    }
  }

  const subtitleSegments = buildSubtitleSegments(words, 6);

  const srtPath = assetManager.getAssetPath('subtitles.srt');
  const vttPath = assetManager.getAssetPath('subtitles.vtt');
  await writeSRT(subtitleSegments, srtPath);
  await writeVTT(subtitleSegments, vttPath);

  spinner.succeed(`Subtitles generated (${subtitleSegments.length} segments)`);
  return subtitleSegments;
}

function resolveTargetPlatforms(workflow: Workflow, config: AppConfig): PlatformId[] {
  const knownPlatforms = new Set<string>(getAllPlatformIds());

  const validatePlatforms = (platforms: string[]): PlatformId[] => {
    const mapped = platforms.map((p) =>
      p === 'youtube_shorts' ? 'youtube' : p,
    );
    const invalid = mapped.filter((p) => !knownPlatforms.has(p));
    if (invalid.length > 0) {
      log.warn('Unknown platform(s) ignored', { invalid, known: [...knownPlatforms] });
    }
    return mapped.filter((p) => knownPlatforms.has(p)) as PlatformId[];
  };

  if (workflow.output?.platforms && workflow.output.platforms.length > 0) {
    return validatePlatforms(workflow.output.platforms);
  }
  if (config.preferences?.platforms) {
    return validatePlatforms(config.preferences.platforms);
  }
  return ['youtube', 'tiktok'];
}

async function renderAllPlatforms(
  workflow: Workflow,
  result: WorkflowResult,
  assetManager: AssetManager,
  config: AppConfig,
  platforms: PlatformId[],
  subtitleSegments: SubtitleSegment[] = [],
): Promise<void> {
  const fps = config.defaults.fps;

  // Convert subtitle segments (seconds) to Remotion subtitle entries (frames)
  const subtitles = subtitleSegments.map((seg) => ({
    text: seg.text,
    startFrame: Math.round(seg.start * fps),
    endFrame: Math.round(seg.end * fps),
  }));

  for (const platform of platforms) {
    const spinner = createSpinner(`Rendering ${platform}...`);
    spinner.start();

    const isLandscape = platform === 'youtube';
    const compositionId = isLandscape ? 'LandscapeVideo' : 'PortraitVideo';
    const rawOutputPath = assetManager.getPlatformPath(platform, 'raw.mp4');

    const props = {
      scenes: workflow.scenes.map((scene) => {
        const assets = result.sceneAssets.find((a) => a.sceneId === scene.id);
        const timing = result.computedTimings.find((t) => t.sceneId === scene.id);
        return {
          id: scene.id,
          type: scene.type,
          src: scene.type === 'video' && assets?.videoPath ? assets.videoPath : assets?.imagePath ?? '',
          startFrame: Math.round((timing?.start ?? scene.timing?.start ?? 0) * fps),
          durationFrames: Math.round((timing?.duration ?? scene.timing?.duration ?? 5) * fps),
          effects: scene.effects ?? [],
        };
      }),
      audioUrl: result.fullNarrationPath ?? '',
      subtitles,
    };

    await renderComposition({
      compositionId,
      outputPath: rawOutputPath,
      props,
      fps: config.defaults.fps,
    });

    spinner.succeed(`${platform} rendered`);
  }
}

async function postProcess(
  assetManager: AssetManager,
  platforms: PlatformId[],
): Promise<void> {
  const spinner = createSpinner('Post-processing...');
  spinner.start();

  for (const platform of platforms) {
    const rawPath = assetManager.getPlatformPath(platform, 'raw.mp4');
    const finalPath = assetManager.getPlatformPath(platform, 'final.mp4');
    const thumbnailPath = assetManager.getPlatformPath(platform, 'thumbnail.jpg');

    try {
      const profile = getEncodingProfile(platform);
      await encode(rawPath, finalPath, profile);
    } catch (err) {
      log.warn(`Encoding failed for ${platform}, copying raw file`, { error: String(err) });
      const { copy } = await import('fs-extra');
      await copy(rawPath, finalPath);
    }

    try {
      await extractThumbnail(finalPath, thumbnailPath, 2);
    } catch (err) {
      log.warn(`Thumbnail extraction failed for ${platform}`, { error: String(err) });
    }

    const { copy, pathExists } = await import('fs-extra');
    const srtSrc = assetManager.getAssetPath('subtitles.srt');
    if (await pathExists(srtSrc)) {
      await copy(srtSrc, assetManager.getPlatformPath(platform, 'subtitles.srt'));
    }
  }

  spinner.succeed('Post-processing complete');
}

export async function runRender(options: RenderOptions): Promise<void> {
  const config = await loadConfig();
  const runDir = resolve(options.run);

  console.log(chalk.blue('Re-rendering from existing run:'), runDir);

  const knownIds = getAllPlatformIds();
  let platforms: PlatformId[];
  if (options.allPlatforms) {
    platforms = knownIds;
  } else if (options.platform) {
    const id = options.platform as string;
    if (!knownIds.includes(id as PlatformId)) {
      throw new Error(`Unknown platform: "${id}". Valid: ${knownIds.join(', ')}`);
    }
    platforms = [id as PlatformId];
  } else {
    platforms = knownIds;
  }

  const assetManager = AssetManager.fromExistingRun(runDir);

  const workflow = workflowSchema.parse(await readJson(join(runDir, 'workflow.json')));

  // Build computed timings from workflow scene data for re-render
  let reRenderStart = 0;
  const computedTimings = workflow.scenes.map((s) => {
    const duration = s.timing?.duration ?? 5;
    const start = s.timing?.start ?? reRenderStart;
    reRenderStart = start + duration;
    return {
      sceneId: s.id,
      start,
      duration,
      ttsDuration: 0,
      source: 'workflow' as const,
    };
  });
  const totalDuration = computedTimings.reduce((sum, t) => sum + t.duration, 0);

  const result: WorkflowResult = {
    sceneAssets: workflow.scenes.map((s) => ({
      sceneId: s.id,
      imagePath: join(runDir, 'assets', `${s.id}.png`),
      imageUrl: '',
      videoPath: s.type === 'video' ? join(runDir, 'assets', `${s.id}.mp4`) : undefined,
    })),
    narrationSegments: [],
    fullNarrationPath: join(runDir, 'assets', 'audio-mixed.mp3'),
    soundEffects: [],
    costTracker: new (await import('../fal/cost.js')).CostTracker(),
    computedTimings,
    totalDuration,
  };

  await renderAllPlatforms(workflow, result, assetManager, config, platforms);
  await postProcess(assetManager, platforms);

  console.log(chalk.green.bold('Re-render complete!'));
}

export async function runPreview(options: PreviewOptions): Promise<void> {
  const { spawn } = await import('node:child_process');
  console.log(chalk.blue('Launching Remotion preview...'));

  await new Promise<void>((resolve, reject) => {
    const child = spawn('npx', ['remotion', 'preview', 'src/render/root.tsx'], {
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Preview exited with code ${code}`))));
    child.on('error', reject);
  });
}

export async function runStudio(): Promise<void> {
  const { spawn } = await import('node:child_process');
  console.log(chalk.blue('Launching Remotion studio...'));

  await new Promise<void>((resolve, reject) => {
    const child = spawn('npx', ['remotion', 'studio', 'src/render/root.tsx'], {
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Studio exited with code ${code}`))));
    child.on('error', reject);
  });
}

export async function runSetup(options: SetupOptions): Promise<void> {
  const fse = await import('fs-extra');
  const { pathExists } = fse;
  const writeJson = fse.default.writeJson;
  const prefsPath = resolve('preferences.json');

  if (options.reset || !(await pathExists(prefsPath))) {
    const defaultPrefs = {
      platforms: ['youtube_shorts', 'tiktok'],
      template: 'horror',
      quality_mode: 'balanced',
      voice: { style: 'ai_male_deep', pacing: 0.9 },
      visual_style: 'cinematic',
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };

    await writeJson(prefsPath, defaultPrefs, { spaces: 2 });
    console.log(chalk.green('preferences.json created!'));
    console.log(chalk.dim('Edit this file to customize your defaults.'));
  } else {
    console.log(chalk.yellow('preferences.json already exists. Use --reset to overwrite.'));
  }

  if (process.env.FAL_KEY) {
    console.log(chalk.green('FAL_KEY: configured'));
  } else {
    console.log(chalk.red('FAL_KEY: not set — add it to .env'));
  }
}
