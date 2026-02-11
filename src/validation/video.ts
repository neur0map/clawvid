import { getMediaInfo } from '../post/ffmpeg.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('validate-video');

export interface VideoValidationResult {
  valid: boolean;
  width?: number;
  height?: number;
  duration?: number;
  codec?: string;
  errors: string[];
}

export async function validateVideo(
  filePath: string,
  expectedDuration?: number,
  toleranceSeconds: number = 1,
): Promise<VideoValidationResult> {
  const errors: string[] = [];

  const info = await getMediaInfo(filePath);
  const videoStream = info.streams.find((s) => s.codec_type === 'video');

  if (!videoStream) {
    return { valid: false, errors: ['No video stream found'] };
  }

  const duration = parseFloat(String(info.format.duration ?? 0));
  const width = videoStream.width;
  const height = videoStream.height;
  const codec = videoStream.codec_name;

  if (expectedDuration && Math.abs(duration - expectedDuration) > toleranceSeconds) {
    errors.push(`Expected duration ~${expectedDuration}s, got ${duration.toFixed(1)}s`);
  }

  const result: VideoValidationResult = {
    valid: errors.length === 0,
    width,
    height,
    duration,
    codec,
    errors,
  };

  if (!result.valid) {
    log.warn('Video validation failed', { filePath, errors });
  }

  return result;
}
