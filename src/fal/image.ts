import { falRequest, downloadFile } from './client.js';
import type { ImageGeneration } from '../schemas/scene.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-image');

interface FalImageOutput {
  images: Array<{ url: string; width: number; height: number }>;
  seed?: number;
}

export async function generateImage(
  spec: ImageGeneration,
  outputPath: string,
): Promise<{ url: string; width: number; height: number }> {
  log.info('Generating image', {
    model: spec.model,
    prompt: spec.input.prompt.slice(0, 80),
  });

  const result = await falRequest<FalImageOutput>(spec.model, spec.input);
  const image = result.images[0];

  if (!image?.url) {
    throw new Error('No image returned from fal.ai');
  }

  await downloadFile(image.url, outputPath);

  return { url: image.url, width: image.width, height: image.height };
}
