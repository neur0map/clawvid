import 'dotenv/config';
import { readJson } from 'fs-extra';
import { join, resolve } from 'node:path';
import chalk from 'chalk';
import { loadConfig, type AppConfig } from '../config/loader.js';
import { workflowSchema, type Workflow } from '../schemas/workflow.js';
import { AssetManager } from './asset-manager.js';
import { executeWorkflow, type WorkflowResult } from './workflow-runner.js';
import { concatenateNarration } from '../audio/mixer.js';
import { normalizeAudio } from '../audio/normalize.js';
import { trimSilence } from '../audio/silence.js';
import { buildSubtitleSegments, writeSRT, writeVTT, type TimedWord } from '../subtitles/generator.js';
import { extractWordTimings } from '../subtitles/word-timing.js';
import { renderComposition } from '../render/renderer.js';
import { encode } from '../post/encoder.js';
import { extractThumbnail } from '../post/thumbnail.js';
import { getEncodingProfile, getAllPlatformIds, type PlatformId } from '../platforms/profiles.js';
import { formatCostSummary } from '../utils/cost.js';
import { writeJsonFile } from '../utils/files.js';
import { createLogger } from '../utils/logger.js';
import { createSpinner } from '../utils/progress.js';

const log = createLogger('pipeline');

export interface GenerateOptions {
  workflow: string;
  template?: string;
  quality?: string;
  skipCache?: boolean;
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
  spinner.succeed(`Workflow loaded: ${workflow.name} (${workflow.scenes.length} scenes, ${workflow.duration_target_seconds}s)`);

  // 2. Initialize output directory
  const assetManager = new AssetManager(
    resolve(config.output.directory),
    workflow.name,
  );
  await assetManager.initialize();
  console.log(chalk.dim(`Output: ${assetManager.outputDir}`));

  // Save workflow copy to output
  await writeJsonFile(join(assetManager.outputDir, 'workflow.json'), rawWorkflow);

  // 3. Execute workflow (generate all assets)
  const result = await executeWorkflow(
    workflow,
    config,
    assetManager,
    options.skipCache,
  );

  // 4. Audio post-processing
  await processAudio(workflow, result, assetManager);

  // 5. Generate subtitles
  await generateSubtitles(workflow, result, assetManager);

  // 6. Render compositions for all target platforms
  const targetPlatforms = resolveTargetPlatforms(workflow, config);
  await renderAllPlatforms(workflow, result, assetManager, config, targetPlatforms);

  // 7. Post-process (encode + thumbnails)
  await postProcess(assetManager, targetPlatforms);

  // 8. Write cost summary
  const costSummary = result.costTracker.getSummary();
  await writeJsonFile(join(assetManager.outputDir, 'cost.json'), costSummary);

  // 9. Final output
  console.log('');
  console.log(chalk.green.bold('Video generation complete!'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log(`  Output: ${assetManager.outputDir}`);
  console.log(`  Scenes: ${result.sceneAssets.length}`);
  console.log(`  Platforms: ${targetPlatforms.join(', ')}`);
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
    const trimmedPath = segment.audioPath.replace('.mp3', '-trimmed.mp3');
    try {
      await trimSilence(segment.audioPath, trimmedPath);
      segment.audioPath = trimmedPath;
    } catch {
      log.warn('Silence trim failed, using original', { sceneId: segment.sceneId });
    }
  }

  // Normalize narration audio
  for (const segment of result.narrationSegments) {
    const normalizedPath = segment.audioPath.replace('.mp3', '-norm.mp3');
    try {
      await normalizeAudio(segment.audioPath, normalizedPath, { targetLUFS: -14 });
      segment.audioPath = normalizedPath;
    } catch {
      log.warn('Normalization failed, using original', { sceneId: segment.sceneId });
    }
  }

  // Concatenate all narration into one file
  if (result.fullNarrationPath) {
    await concatenateNarration(
      result.narrationSegments.map((s) => s.audioPath),
      result.fullNarrationPath,
    );
  }

  // Mix with background music if specified
  if (workflow.audio.music && result.fullNarrationPath) {
    const musicConfig = workflow.audio.music;
    const mixedPath = assetManager.getAssetPath('audio-mixed.mp3');
    try {
      const { mixAudio } = await import('../audio/mixer.js');
      await mixAudio(
        {
          narration: result.fullNarrationPath,
          music: musicConfig.file ?? musicConfig.url,
          narrationVolume: 1.0,
          musicVolume: musicConfig.volume ?? 0.25,
        },
        mixedPath,
      );
      result.fullNarrationPath = mixedPath;
    } catch {
      log.warn('Music mixing failed, using narration only');
    }
  }

  spinner.succeed('Audio processing complete');
}

async function generateSubtitles(
  workflow: Workflow,
  result: WorkflowResult,
  assetManager: AssetManager,
): Promise<void> {
  if (workflow.subtitles?.enabled === false) return;
  if (result.narrationSegments.length === 0) return;

  const spinner = createSpinner('Generating subtitles...');
  spinner.start();

  let words: TimedWord[];

  if (result.transcription?.chunks && result.transcription.chunks.length > 0) {
    // Use Whisper word timings
    words = result.transcription.chunks.map((chunk) => ({
      word: chunk.text.trim(),
      start: chunk.timestamp[0],
      end: chunk.timestamp[1],
    }));
  } else {
    // Fallback: distribute words evenly across scene timings
    words = [];
    for (const segment of result.narrationSegments) {
      const segmentWords = segment.text.split(/\s+/);
      const wordDuration = segment.duration / segmentWords.length;
      segmentWords.forEach((word, i) => {
        words.push({
          word,
          start: segment.startTime + i * wordDuration,
          end: segment.startTime + (i + 1) * wordDuration,
        });
      });
    }
  }

  const subtitleSegments = buildSubtitleSegments(words, 6);

  // Write SRT and VTT for all platform directories
  const srtPath = assetManager.getAssetPath('subtitles.srt');
  const vttPath = assetManager.getAssetPath('subtitles.vtt');
  await writeSRT(subtitleSegments, srtPath);
  await writeVTT(subtitleSegments, vttPath);

  spinner.succeed(`Subtitles generated (${subtitleSegments.length} segments)`);
}

function resolveTargetPlatforms(workflow: Workflow, config: AppConfig): string[] {
  if (workflow.output?.platforms && workflow.output.platforms.length > 0) {
    return workflow.output.platforms;
  }
  if (config.preferences?.platforms) {
    return config.preferences.platforms.map((p) =>
      p === 'youtube_shorts' ? 'youtube' : p === 'instagram_reels' ? 'instagram_reels' : p,
    );
  }
  return ['youtube', 'tiktok'];
}

async function renderAllPlatforms(
  workflow: Workflow,
  result: WorkflowResult,
  assetManager: AssetManager,
  config: AppConfig,
  platforms: string[],
): Promise<void> {
  for (const platform of platforms) {
    const spinner = createSpinner(`Rendering ${platform}...`);
    spinner.start();

    const isLandscape = platform === 'youtube';
    const compositionId = isLandscape ? 'LandscapeVideo' : 'PortraitVideo';
    const rawOutputPath = assetManager.getPlatformPath(platform, 'raw.mp4');

    const props = {
      scenes: workflow.scenes.map((scene) => {
        const assets = result.sceneAssets.find((a) => a.sceneId === scene.id);
        return {
          type: scene.type,
          src: scene.type === 'video' && assets?.videoPath ? assets.videoPath : assets?.imagePath ?? '',
          startFrame: Math.round(scene.timing.start * (config.defaults.fps)),
          durationFrames: Math.round(scene.timing.duration * (config.defaults.fps)),
          effects: scene.effects ?? [],
        };
      }),
      audioUrl: result.fullNarrationPath ?? '',
      subtitles: [],
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
  platforms: string[],
): Promise<void> {
  const spinner = createSpinner('Post-processing...');
  spinner.start();

  for (const platform of platforms) {
    const rawPath = assetManager.getPlatformPath(platform, 'raw.mp4');
    const finalPath = assetManager.getPlatformPath(platform, 'final.mp4');
    const thumbnailPath = assetManager.getPlatformPath(platform, 'thumbnail.jpg');

    // Platform-specific encoding
    try {
      const profile = getEncodingProfile(platform as PlatformId);
      await encode(rawPath, finalPath, profile);
    } catch {
      log.warn(`Encoding failed for ${platform}, copying raw file`);
      const { copy } = await import('fs-extra');
      await copy(rawPath, finalPath);
    }

    // Extract thumbnail
    try {
      await extractThumbnail(finalPath, thumbnailPath, 2);
    } catch {
      log.warn(`Thumbnail extraction failed for ${platform}`);
    }

    // Copy subtitle files
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

  const platforms = options.allPlatforms
    ? getAllPlatformIds()
    : options.platform
      ? [options.platform]
      : getAllPlatformIds();

  const assetManager = new AssetManager(config.output.directory, '');
  Object.defineProperty(assetManager, 'outputDir', { value: runDir });

  // Load workflow from run directory
  const workflow = workflowSchema.parse(await readJson(join(runDir, 'workflow.json')));

  const result: WorkflowResult = {
    sceneAssets: workflow.scenes.map((s) => ({
      sceneId: s.id,
      imagePath: join(runDir, 'assets', `${s.id}.png`),
      imageUrl: '',
      videoPath: s.type === 'video' ? join(runDir, 'assets', `${s.id}.mp4`) : undefined,
    })),
    narrationSegments: [],
    fullNarrationPath: join(runDir, 'assets', 'audio-mixed.mp3'),
    costTracker: new (await import('../fal/cost.js')).CostTracker(),
  };

  await renderAllPlatforms(workflow, result, assetManager, config, platforms as string[]);
  await postProcess(assetManager, platforms as string[]);

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
  const { writeJson, pathExists } = await import('fs-extra');
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

  // Verify FAL_KEY
  if (process.env.FAL_KEY) {
    console.log(chalk.green('FAL_KEY: configured'));
  } else {
    console.log(chalk.red('FAL_KEY: not set — add it to .env'));
  }
}
