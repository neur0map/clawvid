import { falRequest, downloadFile } from './client.js';
import type { VideoGeneration } from '../schemas/scene.js';
import type { FalKandinskyVideoOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-video');

function isKlingModel(model: string): boolean {
  return model.includes('kling-video');
}

function isViduModel(model: string): boolean {
  return model.includes('vidu');
}

function isPixVerseModel(model: string): boolean {
  return model.includes('pixverse');
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

  if (isKlingModel(spec.model)) {
    // Kling uses start_image_url and duration as "5"/"10"
    input.start_image_url = imageUrl;
    const rawDuration = spec.input.duration ?? '5';
    input.duration = rawDuration.replace('s', '');
    input.generate_audio = false;

    if (spec.input.cfg_scale !== undefined) {
      input.cfg_scale = spec.input.cfg_scale;
    }
  } else if (isViduModel(spec.model)) {
    // Vidu Q3 uses image_url, duration as integer seconds
    input.image_url = imageUrl;
    const rawDuration = spec.input.duration ?? '5';
    input.duration = parseInt(rawDuration.replace('s', ''), 10);
    // Native audio generation (default true for Vidu)
    input.audio = spec.input.audio ?? false;

    if (spec.input.seed !== undefined) {
      input.seed = spec.input.seed;
    }
  } else if (isPixVerseModel(spec.model)) {
    // PixVerse uses first_image_url, duration as string "5"/"8"/"10"
    input.first_image_url = imageUrl;
    const rawDuration = spec.input.duration ?? '5';
    input.duration = rawDuration.replace('s', '');

    if (spec.input.style) {
      input.style = spec.input.style;
    }
    if (spec.input.seed !== undefined) {
      input.seed = spec.input.seed;
    }
    if (spec.input.aspect_ratio) {
      input.aspect_ratio = spec.input.aspect_ratio;
    }
  } else {
    // Kandinsky / other models
    input.image_url = imageUrl;
    input.duration = spec.input.duration ?? '5s';
  }

  // Common optional fields
  if (spec.input.resolution) {
    input.resolution = spec.input.resolution;
  }
  if (spec.input.num_inference_steps !== undefined) {
    input.num_inference_steps = spec.input.num_inference_steps;
  }
  if (spec.input.acceleration !== undefined) {
    input.acceleration = spec.input.acceleration;
  }
  if (spec.input.negative_prompt && !isViduModel(spec.model)) {
    input.negative_prompt = spec.input.negative_prompt;
  }

  const result = await falRequest<FalKandinskyVideoOutput>(spec.model, input);

  if (!result.video?.url) {
    throw new Error('No video returned from fal.ai');
  }

  await downloadFile(result.video.url, outputPath);

  return { url: result.video.url };
}

/**
 * Generate a transition video between two images using PixVerse or Vidu Q3.
 * Both models support end_image_url for frame-to-frame interpolation.
 */
export async function generateTransition(
  model: string,
  startImageUrl: string,
  endImageUrl: string,
  prompt: string,
  outputPath: string,
  options?: {
    duration?: string;
    style?: string;
    resolution?: string;
    seed?: number;
  },
): Promise<{ url: string }> {
  log.info('Generating transition', { model, prompt: prompt.slice(0, 60) });

  const input: Record<string, unknown> = {
    prompt,
  };

  if (isPixVerseModel(model)) {
    input.first_image_url = startImageUrl;
    input.end_image_url = endImageUrl;
    input.duration = options?.duration?.replace('s', '') ?? '5';
    if (options?.style) input.style = options.style;
    if (options?.seed !== undefined) input.seed = options.seed;
  } else if (isViduModel(model)) {
    input.image_url = startImageUrl;
    input.end_image_url = endImageUrl;
    const rawDuration = options?.duration ?? '5';
    input.duration = parseInt(rawDuration.replace('s', ''), 10);
    input.audio = false;
    if (options?.seed !== undefined) input.seed = options.seed;
  } else {
    input.first_image_url = startImageUrl;
    input.end_image_url = endImageUrl;
    input.duration = options?.duration ?? '5';
  }

  if (options?.resolution) {
    input.resolution = options.resolution;
  }

  const result = await falRequest<FalKandinskyVideoOutput>(model, input);

  if (!result.video?.url) {
    throw new Error('No transition video returned from fal.ai');
  }

  await downloadFile(result.video.url, outputPath);

  return { url: result.video.url };
}
