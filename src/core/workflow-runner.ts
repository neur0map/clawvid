import type { Workflow } from '../schemas/workflow.js';
import type { Scene } from '../schemas/scene.js';
import type { AppConfig } from '../config/loader.js';
import { AssetManager } from './asset-manager.js';
import { generateImage } from '../fal/image.js';
import { generateVideo } from '../fal/video.js';
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
  video_512p: 0.35,
  video_1024p: 0.70,
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
}

export interface NarrationSegment {
  sceneId: string;
  text: string;
  audioPath: string;
  audioUrl: string;
  startTime: number;
  duration: number;
}

export interface SoundEffectAsset {
  sceneId: string;
  prompt: string;
  audioPath: string;
  absoluteTimestamp: number;
  duration: number;
  volume: number;
}

export interface WorkflowResult {
  sceneAssets: SceneAssets[];
  narrationSegments: NarrationSegment[];
  fullNarrationPath?: string;
  transcription?: { text: string; chunks: Array<{ text: string; timestamp: [number, number] }> };
  soundEffects: SoundEffectAsset[];
  generatedMusicPath?: string;
  costTracker: CostTracker;
}

export async function executeWorkflow(
  workflow: Workflow,
  config: AppConfig,
  assetManager: AssetManager,
  skipCache: boolean = false,
): Promise<WorkflowResult> {
  const cache = new CacheStore(assetManager.outputDir);
  if (!skipCache) await cache.load();
  const costTracker = new CostTracker();

  log.info('Executing workflow', {
    name: workflow.name,
    scenes: workflow.scenes.length,
    template: workflow.template,
  });

  // Phase 1: Generate scene images & videos
  // Use direct API orchestration for consistent images when configured
  const sceneAssets = workflow.consistency
    ? await generateSceneAssetsViaWorkflow(
        workflow,
        assetManager,
        cache,
        costTracker,
        skipCache,
      )
    : await generateSceneAssets(
        workflow.scenes,
        assetManager,
        cache,
        costTracker,
        skipCache,
      );

  // Phase 2: Generate narration audio per scene
  const narrationSegments = await generateNarration(
    workflow,
    assetManager,
    cache,
    costTracker,
    skipCache,
  );

  // Phase 3: Concatenate narration and transcribe for subtitles
  let fullNarrationPath: string | undefined;
  let transcription: WorkflowResult['transcription'];

  if (narrationSegments.length > 0) {
    fullNarrationPath = assetManager.getAssetPath('narration-full.mp3');

    // Transcribe each narration segment and merge chunks with cumulative offset.
    // Whisper timestamps are relative to each audio file. Since segments get
    // concatenated sequentially, we track cumulative duration to align timestamps
    // with the final concatenated audio timeline.
    const whisperModel = config.fal.audio.transcription;
    const allText: string[] = [];
    const allChunks: Array<{ text: string; timestamp: [number, number] }> = [];
    let cumulativeOffset = 0;

    for (const segment of narrationSegments) {
      try {
        const result = await transcribe(segment.audioUrl, whisperModel);
        allText.push(result.text);

        let segmentEnd = 0;
        for (const chunk of result.chunks ?? []) {
          allChunks.push({
            text: chunk.text,
            timestamp: [
              chunk.timestamp[0] + cumulativeOffset,
              chunk.timestamp[1] + cumulativeOffset,
            ],
          });
          segmentEnd = Math.max(segmentEnd, chunk.timestamp[1]);
        }

        // Advance offset by this segment's actual audio duration
        cumulativeOffset += segmentEnd > 0 ? segmentEnd : segment.duration;

        costTracker.record(whisperModel, COST_ESTIMATES.transcription);
      } catch (err) {
        log.warn('Transcription failed for segment, using narration text', {
          sceneId: segment.sceneId,
          error: String(err),
        });
        // Still advance offset so subsequent segments align
        cumulativeOffset += segment.duration;
      }
    }

    if (allText.length > 0 || allChunks.length > 0) {
      transcription = {
        text: allText.join(' '),
        chunks: allChunks,
      };
      log.info('Transcription complete', {
        segments: narrationSegments.length,
        wordCount: transcription.text.split(' ').length,
      });
    }
  }

  // Phase 4: Generate sound effects per scene
  const soundEffects = await generateSceneSoundEffects(
    workflow,
    config,
    assetManager,
    costTracker,
  );

  // Phase 5: Generate background music
  let generatedMusicPath: string | undefined;
  if (workflow.audio.music?.generate && workflow.audio.music.prompt) {
    generatedMusicPath = await generateBackgroundMusic(
      workflow,
      config,
      assetManager,
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
  };
}

async function generateSceneAssets(
  scenes: Scene[],
  assetManager: AssetManager,
  cache: CacheStore,
  costTracker: CostTracker,
  skipCache: boolean,
): Promise<SceneAssets[]> {
  const results: SceneAssets[] = [];

  for (const scene of scenes) {
    const spinner = createSpinner(`Scene ${scene.id}: generating image...`);
    spinner.start();

    const imageFilename = `${scene.id}.png`;
    const imagePath = assetManager.getAssetPath(imageFilename);
    const imageHash = hashWorkflowStep(scene.image_generation as unknown as Record<string, unknown>);

    let imageUrl: string;

    if (!skipCache && cache.has(`${scene.id}-image`, imageHash)) {
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

    if (scene.type === 'video' && scene.video_generation) {
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
        costTracker.record(scene.video_generation.model, COST_ESTIMATES.video_512p);
      }
    }

    spinner.succeed(`Scene ${scene.id}: ${scene.type === 'video' ? 'image + video' : 'image'} ready`);
    results.push(sceneResult);
  }

  return results;
}

async function generateSceneAssetsViaWorkflow(
  workflow: Workflow,
  assetManager: AssetManager,
  cache: CacheStore,
  costTracker: CostTracker,
  skipCache: boolean,
): Promise<SceneAssets[]> {
  const consistency = workflow.consistency!;
  const scenes = workflow.scenes;
  const spinner = createSpinner('Generating consistent scene images...');
  spinner.start();

  const aspectRatio = scenes[0]?.image_generation.input.aspect_ratio ?? '9:16';

  const consistencyOptions: ConsistencyOptions = {
    referencePrompt: consistency.reference_prompt,
    seed: consistency.seed,
    aspectRatio,
    model: consistency.model,
    editModel: consistency.edit_model,
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
        costTracker.record(scene.video_generation.model, COST_ESTIMATES.video_512p);
      }
    }

    results.push(sceneAsset);
  }

  spinner.succeed(`${scenes.length} consistent scene images generated`);
  return results;
}

async function generateNarration(
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

  const spinner = createSpinner('Generating narration...');
  spinner.start();

  for (const scene of scenesWithNarration) {
    const narrationText = scene.narration ?? '';
    if (!narrationText) continue;
    const audioFilename = `narration-${scene.id}.mp3`;
    const audioPath = assetManager.getAssetPath(audioFilename);
    const narrationHash = hashWorkflowStep({ text: narrationText, tts: workflow.audio.tts } as Record<string, unknown>);

    let audioUrl: string;

    if (!skipCache && cache.has(`${scene.id}-narration`, narrationHash)) {
      const cached = cache.get(`${scene.id}-narration`)!;
      audioUrl = cached.outputPath;
      log.info('Narration cache hit', { sceneId: scene.id });
    } else {
      spinner.text = `Narrating scene ${scene.id}...`;
      const result = await generateSpeech(workflow.audio.tts, narrationText, audioPath);
      audioUrl = result.url;
      await cache.set(`${scene.id}-narration`, narrationHash, result.url);
      costTracker.record(workflow.audio.tts.model, COST_ESTIMATES.tts);
    }

    segments.push({
      sceneId: scene.id,
      text: narrationText,
      audioPath,
      audioUrl,
      startTime: scene.timing.start,
      duration: scene.timing.duration,
    });
  }

  spinner.succeed(`Narration generated for ${segments.length} scenes`);
  return segments;
}

async function generateSceneSoundEffects(
  workflow: Workflow,
  config: AppConfig,
  assetManager: AssetManager,
  costTracker: CostTracker,
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

        const absoluteTimestamp = scene.timing.start + sfx.timing_offset;

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
): Promise<string | undefined> {
  const musicConfig = workflow.audio.music;
  if (!musicConfig?.generate || !musicConfig.prompt) return undefined;

  const musicModel = config.fal.audio.music_generation ?? 'beatoven/music-generation';
  const duration = musicConfig.duration ?? workflow.duration_target_seconds;

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

function estimateCost(category: 'image' | 'video', model: string): number {
  if (category === 'image') {
    return model.includes('kling') ? COST_ESTIMATES.image_kling : COST_ESTIMATES.image_default;
  }
  return COST_ESTIMATES.video_512p;
}
