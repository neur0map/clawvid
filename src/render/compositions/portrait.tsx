import { AbsoluteFill } from 'remotion';
import type { CompositionProps } from './types.js';

export const PortraitVideo: React.FC<CompositionProps> = ({ scenes }) => {
  // TODO: Implement 9:16 portrait composition
  // - Center-crop framing
  // - Centered subtitles
  // - Tighter scene shots
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Scene rendering will go here */}
    </AbsoluteFill>
  );
};
