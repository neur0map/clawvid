import { falRequest, downloadFile } from './client.js';
import type { VideoGeneration } from '../schemas/scene.js';
import type { FalKandinskyVideoOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-video');

function isKlingModel(model: string): boolean {
  return model.includes('kling-video');
}

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
  };

  // Kling uses start_image_url and duration as "5"/"10"
  // Kandinsky uses image_url and duration as "5s"
  if (isKlingModel(spec.model)) {
    input.start_image_url = imageUrl;
    const rawDuration = spec.input.duration ?? '5';
    input.duration = rawDuration.replace('s', '');
    input.generate_audio = false;
  } else {
    input.image_url = imageUrl;
    input.duration = spec.input.duration ?? '5s';
  }

  if (spec.input.resolution) {
    input.resolution = spec.input.resolution;
  }
  if (spec.input.num_inference_steps !== undefined) {
    input.num_inference_steps = spec.input.num_inference_steps;
  }
  if (spec.input.acceleration !== undefined) {
    input.acceleration = spec.input.acceleration;
  }
  if (spec.input.negative_prompt) {
    input.negative_prompt = spec.input.negative_prompt;
  }

  const result = await falRequest<FalKandinskyVideoOutput>(spec.model, input);

  if (!result.video?.url) {
    throw new Error('No video returned from fal.ai');
  }

  await downloadFile(result.video.url, outputPath);

  return { url: result.video.url };
}
