import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn(),
}));

import { checkConsistency, analyzeColors } from '../../src/validation/consistency.js';
import sharp from 'sharp';

function mockSharpStats(r: number, g: number, b: number) {
  vi.mocked(sharp).mockReturnValue({
    stats: vi.fn().mockResolvedValue({
      channels: [
        { mean: r, min: 0, max: 255, sum: r * 1000, squaresSum: r * r * 1000, stdev: 10, minX: 0, minY: 0, maxX: 100, maxY: 100 },
        { mean: g, min: 0, max: 255, sum: g * 1000, squaresSum: g * g * 1000, stdev: 10, minX: 0, minY: 0, maxX: 100, maxY: 100 },
        { mean: b, min: 0, max: 255, sum: b * 1000, squaresSum: b * b * 1000, stdev: 10, minX: 0, minY: 0, maxX: 100, maxY: 100 },
      ],
    }),
  } as any);
}

describe('Validation: consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect brightness drift between scenes', async () => {
    // Create mocked sharp instances that return different stats per call
    let callCount = 0;
    vi.mocked(sharp).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Very bright image: R=240, G=240, B=240
        return {
          stats: vi.fn().mockResolvedValue({
            channels: [
              { mean: 240 }, { mean: 240 }, { mean: 240 },
            ],
          }),
        } as any;
      } else {
        // Very dark image: R=20, G=20, B=20
        return {
          stats: vi.fn().mockResolvedValue({
            channels: [
              { mean: 20 }, { mean: 20 }, { mean: 20 },
            ],
          }),
        } as any;
      }
    });

    const result = await checkConsistency(['/tmp/bright.png', '/tmp/dark.png'], 30, 25);

    expect(result.consistent).toBe(false);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings.some((w) => w.includes('brightness drift'))).toBe(true);
  });

  it('should detect saturation drift between scenes', async () => {
    let callCount = 0;
    vi.mocked(sharp).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Highly saturated (pure red): R=255, G=0, B=0
        return {
          stats: vi.fn().mockResolvedValue({
            channels: [
              { mean: 255 }, { mean: 0 }, { mean: 0 },
            ],
          }),
        } as any;
      } else {
        // Desaturated (gray): R=128, G=128, B=128
        return {
          stats: vi.fn().mockResolvedValue({
            channels: [
              { mean: 128 }, { mean: 128 }, { mean: 128 },
            ],
          }),
        } as any;
      }
    });

    const result = await checkConsistency(['/tmp/saturated.png', '/tmp/gray.png'], 30, 25);

    expect(result.consistent).toBe(false);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings.some((w) => w.includes('saturation drift'))).toBe(true);
  });

  it('should pass consistent scene set', async () => {
    // All images have very similar colors
    vi.mocked(sharp).mockImplementation(() => {
      return {
        stats: vi.fn().mockResolvedValue({
          channels: [
            { mean: 100 }, { mean: 100 }, { mean: 100 },
          ],
        }),
      } as any;
    });

    const result = await checkConsistency(
      ['/tmp/scene1.png', '/tmp/scene2.png', '/tmp/scene3.png'],
      30,
      25,
    );

    expect(result.consistent).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.profiles).toHaveLength(3);

    // All profiles should have the same brightness and saturation
    for (const profile of result.profiles) {
      expect(profile.averageBrightness).toBe(result.profiles[0].averageBrightness);
      expect(profile.averageSaturation).toBe(result.profiles[0].averageSaturation);
    }
  });
});
