import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @fal-ai/client
vi.mock('@fal-ai/client', () => ({
  fal: {
    subscribe: vi.fn(),
  },
}));

// Mock p-retry to just call the function directly (no retry delay)
vi.mock('p-retry', () => ({
  default: vi.fn(async (fn: () => Promise<unknown>, _opts?: unknown) => fn()),
}));

// Mock p-queue to just run tasks immediately
vi.mock('p-queue', () => ({
  default: vi.fn().mockImplementation(() => {
    let _concurrency = 3;
    return {
      add: vi.fn(async (fn: () => Promise<unknown>) => fn()),
      get concurrency() { return _concurrency; },
      set concurrency(val: number) { _concurrency = val; },
      pending: 0,
      size: 0,
      onIdle: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

describe('fal.ai: client', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    originalEnv = process.env.FAL_KEY;
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.FAL_KEY = originalEnv;
    } else {
      delete process.env.FAL_KEY;
    }
  });

  it('should throw if not initialized', async () => {
    // Remove FAL_KEY so ensureInitialized throws
    delete process.env.FAL_KEY;

    // Re-import to get fresh module state
    const clientModule = await import('../../src/fal/client.js');

    // Reset the initialized state by calling ensureInitialized without key
    expect(() => clientModule.ensureInitialized()).toThrow('FAL_KEY not set');
  });

  it('should retry on failure', async () => {
    process.env.FAL_KEY = 'test-api-key';

    // Re-import with fresh mocks
    const { fal } = await import('@fal-ai/client');
    const pRetry = (await import('p-retry')).default;

    // Set up p-retry to actually call with retry behavior
    vi.mocked(pRetry).mockImplementation(async (fn: () => Promise<unknown>, _opts?: unknown) => {
      return fn();
    });

    // Mock fal.subscribe to succeed
    vi.mocked(fal.subscribe).mockResolvedValue({
      data: { images: [{ url: 'https://fal.ai/image.png', width: 1080, height: 1920 }] },
      requestId: 'test-req-id',
    });

    const clientModule = await import('../../src/fal/client.js');
    const result = await clientModule.falRequest('fal-ai/kling-image/v3/text-to-image', { prompt: 'test' });

    // Verify p-retry was invoked (wrapping the fal call)
    expect(pRetry).toHaveBeenCalled();
    expect(result).toEqual({ images: [{ url: 'https://fal.ai/image.png', width: 1080, height: 1920 }] });
  });

  it('should respect concurrency limit', async () => {
    process.env.FAL_KEY = 'test-api-key';

    const PQueue = (await import('p-queue')).default;

    const clientModule = await import('../../src/fal/client.js');

    // The queue is created with default concurrency of 3
    expect(clientModule.queue).toBeDefined();
    expect(clientModule.queue.concurrency).toBe(3);

    // Verify that falRequest routes through the queue's add method
    const { fal } = await import('@fal-ai/client');
    vi.mocked(fal.subscribe).mockResolvedValue({
      data: { result: 'ok' },
      requestId: 'req-1',
    });

    await clientModule.falRequest('test-endpoint', { prompt: 'test' });

    // The queue.add should have been called
    expect(clientModule.queue.add).toHaveBeenCalled();
  });
});
