import ffmpeg from 'fluent-ffmpeg';
import { createLogger } from '../utils/logger.js';

const log = createLogger('ffmpeg');

export function getFFmpegCommand(inputPath: string): ffmpeg.FfmpegCommand {
  return ffmpeg(inputPath);
}

export async function runFFmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command
      .on('start', (cmd) => log.debug('FFmpeg started', { command: cmd }))
      .on('progress', (progress) => log.debug('FFmpeg progress', progress))
      .on('end', () => {
        log.info('FFmpeg completed');
        resolve();
      })
      .on('error', (err) => {
        log.error('FFmpeg failed', { error: err.message });
        reject(err);
      })
      .run();
  });
}

export async function getMediaInfo(filePath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}
