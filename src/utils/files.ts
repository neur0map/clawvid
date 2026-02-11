import { readJson, writeJson, ensureDir, pathExists } from 'fs-extra';
import { dirname } from 'node:path';

export async function readJsonFile<T>(filePath: string): Promise<T> {
  return readJson(filePath) as Promise<T>;
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await ensureDir(dirname(filePath));
  await writeJson(filePath, data, { spaces: 2 });
}

export async function fileExists(filePath: string): Promise<boolean> {
  return pathExists(filePath);
}

export { ensureDir };
