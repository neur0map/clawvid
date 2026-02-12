import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/fal/client.js', () => ({
  falRequest: vi.fn(),
  downloadFile: vi.fn().mockResolvedValue(undefined),
}));

import { generateVideo, generateTransition } from '../../src/fal/video.js';
import { falRequest, downloadFile } from '../../src/fal/client.js';
import type { FalKandinskyVideoOutput } from '../../src/fal/types.js';

describe('fal.ai: video', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call correct endpoint for image-to-video (Kandinsky)', async () => {
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

  it('should pass duration and aspect ratio (Kandinsky)', async () => {
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

  it('should use Kling-specific parameters', async () => {
    vi.mocked(falRequest).mockResolvedValue({
      video: { url: 'https://fal.ai/kling-video.mp4' },
    });

    const spec = {
      model: 'fal-ai/kling-video/v2.6/pro/image-to-video',
      input: {
        prompt: 'Shadow creature lurches forward',
        duration: '5',
        cfg_scale: 0.5,
      },
    };

    await generateVideo(spec, 'https://fal.ai/image.png', '/tmp/kling.mp4');

    expect(falRequest).toHaveBeenCalledWith(
      'fal-ai/kling-video/v2.6/pro/image-to-video',
      expect.objectContaining({
        prompt: 'Shadow creature lurches forward',
        start_image_url: 'https://fal.ai/image.png',
        duration: '5',
        generate_audio: false,
        cfg_scale: 0.5,
      }),
    );
  });

  it('should use Vidu Q3-specific parameters', async () => {
    vi.mocked(falRequest).mockResolvedValue({
      video: { url: 'https://fal.ai/vidu-video.mp4' },
    });

    const spec = {
      model: 'fal-ai/vidu/q3/image-to-video',
      input: {
        prompt: 'Dark figure moves through corridor',
        duration: '8',
        resolution: '720p',
        seed: 42,
      },
    };

    await generateVideo(spec, 'https://fal.ai/image.png', '/tmp/vidu.mp4');

    expect(falRequest).toHaveBeenCalledWith(
      'fal-ai/vidu/q3/image-to-video',
      expect.objectContaining({
        prompt: 'Dark figure moves through corridor',
        image_url: 'https://fal.ai/image.png',
        duration: 8,
        audio: false,
        seed: 42,
        resolution: '720p',
      }),
    );
  });

  it('should use PixVerse-specific parameters', async () => {
    vi.mocked(falRequest).mockResolvedValue({
      video: { url: 'https://fal.ai/pixverse-video.mp4' },
    });

    const spec = {
      model: 'fal-ai/pixverse/v5.6/transition',
      input: {
        prompt: 'Dark corridor pulsing with crimson light',
        duration: '5',
        style: 'anime' as const,
        aspect_ratio: '9:16',
      },
    };

    await generateVideo(spec, 'https://fal.ai/image.png', '/tmp/pixverse.mp4');

    expect(falRequest).toHaveBeenCalledWith(
      'fal-ai/pixverse/v5.6/transition',
      expect.objectContaining({
        prompt: 'Dark corridor pulsing with crimson light',
        first_image_url: 'https://fal.ai/image.png',
        duration: '5',
        style: 'anime',
        aspect_ratio: '9:16',
      }),
    );
  });

  it('should not pass negative_prompt for Vidu models', async () => {
    vi.mocked(falRequest).mockResolvedValue({
      video: { url: 'https://fal.ai/vidu-video.mp4' },
    });

    const spec = {
      model: 'fal-ai/vidu/q3/image-to-video',
      input: {
        prompt: 'Scene prompt',
        negative_prompt: 'blurry, low quality',
        duration: '5',
      },
    };

    await generateVideo(spec, 'https://fal.ai/image.png', '/tmp/out.mp4');

    const calledInput = vi.mocked(falRequest).mock.calls[0][1] as Record<string, unknown>;
    expect(calledInput).not.toHaveProperty('negative_prompt');
  });
});

describe('fal.ai: transition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate PixVerse transition between two images', async () => {
    vi.mocked(falRequest).mockResolvedValue({
      video: { url: 'https://fal.ai/transition.mp4' },
    });

    const result = await generateTransition(
      'fal-ai/pixverse/v5.6/transition',
      'https://fal.ai/start.png',
      'https://fal.ai/end.png',
      'Smooth dark transition between scenes',
      '/tmp/transition.mp4',
      { duration: '5', style: 'anime' },
    );

    expect(falRequest).toHaveBeenCalledWith(
      'fal-ai/pixverse/v5.6/transition',
      expect.objectContaining({
        prompt: 'Smooth dark transition between scenes',
        first_image_url: 'https://fal.ai/start.png',
        end_image_url: 'https://fal.ai/end.png',
        duration: '5',
        style: 'anime',
      }),
    );
    expect(result.url).toBe('https://fal.ai/transition.mp4');
  });

  it('should generate Vidu Q3 transition between two images', async () => {
    vi.mocked(falRequest).mockResolvedValue({
      video: { url: 'https://fal.ai/vidu-transition.mp4' },
    });

    await generateTransition(
      'fal-ai/vidu/q3/image-to-video',
      'https://fal.ai/start.png',
      'https://fal.ai/end.png',
      'Cross-dissolve between dark scenes',
      '/tmp/transition.mp4',
      { duration: '5', resolution: '720p' },
    );

    expect(falRequest).toHaveBeenCalledWith(
      'fal-ai/vidu/q3/image-to-video',
      expect.objectContaining({
        image_url: 'https://fal.ai/start.png',
        end_image_url: 'https://fal.ai/end.png',
        duration: 5,
        audio: false,
        resolution: '720p',
      }),
    );
  });
});
