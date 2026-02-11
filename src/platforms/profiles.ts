import type { PlatformId, PlatformSpec } from './types.js';
import { youtube } from './youtube.js';
import { tiktok } from './tiktok.js';
import { instagramReels } from './instagram.js';
import type { EncodingProfile } from '../post/encoder.js';

const platforms: Record<PlatformId, PlatformSpec> = {
  youtube,
  tiktok,
  instagram_reels: instagramReels,
};

export function getPlatformSpec(id: PlatformId): PlatformSpec {
  const spec = platforms[id];
  if (!spec) throw new Error(`Unknown platform: ${id}`);
  return spec;
}

export function getEncodingProfile(id: PlatformId): EncodingProfile {
  const spec = getPlatformSpec(id);
  return {
    codec: spec.codec,
    audioCodec: spec.audioCodec,
    bitrate: spec.bitrate,
    audioBitrate: spec.audioBitrate,
    resolution: spec.resolution,
  };
}

export function getAllPlatformIds(): PlatformId[] {
  return Object.keys(platforms) as PlatformId[];
}
