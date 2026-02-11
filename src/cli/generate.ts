import type { Command } from 'commander';

export function registerGenerate(program: Command): void {
  program
    .command('generate')
    .description('Generate video assets from a workflow file')
    .requiredOption('-w, --workflow <path>', 'Path to workflow JSON file')
    .option('-t, --template <name>', 'Template to use (horror, motivation, quiz, reddit)')
    .option('-q, --quality <mode>', 'Quality mode (max_quality, balanced, budget)', 'balanced')
    .option('--skip-cache', 'Skip cache and regenerate all assets')
    .action(async (options) => {
      try {
        const { runGenerate } = await import('../core/pipeline.js');
        await runGenerate(options);
      } catch (err) {
        console.error('Generate failed:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
