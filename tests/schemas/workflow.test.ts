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
        model: 'fal-ai/flux/dev',
        input: { prompt: 'A dark room' },
      },
      effects: ['vignette'],
    },
  ],
  audio: {
    tts: {
      model: 'fal-ai/f5-tts',
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
            model: 'fal-ai/flux-pro/v1.1',
            input: { prompt: 'A dark room' },
          },
          video_generation: {
            model: 'fal-ai/kling-video/v1.5/pro/image-to-video',
            input: { prompt: 'Camera push forward', duration: '5' },
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
});
