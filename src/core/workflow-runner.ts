import { join } from 'node:path';
import type { Workflow } from '../schemas/workflow.js';
import type { Scene } from '../schemas/scene.js';
import type { AppConfig } from '../config/loader.js';
import { AssetManager } from './asset-manager.js';
import { generateImage } from '../fal/image.js';
import { generateVideo } from '../fal/video.js';
import { generateSpeech, transcribe } from '../fal/audio.js';
import { CacheStore } from '../cache/store.js';
import { hashWorkflowStep } from '../cache/hash.js';
import { CostTracker } from '../fal/cost.js';
import { createLogger } from '../utils/logger.js';
import { createSpinner } from '../utils/progress.js';

const log = createLogger('workflow-runner');

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

export interface WorkflowResult {
  sceneAssets: SceneAssets[];
  narrationSegments: NarrationSegment[];
  fullNarrationPath?: string;
  transcription?: { text: string; chunks: Array<{ text: string; timestamp: [number, number] }> };
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
  const sceneAssets = await generateSceneAssets(
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

    // Transcribe using the first narration segment's URL for now
    // Full concatenation happens in audio pipeline
    const firstUrl = narrationSegments[0].audioUrl;
    try {
      const whisperModel = config.fal.audio.transcription;
      const result = await transcribe(firstUrl, whisperModel);
      transcription = {
        text: result.text,
        chunks: result.chunks ?? [],
      };
      costTracker.record(whisperModel, 0.01);
      log.info('Transcription complete', { wordCount: result.text.split(' ').length });
    } catch (err) {
      log.warn('Transcription failed, subtitles will use narration text', { error: String(err) });
    }
  }

  return { sceneAssets, narrationSegments, fullNarrationPath, transcription, costTracker };
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

    // Check cache for image
    if (!skipCache && cache.has(`${scene.id}-image`, imageHash)) {
      const cached = cache.get(`${scene.id}-image`)!;
      imageUrl = cached.outputPath;
      spinner.text = `Scene ${scene.id}: image cached`;
      log.info('Image cache hit', { sceneId: scene.id });
    } else {
      const result = await generateImage(scene.image_generation, imagePath);
      imageUrl = result.url;
      await cache.set(`${scene.id}-image`, imageHash, result.url);
      costTracker.record(scene.image_generation.model, estimateImageCost(scene.image_generation.model));
    }

    const sceneResult: SceneAssets = { sceneId: scene.id, imagePath, imageUrl };

    // Generate video if scene type is 'video' and video_generation exists
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
        costTracker.record(scene.video_generation.model, estimateVideoCost(scene.video_generation.model));
      }
    }

    spinner.succeed(`Scene ${scene.id}: ${scene.type === 'video' ? 'image + video' : 'image'} ready`);
    results.push(sceneResult);
  }

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
    const narrationText = scene.narration!;
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
      costTracker.record(workflow.audio.tts.model, 0.015);
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

function estimateImageCost(model: string): number {
  if (model.includes('pro')) return 0.05;
  if (model.includes('grok')) return 0.03;
  return 0.02;
}

function estimateVideoCost(model: string): number {
  if (model.includes('kling')) return 0.10;
  if (model.includes('minimax')) return 0.06;
  if (model.includes('luma')) return 0.08;
  return 0.08;
}
