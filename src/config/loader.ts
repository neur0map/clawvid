import { readJson, pathExists } from 'fs-extra';
import { join } from 'node:path';
import { configSchema, type Config } from '../schemas/config.js';
import { preferencesSchema, type Preferences } from '../schemas/preferences.js';
import { defaults } from './defaults.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('config');

export interface AppConfig extends Config {
  preferences?: Preferences;
}

export async function loadConfig(rootDir?: string): Promise<AppConfig> {
  const root = rootDir ?? process.cwd();
  const configPath = join(root, 'config.json');
  const prefsPath = join(root, 'preferences.json');

  let rawConfig: unknown;
  if (await pathExists(configPath)) {
    rawConfig = await readJson(configPath);
    log.info('Loaded config.json');
  } else {
    log.warn('config.json not found, using defaults');
    rawConfig = defaults;
  }

  const config = configSchema.parse(rawConfig);

  let preferences: Preferences | undefined;
  if (await pathExists(prefsPath)) {
    const rawPrefs = await readJson(prefsPath);
    preferences = preferencesSchema.parse(rawPrefs);
    log.info('Loaded preferences.json');
  }

  return { ...config, preferences };
}

export function resolveModelId(config: AppConfig, category: 'image' | 'video', alias: string): string {
  const models = category === 'image' ? config.fal.image : config.fal.video;
  const resolved = (models as Record<string, string>)[alias];
  if (!resolved) throw new Error(`Unknown ${category} model alias: ${alias}`);
  return resolved;
}
