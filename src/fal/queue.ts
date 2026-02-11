import { queue } from './client.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-queue');

export function setQueueConcurrency(concurrency: number): void {
  queue.concurrency = concurrency;
  log.info('Queue concurrency updated', { concurrency });
}

export function getQueueStats(): { pending: number; size: number } {
  return {
    pending: queue.pending,
    size: queue.size,
  };
}

export async function waitForQueueDrain(): Promise<void> {
  await queue.onIdle();
  log.info('Queue drained');
}
