import type { TemplateStyle } from '../compositions/types.js';

export const quizTemplate: TemplateStyle = {
  name: 'quiz',
  // Bright, vibrant, slightly boosted colors
  colorFilter: 'saturate(1.25) brightness(1.08) contrast(1.1)',
  // No dark overlay — keep it bright
  overlayColor: undefined,
  overlayOpacity: 0,
  defaultEffects: [],
};
