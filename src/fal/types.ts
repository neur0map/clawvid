// Re-export schema types as the canonical fal.ai types.
// The actual request/response shapes are defined inline in each module
// (image.ts, video.ts, audio.ts) since fal.ai responses vary by model.
// This file provides shared utility types.

export interface FalError {
  status: number;
  message: string;
  detail?: string;
}

export interface FalQueueStatus {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';
  position?: number;
}
