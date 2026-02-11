import { describe, it, expect } from 'vitest';
import { workflowSchema } from '../../src/schemas/workflow.js';

const validWorkflow = {
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
};

describe('Schema: workflow', () => {
  it('should validate a valid workflow', () => {
    const result = workflowSchema.safeParse(validWorkflow);
    expect(result.success).toBe(true);
  });

  it('should reject workflow without scenes', () => {
    const invalid = { ...validWorkflow, scenes: [] };
    const result = workflowSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject workflow without name', () => {
    const { name, ...noName } = validWorkflow;
    const result = workflowSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it('should reject workflow without audio config', () => {
    const { audio, ...noAudio } = validWorkflow;
    const result = workflowSchema.safeParse(noAudio);
    expect(result.success).toBe(false);
  });

  it('should accept video scene with video_generation', () => {
    const videoScene = {
      ...validWorkflow,
      scenes: [
        {
          id: 'scene_1',
          type: 'video',
          timing: { start: 0, duration: 5 },
          image_generation: {
            model: 'fal-ai/kling-image/v3/text-to-image',
            input: { prompt: 'A dark room', aspect_ratio: '9:16' },
          },
          video_generation: {
            model: 'fal-ai/kandinsky5-pro/image-to-video',
            input: { prompt: 'Camera push forward', duration: '5s' },
          },
          effects: [],
        },
      ],
    };
    const result = workflowSchema.safeParse(videoScene);
    expect(result.success).toBe(true);
  });

  it('should accept scene with null narration', () => {
    const nullNarration = {
      ...validWorkflow,
      scenes: [
        {
          ...validWorkflow.scenes[0],
          narration: null,
        },
      ],
    };
    const result = workflowSchema.safeParse(nullNarration);
    expect(result.success).toBe(true);
  });

  it('should reject negative scene timing', () => {
    const invalid = {
      ...validWorkflow,
      scenes: [
        {
          ...validWorkflow.scenes[0],
          timing: { start: -1, duration: 10 },
        },
      ],
    };
    const result = workflowSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept workflow with subtitles config', () => {
    const withSubs = {
      ...validWorkflow,
      subtitles: {
        enabled: true,
        style: {
          font: 'Impact',
          color: '#ffffff',
          position: 'bottom' as const,
        },
      },
    };
    const result = workflowSchema.safeParse(withSubs);
    expect(result.success).toBe(true);
  });

  it('should accept scene with sound_effects', () => {
    const withSfx = {
      ...validWorkflow,
      scenes: [
        {
          ...validWorkflow.scenes[0],
          sound_effects: [
            {
              prompt: 'Door slam',
              timing_offset: 3,
              duration: 2,
              volume: 0.9,
            },
            {
              prompt: 'Wind howling',
              timing_offset: 0,
              duration: 5,
            },
          ],
        },
      ],
    };
    const result = workflowSchema.safeParse(withSfx);
    expect(result.success).toBe(true);
  });

  it('should reject sound_effects with invalid duration', () => {
    const invalidSfx = {
      ...validWorkflow,
      scenes: [
        {
          ...validWorkflow.scenes[0],
          sound_effects: [
            {
              prompt: 'Too long',
              timing_offset: 0,
              duration: 40,
            },
          ],
        },
      ],
    };
    const result = workflowSchema.safeParse(invalidSfx);
    expect(result.success).toBe(false);
  });

  it('should accept music with generate and prompt', () => {
    const withMusic = {
      ...validWorkflow,
      audio: {
        ...validWorkflow.audio,
        music: {
          generate: true,
          prompt: 'Dark ambient horror drone',
          duration: 60,
          volume: 0.25,
          fade_in: 2,
          fade_out: 3,
        },
      },
    };
    const result = workflowSchema.safeParse(withMusic);
    expect(result.success).toBe(true);
  });

  it('should accept tts with voice_prompt', () => {
    const withVoicePrompt = {
      ...validWorkflow,
      audio: {
        tts: {
          model: 'fal-ai/qwen-3-tts/voice-design/1.7b',
          voice_prompt: 'A deep male voice, creepy',
          language: 'en',
          speed: 0.9,
          temperature: 0.7,
          top_k: 50,
          top_p: 0.9,
        },
      },
    };
    const result = workflowSchema.safeParse(withVoicePrompt);
    expect(result.success).toBe(true);
  });

  it('should accept workflow with analysis config', () => {
    const withAnalysis = {
      ...validWorkflow,
      analysis: {
        verify_images: true,
        verify_videos: false,
      },
    };
    const result = workflowSchema.safeParse(withAnalysis);
    expect(result.success).toBe(true);
  });
});
