import type { Command } from 'commander';

export function registerRender(program: Command): void {
  program
    .command('render')
    .description('Render final video from generated assets')
    .requiredOption('-r, --run <path>', 'Path to a run directory in output/')
    .option('-p, --platform <name>', 'Target platform (youtube, tiktok, instagram_reels)')
    .option('--all-platforms', 'Render for all configured platforms')
    .action(async (options) => {
      const { runRender } = await import('../core/pipeline.js');
      await runRender(options);
    });
}
