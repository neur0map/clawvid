import { AbsoluteFill } from 'remotion';

export interface ChromaticAberrationProps {
  offset?: number;
}

export const ChromaticAberration: React.FC<ChromaticAberrationProps> = ({ offset = 3 }) => {
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Red channel — shifted left */}
      <AbsoluteFill
        style={{
          backgroundColor: 'red',
          mixBlendMode: 'multiply',
          opacity: 0.08,
          transform: `translateX(-${offset}px)`,
        }}
      />
      {/* Blue channel — shifted right */}
      <AbsoluteFill
        style={{
          backgroundColor: 'blue',
          mixBlendMode: 'multiply',
          opacity: 0.08,
          transform: `translateX(${offset}px)`,
        }}
      />
      {/* Cyan fringe at edges */}
      <AbsoluteFill
        style={{
          backgroundColor: 'cyan',
          mixBlendMode: 'multiply',
          opacity: 0.04,
          transform: `translateY(${offset * 0.5}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
