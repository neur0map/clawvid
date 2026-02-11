import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export type TransitionType = 'fade' | 'cut' | 'dissolve';

export interface TransitionProps {
  type: TransitionType;
  durationFrames: number;
  children: React.ReactNode;
}

export const Transition: React.FC<TransitionProps> = ({
  type,
  durationFrames,
  children,
}) => {
  const frame = useCurrentFrame();

  if (type === 'cut') {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const opacity = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};
