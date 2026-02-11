export type PlatformId = 'youtube' | 'tiktok' | 'instagram_reels';

export interface PlatformSpec {
  id: PlatformId;
  aspectRatio: string;
  resolution: { width: number; height: number };
  maxDurationSeconds: number;
  codec: string;
  audioCodec: string;
  bitrate: string;
  audioBitrate: string;
}
