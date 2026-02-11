import { getFFmpegCommand, runFFmpeg } from '../post/ffmpeg.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('audio-silence');

const THRESHOLD_PATTERN = /^-?\d+(\.\d+)?dB$/;

export interface SilenceTrimOptions {
  threshold?: string;
}

export async function trimSilence(
  inputPath: string,
  outputPath: string,
  options: SilenceTrimOptions = {},
): Promise<void> {
  const threshold = options.threshold ?? '-40dB';

  if (!THRESHOLD_PATTERN.test(threshold)) {
    throw new Error(`Invalid silence threshold format: "${threshold}". Expected pattern like "-40dB".`);
  }

  log.info('Trimming silence', { threshold });

  // Remove leading/trailing silence from TTS output
  const command = getFFmpegCommand(inputPath)
    .audioFilters(
      `silenceremove=start_periods=1:start_duration=0:start_threshold=${threshold},` +
      `areverse,silenceremove=start_periods=1:start_duration=0:start_threshold=${threshold},areverse`
    )
    .output(outputPath);

  await runFFmpeg(command);
}
