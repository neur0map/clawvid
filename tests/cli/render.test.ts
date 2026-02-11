import { describe, it, expect } from 'vitest';
import { program } from '../../src/cli/program.js';

describe('CLI: render', () => {
  it('should have render command registered', () => {
    const cmd = program.commands.find((c) => c.name() === 'render');
    expect(cmd).toBeDefined();
  });

  it('should require --run option', () => {
    const cmd = program.commands.find((c) => c.name() === 'render')!;
    const runOpt = cmd.options.find((o) => o.long === '--run');
    expect(runOpt).toBeDefined();
    expect(runOpt!.required).toBe(true);
  });

  it('should have --all-platforms flag', () => {
    const cmd = program.commands.find((c) => c.name() === 'render')!;
    const allOpt = cmd.options.find((o) => o.long === '--all-platforms');
    expect(allOpt).toBeDefined();
  });
});
