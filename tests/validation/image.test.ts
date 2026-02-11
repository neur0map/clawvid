import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock file-type
vi.mock('file-type', () => ({
  fileTypeFromFile: vi.fn(),
}));

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn(),
}));

import { validateImage } from '../../src/validation/image.js';
import { fileTypeFromFile } from 'file-type';
import sharp from 'sharp';

describe('Validation: image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate valid image file', async () => {
    // Mock file-type to return a valid image type
    vi.mocked(fileTypeFromFile).mockResolvedValue({
      ext: 'png',
      mime: 'image/png',
    });

    // Mock sharp to return valid metadata
    vi.mocked(sharp).mockReturnValue({
      metadata: vi.fn().mockResolvedValue({
        width: 1080,
        height: 1920,
        format: 'png',
      }),
    } as any);

    const result = await validateImage('/tmp/valid-image.png', 1080, 1920);

    expect(result.valid).toBe(true);
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1920);
    expect(result.format).toBe('png');
    expect(result.errors).toHaveLength(0);
  });

  it('should reject non-image file', async () => {
    // Mock file-type to return a non-image type
    vi.mocked(fileTypeFromFile).mockResolvedValue({
      ext: 'mp4',
      mime: 'video/mp4',
    });

    const result = await validateImage('/tmp/not-an-image.mp4');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('File is not a valid image');
  });

  it('should report dimension mismatches', async () => {
    // Mock file-type as valid image
    vi.mocked(fileTypeFromFile).mockResolvedValue({
      ext: 'png',
      mime: 'image/png',
    });

    // Mock sharp with wrong dimensions
    vi.mocked(sharp).mockReturnValue({
      metadata: vi.fn().mockResolvedValue({
        width: 800,
        height: 600,
        format: 'png',
      }),
    } as any);

    const result = await validateImage('/tmp/wrong-size.png', 1080, 1920);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Expected width 1080'),
        expect.stringContaining('Expected height 1920'),
      ]),
    );
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });
});
