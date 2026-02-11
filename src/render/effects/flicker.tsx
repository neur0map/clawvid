import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export interface FlickerProps {
  intensity?: number;
  speed?: number;
}

export const Flicker: React.FC<FlickerProps> = ({ intensity = 0.3, speed = 1 }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    Math.sin(frame * speed * 0.5) * Math.cos(frame * speed * 0.3),
    [-1, 1],
    [0, intensity],
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'black',
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
};
