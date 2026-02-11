import { AbsoluteFill } from 'remotion';

export interface VignetteProps {
  intensity?: number;
}

export const Vignette: React.FC<VignetteProps> = ({ intensity = 0.6 }) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${intensity}) 100%)`,
        pointerEvents: 'none',
      }}
    />
  );
};
