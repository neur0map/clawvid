import { fal } from '@fal-ai/client';
import PQueue from 'p-queue';
import pRetry from 'p-retry';
import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createLogger } from '../utils/logger.js';

function validateDownloadUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid download URL: ${url}`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}. Only http(s) allowed.`);
  }
  const hostname = parsed.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('169.254.') || hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
    throw new Error(`Download from private/internal network blocked: ${hostname}`);
  }
}

const log = createLogger('fal-client');

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_RETRIES = 3;

let initialized = false;

export function initFalClient(apiKey: string): void {
  process.env.FAL_KEY = apiKey;
  initialized = true;
  log.info('fal.ai client initialized');
}

export function ensureInitialized(): void {
  if (!initialized) {
    const key = process.env.FAL_KEY;
    if (key) {
      initialized = true;
    } else {
      throw new Error('FAL_KEY not set. Run `clawvid setup` or set FAL_KEY in .env');
    }
  }
}

export const queue: InstanceType<typeof PQueue> = new PQueue({ concurrency: DEFAULT_CONCURRENCY });

export async function falRequest<TOutput>(
  endpointId: string,
  input: Record<string, unknown>,
): Promise<TOutput> {
  ensureInitialized();

  return queue.add(() =>
    pRetry(
      async () => {
        log.info('Calling fal.ai', { endpoint: endpointId, input: JSON.stringify(input).slice(0, 200) });
        try {
          const result = await fal.subscribe(endpointId, { input });
          return result.data as TOutput;
        } catch (err: unknown) {
          const errObj = err as { body?: unknown; status?: number; message?: string };
          log.error('fal.ai call failed', {
            endpoint: endpointId,
            status: errObj.status,
            body: JSON.stringify(errObj.body ?? errObj.message ?? err).slice(0, 500),
          });
          throw err;
        }
      },
      {
        retries: DEFAULT_RETRIES,
        onFailedAttempt: (error) => {
          log.warn('fal.ai request failed, retrying', {
            endpoint: endpointId,
            attempt: error.attemptNumber,
            remaining: error.retriesLeft,
          });
        },
      },
    ),
  ) as Promise<TOutput>;
}

export async function downloadFile(url: string, destPath: string): Promise<void> {
  validateDownloadUrl(url);
  log.info('Downloading asset', { url: url.slice(0, 80), dest: destPath });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('Response body is empty');
  }
  const readableStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
  const fileStream = createWriteStream(destPath);
  try {
    await pipeline(readableStream, fileStream);
  } catch (err) {
    await unlink(destPath).catch(() => {});
    throw err;
  }
  log.info('Asset downloaded', { dest: destPath });
}
