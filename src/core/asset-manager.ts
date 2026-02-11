import { ensureDir } from 'fs-extra';
import { join } from 'node:path';
import { nanoid } from 'nanoid';
import { createSlug } from '../utils/slug.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('asset-manager');

export interface AssetEntry {
  id: string;
  type: 'image' | 'video' | 'audio';
  sceneIndex: number;
  path: string;
  url?: string;
  status: 'pending' | 'generated' | 'validated' | 'failed';
}

export class AssetManager {
  readonly runId: string;
  readonly outputDir: string;
  private assets: Map<string, AssetEntry> = new Map();

  constructor(
    private baseOutputDir: string,
    private slug: string,
  ) {
    const date = new Date().toISOString().split('T')[0];
    this.runId = nanoid(10);
    this.outputDir = join(baseOutputDir, `${date}-${createSlug(slug)}`);
  }

  async initialize(): Promise<void> {
    await ensureDir(join(this.outputDir, 'assets'));
    await ensureDir(join(this.outputDir, 'youtube'));
    await ensureDir(join(this.outputDir, 'tiktok'));
    await ensureDir(join(this.outputDir, 'instagram'));
    log.info('Initialized output directory', { path: this.outputDir });
  }

  registerAsset(entry: Omit<AssetEntry, 'id'>): string {
    const id = nanoid(8);
    this.assets.set(id, { ...entry, id });
    return id;
  }

  updateAsset(id: string, updates: Partial<AssetEntry>): void {
    const existing = this.assets.get(id);
    if (existing) {
      this.assets.set(id, { ...existing, ...updates });
    }
  }

  getAsset(id: string): AssetEntry | undefined {
    return this.assets.get(id);
  }

  getAllAssets(): AssetEntry[] {
    return Array.from(this.assets.values());
  }

  getAssetPath(filename: string): string {
    return join(this.outputDir, 'assets', filename);
  }

  getPlatformPath(platform: string, filename: string): string {
    return join(this.outputDir, platform, filename);
  }
}
