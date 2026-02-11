import * as fal from '@fal-ai/client';
import PQueue from 'p-queue';
import pRetry from 'p-retry';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-client');

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_RETRIES = 3;

let initialized = false;

export function initFalClient(apiKey: string): void {
  fal.config({ credentials: apiKey });
  initialized = true;
  log.info('fal.ai client initialized');
}

export function ensureInitialized(): void {
  if (!initialized) {
    throw new Error('fal.ai client not initialized. Call initFalClient() first.');
  }
}

export const queue = new PQueue({ concurrency: DEFAULT_CONCURRENCY });

export async function falRequest<TInput, TOutput>(
  endpointId: string,
  input: TInput,
): Promise<TOutput> {
  ensureInitialized();

  return queue.add(() =>
    pRetry(
      async () => {
        log.info('Calling fal.ai', { endpoint: endpointId });
        const result = await fal.subscribe(endpointId, { input: input as Record<string, unknown> });
        return result.data as TOutput;
      },
      {
        retries: DEFAULT_RETRIES,
        onFailedAttempt: (error) => {
          log.warn(`fal.ai request failed, retrying`, {
            endpoint: endpointId,
            attempt: error.attemptNumber,
            remaining: error.retriesLeft,
          });
        },
      },
    ),
  ) as Promise<TOutput>;
}
