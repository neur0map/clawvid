import { AbsoluteFill } from 'remotion';
import type { SceneProps } from '../compositions/types.js';

export interface RedditSceneProps {
  scene: SceneProps;
}

export const RedditScene: React.FC<RedditSceneProps> = ({ scene }) => {
  // TODO: Reddit template style
  // - Post card overlay on background
  // - Neutral/variable color mood
  // - Casual, readable typography
  // - Subreddit-specific styling
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a1b' }}>
      {/* Reddit-styled scene */}
    </AbsoluteFill>
  );
};
