import type { Command } from 'commander';

export function registerStudio(program: Command): void {
  program
    .command('studio')
    .description('Launch Remotion studio for visual editing')
    .action(async () => {
      const { runStudio } = await import('../core/pipeline.js');
      await runStudio();
    });
}
