import { AbsoluteFill, useCurrentFrame, random } from 'remotion';

export interface GrainProps {
  opacity?: number;
}

export const Grain: React.FC<GrainProps> = ({ opacity = 0.15 }) => {
  const frame = useCurrentFrame();

  // Generate a unique noise seed per frame using Remotion's deterministic random
  const seed = random(`grain-${frame}`);
  const baseFrequency = 0.65 + seed * 0.1;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity, mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id={`grain-${frame}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={baseFrequency}
            numOctaves={4}
            seed={Math.floor(frame * 7.3)}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${frame})`} />
      </svg>
    </AbsoluteFill>
  );
};
