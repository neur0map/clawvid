import { getMediaInfo } from '../post/ffmpeg.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('validate-audio');

export interface AudioValidationResult {
  valid: boolean;
  duration?: number;
  sampleRate?: number;
  codec?: string;
  errors: string[];
}

export async function validateAudio(
  filePath: string,
  minDuration?: number,
  maxDuration?: number,
): Promise<AudioValidationResult> {
  const errors: string[] = [];

  const info = await getMediaInfo(filePath);
  const audioStream = info.streams.find((s) => s.codec_type === 'audio');

  if (!audioStream) {
    return { valid: false, errors: ['No audio stream found'] };
  }

  const duration = parseFloat(String(info.format.duration ?? 0));
  const sampleRate = audioStream.sample_rate ? parseInt(String(audioStream.sample_rate)) : undefined;
  const codec = audioStream.codec_name;

  if (minDuration && duration < minDuration) {
    errors.push(`Audio too short: ${duration.toFixed(1)}s < ${minDuration}s`);
  }
  if (maxDuration && duration > maxDuration) {
    errors.push(`Audio too long: ${duration.toFixed(1)}s > ${maxDuration}s`);
  }

  const result: AudioValidationResult = {
    valid: errors.length === 0,
    duration,
    sampleRate,
    codec,
    errors,
  };

  if (!result.valid) {
    log.warn('Audio validation failed', { filePath, errors });
  }

  return result;
}
