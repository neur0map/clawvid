import { AbsoluteFill } from 'remotion';

export interface PortraitFrameProps {
  children: React.ReactNode;
}

export const PortraitFrame: React.FC<PortraitFrameProps> = ({ children }) => {
  // TODO: Safe zones and text placement for 9:16
  // - Account for mobile UI overlays (top/bottom)
  // - Subtitle zone: lower third, centered
  // - Keep key content in center 80%
  return (
    <AbsoluteFill>
      {children}
    </AbsoluteFill>
  );
};
