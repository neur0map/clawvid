import { Composition } from 'remotion';
import { LandscapeVideo } from './compositions/landscape.js';
import { PortraitVideo } from './compositions/portrait.js';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LandscapeVideo"
        component={LandscapeVideo as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: [],
          audioUrl: '',
          subtitles: [],
        }}
      />
      <Composition
        id="PortraitVideo"
        component={PortraitVideo as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: [],
          audioUrl: '',
          subtitles: [],
        }}
      />
    </>
  );
};
