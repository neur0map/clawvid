import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/fal/client.js', () => ({
  falRequest: vi.fn(),
  downloadFile: vi.fn().mockResolvedValue(undefined),
  ensureInitialized: vi.fn(),
}));

import { generateReferenceImage, generateSceneFromReference } from '../../src/fal/workflow.js';
import { falRequest, downloadFile } from '../../src/fal/client.js';

const mockFalRequest = vi.mocked(falRequest);
const mockDownloadFile = vi.mocked(downloadFile);

describe('fal/workflow — direct API orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateReferenceImage', () => {
    it('should call falRequest with the correct model and input', async () => {
      mockFalRequest.mockResolvedValueOnce({
        images: [{ url: 'https://fal.ai/ref.png', width: 1080, height: 1920 }],
      });

      const result = await generateReferenceImage(
        { referencePrompt: 'A dark figure', seed: 42, aspectRatio: '9:16' },
        '/tmp/reference.png',
      );

      expect(mockFalRequest).toHaveBeenCalledTimes(1);
      expect(mockFalRequest).toHaveBeenCalledWith('fal-ai/nano-banana-pro', {
        prompt: 'A dark figure',
        seed: 42,
        aspect_ratio: '9:16',
      });
      expect(mockDownloadFile).toHaveBeenCalledWith('https://fal.ai/ref.png', '/tmp/reference.png');
      expect(result).toEqual({ url: 'https://fal.ai/ref.png', width: 1080, height: 1920 });
    });

    it('should use a custom model when provided', async () => {
      mockFalRequest.mockResolvedValueOnce({
        images: [{ url: 'https://fal.ai/ref.png', width: 512, height: 512 }],
      });

      await generateReferenceImage(
        { referencePrompt: 'Test', model: 'fal-ai/custom-model' },
        '/tmp/ref.png',
      );

      expect(mockFalRequest).toHaveBeenCalledWith('fal-ai/custom-model', {
        prompt: 'Test',
      });
    });

    it('should omit seed and aspect_ratio when not provided', async () => {
      mockFalRequest.mockResolvedValueOnce({
        images: [{ url: 'https://fal.ai/ref.png', width: 512, height: 512 }],
      });

      await generateReferenceImage(
        { referencePrompt: 'Minimal' },
        '/tmp/ref.png',
      );

      expect(mockFalRequest).toHaveBeenCalledWith('fal-ai/nano-banana-pro', {
        prompt: 'Minimal',
      });
    });

    it('should throw when no image is returned', async () => {
      mockFalRequest.mockResolvedValueOnce({ images: [] });

      await expect(
        generateReferenceImage({ referencePrompt: 'Test' }, '/tmp/ref.png'),
      ).rejects.toThrow('No reference image returned from fal.ai');
    });
  });

  describe('generateSceneFromReference', () => {
    it('should call falRequest with the edit model and reference URL', async () => {
      mockFalRequest.mockResolvedValueOnce({
        images: [{ url: 'https://fal.ai/scene1.png', width: 1080, height: 1920 }],
      });

      const result = await generateSceneFromReference(
        'https://fal.ai/ref.png',
        'A hallway scene',
        { referencePrompt: 'A dark figure', seed: 42, aspectRatio: '9:16' },
        '/tmp/scene1.png',
      );

      expect(mockFalRequest).toHaveBeenCalledTimes(1);
      expect(mockFalRequest).toHaveBeenCalledWith('fal-ai/nano-banana-pro/edit', {
        prompt: 'A hallway scene',
        image_urls: ['https://fal.ai/ref.png'],
        seed: 42,
        aspect_ratio: '9:16',
      });
      expect(mockDownloadFile).toHaveBeenCalledWith('https://fal.ai/scene1.png', '/tmp/scene1.png');
      expect(result).toEqual({ url: 'https://fal.ai/scene1.png', width: 1080, height: 1920 });
    });

    it('should use a custom edit model when provided', async () => {
      mockFalRequest.mockResolvedValueOnce({
        images: [{ url: 'https://fal.ai/scene1.png', width: 512, height: 512 }],
      });

      await generateSceneFromReference(
        'https://fal.ai/ref.png',
        'A scene',
        { referencePrompt: 'Test', editModel: 'fal-ai/custom-edit' },
        '/tmp/scene.png',
      );

      expect(mockFalRequest).toHaveBeenCalledWith('fal-ai/custom-edit', {
        prompt: 'A scene',
        image_urls: ['https://fal.ai/ref.png'],
      });
    });

    it('should throw when no image is returned', async () => {
      mockFalRequest.mockResolvedValueOnce({ images: [] });

      await expect(
        generateSceneFromReference(
          'https://fal.ai/ref.png',
          'A scene',
          { referencePrompt: 'Test' },
          '/tmp/scene.png',
        ),
      ).rejects.toThrow('No scene image returned from fal.ai');
    });
  });
});
