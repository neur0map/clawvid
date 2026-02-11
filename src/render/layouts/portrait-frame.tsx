import { AbsoluteFill } from 'remotion';

export interface PortraitFrameProps {
  children: React.ReactNode;
}

/**
 * 9:16 portrait frame with mobile platform-aware safe zones.
 * Mobile UI overlays eat into top ~8% and bottom ~12% of the screen
 * on TikTok, Reels, and Shorts. Key content should stay in center 80%.
 *
 * - Top safe: 8% (status bar, platform header)
 * - Bottom safe: 12% (platform controls, comments bar)
 * - Side safe: 3% (edge clipping on some devices)
 */
export const PortraitFrame: React.FC<PortraitFrameProps> = ({ children }) => {
  return (
    <AbsoluteFill>
      {/* Full-bleed scene content — fills the whole frame */}
      <AbsoluteFill>
        {children}
      </AbsoluteFill>

      {/* Top dead zone gradient — fades to transparent to protect
          against platform UI overlap cutting into content */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 8%)',
          pointerEvents: 'none',
        }}
      />

      {/* Bottom dead zone gradient — protects subtitle area from
          platform controls overlap */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 15%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
