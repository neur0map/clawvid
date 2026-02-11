import type { TemplateStyle } from '../compositions/types.js';

export const motivationTemplate: TemplateStyle = {
  name: 'motivation',
  // Warm golden hour grading
  colorFilter: 'saturate(1.1) brightness(1.05) sepia(0.12) contrast(1.05)',
  // Warm amber tint
  overlayColor: '#3d2a00',
  overlayOpacity: 0.08,
  defaultEffects: [],
};
