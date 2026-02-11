import { falRequest, downloadFile } from './client.js';
import type { ImageGeneration } from '../schemas/scene.js';
import type { FalKlingImageOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-image');

export async function generateImage(
  spec: ImageGeneration,
  outputPath: string,
): Promise<{ url: string; width: number; height: number }> {
  log.info('Generating image', {
    model: spec.model,
    prompt: spec.input.prompt.slice(0, 80),
  });

  const input: Record<string, unknown> = {
    prompt: spec.input.prompt,
  };

  if (spec.input.negative_prompt) {
    input.negative_prompt = spec.input.negative_prompt;
  }
  if (spec.input.aspect_ratio) {
    input.aspect_ratio = spec.input.aspect_ratio;
  }
  if (spec.input.resolution) {
    input.resolution = spec.input.resolution;
  }
  if (spec.input.num_images) {
    input.num_images = spec.input.num_images;
  }
  if (spec.input.output_format) {
    input.output_format = spec.input.output_format;
  }
  if (spec.input.seed !== undefined) {
    input.seed = spec.input.seed;
  }

  const result = await falRequest<FalKlingImageOutput>(spec.model, input);
  const image = result.images[0];

  if (!image?.url) {
    throw new Error('No image returned from fal.ai');
  }

  await downloadFile(image.url, outputPath);

  return { url: image.url, width: image.width, height: image.height };
}
