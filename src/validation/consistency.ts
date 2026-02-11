import sharp from 'sharp';
import { createLogger } from '../utils/logger.js';

const log = createLogger('validate-consistency');

export interface ColorProfile {
  dominantHue: number;
  averageBrightness: number;
  averageSaturation: number;
}

export async function analyzeColors(imagePath: string): Promise<ColorProfile> {
  const stats = await sharp(imagePath).stats();
  const [r, g, b] = stats.channels.map((c) => c.mean);

  // Convert RGB means to HSL approximation
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  let hue = 0;
  if (delta !== 0) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    if (max === rn) hue = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) hue = 60 * ((bn - rn) / delta + 2);
    else hue = 60 * ((rn - gn) / delta + 4);
  }
  if (hue < 0) hue += 360;

  return {
    dominantHue: Math.round(hue),
    averageBrightness: Math.round(lightness * 100),
    averageSaturation: Math.round(saturation * 100),
  };
}

export async function checkConsistency(
  imagePaths: string[],
  maxBrightnessDrift: number = 30,
  maxSaturationDrift: number = 25,
): Promise<{ consistent: boolean; profiles: ColorProfile[]; warnings: string[] }> {
  const warnings: string[] = [];
  const profiles = await Promise.all(imagePaths.map(analyzeColors));

  if (profiles.length < 2) {
    return { consistent: true, profiles, warnings };
  }

  const avgBrightness = profiles.reduce((s, p) => s + p.averageBrightness, 0) / profiles.length;
  const avgSaturation = profiles.reduce((s, p) => s + p.averageSaturation, 0) / profiles.length;

  profiles.forEach((profile, i) => {
    if (Math.abs(profile.averageBrightness - avgBrightness) > maxBrightnessDrift) {
      warnings.push(`Scene ${i + 1}: brightness drift (${profile.averageBrightness} vs avg ${Math.round(avgBrightness)})`);
    }
    if (Math.abs(profile.averageSaturation - avgSaturation) > maxSaturationDrift) {
      warnings.push(`Scene ${i + 1}: saturation drift (${profile.averageSaturation} vs avg ${Math.round(avgSaturation)})`);
    }
  });

  log.info('Consistency check', { sceneCount: profiles.length, warnings: warnings.length });

  return {
    consistent: warnings.length === 0,
    profiles,
    warnings,
  };
}
