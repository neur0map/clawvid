import { AbsoluteFill, Audio, Sequence } from 'remotion';
import type { CompositionProps } from './types.js';
import { SceneRenderer } from './scene-renderer.js';
import { SubtitleOverlay } from '../components/subtitle.js';
import { PortraitFrame } from '../layouts/portrait-frame.js';

export const PortraitVideo: React.FC<CompositionProps> = ({
  scenes,
  audioUrl,
  subtitles,
  template,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <PortraitFrame>
        {/* Scene sequences — each scene plays at its designated time */}
        {scenes.map((scene) => (
          <Sequence
            key={scene.id}
            from={scene.startFrame}
            durationInFrames={scene.durationFrames}
            name={scene.id}
          >
            <SceneRenderer scene={scene} template={template} />
          </Sequence>
        ))}
      </PortraitFrame>

      {/* Audio track */}
      {audioUrl && (
        <Audio src={audioUrl} volume={1} />
      )}

      {/* Subtitle overlay — centered for mobile, larger font */}
      {subtitles.length > 0 && (
        <SubtitleOverlay
          subtitles={subtitles}
          position="bottom"
          fontSize={52}
        />
      )}
    </AbsoluteFill>
  );
};
