import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import type { CompositionProps } from './types.js';
import { SceneRenderer } from './scene-renderer.js';
import { SubtitleOverlay } from '../components/subtitle.js';
import { LandscapeFrame } from '../layouts/landscape-frame.js';

export const LandscapeVideo: React.FC<CompositionProps> = ({
  scenes,
  audioUrl,
  subtitles,
  template,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <LandscapeFrame>
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
      </LandscapeFrame>

      {/* Audio track */}
      {audioUrl && (
        <Audio src={audioUrl} volume={1} />
      )}

      {/* Subtitle overlay — runs across full timeline */}
      {subtitles.length > 0 && (
        <SubtitleOverlay
          subtitles={subtitles}
          position="bottom"
          fontSize={42}
        />
      )}
    </AbsoluteFill>
  );
};
