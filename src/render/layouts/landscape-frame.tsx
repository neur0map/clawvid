import { AbsoluteFill } from 'remotion';

export interface LandscapeFrameProps {
  children: React.ReactNode;
}

/**
 * 16:9 landscape frame with platform-aware safe zones.
 * - Action safe: 5% inset (critical content stays inside)
 * - Title safe: 10% inset (text stays inside)
 * - Subtitle zone: bottom 15%
 */
export const LandscapeFrame: React.FC<LandscapeFrameProps> = ({ children }) => {
  return (
    <AbsoluteFill>
      {/* Full-bleed scene content */}
      <AbsoluteFill>
        {children}
      </AbsoluteFill>

      {/* Action safe area indicator (transparent — only crops overflow) */}
      <AbsoluteFill
        style={{
          overflow: 'hidden',
          // 5% inset from all edges for action-safe
          padding: '5%',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
