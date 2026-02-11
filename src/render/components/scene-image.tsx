import { AbsoluteFill, Img } from 'remotion';

export interface SceneImageProps {
  src: string;
  fit?: 'cover' | 'contain';
}

export const SceneImage: React.FC<SceneImageProps> = ({ src, fit = 'cover' }) => {
  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit,
        }}
      />
    </AbsoluteFill>
  );
};
