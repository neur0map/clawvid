import { z } from 'zod';

export const imageGenerationSchema = z.object({
  model: z.string(),
  input: z.object({
    prompt: z.string(),
    negative_prompt: z.string().optional(),
    aspect_ratio: z.string().optional(),
    resolution: z.string().optional(),
    num_images: z.number().int().positive().optional(),
    output_format: z.enum(['png', 'jpeg']).optional(),
    seed: z.number().int().optional(),
  }),
});

export const videoGenerationSchema = z.object({
  model: z.string(),
  input: z.object({
    prompt: z.string(),
    negative_prompt: z.string().optional(),
    duration: z.string().optional(),
    resolution: z.string().optional(),
    num_inference_steps: z.number().int().positive().optional(),
    acceleration: z.boolean().optional(),
    cfg_scale: z.number().min(0).max(1).optional(),
    // Vidu Q3 / PixVerse specific
    audio: z.boolean().optional(),
    seed: z.number().int().optional(),
    style: z.enum(['anime', '3d_animation', 'clay', 'comic', 'cyberpunk']).optional(),
    aspect_ratio: z.string().optional(),
    // Vidu movement control
    movement_amplitude: z.enum(['auto', 'small', 'medium', 'large']).optional(),
  }),
});

/**
 * Talking head video generation (VEED Fabric 1.0)
 * Creates lip-synced video from a face image and speech text.
 */
export const talkingHeadGenerationSchema = z.object({
  model: z.string().default('veed/fabric-1.0/text'),
  input: z.object({
    /** The speech text to lip-sync */
    text: z.string(),
    /** Resolution: 720p or 480p */
    resolution: z.enum(['720p', '480p']).optional().default('720p'),
    /** Optional voice description (e.g., "British accent", "Confident male voice") */
    voice_description: z.string().optional(),
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
  start: z.number().nonnegative().optional(),
  duration: z.number().positive().optional(),
});

export const soundEffectSchema = z.object({
  prompt: z.string(),
  negative_prompt: z.string().optional(),
  timing_offset: z.number().nonnegative(),
  duration: z.number().min(1).max(35),
  volume: z.number().min(0).max(1).optional(),
});

export const transitionSchema = z.object({
  model: z.string(),
  duration: z.string().optional(),
  prompt: z.string().optional(),
  style: z.enum(['anime', '3d_animation', 'clay', 'comic', 'cyberpunk']).optional(),
});

/**
 * Static image configuration for displaying existing images
 * (e.g., reference photos, maps, documents) without AI generation.
 * These are SHOWN in the video but NOT used for image-to-video.
 */
export const staticImageSchema = z.object({
  /** URL or local path to the static image */
  url: z.string(),
  /** Alt text for accessibility */
  alt: z.string().optional(),
  /** How to fit the image: contain (letterbox), cover (crop), or fill (stretch) */
  fit: z.enum(['contain', 'cover', 'fill']).optional().default('contain'),
  /** Background color for letterboxing (default: black) */
  background: z.string().optional(),
});

export const sceneSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  type: z.enum(['image', 'video', 'static', 'talking_head']),
  timing: timingSchema,
  narration: z.string().nullable().optional(),
  /** AI-generated image config (required for type: image/video, optional for static) */
  image_generation: imageGenerationSchema.optional(),
  /** Static image to display as-is (for type: static, or as overlay) */
  static_image: staticImageSchema.nullable().optional(),
  video_generation: videoGenerationSchema.nullable().optional(),
  /** Talking head video config (for type: talking_head) - uses VEED Fabric */
  talking_head: talkingHeadGenerationSchema.nullable().optional(),
  transition: transitionSchema.nullable().optional(),
  text_overlay: textOverlaySchema.optional(),
  effects: z.array(z.string()).optional(),
  sound_effects: z.array(soundEffectSchema).optional(),
  /** Skip Vision QA for this scene (default: false) */
  skip_qa: z.boolean().optional(),
});

export type Scene = z.infer<typeof sceneSchema>;
export type ImageGeneration = z.infer<typeof imageGenerationSchema>;
export type VideoGeneration = z.infer<typeof videoGenerationSchema>;
export type TalkingHeadGeneration = z.infer<typeof talkingHeadGenerationSchema>;
export type Transition = z.infer<typeof transitionSchema>;
export type TextOverlay = z.infer<typeof textOverlaySchema>;
export type Timing = z.infer<typeof timingSchema>;
export type SoundEffect = z.infer<typeof soundEffectSchema>;
export type StaticImage = z.infer<typeof staticImageSchema>;
