import { falRequest } from './client.js';
import type { ImageGenerationInput, ImageGenerationOutput, ImageToImageInput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-image');

export async function generateImage(
  modelId: string,
  input: ImageGenerationInput,
): Promise<ImageGenerationOutput> {
  log.info('Generating image', { model: modelId, prompt: input.prompt.slice(0, 80) });
  return falRequest<ImageGenerationInput, ImageGenerationOutput>(modelId, input);
}

export async function imageToImage(
  modelId: string,
  input: ImageToImageInput,
): Promise<ImageGenerationOutput> {
  log.info('Image-to-image transform', { model: modelId });
  return falRequest<ImageToImageInput, ImageGenerationOutput>(modelId, input);
}
