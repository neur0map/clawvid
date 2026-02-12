import type { Scene } from '../schemas/scene.js';
import type { AppConfig } from '../config/loader.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('scene-planner');

export interface ScenePlan {
  scenes: Scene[];
  totalDuration: number;
  videoClipCount: number;
  imageCount: number;
}

/**
 * Validates and analyzes a scene plan from a workflow.
 * The agent creates the scene plan via the workflow JSON —
 * this function validates the plan is coherent and returns stats.
 */
export function analyzeScenePlan(scenes: Scene[], config: AppConfig): ScenePlan {
  const videoClipCount = scenes.filter((s) => s.type === 'video').length;
  const imageCount = scenes.filter((s) => s.type === 'image').length;
  const totalDuration = scenes.reduce((sum, s) => Math.max(sum, (s.timing?.start ?? 0) + (s.timing?.duration ?? 0)), 0);

  if (videoClipCount > config.defaults.max_video_clips) {
    log.warn('Scene plan exceeds max video clips', {
      count: videoClipCount,
      max: config.defaults.max_video_clips,
    });
  }

  log.info('Scene plan analysis', {
    totalScenes: scenes.length,
    videoClips: videoClipCount,
    images: imageCount,
    totalDuration: `${totalDuration}s`,
  });

  return { scenes, totalDuration, videoClipCount, imageCount };
}
