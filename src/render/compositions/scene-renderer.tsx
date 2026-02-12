import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import type { SceneProps, TemplateStyle } from './types.js';
import { SceneImage } from '../components/scene-image.js';
import { SceneVideo } from '../components/scene-video.js';
import { KenBurns } from '../effects/ken-burns.js';
import { Vignette } from '../effects/vignette.js';
import { Grain } from '../effects/grain.js';
import { Flicker } from '../effects/flicker.js';
import { Glitch } from '../effects/glitch.js';
import { ChromaticAberration } from '../effects/chromatic-aberration.js';
import { Transition } from '../components/transition.js';

interface SceneRendererProps {
  scene: SceneProps;
  template?: TemplateStyle;
  isLast?: boolean;
}

export const SceneRenderer: React.FC<SceneRendererProps> = ({ scene, template, isLast = false }) => {
  const allEffects = [
    ...(scene.effects ?? []),
    ...(template?.defaultEffects ?? []),
  ];

  // Determine the transition style
  const transitionType = scene.transition ?? 'fade';

  return (
    <Transition type={transitionType} durationFrames={scene.durationFrames} isLast={isLast}>
      <AbsoluteFill>
        {/* Base scene content */}
        <SceneContent scene={scene} effects={allEffects} />

        {/* Template color grading overlay */}
        {template?.colorFilter && (
          <AbsoluteFill
            style={{
              filter: template.colorFilter,
              mixBlendMode: 'multiply',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Template color overlay */}
        {template?.overlayColor && (
          <AbsoluteFill
            style={{
              backgroundColor: template.overlayColor,
              opacity: template.overlayOpacity ?? 0.1,
              mixBlendMode: 'overlay',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Effect layers driven by effects[] array */}
        <EffectStack effects={allEffects} />

        {/* Text overlay if specified */}
        {scene.textOverlay && (
          <TextOverlayLayer overlay={scene.textOverlay} />
        )}
      </AbsoluteFill>
    </Transition>
  );
};

interface SceneContentProps {
  scene: SceneProps;
  effects: string[];
}

const SceneContent: React.FC<SceneContentProps> = ({ scene, effects }) => {
  const hasKenBurns = effects.some((e) =>
    e.startsWith('kenburns') || e === 'ken_burns' || e === 'ken-burns',
  );

  if (scene.type === 'video' && scene.src.endsWith('.mp4')) {
    return <SceneVideo src={scene.src} volume={0} durationInFrames={scene.durationFrames} />;
  }

  if (hasKenBurns) {
    const direction = effects.find((e) => e.includes('zoom'))
      ? effects.find((e) => e.includes('zoom_out') || e.includes('zoom-out'))
        ? 'zoom-out' as const
        : 'zoom-in' as const
      : effects.find((e) => e.includes('pan_left') || e.includes('pan-left'))
        ? 'pan-left' as const
        : effects.find((e) => e.includes('pan_right') || e.includes('pan-right'))
          ? 'pan-right' as const
          : 'zoom-in' as const;

    return (
      <KenBurns
        src={scene.src}
        durationFrames={scene.durationFrames}
        direction={direction}
      />
    );
  }

  return <SceneImage src={scene.src} />;
};

interface EffectStackProps {
  effects: string[];
}

const EffectStack: React.FC<EffectStackProps> = ({ effects }) => {
  const effectComponents: React.ReactNode[] = [];

  for (const effect of effects) {
    const normalized = effect.toLowerCase().replace(/[_-]/g, '');

    if (normalized.includes('vignette')) {
      const intensity = normalized.includes('heavy') ? 0.8
        : normalized.includes('subtle') ? 0.3
        : 0.6;
      effectComponents.push(<Vignette key={effect} intensity={intensity} />);
    }

    if (normalized.includes('grain')) {
      const opacity = normalized.includes('heavy') ? 0.25
        : normalized.includes('subtle') ? 0.08
        : 0.15;
      effectComponents.push(<Grain key={effect} opacity={opacity} />);
    }

    if (normalized.includes('flicker')) {
      const intensity = normalized.includes('subtle') ? 0.15 : 0.3;
      effectComponents.push(<Flicker key={effect} intensity={intensity} />);
    }

    if (normalized.includes('glitch')) {
      const intensity = normalized.includes('subtle') ? 0.3 : 0.6;
      effectComponents.push(<Glitch key={effect} intensity={intensity} />);
    }

    if (normalized.includes('chromatic') || normalized.includes('aberration')) {
      const offset = normalized.includes('subtle') ? 2 : 4;
      effectComponents.push(<ChromaticAberration key={effect} offset={offset} />);
    }
  }

  return <>{effectComponents}</>;
};

interface TextOverlayLayerProps {
  overlay: NonNullable<SceneProps['textOverlay']>;
}

const TextOverlayLayer: React.FC<TextOverlayLayerProps> = ({ overlay }) => {
  const position = overlay.position ?? 'center';

  return (
    <AbsoluteFill
      style={{
        justifyContent: position === 'top' ? 'flex-start'
          : position === 'bottom' ? 'flex-end'
          : 'center',
        alignItems: 'center',
        padding: 40,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'Impact, Arial Black, sans-serif',
          fontSize: 56,
          color: 'white',
          textAlign: 'center',
          textShadow: '3px 3px 6px rgba(0,0,0,0.9)',
          WebkitTextStroke: '1.5px black',
          letterSpacing: 2,
        }}
      >
        {overlay.text}
      </div>
    </AbsoluteFill>
  );
};
