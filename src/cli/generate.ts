import type { Command } from 'commander';

export type GeneratePhase = 'all' | 'images' | 'videos' | 'audio' | 'render';

export function registerGenerate(program: Command): void {
  program
    .command('generate')
    .description('Generate video assets from a workflow file')
    .requiredOption('-w, --workflow <path>', 'Path to workflow JSON file')
    .option('-t, --template <name>', 'Template to use (horror, motivation, quiz, reddit)')
    .option('-q, --quality <mode>', 'Quality mode (max_quality, balanced, budget)', 'balanced')
    .option('--skip-cache', 'Skip cache and regenerate all assets')
    .option(
      '--phase <phase>',
      'Run specific phase only: images, videos, audio, render, or all (default: all)',
      'all'
    )
    .option('--qa', 'Enable Vision QA to check generated images for issues')
    .option('--qa-auto-fix', 'Automatically regenerate images that fail QA (implies --qa)')
    .option('--use-existing-images', 'Skip image generation and use existing assets')
    .option('--use-existing-videos', 'Skip video generation and use existing assets')
    .option('--regenerate <sceneIds>', 'Regenerate specific scenes (comma-separated IDs)')
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
