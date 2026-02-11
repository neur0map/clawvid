import { z } from 'zod';

export const imageGenerationSchema = z.object({
  model: z.string(),
  input: z.object({
    prompt: z.string(),
    negative_prompt: z.string().optional(),
    image_size: z.string().optional(),
    guidance_scale: z.number().optional(),
    num_inference_steps: z.number().int().optional(),
    seed: z.number().int().optional(),
  }),
});

export const videoGenerationSchema = z.object({
  model: z.string(),
  input: z.object({
    prompt: z.string(),
    duration: z.string().optional(),
    aspect_ratio: z.string().optional(),
  }),
});

export const textOverlaySchema = z.object({
  text: z.string(),
  style: z.string().optional(),
  position: z.enum(['top', 'center', 'bottom']).optional(),
  font_size: z.number().optional(),
  color: z.string().optional(),
});

export const timingSchema = z.object({
  start: z.number().nonnegative(),
  duration: z.number().positive(),
});

export const sceneSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  type: z.enum(['image', 'video']),
  timing: timingSchema,
  narration: z.string().nullable().optional(),
  image_generation: imageGenerationSchema,
  video_generation: videoGenerationSchema.nullable().optional(),
  text_overlay: textOverlaySchema.optional(),
  effects: z.array(z.string()).optional(),
});

export type Scene = z.infer<typeof sceneSchema>;
export type ImageGeneration = z.infer<typeof imageGenerationSchema>;
export type VideoGeneration = z.infer<typeof videoGenerationSchema>;
export type TextOverlay = z.infer<typeof textOverlaySchema>;
export type Timing = z.infer<typeof timingSchema>;
