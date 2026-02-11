import type { PlatformSpec } from './types.js';

export const tiktok: PlatformSpec = {
  id: 'tiktok',
  aspectRatio: '9:16',
  resolution: { width: 1080, height: 1920 },
  maxDurationSeconds: 60,
  codec: 'h264',
  audioCodec: 'aac',
  bitrate: '6M',
  audioBitrate: '128k',
};
