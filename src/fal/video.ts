import { falRequest, downloadFile } from './client.js';
import type { VideoGeneration, TalkingHeadGeneration } from '../schemas/scene.js';
import type { FalKandinskyVideoOutput, FalFabricVideoOutput } from './types.js';
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

function isFabricModel(model: string): boolean {
  return model.includes('fabric');
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
    // Vidu uses image_url, duration as integer seconds
    input.image_url = imageUrl;
    const rawDuration = spec.input.duration ?? '5';
    input.duration = parseInt(rawDuration.replace('s', ''), 10);
    // Native audio generation (default false to use our own audio)
    input.audio = spec.input.audio ?? false;

    if (spec.input.seed !== undefined) {
      input.seed = spec.input.seed;
    }
    // Q3 models support resolution
    if (spec.input.resolution && spec.model.includes('q3')) {
      input.resolution = spec.input.resolution;
    }
    // Q2/Q3 text-to-video support aspect_ratio
    if (spec.input.aspect_ratio && !spec.model.includes('image-to-video')) {
      input.resolution = spec.input.aspect_ratio;
    }
    // Movement amplitude for all Vidu models
    if (spec.input.movement_amplitude) {
      input.movement_amplitude = spec.input.movement_amplitude;
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

/**
 * Generate a talking head video using VEED Fabric 1.0.
 * Creates lip-synced video from a face image and speech text.
 * 
 * @param spec - Talking head configuration
 * @param imageUrl - URL of the face/character image
 * @param outputPath - Where to save the video
 * @returns Video URL and audio flag (Fabric generates audio)
 */
export async function generateTalkingHead(
  spec: TalkingHeadGeneration,
  imageUrl: string,
  outputPath: string,
): Promise<{ url: string; hasAudio: boolean }> {
  log.info('Generating talking head video', {
    model: spec.model,
    textLength: spec.input.text.length,
    resolution: spec.input.resolution,
  });

  const input: Record<string, unknown> = {
    image_url: imageUrl,
    text: spec.input.text,
    resolution: spec.input.resolution ?? '720p',
  };

  // Optional voice description for styling
  if (spec.input.voice_description) {
    input.voice_description = spec.input.voice_description;
  }

  const result = await falRequest<FalFabricVideoOutput>(spec.model, input);

  if (!result.video?.url) {
    throw new Error('No talking head video returned from VEED Fabric');
  }

  await downloadFile(result.video.url, outputPath);

  log.info('Talking head video generated', {
    url: result.video.url.slice(0, 60),
    contentType: result.video.content_type,
  });

  // Fabric generates audio embedded in video
  return { url: result.video.url, hasAudio: true };
}
