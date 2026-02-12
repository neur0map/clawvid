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
    .videoBitrate(profile.bitrate)
    .size(`${profile.resolution.width}x${profile.resolution.height}`)
    .outputOptions(['-y', '-pix_fmt', 'yuv420p']);

  // Probe for audio stream — if present, encode it; otherwise skip
  try {
    const { getMediaInfo } = await import('./ffmpeg.js');
    const info = await getMediaInfo(inputPath);
    const hasAudio = info.streams.some((s: { codec_type?: string }) => s.codec_type === 'audio');
    if (hasAudio) {
      command.audioCodec(profile.audioCodec).audioBitrate(profile.audioBitrate);
    } else {
      command.noAudio();
    }
  } catch {
    // If probe fails, try encoding with audio anyway
    command.audioCodec(profile.audioCodec).audioBitrate(profile.audioBitrate);
  }

  command.output(outputPath);
  await runFFmpeg(command);
}
