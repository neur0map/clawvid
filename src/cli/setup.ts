import type { Command } from 'commander';

export function registerSetup(program: Command): void {
  program
    .command('setup')
    .description('Configure default preferences for video generation')
    .option('--reset', 'Reset preferences to defaults')
    .action(async (options) => {
      const { runSetup } = await import('../core/pipeline.js');
      await runSetup(options);
    });
}
