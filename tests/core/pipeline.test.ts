import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all heavy dependencies before importing the module under test
vi.mock('dotenv/config', () => ({}));

const mockFsExtra = {
  readJson: vi.fn().mockResolvedValue({
    name: 'Test Video',
    template: 'horror',
    duration_target_seconds: 60,
    scenes: [
      {
        id: 'scene_1',
        type: 'image',
        timing: { start: 0, duration: 10 },
        narration: 'Test narration',
        image_generation: {
          model: 'fal-ai/kling-image/v3/text-to-image',
          input: { prompt: 'A dark room', aspect_ratio: '9:16' },
        },
        effects: ['vignette'],
      },
    ],
    audio: {
      tts: {
        model: 'fal-ai/qwen-3-tts/voice-design/1.7b',
        speed: 0.9,
      },
    },
  }),
  writeJson: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockResolvedValue(false),
  ensureDir: vi.fn().mockResolvedValue(undefined),
  copy: vi.fn().mockResolvedValue(undefined),
};

vi.mock('fs-extra', () => ({
  default: mockFsExtra,
  ...mockFsExtra,
}));

vi.mock('chalk', () => ({
  default: {
    dim: (s: string) => s,
    green: { bold: (s: string) => s },
    blue: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
  },
}));

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    fal: {
      image: { default: 'fal-ai/kling-image/v3/text-to-image', premium: 'fal-ai/kling-image/v3/text-to-image', stylized: 'fal-ai/kling-image/v3/text-to-image' },
      video: { default: 'fal-ai/kandinsky5-pro/image-to-video', fast: 'fal-ai/kandinsky5-pro/image-to-video', cinematic: 'fal-ai/kandinsky5-pro/image-to-video' },
      audio: { tts: 'fal-ai/qwen-3-tts/voice-design/1.7b', transcription: 'fal-ai/whisper', sound_effects: 'beatoven/sound-effect-generation', music_generation: 'beatoven/music-generation' },
      analysis: { image: 'fal-ai/got-ocr/v2', video: 'fal-ai/video-understanding' },
    },
    defaults: { aspect_ratio: '9:16', resolution: { width: 1080, height: 1920 }, fps: 30, duration_seconds: 60, max_video_clips: 3, image_to_video_ratio: 0.75 },
    templates: { horror: { image_model: 'premium', video_model: 'default', color_mood: 'dark_desaturated', effects: ['vignette'], voice_style: 'deep_slow', voice_pacing: 0.9, scenes_per_minute: 7 } },
    quality: { max_quality: { image_model: 'premium', image_size: '9:16', video_clips: 3, inference_steps: 50 }, balanced: { image_model: 'default', image_size: '9:16', video_clips: 2, inference_steps: 28 }, budget: { image_model: 'default', image_size: '9:16', video_clips: 1, inference_steps: 20 } },
    platforms: { youtube: { aspect_ratio: '16:9', resolution: { width: 1920, height: 1080 }, max_duration_seconds: 60, codec: 'h264', audio_codec: 'aac', bitrate: '8M', audio_bitrate: '192k' }, tiktok: { aspect_ratio: '9:16', resolution: { width: 1080, height: 1920 }, max_duration_seconds: 60, codec: 'h264', audio_codec: 'aac', bitrate: '6M', audio_bitrate: '128k' } },
    output: { directory: 'output', format: 'mp4', codec: 'h264', naming: '{date}-{slug}' },
  }),
}));

const mockAssetManagerInstance = {
  outputDir: '/tmp/test-pipeline-output',
  runId: 'test123',
  getAssetPath: vi.fn((f: string) => `/tmp/test-pipeline-output/assets/${f}`),
  getPlatformPath: vi.fn((p: string, f: string) => `/tmp/test-pipeline-output/${p}/${f}`),
  initialize: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../src/core/asset-manager.js', () => {
  const MockAssetManager = vi.fn().mockImplementation(() => mockAssetManagerInstance);
  MockAssetManager.fromExistingRun = vi.fn().mockReturnValue(mockAssetManagerInstance);
  return { AssetManager: MockAssetManager };
});

vi.mock('../../src/core/workflow-runner.js', () => ({
  executeWorkflow: vi.fn().mockResolvedValue({
    sceneAssets: [
      { sceneId: 'scene_1', imagePath: '/tmp/scene_1.png', imageUrl: 'https://fal.ai/scene_1.png' },
    ],
    narrationSegments: [
      { sceneId: 'scene_1', text: 'Test narration', audioPath: '/tmp/narration-scene_1.mp3', audioUrl: 'https://fal.ai/narration.mp3', actualDuration: 7, computedStart: 0 },
    ],
    fullNarrationPath: '/tmp/narration-full.mp3',
    transcription: { text: 'Test narration', chunks: [{ text: 'Test', timestamp: [0, 2] }] },
    soundEffects: [],
    costTracker: {
      record: vi.fn(),
      getTotal: vi.fn().mockReturnValue(0.1),
      getBreakdown: vi.fn().mockReturnValue({}),
      getSummary: vi.fn().mockReturnValue({ total: 0.1, breakdown: {}, count: 3 }),
    },
    computedTimings: [
      { sceneId: 'scene_1', start: 0, duration: 7.5, ttsDuration: 7, source: 'tts' },
    ],
    totalDuration: 7.5,
  }),
}));

vi.mock('../../src/audio/mixer.js', () => ({
  positionNarration: vi.fn().mockResolvedValue(undefined),
  concatenateNarration: vi.fn().mockResolvedValue(undefined),
  mixAudio: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/audio/normalize.js', () => ({
  normalizeAudio: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/audio/silence.js', () => ({
  trimSilence: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/subtitles/generator.js', () => ({
  buildSubtitleSegments: vi.fn().mockReturnValue([{ text: 'Test', startTime: 0, endTime: 2 }]),
  writeSRT: vi.fn().mockResolvedValue(undefined),
  writeVTT: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/subtitles/word-timing.js', () => ({
  extractWordTimings: vi.fn().mockReturnValue([]),
}));

vi.mock('../../src/render/renderer.js', () => ({
  renderComposition: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/post/encoder.js', () => ({
  encode: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/post/thumbnail.js', () => ({
  extractThumbnail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/platforms/profiles.js', () => ({
  getEncodingProfile: vi.fn().mockReturnValue({ codec: 'h264', bitrate: '6M' }),
  getAllPlatformIds: vi.fn().mockReturnValue(['youtube', 'tiktok']),
}));

vi.mock('../../src/utils/cost.js', () => ({
  formatCostSummary: vi.fn().mockReturnValue('Cost: $0.10'),
}));

vi.mock('../../src/utils/files.js', () => ({
  writeJsonFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/progress.js', () => ({
  createSpinner: vi.fn(() => ({
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  })),
}));

import { loadConfig } from '../../src/config/loader.js';
import { executeWorkflow } from '../../src/core/workflow-runner.js';

describe('Core: pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.log
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should load config before running', async () => {
    const { runGenerate } = await import('../../src/core/pipeline.js');

    await runGenerate({ workflow: '/tmp/workflow.json' });

    expect(loadConfig).toHaveBeenCalledTimes(1);
  });

  it('should execute generate pipeline end-to-end', async () => {
    const { runGenerate } = await import('../../src/core/pipeline.js');

    await runGenerate({ workflow: '/tmp/workflow.json' });

    expect(executeWorkflow).toHaveBeenCalledTimes(1);
    // Verify it was called with parsed workflow, config, assetManager, and skipCache
    expect(executeWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Video' }),
      expect.objectContaining({ defaults: expect.any(Object) }),
      expect.any(Object),
      undefined,
    );
  });

  it('should execute render pipeline end-to-end', async () => {
    // Mock readJson for the render path to return a valid workflow from runDir
    const fsExtra = await import('fs-extra');
    vi.mocked(fsExtra.readJson).mockResolvedValue({
      name: 'Test Video',
      template: 'horror',
      duration_target_seconds: 60,
      scenes: [
        {
          id: 'scene_1',
          type: 'image',
          timing: { start: 0, duration: 10 },
          narration: 'Test narration',
          image_generation: {
            model: 'fal-ai/kling-image/v3/text-to-image',
            input: { prompt: 'A dark room', aspect_ratio: '9:16' },
          },
          effects: ['vignette'],
        },
      ],
      audio: {
        tts: {
          model: 'fal-ai/qwen-3-tts/voice-design/1.7b',
          speed: 0.9,
        },
      },
    });

    // For runRender, we need the CostTracker class to be available
    vi.mock('../../src/fal/cost.js', () => ({
      CostTracker: vi.fn().mockImplementation(() => ({
        record: vi.fn(),
        getTotal: vi.fn().mockReturnValue(0),
        getBreakdown: vi.fn().mockReturnValue({}),
        getSummary: vi.fn().mockReturnValue({ total: 0, breakdown: {}, count: 0 }),
      })),
    }));

    const { runRender } = await import('../../src/core/pipeline.js');

    await runRender({ run: '/tmp/test-run' });

    // renderComposition should have been called for each platform
    const { renderComposition } = await import('../../src/render/renderer.js');
    expect(renderComposition).toHaveBeenCalled();
  });
});
