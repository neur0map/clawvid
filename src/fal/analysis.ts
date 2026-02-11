import { falRequest } from './client.js';
import type { FalImageAnalysisOutput, FalVideoAnalysisOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-analysis');

export async function analyzeImage(
  model: string,
  imageUrls: string[],
): Promise<FalImageAnalysisOutput> {
  log.info('Analyzing image(s)', { model, count: imageUrls.length });

  const result = await falRequest<FalImageAnalysisOutput>(model, {
    image_url: imageUrls[0],
  });

  return result;
}

export async function analyzeVideo(
  model: string,
  videoUrl: string,
  prompt: string = 'Describe what happens in this video.',
): Promise<FalVideoAnalysisOutput> {
  log.info('Analyzing video', { model, prompt: prompt.slice(0, 80) });

  const result = await falRequest<FalVideoAnalysisOutput>(model, {
    video_url: videoUrl,
    prompt,
  });

  return result;
}
