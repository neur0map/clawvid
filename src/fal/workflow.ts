import { falRequest, downloadFile } from './client.js';
import type { FalKlingImageOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-workflow');

const DEFAULT_MODEL = 'fal-ai/nano-banana-pro';
const DEFAULT_EDIT_MODEL = 'fal-ai/nano-banana-pro/edit';

export interface ConsistencyOptions {
  referencePrompt: string;
  seed?: number;
  aspectRatio?: string;
  model?: string;
  editModel?: string;
}

/**
 * Generates a reference image using nano-banana-pro (or custom model).
 * This reference is then passed to all scene edits for visual consistency.
 */
export async function generateReferenceImage(
  options: ConsistencyOptions,
  outputPath: string,
): Promise<{ url: string; width: number; height: number }> {
  const model = options.model ?? DEFAULT_MODEL;

  log.info('Generating reference image', {
    model,
    prompt: options.referencePrompt.slice(0, 80),
    seed: options.seed,
  });

  const input: Record<string, unknown> = {
    prompt: options.referencePrompt,
  };

  if (options.seed !== undefined) {
    input.seed = options.seed;
  }
  if (options.aspectRatio) {
    input.aspect_ratio = options.aspectRatio;
  }

  const result = await falRequest<FalKlingImageOutput>(model, input);
  const image = result.images[0];

  if (!image?.url) {
    throw new Error('No reference image returned from fal.ai');
  }

  await downloadFile(image.url, outputPath);

  const width = image.width ?? 0;
  const height = image.height ?? 0;

  log.info('Reference image generated', {
    url: image.url.slice(0, 80),
    width,
    height,
  });

  return { url: image.url, width, height };
}

/**
 * Generates a scene image by editing the reference image with a scene-specific prompt.
 * Uses the same seed and reference URL to maintain visual consistency across scenes.
 */
export async function generateSceneFromReference(
  referenceImageUrl: string,
  scenePrompt: string,
  options: ConsistencyOptions,
  outputPath: string,
): Promise<{ url: string; width: number; height: number }> {
  const editModel = options.editModel ?? DEFAULT_EDIT_MODEL;

  log.info('Generating scene from reference', {
    model: editModel,
    prompt: scenePrompt.slice(0, 80),
    seed: options.seed,
  });

  const input: Record<string, unknown> = {
    prompt: scenePrompt,
    image_urls: [referenceImageUrl],
  };

  if (options.seed !== undefined) {
    input.seed = options.seed;
  }
  if (options.aspectRatio) {
    input.aspect_ratio = options.aspectRatio;
  }

  const result = await falRequest<FalKlingImageOutput>(editModel, input);
  const image = result.images[0];

  if (!image?.url) {
    throw new Error('No scene image returned from fal.ai');
  }

  await downloadFile(image.url, outputPath);

  const width = image.width ?? 0;
  const height = image.height ?? 0;

  log.info('Scene image generated from reference', {
    url: image.url.slice(0, 80),
    width,
    height,
  });

  return { url: image.url, width, height };
}
