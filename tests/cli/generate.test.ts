import { describe, it, expect } from 'vitest';
import { program } from '../../src/cli/program.js';

describe('CLI: generate', () => {
  it('should have generate command registered', () => {
    const cmd = program.commands.find((c) => c.name() === 'generate');
    expect(cmd).toBeDefined();
  });

  it('should require --workflow option', () => {
    const cmd = program.commands.find((c) => c.name() === 'generate')!;
    const workflowOpt = cmd.options.find((o) => o.long === '--workflow');
    expect(workflowOpt).toBeDefined();
    expect(workflowOpt!.required).toBe(true);
  });

  it('should have --quality option with default', () => {
    const cmd = program.commands.find((c) => c.name() === 'generate')!;
    const qualityOpt = cmd.options.find((o) => o.long === '--quality');
    expect(qualityOpt).toBeDefined();
    expect(qualityOpt!.defaultValue).toBe('balanced');
  });

  it('should have --skip-cache flag', () => {
    const cmd = program.commands.find((c) => c.name() === 'generate')!;
    const cacheOpt = cmd.options.find((o) => o.long === '--skip-cache');
    expect(cacheOpt).toBeDefined();
  });
});
