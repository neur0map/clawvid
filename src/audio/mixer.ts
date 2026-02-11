import { writeFile } from 'node:fs/promises';
import { getFFmpegCommand, runFFmpeg } from '../post/ffmpeg.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('audio-mixer');

export interface PositionedSoundEffect {
  path: string;
  timestampMs: number;
  volume: number;
}

export interface MixInput {
  narration: string;
  music?: string;
  soundEffects?: PositionedSoundEffect[];
  narrationVolume?: number;
  musicVolume?: number;
  musicFadeIn?: number;
  musicFadeOut?: number;
  totalDuration?: number;
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
  const sfxList = input.soundEffects ?? [];

  log.info('Mixing audio tracks', {
    hasMusic: !!input.music,
    sfxCount: sfxList.length,
  });

  if (!input.music && sfxList.length === 0) {
    const { copy } = await import('fs-extra');
    await copy(input.narration, outputPath);
    return;
  }

  const narrationVol = input.narrationVolume ?? 1.0;
  const musicVol = input.musicVolume ?? 0.25;
  const fadeIn = input.musicFadeIn ?? 0;
  const fadeOut = input.musicFadeOut ?? 0;
  const totalDuration = input.totalDuration;

  // Build FFmpeg complex filter graph:
  //   Input 0: narration
  //   Input 1: music (if present)
  //   Input 2..N: sound effects (each with adelay positioning)
  //   All mixed via amix

  const filterParts: string[] = [];
  const inputLabels: string[] = [];
  let inputCount = 1; // narration is always input 0

  // Narration: volume adjust
  filterParts.push(`[0:a]volume=${narrationVol}[narr]`);
  inputLabels.push('[narr]');

  // Music: volume, loop, fade
  let hasMusic = false;
  if (input.music) {
    hasMusic = true;
    inputCount++;
    let musicFilter = `[1:a]volume=${musicVol},aloop=-1:2e+09`;
    if (fadeIn > 0) {
      musicFilter += `,afade=t=in:st=0:d=${fadeIn}`;
    }
    if (fadeOut > 0 && totalDuration) {
      const fadeStart = totalDuration - fadeOut;
      musicFilter += `,afade=t=out:st=${fadeStart}:d=${fadeOut}`;
    }
    musicFilter += '[music]';
    filterParts.push(musicFilter);
    inputLabels.push('[music]');
  }

  // Sound effects: each gets adelay for precise timestamp positioning
  for (let i = 0; i < sfxList.length; i++) {
    const sfx = sfxList[i];
    const inputIdx = hasMusic ? i + 2 : i + 1;
    inputCount++;
    const delayMs = Math.round(sfx.timestampMs);
    filterParts.push(
      `[${inputIdx}:a]volume=${sfx.volume},adelay=${delayMs}|${delayMs}[sfx${i}]`,
    );
    inputLabels.push(`[sfx${i}]`);
  }

  // Mix all tracks together
  const mixLabel = inputLabels.join('');
  filterParts.push(
    `${mixLabel}amix=inputs=${inputLabels.length}:duration=first:dropout_transition=3[out]`,
  );

  // Build command
  let command = getFFmpegCommand(input.narration);

  if (input.music) {
    command = command.input(input.music);
  }

  for (const sfx of sfxList) {
    command = command.input(sfx.path);
  }

  command = command
    .complexFilter(filterParts)
    .outputOptions(['-map', '[out]'])
    .audioCodec('libmp3lame')
    .audioBitrate('192k')
    .output(outputPath);

  await runFFmpeg(command);
  log.info('Audio mixed', { output: outputPath, tracks: inputLabels.length });
}
