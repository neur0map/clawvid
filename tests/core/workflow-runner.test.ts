import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Workflow } from '../../src/schemas/workflow.js';
import type { AppConfig } from '../../src/config/loader.js';
import { defaults } from '../../src/config/defaults.js';

// Mock all external dependencies before importing the module under test
vi.mock('../../src/fal/image.js', () => ({
  generateImage: vi.fn().mockResolvedValue({ url: 'https://fal.ai/image.png', width: 1080, height: 1920 }),
}));

vi.mock('../../src/fal/video.js', () => ({
  generateVideo: vi.fn().mockResolvedValue({ url: 'https://fal.ai/video.mp4' }),
}));

vi.mock('../../src/fal/audio.js', () => ({
  generateSpeech: vi.fn().mockResolvedValue({ url: 'https://fal.ai/speech.mp3', duration: 7 }),
  transcribe: vi.fn().mockResolvedValue({ text: 'Hello world', chunks: [{ text: 'Hello', timestamp: [0, 1] }] }),
}));

vi.mock('../../src/fal/sound.js', () => ({
  generateSoundEffect: vi.fn().mockResolvedValue({ url: 'https://fal.ai/sfx.wav', duration: 2 }),
}));

vi.mock('../../src/fal/music.js', () => ({
  generateMusic: vi.fn().mockResolvedValue({ url: 'https://fal.ai/music.wav', duration: 60 }),
}));

vi.mock('../../src/fal/workflow.js', () => ({
  generateReferenceImage: vi.fn().mockResolvedValue({ url: 'https://fal.ai/ref.png', width: 1080, height: 1920 }),
  generateSceneFromReference: vi.fn().mockResolvedValue({ url: 'https://fal.ai/scene.png', width: 1080, height: 1920 }),
}));

vi.mock('../../src/utils/progress.js', () => ({
  createSpinner: vi.fn(() => ({
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  })),
}));

vi.mock('../../src/cache/store.js', () => {
  const entries = new Map<string, { hash: string; outputPath: string }>();
  return {
    CacheStore: vi.fn().mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
      has: vi.fn((key: string, hash: string) => {
        const entry = entries.get(key);
        return !!entry && entry.hash === hash;
      }),
      get: vi.fn((key: string) => entries.get(key)),
      set: vi.fn(async (key: string, hash: string, outputPath: string) => {
        entries.set(key, { hash, outputPath });
      }),
      clear: vi.fn(() => entries.clear()),
    })),
  };
});

vi.mock('../../src/cache/hash.js', () => ({
  hashWorkflowStep: vi.fn(() => 'mockhash1234'),
}));

vi.mock('../../src/core/asset-manager.js', () => ({
  AssetManager: vi.fn().mockImplementation(() => ({
    outputDir: '/tmp/test-output',
    getAssetPath: vi.fn((filename: string) => `/tmp/test-output/assets/${filename}`),
    getPlatformPath: vi.fn((platform: string, filename: string) => `/tmp/test-output/${platform}/${filename}`),
    initialize: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { executeWorkflow, computeTiming, type NarrationSegment } from '../../src/core/workflow-runner.js';
import { generateImage } from '../../src/fal/image.js';
import { generateVideo } from '../../src/fal/video.js';
import { generateSpeech } from '../../src/fal/audio.js';
import { generateReferenceImage, generateSceneFromReference } from '../../src/fal/workflow.js';
import { AssetManager } from '../../src/core/asset-manager.js';

const config: AppConfig = { ...defaults };

function makeWorkflow(overrides?: Partial<Workflow>): Workflow {
  return {
    name: 'Test Workflow',
    template: 'horror',
    duration_target_seconds: 30,
    scenes: [
      {
        id: 'scene_1',
        type: 'image',
        timing: { start: 0, duration: 10 },
        narration: 'Hello world',
        image_generation: {
          model: 'fal-ai/kling-image/v3/text-to-image',
          input: { prompt: 'A dark room', aspect_ratio: '9:16' },
        },
      },
      {
        id: 'scene_2',
        type: 'video',
        timing: { start: 10, duration: 10 },
        narration: 'Spooky scene',
        image_generation: {
          model: 'fal-ai/kling-image/v3/text-to-image',
          input: { prompt: 'A haunted house', aspect_ratio: '9:16' },
        },
        video_generation: {
          model: 'fal-ai/kandinsky5-pro/image-to-video',
          input: { prompt: 'Camera push forward', duration: '5s' },
        },
      },
    ],
    audio: {
      tts: {
        model: 'fal-ai/qwen-3-tts/voice-design/1.7b',
        speed: 0.9,
      },
    },
    ...overrides,
  } as Workflow;
}

describe('Core: workflow-runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute all workflow steps in order', async () => {
    const workflow = makeWorkflow();
    const assetManager = new AssetManager('/tmp/test-output', 'test');

    const result = await executeWorkflow(workflow, config, assetManager, true);

    // Should generate images for all scenes
    expect(generateImage).toHaveBeenCalledTimes(2);
    // Should generate video for scene_2 (the video scene)
    expect(generateVideo).toHaveBeenCalledTimes(1);
    // Should generate speech for both scenes (both have narration)
    expect(generateSpeech).toHaveBeenCalledTimes(2);

    // Result should contain assets for all scenes
    expect(result.sceneAssets).toHaveLength(2);
    expect(result.narrationSegments).toHaveLength(2);
    expect(result.costTracker).toBeDefined();
    expect(result.computedTimings).toHaveLength(2);
    expect(result.totalDuration).toBeGreaterThan(0);
  });

  it('should return NarrationSegments with actualDuration and computedStart', async () => {
    const workflow = makeWorkflow();
    const assetManager = new AssetManager('/tmp/test-output', 'test');

    const result = await executeWorkflow(workflow, config, assetManager, true);

    for (const segment of result.narrationSegments) {
      expect(segment.actualDuration).toBeGreaterThan(0);
      expect(typeof segment.computedStart).toBe('number');
    }

    // Second segment should start after first
    expect(result.narrationSegments[1].computedStart).toBeGreaterThan(0);
  });

  it('should skip cached steps', async () => {
    const workflow = makeWorkflow();
    const assetManager = new AssetManager('/tmp/test-output', 'test');

    // First run: populates cache
    await executeWorkflow(workflow, config, assetManager, true);
    vi.clearAllMocks();

    // Second run: skipCache=true, so it always calls generate
    const result = await executeWorkflow(workflow, config, assetManager, true);

    // With skipCache=true, it should still call generateImage
    expect(generateImage).toHaveBeenCalledTimes(2);
    expect(result.sceneAssets).toHaveLength(2);
  });

  it('should track costs per step', async () => {
    const workflow = makeWorkflow();
    const assetManager = new AssetManager('/tmp/test-output', 'test');

    const result = await executeWorkflow(workflow, config, assetManager, true);

    const summary = result.costTracker.getSummary();
    // Should have recorded costs for: 2 images + 1 video + 2 narrations + 2 transcriptions
    expect(summary.count).toBeGreaterThanOrEqual(5);
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.breakdown).toBeDefined();
  });

  it('should use direct API orchestration when consistency is configured', async () => {
    const workflow = makeWorkflow({
      consistency: {
        reference_prompt: 'A dark figure in horror style',
        seed: 42,
      },
    });
    const assetManager = new AssetManager('/tmp/test-output', 'test');

    const result = await executeWorkflow(workflow, config, assetManager, true);

    // Should call generateReferenceImage once
    expect(generateReferenceImage).toHaveBeenCalledTimes(1);
    // Should call generateSceneFromReference for each scene
    expect(generateSceneFromReference).toHaveBeenCalledTimes(2);
    // Should NOT call individual generateImage
    expect(generateImage).not.toHaveBeenCalled();
    // Video generation for scene_2 should still happen (from consistent image)
    expect(generateVideo).toHaveBeenCalledTimes(1);
    expect(result.sceneAssets).toHaveLength(2);
  });

  it('should handle step failures gracefully', async () => {
    // Make generateImage fail on second call
    const genImage = vi.mocked(generateImage);
    genImage.mockResolvedValueOnce({ url: 'https://fal.ai/image.png', width: 1080, height: 1920 });
    genImage.mockRejectedValueOnce(new Error('API rate limit'));

    const workflow = makeWorkflow();
    const assetManager = new AssetManager('/tmp/test-output', 'test');

    // The workflow runner should throw because image generation is required
    await expect(executeWorkflow(workflow, config, assetManager, true)).rejects.toThrow('API rate limit');
  });

  it('should inject voice_reference for scenes after the first', async () => {
    const workflow = makeWorkflow();
    const assetManager = new AssetManager('/tmp/test-output', 'test');

    await executeWorkflow(workflow, config, assetManager, true);

    // First call: no voice_reference
    const firstCall = vi.mocked(generateSpeech).mock.calls[0];
    expect(firstCall[0].voice_reference).toBeUndefined();

    // Second call: should have voice_reference set to first audio URL
    const secondCall = vi.mocked(generateSpeech).mock.calls[1];
    expect(secondCall[0].voice_reference).toBe('https://fal.ai/speech.mp3');
  });
});

describe('computeTiming', () => {
  it('should compute TTS-driven timing with padding', () => {
    const workflow = makeWorkflow();
    const segments: NarrationSegment[] = [
      { sceneId: 'scene_1', text: 'Hello', audioPath: '', audioUrl: '', actualDuration: 7, computedStart: 0 },
      { sceneId: 'scene_2', text: 'World', audioPath: '', audioUrl: '', actualDuration: 8, computedStart: 0 },
    ];

    const timings = computeTiming(workflow, segments);

    expect(timings).toHaveLength(2);
    // scene_1: max(7 + 0.5, 3) = 7.5
    expect(timings[0].start).toBe(0);
    expect(timings[0].duration).toBe(7.5);
    expect(timings[0].source).toBe('tts');
    // scene_2: max(8 + 0.5, 3) = 8.5, start = 7.5
    expect(timings[1].start).toBe(7.5);
    expect(timings[1].duration).toBe(8.5);
    expect(timings[1].source).toBe('tts');
  });

  it('should use fixed timing mode when specified', () => {
    const workflow = makeWorkflow({ timing_mode: 'fixed' });
    const segments: NarrationSegment[] = [
      { sceneId: 'scene_1', text: 'Hello', audioPath: '', audioUrl: '', actualDuration: 7, computedStart: 0 },
      { sceneId: 'scene_2', text: 'World', audioPath: '', audioUrl: '', actualDuration: 8, computedStart: 0 },
    ];

    const timings = computeTiming(workflow, segments);

    expect(timings).toHaveLength(2);
    // Fixed mode uses workflow JSON timing
    expect(timings[0].start).toBe(0);
    expect(timings[0].duration).toBe(10);
    expect(timings[0].source).toBe('workflow');
    expect(timings[1].start).toBe(10);
    expect(timings[1].duration).toBe(10);
    expect(timings[1].source).toBe('workflow');
  });

  it('should respect min_scene_duration_seconds', () => {
    const workflow = makeWorkflow({ min_scene_duration_seconds: 10 });
    const segments: NarrationSegment[] = [
      { sceneId: 'scene_1', text: 'Hi', audioPath: '', audioUrl: '', actualDuration: 2, computedStart: 0 },
      { sceneId: 'scene_2', text: 'Ok', audioPath: '', audioUrl: '', actualDuration: 1, computedStart: 0 },
    ];

    const timings = computeTiming(workflow, segments);

    // max(2 + 0.5, 10) = 10
    expect(timings[0].duration).toBe(10);
    expect(timings[1].duration).toBe(10);
  });

  it('should use custom padding', () => {
    const workflow = makeWorkflow({ scene_padding_seconds: 2 });
    const segments: NarrationSegment[] = [
      { sceneId: 'scene_1', text: 'Hello', audioPath: '', audioUrl: '', actualDuration: 7, computedStart: 0 },
      { sceneId: 'scene_2', text: 'World', audioPath: '', audioUrl: '', actualDuration: 8, computedStart: 0 },
    ];

    const timings = computeTiming(workflow, segments);

    // max(7 + 2, 3) = 9
    expect(timings[0].duration).toBe(9);
    // max(8 + 2, 3) = 10
    expect(timings[1].duration).toBe(10);
  });

  it('should fall back to default for scenes without narration', () => {
    const workflow = makeWorkflow();
    // Only scene_1 has narration
    const segments: NarrationSegment[] = [
      { sceneId: 'scene_1', text: 'Hello', audioPath: '', audioUrl: '', actualDuration: 7, computedStart: 0 },
    ];

    const timings = computeTiming(workflow, segments);

    expect(timings[0].source).toBe('tts');
    // scene_2 has no narration segment → uses workflow timing or default
    expect(timings[1].source).toBe('workflow');
    expect(timings[1].duration).toBe(10); // from workflow JSON
  });
});
