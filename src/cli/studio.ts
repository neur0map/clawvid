import type { Command } from 'commander';

export function registerStudio(program: Command): void {
  program
    .command('studio')
    .description('Launch Remotion studio for visual editing')
    .action(async () => {
      try {
        const { runStudio } = await import('../core/pipeline.js');
        await runStudio();
      } catch (err) {
        console.error('Studio failed:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
