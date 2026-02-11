import { falRequest } from './client.js';
import type { VideoGenerationInput, VideoGenerationOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-video');

export async function generateVideo(
  modelId: string,
  input: VideoGenerationInput,
): Promise<VideoGenerationOutput> {
  log.info('Generating video', { model: modelId, duration: input.duration });
  return falRequest<VideoGenerationInput, VideoGenerationOutput>(modelId, input);
}
