import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/fal/client.js', () => ({
  falRequest: vi.fn(),
  downloadFile: vi.fn().mockResolvedValue(undefined),
}));

import { generateImage } from '../../src/fal/image.js';
import { falRequest, downloadFile } from '../../src/fal/client.js';
import type { FalKlingImageOutput } from '../../src/fal/types.js';

describe('fal.ai: image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call correct endpoint for text-to-image', async () => {
    const mockResponse: FalKlingImageOutput = {
      images: [{ url: 'https://fal.ai/generated-image.png', width: 1080, height: 1920 }],
    };
    vi.mocked(falRequest).mockResolvedValue(mockResponse);

    const spec = {
      model: 'fal-ai/kling-image/v3/text-to-image',
      input: { prompt: 'A dark, eerie forest at midnight' },
    };

    await generateImage(spec, '/tmp/output.png');

    expect(falRequest).toHaveBeenCalledWith(
      'fal-ai/kling-image/v3/text-to-image',
      expect.objectContaining({ prompt: 'A dark, eerie forest at midnight' }),
    );
  });

  it('should call correct endpoint for image-to-image', async () => {
    const mockResponse: FalKlingImageOutput = {
      images: [{ url: 'https://fal.ai/styled-image.png', width: 512, height: 512 }],
    };
    vi.mocked(falRequest).mockResolvedValue(mockResponse);

    const spec = {
      model: 'fal-ai/kling-image/v3/text-to-image',
      input: {
        prompt: 'Transform to oil painting style',
        aspect_ratio: '1:1',
        seed: 42,
      },
    };

    const result = await generateImage(spec, '/tmp/styled.png');

    expect(falRequest).toHaveBeenCalledWith(
      'fal-ai/kling-image/v3/text-to-image',
      expect.objectContaining({
        prompt: 'Transform to oil painting style',
        aspect_ratio: '1:1',
        seed: 42,
      }),
    );
    expect(result.url).toBe('https://fal.ai/styled-image.png');
    expect(result.width).toBe(512);
    expect(result.height).toBe(512);
  });

  it('should pass prompt and parameters', async () => {
    const mockResponse: FalKlingImageOutput = {
      images: [{ url: 'https://fal.ai/image.png', width: 1080, height: 1920 }],
    };
    vi.mocked(falRequest).mockResolvedValue(mockResponse);

    const spec = {
      model: 'fal-ai/kling-image/v3/text-to-image',
      input: {
        prompt: 'A haunted mansion',
        negative_prompt: 'bright, happy',
        aspect_ratio: '9:16',
        resolution: '1080x1920',
        num_images: 1,
        output_format: 'png' as const,
        seed: 12345,
      },
    };

    await generateImage(spec, '/tmp/haunted.png');

    expect(falRequest).toHaveBeenCalledWith(
      'fal-ai/kling-image/v3/text-to-image',
      {
        prompt: 'A haunted mansion',
        negative_prompt: 'bright, happy',
        aspect_ratio: '9:16',
        resolution: '1080x1920',
        num_images: 1,
        output_format: 'png',
        seed: 12345,
      },
    );

    // Verify downloadFile was called with the correct URL and output path
    expect(downloadFile).toHaveBeenCalledWith('https://fal.ai/image.png', '/tmp/haunted.png');
  });
});
