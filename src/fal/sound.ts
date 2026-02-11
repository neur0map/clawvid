import { falRequest, downloadFile } from './client.js';
import type { FalSoundEffectOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-sound');

export interface SoundEffectRequest {
  prompt: string;
  negative_prompt?: string;
  duration: number;
}

export async function generateSoundEffect(
  model: string,
  request: SoundEffectRequest,
  outputPath: string,
): Promise<{ url: string; duration: number }> {
  log.info('Generating sound effect', {
    model,
    prompt: request.prompt.slice(0, 80),
    duration: request.duration,
  });

  const input: Record<string, unknown> = {
    prompt: request.prompt,
    duration: request.duration,
  };

  if (request.negative_prompt) {
    input.negative_prompt = request.negative_prompt;
  }

  const result = await falRequest<FalSoundEffectOutput>(model, input);

  if (!result.audio?.url) {
    throw new Error('No sound effect returned from fal.ai');
  }

  await downloadFile(result.audio.url, outputPath);

  return { url: result.audio.url, duration: result.metadata?.duration ?? request.duration };
}
