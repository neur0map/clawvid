import { AbsoluteFill, useCurrentFrame, random } from 'remotion';

export interface GlitchProps {
  intensity?: number;
  frequency?: number;
}

export const Glitch: React.FC<GlitchProps> = ({ intensity = 0.5, frequency = 0.08 }) => {
  const frame = useCurrentFrame();

  // Deterministic "random" glitch triggers based on frame
  const glitchRoll = random(`glitch-trigger-${frame}`);
  const isGlitchFrame = glitchRoll < frequency;

  if (!isGlitchFrame) return null;

  const offsetR = (random(`glitch-r-${frame}`) - 0.5) * intensity * 12;
  const offsetB = (random(`glitch-b-${frame}`) - 0.5) * intensity * 12;
  const sliceY = random(`glitch-y-${frame}`) * 100;
  const sliceHeight = 2 + random(`glitch-h-${frame}`) * 8;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Red channel shift */}
      <AbsoluteFill
        style={{
          backgroundColor: 'red',
          mixBlendMode: 'multiply',
          opacity: intensity * 0.4,
          transform: `translateX(${offsetR}px)`,
          clipPath: `inset(${sliceY}% 0 ${100 - sliceY - sliceHeight}% 0)`,
        }}
      />
      {/* Blue channel shift */}
      <AbsoluteFill
        style={{
          backgroundColor: 'blue',
          mixBlendMode: 'multiply',
          opacity: intensity * 0.4,
          transform: `translateX(${offsetB}px)`,
          clipPath: `inset(${sliceY + 2}% 0 ${100 - sliceY - sliceHeight - 2}% 0)`,
        }}
      />
      {/* Horizontal displacement slice */}
      <AbsoluteFill
        style={{
          backgroundColor: 'white',
          mixBlendMode: 'difference',
          opacity: intensity * 0.15,
          clipPath: `inset(${sliceY}% 0 ${100 - sliceY - sliceHeight}% 0)`,
          transform: `translateX(${offsetR * 2}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
