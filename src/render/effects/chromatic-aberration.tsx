import { AbsoluteFill, useCurrentFrame } from 'remotion';

export interface ChromaticAberrationProps {
  offset?: number;
}

export const ChromaticAberration: React.FC<ChromaticAberrationProps> = ({ offset = 3 }) => {
  // TODO: Implement chromatic aberration
  // - Duplicate layer with red/blue channel shifts
  // - Apply CSS filter offsets
  // - Best used on climax frames
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
      }}
    />
  );
};
