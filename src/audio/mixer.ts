import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getFFmpegCommand, runFFmpeg } from '../post/ffmpeg.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('audio-mixer');

export interface MixInput {
  narration: string;
  music?: string;
  sfx?: string[];
  narrationVolume?: number;
  musicVolume?: number;
  sfxVolume?: number;
}

export async function concatenateNarration(
  audioPaths: string[],
  outputPath: string,
): Promise<void> {
  if (audioPaths.length === 0) return;

  if (audioPaths.length === 1) {
    const { copy } = await import('fs-extra');
    await copy(audioPaths[0], outputPath);
    return;
  }

  log.info('Concatenating narration', { segments: audioPaths.length });

  // Create a concat file list for FFmpeg
  const listPath = outputPath.replace('.mp3', '-concat-list.txt');
  const listContent = audioPaths.map((p) => `file '${p}'`).join('\n');
  await writeFile(listPath, listContent, 'utf-8');

  const command = getFFmpegCommand(listPath)
    .inputOptions(['-f', 'concat', '-safe', '0'])
    .audioCodec('libmp3lame')
    .audioBitrate('192k')
    .output(outputPath);

  await runFFmpeg(command);
  log.info('Narration concatenated', { output: outputPath });
}

export async function mixAudio(input: MixInput, outputPath: string): Promise<void> {
  log.info('Mixing audio tracks', {
    hasMusic: !!input.music,
    sfxCount: input.sfx?.length ?? 0,
  });

  if (!input.music) {
    // No music — just copy narration
    const { copy } = await import('fs-extra');
    await copy(input.narration, outputPath);
    return;
  }

  const narrationVol = input.narrationVolume ?? 1.0;
  const musicVol = input.musicVolume ?? 0.25;

  // Mix narration with background music using FFmpeg amix filter
  const command = getFFmpegCommand(input.narration)
    .input(input.music)
    .complexFilter([
      `[0:a]volume=${narrationVol}[narr]`,
      `[1:a]volume=${musicVol},aloop=-1:2e+09[music]`,
      `[narr][music]amix=inputs=2:duration=first:dropout_transition=3[out]`,
    ])
    .outputOptions(['-map', '[out]'])
    .audioCodec('libmp3lame')
    .audioBitrate('192k')
    .output(outputPath);

  await runFFmpeg(command);
  log.info('Audio mixed', { output: outputPath });
}
