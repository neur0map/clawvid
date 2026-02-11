import { getFFmpegCommand, runFFmpeg } from './ffmpeg.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('thumbnail');

export async function extractThumbnail(
  videoPath: string,
  outputPath: string,
  timestampSeconds?: number,
): Promise<void> {
  const timestamp = timestampSeconds ?? 2;
  log.info('Extracting thumbnail', { video: videoPath, timestamp });

  const command = getFFmpegCommand(videoPath)
    .seekInput(timestamp)
    .frames(1)
    .output(outputPath);

  await runFFmpeg(command);
}
