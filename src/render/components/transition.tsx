import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export type TransitionType = 'fade' | 'cut' | 'dissolve';

const FADE_FRAMES = 15; // ~0.5s at 30fps

export interface TransitionProps {
  type: TransitionType;
  durationFrames: number;
  children: React.ReactNode;
  isLast?: boolean;
}

export const Transition: React.FC<TransitionProps> = ({
  type,
  durationFrames,
  children,
  isLast = false,
}) => {
  const frame = useCurrentFrame();

  if (type === 'cut') {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  // Fade in at start
  const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade out at end (skip for last scene)
  const fadeOut = isLast
    ? 1
    : interpolate(
        frame,
        [durationFrames - FADE_FRAMES, durationFrames],
        [1, 0],
        {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        },
      );

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};
