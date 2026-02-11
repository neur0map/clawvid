import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/fal/client.js', () => ({
  falRequest: vi.fn(),
  downloadFile: vi.fn().mockResolvedValue(undefined),
}));

import { generateVideo } from '../../src/fal/video.js';
import { falRequest, downloadFile } from '../../src/fal/client.js';
import type { FalKandinskyVideoOutput } from '../../src/fal/types.js';

describe('fal.ai: video', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call correct endpoint for image-to-video', async () => {
    const mockResponse: FalKandinskyVideoOutput = {
      video: { url: 'https://fal.ai/generated-video.mp4' },
    };
    vi.mocked(falRequest).mockResolvedValue(mockResponse);

    const spec = {
      model: 'fal-ai/kandinsky5-pro/image-to-video',
      input: {
        prompt: 'Camera slowly pushes forward through fog',
        duration: '5s',
      },
    };

    const result = await generateVideo(spec, 'https://fal.ai/source-image.png', '/tmp/video.mp4');

    expect(falRequest).toHaveBeenCalledWith(
      'fal-ai/kandinsky5-pro/image-to-video',
      expect.objectContaining({
        prompt: 'Camera slowly pushes forward through fog',
        image_url: 'https://fal.ai/source-image.png',
        duration: '5s',
      }),
    );
    expect(result.url).toBe('https://fal.ai/generated-video.mp4');
    expect(downloadFile).toHaveBeenCalledWith('https://fal.ai/generated-video.mp4', '/tmp/video.mp4');
  });

  it('should pass duration and aspect ratio', async () => {
    const mockResponse: FalKandinskyVideoOutput = {
      video: { url: 'https://fal.ai/video.mp4' },
    };
    vi.mocked(falRequest).mockResolvedValue(mockResponse);

    const spec = {
      model: 'fal-ai/kandinsky5-pro/image-to-video',
      input: {
        prompt: 'Slow zoom out revealing landscape',
        duration: '10s',
        resolution: '1080x1920',
        num_inference_steps: 50,
        acceleration: true,
      },
    };

    await generateVideo(spec, 'https://fal.ai/image.png', '/tmp/output.mp4');

    expect(falRequest).toHaveBeenCalledWith(
      'fal-ai/kandinsky5-pro/image-to-video',
      {
        prompt: 'Slow zoom out revealing landscape',
        image_url: 'https://fal.ai/image.png',
        duration: '10s',
        resolution: '1080x1920',
        num_inference_steps: 50,
        acceleration: true,
      },
    );
  });
});
