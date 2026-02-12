import { AbsoluteFill, Loop, OffthreadVideo } from 'remotion';

export interface SceneVideoProps {
  src: string;
  startFrom?: number;
  volume?: number;
  durationInFrames?: number;
}

export const SceneVideo: React.FC<SceneVideoProps> = ({
  src,
  startFrom = 0,
  volume = 0,
  durationInFrames,
}) => {
  const video = (
    <OffthreadVideo
      src={src}
      startFrom={startFrom}
      volume={volume}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  );

  // Loop the video if scene duration exceeds clip length
  if (durationInFrames) {
    return (
      <AbsoluteFill>
        <Loop durationInFrames={durationInFrames}>
          {video}
        </Loop>
      </AbsoluteFill>
    );
  }

  return <AbsoluteFill>{video}</AbsoluteFill>;
};
