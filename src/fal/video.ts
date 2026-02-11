import { falRequest, downloadFile } from './client.js';
import type { VideoGeneration } from '../schemas/scene.js';
import type { FalKandinskyVideoOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-video');

export async function generateVideo(
  spec: VideoGeneration,
  imageUrl: string,
  outputPath: string,
): Promise<{ url: string }> {
  log.info('Generating video', {
    model: spec.model,
    duration: spec.input.duration,
  });

  const input: Record<string, unknown> = {
    prompt: spec.input.prompt,
    image_url: imageUrl,
    duration: spec.input.duration ?? '5s',
  };

  if (spec.input.resolution) {
    input.resolution = spec.input.resolution;
  }
  if (spec.input.num_inference_steps !== undefined) {
    input.num_inference_steps = spec.input.num_inference_steps;
  }
  if (spec.input.acceleration !== undefined) {
    input.acceleration = spec.input.acceleration;
  }

  const result = await falRequest<FalKandinskyVideoOutput>(spec.model, input);

  if (!result.video?.url) {
    throw new Error('No video returned from fal.ai');
  }

  await downloadFile(result.video.url, outputPath);

  return { url: result.video.url };
}
