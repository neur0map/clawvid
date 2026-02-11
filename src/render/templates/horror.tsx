import type { TemplateStyle } from '../compositions/types.js';

export const horrorTemplate: TemplateStyle = {
  name: 'horror',
  // Desaturate + darken via CSS filter
  colorFilter: 'saturate(0.6) brightness(0.85) contrast(1.15)',
  // Cold blue-black tint overlay
  overlayColor: '#0a0a1a',
  overlayOpacity: 0.15,
  // Every scene gets these by default (workflow can override per-scene)
  defaultEffects: ['vignette', 'grain'],
};
