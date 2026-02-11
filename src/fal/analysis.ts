import { falRequest } from './client.js';
import type { FalImageAnalysisOutput, FalVideoAnalysisOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-analysis');

export async function analyzeImage(
  model: string,
  imageUrl: string,
): Promise<FalImageAnalysisOutput> {
  if (!imageUrl) {
    throw new Error('imageUrl is required for image analysis');
  }
  log.info('Analyzing image', { model });

  const result = await falRequest<FalImageAnalysisOutput>(model, {
    image_url: imageUrl,
  });

  return result;
}

export async function analyzeVideo(
  model: string,
  videoUrl: string,
  prompt: string = 'Describe what happens in this video.',
): Promise<FalVideoAnalysisOutput> {
  if (!videoUrl) {
    throw new Error('videoUrl is required for video analysis');
  }
  log.info('Analyzing video', { model, prompt: prompt.slice(0, 80) });

  const result = await falRequest<FalVideoAnalysisOutput>(model, {
    video_url: videoUrl,
    prompt,
  });

  return result;
}
