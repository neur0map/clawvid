import { describe, it, expect } from 'vitest';
import { configSchema } from '../../src/schemas/config.js';
import { defaults } from '../../src/config/defaults.js';

describe('Schema: config', () => {
  it('should validate default config', () => {
    const result = configSchema.safeParse(defaults);
    expect(result.success).toBe(true);
  });

  it('should reject config missing fal models', () => {
    const invalid = { ...defaults, fal: {} };
    const result = configSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject config with negative duration', () => {
    const invalid = {
      ...defaults,
      defaults: { ...defaults.defaults, duration_seconds: -10 },
    };
    const result = configSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject config with invalid resolution', () => {
    const invalid = {
      ...defaults,
      defaults: { ...defaults.defaults, resolution: { width: -1, height: 1920 } },
    };
    const result = configSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept config with extra templates', () => {
    const extended = {
      ...defaults,
      templates: {
        ...defaults.templates,
        custom: {
          image_model: 'default',
          video_model: 'fast',
          color_mood: 'cool',
          effects: ['vignette'],
          voice_style: 'neutral',
          voice_pacing: 1.0,
          scenes_per_minute: 6,
        },
      },
    };
    const result = configSchema.safeParse(extended);
    expect(result.success).toBe(true);
  });

  it('should reject image_to_video_ratio outside 0-1', () => {
    const invalid = {
      ...defaults,
      defaults: { ...defaults.defaults, image_to_video_ratio: 1.5 },
    };
    const result = configSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate config with sound_effects and music_generation models', () => {
    const result = configSchema.safeParse(defaults);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fal.audio.sound_effects).toBe('beatoven/sound-effect-generation');
      expect(result.data.fal.audio.music_generation).toBe('beatoven/music-generation');
    }
  });

  it('should validate config with analysis models', () => {
    const result = configSchema.safeParse(defaults);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fal.analysis?.image).toBe('fal-ai/got-ocr/v2');
      expect(result.data.fal.analysis?.video).toBe('fal-ai/video-understanding');
    }
  });

  it('should accept config without optional audio and analysis fields', () => {
    const minimal = {
      ...defaults,
      fal: {
        image: defaults.fal.image,
        video: defaults.fal.video,
        audio: {
          tts: defaults.fal.audio.tts,
          transcription: defaults.fal.audio.transcription,
        },
      },
    };
    const result = configSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});
