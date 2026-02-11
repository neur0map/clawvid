// Shared fal.ai types and response interfaces for all models.

export interface FalError {
  status: number;
  message: string;
  detail?: string;
}

export interface FalQueueStatus {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';
  position?: number;
}

// --- Image: fal-ai/kling-image/v3/text-to-image ---
export interface FalKlingImageOutput {
  images: Array<{ url: string; width: number; height: number }>;
  seed?: number;
}

// --- Video: fal-ai/kandinsky5-pro/image-to-video ---
export interface FalKandinskyVideoOutput {
  video: { url: string };
}

// --- TTS: fal-ai/qwen-3-tts/voice-design/1.7b ---
export interface FalQwenTTSOutput {
  audio: { url: string; duration: number };
}

// --- Sound Effects: beatoven/sound-effect-generation ---
export interface FalSoundEffectOutput {
  audio: { url: string };
  metadata: { duration: number };
}

// --- Music: beatoven/music-generation ---
export interface FalMusicOutput {
  audio: { url: string };
  metadata: { duration: number };
}

// --- Image Analysis: fal-ai/got-ocr/v2 ---
export interface FalImageAnalysisOutput {
  text: string;
  labels?: string[];
}

// --- Video Analysis: fal-ai/video-understanding ---
export interface FalVideoAnalysisOutput {
  text: string;
  segments?: Array<{ start: number; end: number; description: string }>;
}
