import type { TemplateStyle } from '../compositions/types.js';
import { horrorTemplate } from './horror.js';
import { motivationTemplate } from './motivation.js';
import { quizTemplate } from './quiz.js';
import { redditTemplate } from './reddit.js';

const templates: Record<string, TemplateStyle> = {
  horror: horrorTemplate,
  motivation: motivationTemplate,
  quiz: quizTemplate,
  reddit: redditTemplate,
};

export function getTemplate(name: string): TemplateStyle | undefined {
  return templates[name];
}

export function getAllTemplateNames(): string[] {
  return Object.keys(templates);
}
