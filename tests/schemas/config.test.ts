import { describe, it, expect } from 'vitest';
import { configSchema } from '../../src/schemas/config.js';
import { defaults } from '../../src/config/defaults.js';

describe('Schema: config', () => {
  it('should validate default config', () => {
    const result = configSchema.safeParse(defaults);
    expect(result.success).toBe(true);
  });

  it.todo('should reject config with missing fal models');
  it.todo('should reject config with invalid resolution');
  it.todo('should reject config with negative duration');
});
