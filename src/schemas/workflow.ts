import { z } from 'zod';
import { sceneSchema } from './scene.js';

export const workflowSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  template: z.string(),
  duration_seconds: z.number().positive(),
  scenes: z.array(sceneSchema),
  audio: z.object({
    narration_script: z.string(),
    voice_model: z.string().optional(),
    voice_pacing: z.number().optional(),
    background_music: z.string().optional(),
  }),
  output: z.object({
    platforms: z.array(z.string()).optional(),
    subtitle_style: z.object({
      font: z.string().optional(),
      size: z.number().optional(),
      color: z.string().optional(),
      stroke_color: z.string().optional(),
      stroke_width: z.number().optional(),
    }).optional(),
  }).optional(),
});

export type Workflow = z.infer<typeof workflowSchema>;
