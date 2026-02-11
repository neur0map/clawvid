import { describe, it, expect } from 'vitest';
import { analyzeScenePlan } from '../../src/core/scene-planner.js';
import type { Scene } from '../../src/schemas/scene.js';
import type { AppConfig } from '../../src/config/loader.js';
import { defaults } from '../../src/config/defaults.js';

function makeScene(overrides: Partial<Scene> & { id: string; type: Scene['type']; timing: Scene['timing'] }): Scene {
  return {
    image_generation: {
      model: 'fal-ai/kling-image/v3/text-to-image',
      input: { prompt: 'A test scene' },
    },
    ...overrides,
  } as Scene;
}

const config: AppConfig = { ...defaults };

describe('Core: scene-planner', () => {
  it('should return correct number of scenes for 60s video', () => {
    const scenes: Scene[] = [
      makeScene({ id: 'scene_1', type: 'image', timing: { start: 0, duration: 10 } }),
      makeScene({ id: 'scene_2', type: 'video', timing: { start: 10, duration: 10 } }),
      makeScene({ id: 'scene_3', type: 'image', timing: { start: 20, duration: 10 } }),
      makeScene({ id: 'scene_4', type: 'video', timing: { start: 30, duration: 10 } }),
      makeScene({ id: 'scene_5', type: 'image', timing: { start: 40, duration: 10 } }),
      makeScene({ id: 'scene_6', type: 'image', timing: { start: 50, duration: 10 } }),
    ];

    const plan = analyzeScenePlan(scenes, config);
    expect(plan.scenes).toHaveLength(6);
    expect(plan.totalDuration).toBe(60);
  });

  it('should not exceed max video clips', () => {
    // config.defaults.max_video_clips is 3
    const scenes: Scene[] = [
      makeScene({ id: 'scene_1', type: 'video', timing: { start: 0, duration: 10 } }),
      makeScene({ id: 'scene_2', type: 'video', timing: { start: 10, duration: 10 } }),
      makeScene({ id: 'scene_3', type: 'video', timing: { start: 20, duration: 10 } }),
    ];

    const plan = analyzeScenePlan(scenes, config);
    // 3 video clips equals the max (3) -- should not warn, plan is valid
    expect(plan.videoClipCount).toBeLessThanOrEqual(config.defaults.max_video_clips);
    expect(plan.videoClipCount).toBe(3);
  });

  it('should assign correct scene types per template', () => {
    const scenes: Scene[] = [
      makeScene({ id: 'scene_1', type: 'image', timing: { start: 0, duration: 10 } }),
      makeScene({ id: 'scene_2', type: 'video', timing: { start: 10, duration: 10 } }),
      makeScene({ id: 'scene_3', type: 'image', timing: { start: 20, duration: 10 } }),
      makeScene({ id: 'scene_4', type: 'video', timing: { start: 30, duration: 10 } }),
      makeScene({ id: 'scene_5', type: 'image', timing: { start: 40, duration: 20 } }),
    ];

    const plan = analyzeScenePlan(scenes, config);
    expect(plan.videoClipCount).toBe(2);
    expect(plan.imageCount).toBe(3);
    expect(plan.videoClipCount + plan.imageCount).toBe(scenes.length);
  });

  it('should sum scene durations to total duration', () => {
    const scenes: Scene[] = [
      makeScene({ id: 'scene_1', type: 'image', timing: { start: 0, duration: 15 } }),
      makeScene({ id: 'scene_2', type: 'video', timing: { start: 15, duration: 20 } }),
      makeScene({ id: 'scene_3', type: 'image', timing: { start: 35, duration: 25 } }),
    ];

    const plan = analyzeScenePlan(scenes, config);
    // totalDuration = max(start + duration) across scenes = max(15, 35, 60) = 60
    expect(plan.totalDuration).toBe(60);
  });
});
