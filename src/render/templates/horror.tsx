import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../compositions/types.js';

export interface HorrorSceneProps {
  scene: SceneProps;
}

export const HorrorScene: React.FC<HorrorSceneProps> = ({ scene }) => {
  // TODO: Horror template style
  // - Dark, desaturated color grading
  // - Vignette overlay
  // - Film grain texture
  // - Flicker effect on transitions
  // - Chromatic aberration on climax scenes
  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Horror-styled scene */}
    </AbsoluteFill>
  );
};
