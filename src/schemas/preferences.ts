import { z } from 'zod';

export const preferencesSchema = z.object({
  platforms: z.array(z.string()),
  template: z.string(),
  quality_mode: z.enum(['max_quality', 'balanced', 'budget']),
  voice: z.object({
    style: z.string(),
    pacing: z.number().positive(),
  }),
  visual_style: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Preferences = z.infer<typeof preferencesSchema>;
