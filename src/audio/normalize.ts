import { getFFmpegCommand, runFFmpeg } from '../post/ffmpeg.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('audio-normalize');

export interface NormalizeOptions {
  targetLUFS?: number;
  truePeak?: number;
}

export async function normalizeAudio(
  inputPath: string,
  outputPath: string,
  options: NormalizeOptions = {},
): Promise<void> {
  const targetLUFS = options.targetLUFS ?? -14;
  const truePeak = options.truePeak ?? -1;

  log.info('Normalizing audio', { targetLUFS, truePeak });

  // Single-pass loudness normalization using FFmpeg loudnorm filter
  const command = getFFmpegCommand(inputPath)
    .audioFilters(`loudnorm=I=${targetLUFS}:TP=${truePeak}:LRA=11`)
    .output(outputPath);

  await runFFmpeg(command);
}
