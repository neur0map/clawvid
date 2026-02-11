import type { PlatformSpec } from './types.js';

export const youtube: PlatformSpec = {
  id: 'youtube',
  aspectRatio: '16:9',
  resolution: { width: 1920, height: 1080 },
  maxDurationSeconds: 60,
  codec: 'h264',
  audioCodec: 'aac',
  bitrate: '8M',
  audioBitrate: '192k',
};
