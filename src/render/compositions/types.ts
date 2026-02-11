export interface SceneProps {
  type: 'image' | 'video';
  src: string;
  startFrame: number;
  durationFrames: number;
  effects?: string[];
}

export interface SubtitleEntry {
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface CompositionProps {
  scenes: SceneProps[];
  audioUrl: string;
  subtitles: SubtitleEntry[];
}
