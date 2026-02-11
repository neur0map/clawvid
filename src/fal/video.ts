import { falRequest, downloadFile } from './client.js';
import type { VideoGeneration } from '../schemas/scene.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-video');

interface FalVideoOutput {
  video: { url: string };
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

  const input = {
    ...spec.input,
    image_url: imageUrl,
  };

  const result = await falRequest<FalVideoOutput>(spec.model, input);

  if (!result.video?.url) {
    throw new Error('No video returned from fal.ai');
  }

  await downloadFile(result.video.url, outputPath);

  return { url: result.video.url };
}
