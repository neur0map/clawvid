import { AbsoluteFill, useCurrentFrame } from 'remotion';

export interface GrainProps {
  opacity?: number;
}

export const Grain: React.FC<GrainProps> = ({ opacity = 0.15 }) => {
  const frame = useCurrentFrame();

  // TODO: Implement animated film grain effect
  // - SVG noise filter or canvas-based grain
  // - Animate seed per frame for realistic grain movement
  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }}
    />
  );
};
