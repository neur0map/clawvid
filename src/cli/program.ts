import { Command } from 'commander';
import { registerGenerate } from './generate.js';
import { registerRender } from './render.js';
import { registerPreview } from './preview.js';
import { registerStudio } from './studio.js';
import { registerSetup } from './setup.js';

export const program = new Command()
  .name('clawvid')
  .description('AI-powered short-form video generation')
  .version('0.1.0');

registerGenerate(program);
registerRender(program);
registerPreview(program);
registerStudio(program);
registerSetup(program);
