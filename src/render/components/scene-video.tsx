import { AbsoluteFill, Video } from 'remotion';

export interface SceneVideoProps {
  src: string;
  startFrom?: number;
  volume?: number;
}

export const SceneVideo: React.FC<SceneVideoProps> = ({
  src,
  startFrom = 0,
  volume = 0,
}) => {
  return (
    <AbsoluteFill>
      <Video
        src={src}
        startFrom={startFrom}
        volume={volume}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </AbsoluteFill>
  );
};
