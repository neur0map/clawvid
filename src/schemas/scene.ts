import { z } from 'zod';

export const sceneSchema = z.object({
  index: z.number().int().nonnegative(),
  type: z.enum(['image', 'video', 'image_to_image']),
  prompt: z.string(),
  model: z.string().optional(),
  duration_seconds: z.number().positive(),
  start_time: z.number().nonnegative(),
  effects: z.array(z.string()).optional(),
  transition: z.enum(['fade', 'cut', 'dissolve']).optional(),
  image_url: z.string().url().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export type Scene = z.infer<typeof sceneSchema>;
