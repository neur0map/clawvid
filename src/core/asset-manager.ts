import fsExtra from 'fs-extra';
const { ensureDir } = fsExtra;
import { join, resolve } from 'node:path';
import { nanoid } from 'nanoid';
import { createSlug } from '../utils/slug.js';
import { createLogger } from '../utils/logger.js';

const VALID_NAME_PATTERN = /^[\w.\-]+$/;

function validatePathComponent(name: string, label: string): void {
  if (!name || !VALID_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid ${label}: "${name}". Only alphanumeric, dash, underscore, and dot allowed.`);
  }
  if (name.includes('..')) {
    throw new Error(`Path traversal detected in ${label}: "${name}"`);
  }
}

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
    await ensureDir(join(this.outputDir, 'instagram_reels'));
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
    validatePathComponent(filename, 'filename');
    const result = resolve(this.outputDir, 'assets', filename);
    if (!result.startsWith(resolve(this.outputDir))) {
      throw new Error(`Path traversal detected: ${filename}`);
    }
    return result;
  }

  getPlatformPath(platform: string, filename: string): string {
    validatePathComponent(platform, 'platform');
    validatePathComponent(filename, 'filename');
    const result = resolve(this.outputDir, platform, filename);
    if (!result.startsWith(resolve(this.outputDir))) {
      throw new Error(`Path traversal detected: ${platform}/${filename}`);
    }
    return result;
  }

  /**
   * Create an AssetManager pointing to an existing run directory.
   * Used for re-rendering without generating new assets.
   */
  static fromExistingRun(runDir: string): AssetManager {
    const manager = Object.create(AssetManager.prototype) as AssetManager;
    Object.defineProperty(manager, 'runId', { value: 'existing', writable: false });
    Object.defineProperty(manager, 'outputDir', { value: runDir, writable: false });
    return manager;
  }
}
