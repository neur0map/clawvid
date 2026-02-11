import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { SubtitleEntry } from '../compositions/types.js';

export interface SubtitleOverlayProps {
  subtitles: SubtitleEntry[];
  position?: 'bottom' | 'center';
  fontFamily?: string;
  fontSize?: number;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  subtitles,
  position = 'bottom',
  fontFamily = 'Impact, sans-serif',
  fontSize = 48,
}) => {
  const frame = useCurrentFrame();
  const current = subtitles.find((s) => frame >= s.startFrame && frame <= s.endFrame);

  if (!current) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: position === 'bottom' ? 'flex-end' : 'center',
        alignItems: 'center',
        paddingBottom: position === 'bottom' ? 80 : 0,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize,
          color: 'white',
          textAlign: 'center',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.6)',
          WebkitTextStroke: '1px black',
          maxWidth: '85%',
          lineHeight: 1.2,
        }}
      >
        {current.text}
      </div>
    </AbsoluteFill>
  );
};
