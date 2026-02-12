import { z } from 'zod';
import { sceneSchema } from './scene.js';

export const ttsConfigSchema = z.object({
  model: z.string(),
  voice_reference: z.string().optional(),
  voice_prompt: z.string().optional(),
  language: z.string().optional(),
  speed: z.number().optional(),
  temperature: z.number().optional(),
  top_k: z.number().int().optional(),
  top_p: z.number().optional(),
});

export const musicConfigSchema = z.object({
  file: z.string().optional(),
  url: z.string().optional(),
  volume: z.number().min(0).max(1).optional(),
  fade_in: z.number().nonnegative().optional(),
  fade_out: z.number().nonnegative().optional(),
  generate: z.boolean().optional(),
  prompt: z.string().optional(),
  duration: z.number().min(5).max(150).optional(),
});

export const audioConfigSchema = z.object({
  tts: ttsConfigSchema,
  music: musicConfigSchema.optional(),
});

export const analysisConfigSchema = z.object({
  verify_images: z.boolean().optional(),
  verify_videos: z.boolean().optional(),
});

export const consistencyConfigSchema = z.object({
  workflow_id: z.string(),
  reference_prompt: z.string(),
  seed: z.number().int().optional(),
});

export const subtitleStyleSchema = z.object({
  font: z.string().optional(),
  color: z.string().optional(),
  stroke_color: z.string().optional(),
  stroke_width: z.number().optional(),
  position: z.enum(['top', 'center', 'bottom']).optional(),
  animation: z.string().optional(),
  font_size: z.number().optional(),
});

export const subtitlesConfigSchema = z.object({
  enabled: z.boolean(),
  style: subtitleStyleSchema.optional(),
});

export const outputConfigSchema = z.object({
  filename: z.string().optional(),
  resolution: z.string().optional(),
  fps: z.number().int().positive().optional(),
  format: z.string().optional(),
  platforms: z.array(z.string()).optional(),
});

export const workflowSchema = z.object({
  name: z.string(),
  template: z.string(),
  duration_target_seconds: z.number().positive(),
  scenes: z.array(sceneSchema).min(1),
  audio: audioConfigSchema,
  subtitles: subtitlesConfigSchema.optional(),
  output: outputConfigSchema.optional(),
  analysis: analysisConfigSchema.optional(),
  consistency: consistencyConfigSchema.optional(),
});

export type Workflow = z.infer<typeof workflowSchema>;
export type TTSConfig = z.infer<typeof ttsConfigSchema>;
export type MusicConfig = z.infer<typeof musicConfigSchema>;
export type AudioConfig = z.infer<typeof audioConfigSchema>;
export type AnalysisConfig = z.infer<typeof analysisConfigSchema>;
export type ConsistencyConfig = z.infer<typeof consistencyConfigSchema>;
export type SubtitlesConfig = z.infer<typeof subtitlesConfigSchema>;
export type OutputConfig = z.infer<typeof outputConfigSchema>;
