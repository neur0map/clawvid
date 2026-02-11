import type { TemplateStyle } from '../compositions/types.js';

export const redditTemplate: TemplateStyle = {
  name: 'reddit',
  // Neutral, slightly muted for readability with overlays
  colorFilter: 'saturate(0.9) brightness(0.95)',
  // Very slight dark overlay for text contrast
  overlayColor: '#000000',
  overlayOpacity: 0.05,
  defaultEffects: [],
};
