import type { Command } from 'commander';

export function registerPreview(program: Command): void {
  program
    .command('preview')
    .description('Preview a workflow in Remotion studio')
    .requiredOption('-w, --workflow <path>', 'Path to workflow JSON file')
    .option('-p, --platform <name>', 'Preview as platform (youtube, tiktok)', 'tiktok')
    .action(async (options) => {
      const { runPreview } = await import('../core/pipeline.js');
      await runPreview(options);
    });
}
