export interface ImageGenerationInput {
  prompt: string;
  image_size?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  seed?: number;
}

export interface ImageGenerationOutput {
  images: Array<{ url: string; width: number; height: number }>;
  seed: number;
}

export interface ImageToImageInput {
  prompt: string;
  image_url: string;
  strength?: number;
  image_size?: string;
  num_inference_steps?: number;
}

export interface VideoGenerationInput {
  prompt: string;
  image_url?: string;
  duration?: string;
  aspect_ratio?: string;
}

export interface VideoGenerationOutput {
  video: { url: string };
}

export interface TTSInput {
  gen_text: string;
  ref_audio_url?: string;
  ref_text?: string;
  model_type?: string;
}

export interface TTSOutput {
  audio_url: { url: string };
}

export interface TranscriptionInput {
  audio_url: string;
  task?: 'transcribe' | 'translate';
  language?: string;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionOutput {
  text: string;
  segments: TranscriptionSegment[];
}
