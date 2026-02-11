import { AbsoluteFill } from 'remotion';

export interface LandscapeFrameProps {
  children: React.ReactNode;
}

export const LandscapeFrame: React.FC<LandscapeFrameProps> = ({ children }) => {
  // TODO: Safe zones and text placement for 16:9
  // - Title safe area: 10% inset
  // - Subtitle zone: bottom 15%
  // - Action safe area: 5% inset
  return (
    <AbsoluteFill>
      {children}
    </AbsoluteFill>
  );
};
