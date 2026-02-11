import { describe, it, expect } from 'vitest';
import { program } from '../../src/cli/program.js';

describe('CLI: setup', () => {
  it('should have setup command registered', () => {
    const cmd = program.commands.find((c) => c.name() === 'setup');
    expect(cmd).toBeDefined();
  });

  it('should have --reset flag', () => {
    const cmd = program.commands.find((c) => c.name() === 'setup')!;
    const resetOpt = cmd.options.find((o) => o.long === '--reset');
    expect(resetOpt).toBeDefined();
  });

  it('should register all 5 commands', () => {
    const names = program.commands.map((c) => c.name());
    expect(names).toContain('generate');
    expect(names).toContain('render');
    expect(names).toContain('preview');
    expect(names).toContain('studio');
    expect(names).toContain('setup');
    expect(names).toHaveLength(5);
  });
});
