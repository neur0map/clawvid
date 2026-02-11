import type { PlatformSpec } from './types.js';

export const instagramReels: PlatformSpec = {
  id: 'instagram_reels',
  aspectRatio: '9:16',
  resolution: { width: 1080, height: 1920 },
  maxDurationSeconds: 90,
  codec: 'h264',
  audioCodec: 'aac',
  bitrate: '6M',
  audioBitrate: '128k',
};
