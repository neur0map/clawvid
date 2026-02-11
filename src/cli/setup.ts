import type { Command } from 'commander';

export function registerSetup(program: Command): void {
  program
    .command('setup')
    .description('Configure default preferences for video generation')
    .option('--reset', 'Reset preferences to defaults')
    .action(async (options) => {
      try {
        const { runSetup } = await import('../core/pipeline.js');
        await runSetup(options);
      } catch (err) {
        console.error('Setup failed:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
