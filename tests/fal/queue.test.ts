import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock p-queue before importing queue module
vi.mock('p-queue', () => {
  let _concurrency = 3;
  const mockQueue = {
    add: vi.fn(async (fn: () => Promise<unknown>) => fn()),
    get concurrency() { return _concurrency; },
    set concurrency(val: number) { _concurrency = val; },
    pending: 2,
    size: 5,
    onIdle: vi.fn().mockResolvedValue(undefined),
  };
  return {
    default: vi.fn().mockImplementation(() => mockQueue),
    __mockQueue: mockQueue,
  };
});

// Mock @fal-ai/client (required by client.js which queue.js imports)
vi.mock('@fal-ai/client', () => ({
  fal: { subscribe: vi.fn() },
}));

vi.mock('p-retry', () => ({
  default: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

import { setQueueConcurrency, getQueueStats, waitForQueueDrain } from '../../src/fal/queue.js';
import { queue } from '../../src/fal/client.js';

describe('fal.ai: queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update concurrency', () => {
    setQueueConcurrency(5);
    expect(queue.concurrency).toBe(5);

    setQueueConcurrency(1);
    expect(queue.concurrency).toBe(1);
  });

  it('should report queue stats', () => {
    const stats = getQueueStats();

    expect(stats).toEqual({
      pending: expect.any(Number),
      size: expect.any(Number),
    });
    expect(typeof stats.pending).toBe('number');
    expect(typeof stats.size).toBe('number');
  });

  it('should drain queue', async () => {
    await waitForQueueDrain();

    // onIdle should have been called on the queue
    expect(queue.onIdle).toHaveBeenCalled();
  });
});
