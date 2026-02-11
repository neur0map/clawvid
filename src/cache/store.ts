import { readJson, writeJson, pathExists } from 'fs-extra';
import { join } from 'node:path';
import { createLogger } from '../utils/logger.js';

const log = createLogger('cache');

interface CacheEntry {
  hash: string;
  outputPath: string;
  timestamp: number;
}

interface CacheData {
  version: 1;
  entries: Record<string, CacheEntry>;
}

export class CacheStore {
  private data: CacheData = { version: 1, entries: {} };
  private cacheFile: string;

  constructor(runDir: string) {
    this.cacheFile = join(runDir, '.cache.json');
  }

  async load(): Promise<void> {
    if (await pathExists(this.cacheFile)) {
      this.data = await readJson(this.cacheFile);
      log.info('Cache loaded', { entries: Object.keys(this.data.entries).length });
    }
  }

  async save(): Promise<void> {
    await writeJson(this.cacheFile, this.data, { spaces: 2 });
  }

  has(stepKey: string, hash: string): boolean {
    const entry = this.data.entries[stepKey];
    return !!entry && entry.hash === hash;
  }

  get(stepKey: string): CacheEntry | undefined {
    return this.data.entries[stepKey];
  }

  async set(stepKey: string, hash: string, outputPath: string): Promise<void> {
    this.data.entries[stepKey] = {
      hash,
      outputPath,
      timestamp: Date.now(),
    };
    await this.save();
  }

  clear(): void {
    this.data.entries = {};
    log.info('Cache cleared');
  }
}
