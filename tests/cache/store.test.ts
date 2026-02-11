import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheStore } from '../../src/cache/store.js';
import { hashWorkflowStep, hashString } from '../../src/cache/hash.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Cache: store', () => {
  let tempDir: string;
  let cache: CacheStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'clawvid-test-'));
    cache = new CacheStore(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should report miss for empty cache', () => {
    expect(cache.has('scene_1-image', 'abc123')).toBe(false);
  });

  it('should report hit after set', async () => {
    await cache.set('scene_1-image', 'abc123', '/path/to/image.png');
    expect(cache.has('scene_1-image', 'abc123')).toBe(true);
  });

  it('should report miss on hash change', async () => {
    await cache.set('scene_1-image', 'abc123', '/path/to/image.png');
    expect(cache.has('scene_1-image', 'different_hash')).toBe(false);
  });

  it('should persist and reload', async () => {
    await cache.set('scene_1-image', 'abc123', '/path/to/image.png');

    const cache2 = new CacheStore(tempDir);
    await cache2.load();
    expect(cache2.has('scene_1-image', 'abc123')).toBe(true);
  });

  it('should clear all entries', async () => {
    await cache.set('scene_1', 'hash1', '/path1');
    await cache.set('scene_2', 'hash2', '/path2');
    cache.clear();
    expect(cache.has('scene_1', 'hash1')).toBe(false);
    expect(cache.has('scene_2', 'hash2')).toBe(false);
  });

  it('should return entry with get', async () => {
    await cache.set('scene_1-image', 'abc123', '/path/to/image.png');
    const entry = cache.get('scene_1-image');
    expect(entry).toBeDefined();
    expect(entry!.hash).toBe('abc123');
    expect(entry!.outputPath).toBe('/path/to/image.png');
    expect(entry!.timestamp).toBeGreaterThan(0);
  });
});

describe('Cache: hash', () => {
  it('should produce consistent hashes', () => {
    const step = { model: 'flux/dev', prompt: 'test' };
    const hash1 = hashWorkflowStep(step);
    const hash2 = hashWorkflowStep(step);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = hashWorkflowStep({ prompt: 'a' });
    const hash2 = hashWorkflowStep({ prompt: 'b' });
    expect(hash1).not.toBe(hash2);
  });

  it('should produce 32-char hex strings', () => {
    const hash = hashString('test');
    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('should be order-independent for object keys', () => {
    const hash1 = hashWorkflowStep({ a: 1, b: 2 });
    const hash2 = hashWorkflowStep({ b: 2, a: 1 });
    expect(hash1).toBe(hash2);
  });
});
