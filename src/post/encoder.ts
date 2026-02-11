import { getFFmpegCommand, runFFmpeg } from './ffmpeg.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('encoder');

export interface EncodingProfile {
  codec: string;
  audioCodec: string;
  bitrate: string;
  audioBitrate: string;
  resolution: { width: number; height: number };
}

export async function encode(
  inputPath: string,
  outputPath: string,
  profile: EncodingProfile,
): Promise<void> {
  log.info('Encoding video', {
    input: inputPath,
    output: outputPath,
    codec: profile.codec,
    bitrate: profile.bitrate,
  });

  const command = getFFmpegCommand(inputPath)
    .videoCodec(profile.codec === 'h264' ? 'libx264' : profile.codec)
    .audioCodec(profile.audioCodec)
    .videoBitrate(profile.bitrate)
    .audioBitrate(profile.audioBitrate)
    .size(`${profile.resolution.width}x${profile.resolution.height}`)
    .output(outputPath);

  await runFFmpeg(command);
}
