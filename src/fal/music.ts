import { falRequest, downloadFile } from './client.js';
import type { FalMusicOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-music');

export interface MusicRequest {
  prompt: string;
  duration: number;
}

export async function generateMusic(
  model: string,
  request: MusicRequest,
  outputPath: string,
): Promise<{ url: string; duration: number }> {
  log.info('Generating music', {
    model,
    prompt: request.prompt.slice(0, 80),
    duration: request.duration,
  });

  const input: Record<string, unknown> = {
    prompt: request.prompt,
    duration: request.duration,
  };

  const result = await falRequest<FalMusicOutput>(model, input);

  if (!result.audio?.url) {
    throw new Error('No music returned from fal.ai');
  }

  await downloadFile(result.audio.url, outputPath);

  return { url: result.audio.url, duration: result.metadata?.duration ?? request.duration };
}
