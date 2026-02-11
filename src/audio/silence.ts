import { getFFmpegCommand, runFFmpeg } from '../post/ffmpeg.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('audio-silence');

export interface SilenceTrimOptions {
  threshold?: string;
  minDuration?: number;
}

export async function trimSilence(
  inputPath: string,
  outputPath: string,
  options: SilenceTrimOptions = {},
): Promise<void> {
  const threshold = options.threshold ?? '-40dB';
  const minDuration = options.minDuration ?? 0.5;

  log.info('Trimming silence', { threshold, minDuration });

  // Remove leading/trailing silence from TTS output
  const command = getFFmpegCommand(inputPath)
    .audioFilters(
      `silenceremove=start_periods=1:start_duration=0:start_threshold=${threshold},` +
      `areverse,silenceremove=start_periods=1:start_duration=0:start_threshold=${threshold},areverse`
    )
    .output(outputPath);

  await runFFmpeg(command);
}
