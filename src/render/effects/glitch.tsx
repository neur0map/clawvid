import { AbsoluteFill, useCurrentFrame } from 'remotion';

export interface GlitchProps {
  intensity?: number;
  frequency?: number;
}

export const Glitch: React.FC<GlitchProps> = ({ intensity = 0.5, frequency = 0.1 }) => {
  const frame = useCurrentFrame();

  // TODO: Implement glitch effect
  // - RGB channel splitting
  // - Horizontal displacement on random frames
  // - Controlled by frequency (how often) and intensity (how much)
  const isGlitchFrame = Math.sin(frame * frequency * Math.PI) > (1 - frequency);

  if (!isGlitchFrame) return null;

  return (
    <AbsoluteFill
      style={{
        opacity: intensity,
        pointerEvents: 'none',
      }}
    />
  );
};
