import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../compositions/types.js';

export interface QuizSceneProps {
  scene: SceneProps;
}

export const QuizScene: React.FC<QuizSceneProps> = ({ scene }) => {
  // TODO: Quiz template style
  // - Bright, vibrant colors
  // - Game-show style animations
  // - Timer countdown overlays
  // - Reveal animations for answers
  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a2e' }}>
      {/* Quiz-styled scene */}
    </AbsoluteFill>
  );
};
