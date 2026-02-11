export interface SceneProps {
  id: string;
  type: 'image' | 'video';
  src: string;
  startFrame: number;
  durationFrames: number;
  effects: string[];
  transition?: 'fade' | 'cut' | 'dissolve';
  textOverlay?: {
    text: string;
    style?: string;
    position?: 'top' | 'center' | 'bottom';
  };
}

export interface SubtitleEntry {
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface TemplateStyle {
  name: string;
  colorFilter?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  defaultEffects?: string[];
}

export interface CompositionProps {
  scenes: SceneProps[];
  audioUrl: string;
  subtitles: SubtitleEntry[];
  template?: TemplateStyle;
  fps?: number;
}
