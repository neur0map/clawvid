import { AbsoluteFill, useCurrentFrame, interpolate, Img } from 'remotion';

export interface KenBurnsProps {
  src: string;
  durationFrames: number;
  direction?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';
}

export const KenBurns: React.FC<KenBurnsProps> = ({
  src,
  durationFrames,
  direction = 'zoom-in',
}) => {
  const frame = useCurrentFrame();

  const scale = direction === 'zoom-in'
    ? interpolate(frame, [0, durationFrames], [1, 1.2], { extrapolateRight: 'clamp' })
    : interpolate(frame, [0, durationFrames], [1.2, 1], { extrapolateRight: 'clamp' });

  const translateX = direction === 'pan-left'
    ? interpolate(frame, [0, durationFrames], [0, -50], { extrapolateRight: 'clamp' })
    : direction === 'pan-right'
      ? interpolate(frame, [0, durationFrames], [0, 50], { extrapolateRight: 'clamp' })
      : 0;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateX(${translateX}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
