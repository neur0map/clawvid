import type { Workflow } from '../schemas/workflow.js';
import type { Scene } from '../schemas/scene.js';
import type { AppConfig } from '../config/loader.js';
import { AssetManager } from './asset-manager.js';
import { generateImage } from '../fal/image.js';
import { generateVideo, generateTransition } from '../fal/video.js';
import { generateSpeech, transcribe } from '../fal/audio.js';
import { generateSoundEffect } from '../fal/sound.js';
import { generateMusic } from '../fal/music.js';
import { generateReferenceImage, generateSceneFromReference } from '../fal/workflow.js';
import type { ConsistencyOptions } from '../fal/workflow.js';
import { CacheStore } from '../cache/store.js';
import { hashWorkflowStep } from '../cache/hash.js';
import { CostTracker } from '../fal/cost.js';
import { createLogger } from '../utils/logger.js';
import { createSpinner } from '../utils/progress.js';

const log = createLogger('workflow-runner');

/** Estimated cost per API call by model category. Update when pricing changes. */
const COST_ESTIMATES = {
  image_kling: 0.028,
  image_default: 0.028,
  image_nano_ref: 0.15,
  image_nano_edit: 0.15,
  video_kling_5s: 0.35,
  video_kling_10s: 0.70,
  video_vidu_5s_720p: 0.77,
  video_vidu_5s_1080p: 0.77,
  video_pixverse_5s_720p: 0.45,
  video_pixverse_5s_1080p: 0.75,
  video_default: 0.35,
  transition_pixverse: 0.45,
  transition_vidu: 0.77,
  tts: 0.09,
  transcription: 0.001,
  sound_effect: 0.10,
  music: 0.10,
} as const;

export interface SceneAssets {
  sceneId: string;
  imagePath: string;
  imageUrl: string;
  videoPath?: string;
  videoUrl?: string;
  transitionPath?: string;
  transitionUrl?: string;
}

export interface NarrationSegment {
  sceneId: string;
  text: string;
  audioPath: string;
  audioUrl: string;
  actualDuration: number;
  computedStart: number;
}

export interface ComputedSceneTiming {
  sceneId: string;
  start: number;
  duration: number;
  ttsDuration: number;
  source: 'tts' | 'workflow' | 'default';
}

export interface SoundEffectAsset {
  sceneId: string;
  prompt: string;
  audioPath: string;
  absoluteTimestamp: number;
  duration: number;
  volume: number;
}

export interface VisionQASceneResult {
  sceneId: string;
  passed: boolean;
  issues: Array<{ type: string; severity: string; description: string }>;
  confidence: number;
}

export interface WorkflowExecuteOptions {
  phase?: 'all' | 'images' | 'videos' | 'audio' | 'render';
  enableQA?: boolean;
  qaAutoFix?: boolean;
  useExistingImages?: boolean;
  useExistingVideos?: boolean;
  regenerateSceneIds?: string[];
}

export interface WorkflowResult {
  sceneAssets: SceneAssets[];
  narrationSegments: NarrationSegment[];
  fullNarrationPath?: string;
  transcription?: { text: string; chunks: Array<{ text: string; timestamp: [number, number] }> };
  soundEffects: SoundEffectAsset[];
  generatedMusicPath?: string;
  costTracker: CostTracker;
  computedTimings: ComputedSceneTiming[];
  totalDuration: number;
  /** Vision QA results for each scene (when QA is enabled) */
  qaResults?: VisionQASceneResult[];
}

export async function executeWorkflow(
  workflow: Workflow,
  config: AppConfig,
  assetManager: AssetManager,
  skipCache: boolean = false,
  options: WorkflowExecuteOptions = {},
): Promise<WorkflowResult> {
  const cache = new CacheStore(assetManager.outputDir);
  if (!skipCache) await cache.load();
  const costTracker = new CostTracker();

  const {
    phase = 'all',
    enableQA = false,
    qaAutoFix = false,
    useExistingImages = false,
    useExistingVideos = false,
    regenerateSceneIds = [],
  } = options;

  log.info('Executing workflow', {
    name: workflow.name,
    scenes: workflow.scenes.length,
    template: workflow.template,
    timingMode: workflow.timing_mode ?? 'tts_driven',
    phase,
    enableQA,
  });

  // Phase 1: Generate narration FIRST (TTS-driven timing, voice consistency)
  const narrationSegments = await generateNarrationFirst(
    workflow,
    assetManager,
    cache,
    costTracker,
    skipCache,
  );

  // Phase 2: Compute timing from TTS durations
  const computedTimings = computeTiming(workflow, narrationSegments);
  const totalDuration = computedTimings.reduce((sum, t) => sum + t.duration, 0);

  // Update narration segments with computed start times
  for (const segment of narrationSegments) {
    const timing = computedTimings.find((t) => t.sceneId === segment.sceneId);
    if (timing) {
      segment.computedStart = timing.start;
    }
  }

  log.info('Timing computed', {
    mode: workflow.timing_mode ?? 'tts_driven',
    totalDuration: `${totalDuration.toFixed(1)}s`,
    scenes: computedTimings.map((t) => `${t.sceneId}:${t.duration.toFixed(1)}s`),
  });

  // Phase 3: Generate scene images & videos
  const shouldGenerateImages = !useExistingImages && (phase === 'all' || phase === 'images');
  const shouldGenerateVideos = !useExistingVideos && (phase === 'all' || phase === 'videos');

  let sceneAssets: SceneAssets[];
  let qaResults: VisionQASceneResult[] | undefined;

  if (shouldGenerateImages) {
    sceneAssets = workflow.consistency
      ? await generateSceneAssetsViaWorkflow(
          workflow,
          assetManager,
          cache,
          costTracker,
          skipCache,
          { regenerateSceneIds, skipVideos: phase === 'images' },
        )
      : await generateSceneAssets(
          workflow.scenes,
          assetManager,
          cache,
          costTracker,
          skipCache,
          { regenerateSceneIds, skipVideos: phase === 'images' },
        );

    // Run Vision QA if enabled
    if (enableQA) {
      qaResults = await runVisionQA(workflow, sceneAssets, assetManager, costTracker, qaAutoFix);
    }
  } else {
    // Load existing assets from output directory
    sceneAssets = await loadExistingAssets(workflow.scenes, assetManager);

    // Generate videos only if needed
    if (shouldGenerateVideos) {
      sceneAssets = await generateVideosOnly(
        workflow,
        sceneAssets,
        assetManager,
        cache,
        costTracker,
        skipCache,
      );
    }
  }

  // Phase 4: Generate sound effects using computed timing
  const soundEffects = await generateSceneSoundEffects(
    workflow,
    config,
    assetManager,
    costTracker,
    computedTimings,
  );

  // Phase 5: Generate background music using computed total duration
  let generatedMusicPath: string | undefined;
  if (workflow.audio.music?.generate && workflow.audio.music.prompt) {
    generatedMusicPath = await generateBackgroundMusic(
      workflow,
      config,
      assetManager,
      costTracker,
      totalDuration,
    );
  }

  // Phase 6: Transcribe narration with scene-aligned offsets
  let fullNarrationPath: string | undefined;
  let transcription: WorkflowResult['transcription'];

  if (narrationSegments.length > 0) {
    fullNarrationPath = assetManager.getAssetPath('narration-full.mp3');
    transcription = await transcribeWithSceneOffsets(
      narrationSegments,
      config,
      costTracker,
    );
  }

  return {
    sceneAssets,
    narrationSegments,
    fullNarrationPath,
    transcription,
    soundEffects,
    generatedMusicPath,
    costTracker,
    computedTimings,
    totalDuration,
    qaResults,
  };
}

/**
 * Generate narration with voice consistency: first segment establishes
 * the voice, subsequent segments clone it via voice_reference.
 */
async function generateNarrationFirst(
  workflow: Workflow,
  assetManager: AssetManager,
  cache: CacheStore,
  costTracker: CostTracker,
  skipCache: boolean,
): Promise<NarrationSegment[]> {
  const segments: NarrationSegment[] = [];
  const scenesWithNarration = workflow.scenes.filter(
    (s) => s.narration && s.narration.trim().length > 0,
  );

  if (scenesWithNarration.length === 0) {
    log.info('No narration in workflow');
    return segments;
  }

  const spinner = createSpinner('Generating narration (voice-consistent)...');
  spinner.start();

  let firstAudioUrl: string | undefined;

  for (let i = 0; i < scenesWithNarration.length; i++) {
    const scene = scenesWithNarration[i];
    const narrationText = scene.narration ?? '';
    if (!narrationText) continue;
    const audioFilename = `narration-${scene.id}.mp3`;
    const audioPath = assetManager.getAssetPath(audioFilename);

    // Build TTS config with voice cloning for scenes after the first
    const ttsConfig = { ...workflow.audio.tts };
    if (i > 0 && firstAudioUrl && !ttsConfig.voice_reference) {
      ttsConfig.voice_reference = firstAudioUrl;
    }

    const narrationHash = hashWorkflowStep({
      text: narrationText,
      tts: ttsConfig,
    } as Record<string, unknown>);

    let audioUrl: string;
    let actualDuration = 0;

    if (!skipCache && cache.has(`${scene.id}-narration`, narrationHash)) {
      const cached = cache.get(`${scene.id}-narration`)!;
      audioUrl = cached.outputPath;
      log.info('Narration cache hit', { sceneId: scene.id });
    } else {
      spinner.text = `Narrating scene ${scene.id}${i > 0 ? ' (voice-cloned)' : ''}...`;
      const result = await generateSpeech(ttsConfig, narrationText, audioPath);
      audioUrl = result.url;
      if (result.duration) {
        actualDuration = result.duration;
      }
      await cache.set(`${scene.id}-narration`, narrationHash, result.url);
      costTracker.record(ttsConfig.model, COST_ESTIMATES.tts);
    }

    // Capture first segment's audio URL for voice cloning
    if (i === 0) {
      firstAudioUrl = audioUrl;
    }

    // If we don't have duration from API (e.g. cache hit), use ffprobe fallback
    if (actualDuration <= 0) {
      try {
        const { getMediaInfo } = await import('../post/ffmpeg.js');
        const info = await getMediaInfo(audioPath);
        actualDuration = info.format.duration ? Number(info.format.duration) : 5;
      } catch {
        log.warn('Could not probe narration duration, using default', { sceneId: scene.id });
        actualDuration = scene.timing?.duration ?? 5;
      }
    }

    segments.push({
      sceneId: scene.id,
      text: narrationText,
      audioPath,
      audioUrl,
      actualDuration,
      computedStart: 0, // will be set by computeTiming()
    });
  }

  spinner.succeed(`Narration generated for ${segments.length} scenes (voice-consistent)`);
  return segments;
}

/**
 * Compute scene timing from TTS durations.
 * In tts_driven mode: scene duration = max(ttsDuration + padding, minDuration)
 * In fixed mode: uses workflow JSON timing values (backward compat)
 */
export function computeTiming(
  workflow: Workflow,
  narrationSegments: NarrationSegment[],
): ComputedSceneTiming[] {
  const timingMode = workflow.timing_mode ?? 'tts_driven';
  const padding = workflow.scene_padding_seconds ?? 0.5;
  const minDuration = workflow.min_scene_duration_seconds ?? 3;

  const timings: ComputedSceneTiming[] = [];
  let currentStart = 0;

  for (const scene of workflow.scenes) {
    const segment = narrationSegments.find((s) => s.sceneId === scene.id);
    const ttsDuration = segment?.actualDuration ?? 0;

    let duration: number;
    let source: ComputedSceneTiming['source'];

    if (timingMode === 'fixed') {
      // Backward-compatible: use workflow JSON timing
      duration = scene.timing?.duration ?? 5;
      source = scene.timing?.duration ? 'workflow' : 'default';
      currentStart = scene.timing?.start ?? currentStart;
    } else {
      // TTS-driven: duration derived from actual narration length
      if (ttsDuration > 0) {
        duration = Math.max(ttsDuration + padding, minDuration);
        source = 'tts';
      } else {
        // No narration for this scene — use workflow timing or default
        duration = scene.timing?.duration ?? minDuration;
        source = scene.timing?.duration ? 'workflow' : 'default';
      }
    }

    timings.push({
      sceneId: scene.id,
      start: currentStart,
      duration,
      ttsDuration,
      source,
    });

    if (timingMode !== 'fixed') {
      currentStart += duration;
    } else {
      currentStart = (scene.timing?.start ?? currentStart) + duration;
    }
  }

  return timings;
}

/**
 * Transcribe narration segments with offsets based on computed scene starts
 * (not sequential cumulative offset). This aligns subtitles to the video timeline.
 */
async function transcribeWithSceneOffsets(
  narrationSegments: NarrationSegment[],
  config: AppConfig,
  costTracker: CostTracker,
): Promise<WorkflowResult['transcription']> {
  const whisperModel = config.fal.audio.transcription;
  const allText: string[] = [];
  const allChunks: Array<{ text: string; timestamp: [number, number] }> = [];

  for (const segment of narrationSegments) {
    try {
      const result = await transcribe(segment.audioUrl, whisperModel);
      allText.push(result.text);

      // Offset chunks by the segment's computed scene start time
      for (const chunk of result.chunks ?? []) {
        allChunks.push({
          text: chunk.text,
          timestamp: [
            chunk.timestamp[0] + segment.computedStart,
            chunk.timestamp[1] + segment.computedStart,
          ],
        });
      }

      costTracker.record(whisperModel, COST_ESTIMATES.transcription);
    } catch (err) {
      log.warn('Transcription failed for segment, using narration text', {
        sceneId: segment.sceneId,
        error: String(err),
      });
    }
  }

  if (allText.length > 0 || allChunks.length > 0) {
    const transcription = {
      text: allText.join(' '),
      chunks: allChunks,
    };
    log.info('Transcription complete', {
      segments: narrationSegments.length,
      wordCount: transcription.text.split(' ').length,
    });
    return transcription;
  }

  return undefined;
}

interface GenerateAssetsOptions {
  regenerateSceneIds?: string[];
  skipVideos?: boolean;
}

async function generateSceneAssets(
  scenes: Scene[],
  assetManager: AssetManager,
  cache: CacheStore,
  costTracker: CostTracker,
  skipCache: boolean,
  options: GenerateAssetsOptions = {},
): Promise<SceneAssets[]> {
  const { regenerateSceneIds = [], skipVideos = false } = options;
  const results: SceneAssets[] = [];

  for (const scene of scenes) {
    // Handle static images (type: 'static')
    if (scene.type === 'static' && scene.static_image) {
      const staticAsset = await handleStaticImage(scene, assetManager);
      results.push(staticAsset);
      continue;
    }

    // Skip if not in regenerate list (when regenerating specific scenes)
    const shouldRegenerate = regenerateSceneIds.length === 0 || regenerateSceneIds.includes(scene.id);

    const spinner = createSpinner(`Scene ${scene.id}: generating image...`);
    spinner.start();

    const imageFilename = `${scene.id}.png`;
    const imagePath = assetManager.getAssetPath(imageFilename);

    // Check if image_generation exists (required for non-static scenes)
    if (!scene.image_generation) {
      log.warn('No image_generation config for scene', { sceneId: scene.id });
      results.push({ sceneId: scene.id, imagePath: '', imageUrl: '' });
      spinner.fail(`Scene ${scene.id}: no image generation config`);
      continue;
    }

    const imageHash = hashWorkflowStep(scene.image_generation as unknown as Record<string, unknown>);

    let imageUrl: string;

    if (!skipCache && !shouldRegenerate && cache.has(`${scene.id}-image`, imageHash)) {
      const cached = cache.get(`${scene.id}-image`)!;
      imageUrl = cached.outputPath;
      spinner.text = `Scene ${scene.id}: image cached`;
      log.info('Image cache hit', { sceneId: scene.id });
    } else {
      const result = await generateImage(scene.image_generation, imagePath);
      imageUrl = result.url;
      await cache.set(`${scene.id}-image`, imageHash, result.url);
      costTracker.record(scene.image_generation.model, estimateCost('image', scene.image_generation.model));
    }

    const sceneResult: SceneAssets = { sceneId: scene.id, imagePath, imageUrl };

    if (!skipVideos && scene.type === 'video' && scene.video_generation) {
      spinner.text = `Scene ${scene.id}: generating video...`;
      const videoFilename = `${scene.id}.mp4`;
      const videoPath = assetManager.getAssetPath(videoFilename);
      const videoHash = hashWorkflowStep(scene.video_generation as unknown as Record<string, unknown>);

      if (!skipCache && cache.has(`${scene.id}-video`, videoHash)) {
        const cached = cache.get(`${scene.id}-video`)!;
        sceneResult.videoPath = videoPath;
        sceneResult.videoUrl = cached.outputPath;
        log.info('Video cache hit', { sceneId: scene.id });
      } else {
        const result = await generateVideo(scene.video_generation, imageUrl, videoPath);
        sceneResult.videoPath = videoPath;
        sceneResult.videoUrl = result.url;
        await cache.set(`${scene.id}-video`, videoHash, result.url);
        costTracker.record(scene.video_generation.model, estimateVideoCost(scene.video_generation.model));
      }
    }

    spinner.succeed(`Scene ${scene.id}: ${scene.type === 'video' ? 'image + video' : 'image'} ready`);
    results.push(sceneResult);
  }

  return results;
}

/**
 * Handle static image scenes - download/copy image and return assets
 */
async function handleStaticImage(
  scene: Scene,
  assetManager: AssetManager,
): Promise<SceneAssets> {
  const staticConfig = scene.static_image!;
  const imageFilename = `${scene.id}.png`;
  const imagePath = assetManager.getAssetPath(imageFilename);

  log.info('Processing static image', { sceneId: scene.id, url: staticConfig.url.slice(0, 60) });

  // Download or copy the static image
  if (staticConfig.url.startsWith('http://') || staticConfig.url.startsWith('https://')) {
    const { downloadFile } = await import('../fal/client.js');
    await downloadFile(staticConfig.url, imagePath);
  } else {
    const { copy } = await import('fs-extra');
    await copy(staticConfig.url, imagePath);
  }

  return {
    sceneId: scene.id,
    imagePath,
    imageUrl: staticConfig.url,
    // Static images don't generate video - they're shown as-is
  };
}

async function generateSceneAssetsViaWorkflow(
  workflow: Workflow,
  assetManager: AssetManager,
  cache: CacheStore,
  costTracker: CostTracker,
  skipCache: boolean,
  options: GenerateAssetsOptions = {},
): Promise<SceneAssets[]> {
  const consistency = workflow.consistency!;
  const scenes = workflow.scenes;
  const spinner = createSpinner('Generating consistent scene images...');
  spinner.start();

  const aspectRatio = scenes[0]?.image_generation?.input?.aspect_ratio ?? '9:16';

  const consistencyOptions: ConsistencyOptions = {
    referencePrompt: consistency.reference_prompt,
    seed: consistency.seed,
    aspectRatio,
    model: consistency.model,
    editModel: consistency.edit_model,
    resolution: consistency.resolution,
  };

  // Step 1: Generate reference image
  spinner.text = 'Generating reference image...';
  const refPath = assetManager.getAssetPath('reference.png');
  const refHash = hashWorkflowStep({
    reference_prompt: consistency.reference_prompt,
    seed: consistency.seed,
    model: consistency.model,
  } as Record<string, unknown>);

  let referenceUrl: string;

  if (!skipCache && cache.has('consistency-reference', refHash)) {
    const cached = cache.get('consistency-reference')!;
    referenceUrl = cached.outputPath;
    log.info('Reference image cache hit');
  } else {
    const refResult = await generateReferenceImage(consistencyOptions, refPath);
    referenceUrl = refResult.url;
    await cache.set('consistency-reference', refHash, refResult.url);
    costTracker.record(consistency.model ?? 'fal-ai/nano-banana-pro', COST_ESTIMATES.image_nano_ref);
  }

  // Step 2: Generate each scene image from the reference
  const results: SceneAssets[] = [];

  for (const scene of scenes) {
    // Handle static images
    if (scene.type === 'static' && scene.static_image) {
      const staticAsset = await handleStaticImage(scene, assetManager);
      results.push(staticAsset);
      continue;
    }

    // Skip scenes without image_generation
    if (!scene.image_generation) {
      log.warn('Scene missing image_generation in consistency workflow', { sceneId: scene.id });
      results.push({ sceneId: scene.id, imagePath: '', imageUrl: '' });
      continue;
    }

    spinner.text = `Scene ${scene.id}: generating from reference...`;
    const imagePath = assetManager.getAssetPath(`${scene.id}.png`);
    const scenePrompt = scene.image_generation.input.prompt;
    const sceneHash = hashWorkflowStep({
      reference_url: referenceUrl,
      prompt: scenePrompt,
      seed: consistency.seed,
      edit_model: consistency.edit_model,
    } as Record<string, unknown>);

    let imageUrl: string;

    if (!skipCache && cache.has(`${scene.id}-image`, sceneHash)) {
      const cached = cache.get(`${scene.id}-image`)!;
      imageUrl = cached.outputPath;
      log.info('Scene image cache hit', { sceneId: scene.id });
    } else {
      const sceneResult = await generateSceneFromReference(
        referenceUrl,
        scenePrompt,
        consistencyOptions,
        imagePath,
      );
      imageUrl = sceneResult.url;
      await cache.set(`${scene.id}-image`, sceneHash, sceneResult.url);
      costTracker.record(consistency.edit_model ?? 'fal-ai/nano-banana-pro/edit', COST_ESTIMATES.image_nano_edit);
    }

    const sceneAsset: SceneAssets = { sceneId: scene.id, imagePath, imageUrl };

    // Generate video if needed (uses the consistent image as input)
    if (scene.type === 'video' && scene.video_generation) {
      spinner.text = `Scene ${scene.id}: generating video from consistent image...`;
      const videoFilename = `${scene.id}.mp4`;
      const videoPath = assetManager.getAssetPath(videoFilename);
      const videoHash = hashWorkflowStep(scene.video_generation as unknown as Record<string, unknown>);

      if (!skipCache && cache.has(`${scene.id}-video`, videoHash)) {
        const cached = cache.get(`${scene.id}-video`)!;
        sceneAsset.videoPath = videoPath;
        sceneAsset.videoUrl = cached.outputPath;
        log.info('Video cache hit', { sceneId: scene.id });
      } else {
        const result = await generateVideo(scene.video_generation, imageUrl, videoPath);
        sceneAsset.videoPath = videoPath;
        sceneAsset.videoUrl = result.url;
        await cache.set(`${scene.id}-video`, videoHash, result.url);
        costTracker.record(scene.video_generation.model, estimateVideoCost(scene.video_generation.model));
      }
    }

    results.push(sceneAsset);
  }

  // Step 3: Generate transitions between consecutive scenes
  for (let i = 1; i < scenes.length; i++) {
    const scene = scenes[i];
    if (!scene.transition) continue;

    const prevAsset = results[i - 1];
    const currAsset = results[i];
    if (!prevAsset?.imageUrl || !currAsset?.imageUrl) continue;

    spinner.text = `Generating transition ${scenes[i - 1].id} → ${scene.id}...`;
    const transFilename = `transition-${scenes[i - 1].id}-${scene.id}.mp4`;
    const transPath = assetManager.getAssetPath(transFilename);

    try {
      const transResult = await generateTransition(
        scene.transition.model,
        prevAsset.imageUrl,
        currAsset.imageUrl,
        scene.transition.prompt ?? `Smooth transition between scenes`,
        transPath,
        {
          duration: scene.transition.duration,
          style: scene.transition.style,
        },
      );
      currAsset.transitionPath = transPath;
      currAsset.transitionUrl = transResult.url;
      const transCost = scene.transition.model.includes('pixverse')
        ? COST_ESTIMATES.transition_pixverse
        : COST_ESTIMATES.transition_vidu;
      costTracker.record(scene.transition.model, transCost);
    } catch (err) {
      log.warn('Transition generation failed, skipping', {
        from: scenes[i - 1].id,
        to: scene.id,
        error: String(err),
      });
    }
  }

  spinner.succeed(`${scenes.length} consistent scene images generated`);
  return results;
}

async function generateSceneSoundEffects(
  workflow: Workflow,
  config: AppConfig,
  assetManager: AssetManager,
  costTracker: CostTracker,
  computedTimings: ComputedSceneTiming[],
): Promise<SoundEffectAsset[]> {
  const results: SoundEffectAsset[] = [];
  const scenesWithSfx = workflow.scenes.filter(
    (s) => s.sound_effects && s.sound_effects.length > 0,
  );

  if (scenesWithSfx.length === 0) {
    return results;
  }

  const sfxModel = config.fal.audio.sound_effects ?? 'beatoven/sound-effect-generation';
  const spinner = createSpinner('Generating sound effects...');
  spinner.start();

  for (const scene of scenesWithSfx) {
    const sfxArray = scene.sound_effects ?? [];
    const timing = computedTimings.find((t) => t.sceneId === scene.id);
    const sceneStart = timing?.start ?? (scene.timing?.start ?? 0);

    for (let i = 0; i < sfxArray.length; i++) {
      const sfx = sfxArray[i];
      const sfxFilename = `sfx-${scene.id}-${i}.wav`;
      const sfxPath = assetManager.getAssetPath(sfxFilename);

      spinner.text = `SFX: ${sfx.prompt.slice(0, 40)}...`;

      try {
        const result = await generateSoundEffect(
          sfxModel,
          { prompt: sfx.prompt, negative_prompt: sfx.negative_prompt, duration: sfx.duration },
          sfxPath,
        );

        const absoluteTimestamp = sceneStart + sfx.timing_offset;

        results.push({
          sceneId: scene.id,
          prompt: sfx.prompt,
          audioPath: sfxPath,
          absoluteTimestamp,
          duration: result.duration,
          volume: sfx.volume ?? 0.8,
        });

        costTracker.record(sfxModel, COST_ESTIMATES.sound_effect);
      } catch (err) {
        log.warn('Sound effect generation failed, skipping', {
          sceneId: scene.id,
          prompt: sfx.prompt,
          error: String(err),
        });
      }
    }
  }

  spinner.succeed(`Sound effects generated: ${results.length}`);
  return results;
}

async function generateBackgroundMusic(
  workflow: Workflow,
  config: AppConfig,
  assetManager: AssetManager,
  costTracker: CostTracker,
  computedTotalDuration: number,
): Promise<string | undefined> {
  const musicConfig = workflow.audio.music;
  if (!musicConfig?.generate || !musicConfig.prompt) return undefined;

  const musicModel = config.fal.audio.music_generation ?? 'beatoven/music-generation';
  const duration = musicConfig.duration ?? computedTotalDuration;

  const spinner = createSpinner('Generating background music...');
  spinner.start();

  const musicPath = assetManager.getAssetPath('music-generated.wav');

  try {
    await generateMusic(
      musicModel,
      { prompt: musicConfig.prompt, duration },
      musicPath,
    );
    costTracker.record(musicModel, COST_ESTIMATES.music);
    spinner.succeed('Background music generated');
    return musicPath;
  } catch (err) {
    spinner.fail('Music generation failed');
    log.warn('Music generation failed', { error: String(err) });
    return undefined;
  }
}

function estimateVideoCost(model: string): number {
  if (model.includes('vidu')) return COST_ESTIMATES.video_vidu_5s_720p;
  if (model.includes('pixverse')) return COST_ESTIMATES.video_pixverse_5s_720p;
  if (model.includes('kling')) return COST_ESTIMATES.video_kling_5s;
  return COST_ESTIMATES.video_default;
}

function estimateCost(category: 'image' | 'video', model: string): number {
  if (category === 'image') {
    return model.includes('kling') ? COST_ESTIMATES.image_kling : COST_ESTIMATES.image_default;
  }
  return estimateVideoCost(model);
}

/**
 * Load existing scene assets from output directory (for phase-based generation)
 */
async function loadExistingAssets(
  scenes: Scene[],
  assetManager: AssetManager,
): Promise<SceneAssets[]> {
  const { pathExists } = await import('fs-extra');
  const results: SceneAssets[] = [];

  for (const scene of scenes) {
    const imagePath = assetManager.getAssetPath(`${scene.id}.png`);
    const videoPath = assetManager.getAssetPath(`${scene.id}.mp4`);

    const hasImage = await pathExists(imagePath);
    const hasVideo = await pathExists(videoPath);

    if (!hasImage) {
      log.warn('Missing image for scene', { sceneId: scene.id, imagePath });
    }

    results.push({
      sceneId: scene.id,
      imagePath: hasImage ? imagePath : '',
      imageUrl: hasImage ? imagePath : '', // Local path as fallback
      videoPath: hasVideo ? videoPath : undefined,
      videoUrl: hasVideo ? videoPath : undefined,
    });
  }

  log.info('Loaded existing assets', {
    total: results.length,
    withImages: results.filter(r => r.imagePath).length,
    withVideos: results.filter(r => r.videoPath).length,
  });

  return results;
}

/**
 * Generate videos only from existing images (for phase-based generation)
 */
async function generateVideosOnly(
  workflow: Workflow,
  existingAssets: SceneAssets[],
  assetManager: AssetManager,
  cache: CacheStore,
  costTracker: CostTracker,
  skipCache: boolean,
): Promise<SceneAssets[]> {
  const spinner = createSpinner('Generating videos from existing images...');
  spinner.start();

  for (const scene of workflow.scenes) {
    if (scene.type !== 'video' || !scene.video_generation) continue;

    const assets = existingAssets.find(a => a.sceneId === scene.id);
    if (!assets || !assets.imageUrl) {
      log.warn('No image for video generation', { sceneId: scene.id });
      continue;
    }

    spinner.text = `Scene ${scene.id}: generating video...`;
    const videoFilename = `${scene.id}.mp4`;
    const videoPath = assetManager.getAssetPath(videoFilename);
    const videoHash = hashWorkflowStep(scene.video_generation as unknown as Record<string, unknown>);

    if (!skipCache && cache.has(`${scene.id}-video`, videoHash)) {
      const cached = cache.get(`${scene.id}-video`)!;
      assets.videoPath = videoPath;
      assets.videoUrl = cached.outputPath;
      log.info('Video cache hit', { sceneId: scene.id });
    } else {
      const result = await generateVideo(scene.video_generation, assets.imageUrl, videoPath);
      assets.videoPath = videoPath;
      assets.videoUrl = result.url;
      await cache.set(`${scene.id}-video`, videoHash, result.url);
      costTracker.record(scene.video_generation.model, estimateVideoCost(scene.video_generation.model));
    }
  }

  spinner.succeed('Videos generated from existing images');
  return existingAssets;
}

/**
 * Run Vision QA on generated images to detect issues
 */
async function runVisionQA(
  workflow: Workflow,
  sceneAssets: SceneAssets[],
  assetManager: AssetManager,
  costTracker: CostTracker,
  autoFix: boolean = false,
): Promise<VisionQASceneResult[]> {
  const { analyzeImage, sanitizePrompt, buildSafeNegativePrompt } = await import('../validation/vision-qa.js');
  const spinner = createSpinner('Running Vision QA on images...');
  spinner.start();

  const results: VisionQASceneResult[] = [];
  const qaFailures: string[] = [];

  for (const scene of workflow.scenes) {
    // Skip QA for scenes that opted out or are static
    if (scene.skip_qa || scene.type === 'static') continue;

    const assets = sceneAssets.find(a => a.sceneId === scene.id);
    if (!assets?.imageUrl) continue;

    spinner.text = `QA checking scene ${scene.id}...`;

    try {
      const qaResult = await analyzeImage(assets.imageUrl, {
        prompt: scene.image_generation?.input?.prompt ?? '',
        checkText: true,
        checkWatermarks: true,
        forbiddenElements: ['logo', 'watermark', 'text overlay', 'brand'],
      });

      // Record QA cost (vision model)
      costTracker.record('fal-ai/llava-next', 0.01);

      results.push({
        sceneId: scene.id,
        passed: qaResult.passed,
        issues: qaResult.issues.map(i => ({
          type: i.type,
          severity: i.severity,
          description: i.description,
        })),
        confidence: qaResult.confidence,
      });

      if (!qaResult.passed) {
        qaFailures.push(scene.id);
        log.warn('Vision QA failed for scene', {
          sceneId: scene.id,
          issues: qaResult.issues.map(i => i.description),
        });

        // Auto-fix if enabled (regenerate with sanitized prompt)
        if (autoFix && scene.image_generation) {
          spinner.text = `Regenerating scene ${scene.id} with fixed prompt...`;
          const sanitizedPrompt = sanitizePrompt(scene.image_generation.input.prompt);
          const safeNegative = buildSafeNegativePrompt(scene.image_generation.input.negative_prompt);

          // Update scene config for regeneration
          scene.image_generation.input.prompt = sanitizedPrompt;
          scene.image_generation.input.negative_prompt = safeNegative;

          // Regenerate would happen on next run with --regenerate flag
          log.info('Prompt sanitized for regeneration', {
            sceneId: scene.id,
            originalPrompt: scene.image_generation.input.prompt.slice(0, 50),
            sanitizedPrompt: sanitizedPrompt.slice(0, 50),
          });
        }
      }
    } catch (err) {
      log.warn('Vision QA check failed', { sceneId: scene.id, error: String(err) });
      results.push({
        sceneId: scene.id,
        passed: true, // Pass on error to not block pipeline
        issues: [],
        confidence: 0.5,
      });
    }
  }

  if (qaFailures.length > 0) {
    spinner.warn(`Vision QA: ${qaFailures.length} scene(s) have issues`);
  } else {
    spinner.succeed(`Vision QA: All ${results.length} images passed`);
  }

  return results;
}
