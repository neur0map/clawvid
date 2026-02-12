import { describe, it, expect } from 'vitest';
import { buildSceneWorkflowInput, buildSceneOutputMapping } from '../../src/fal/workflow.js';

describe('fal/workflow helpers', () => {
  it('should build scene workflow input from prompts', () => {
    const input = buildSceneWorkflowInput(
      'A dark figure in horror style',
      ['Scene 1: hallway', 'Scene 2: basement'],
      { seed: 42, aspectRatio: '9:16' },
    );

    expect(input.reference_prompt).toBe('A dark figure in horror style');
    expect(input.scene_1_prompt).toBe('Scene 1: hallway');
    expect(input.scene_2_prompt).toBe('Scene 2: basement');
    expect(input.seed).toBe(42);
    expect(input.aspect_ratio).toBe('9:16');
  });

  it('should omit seed and aspect_ratio when not provided', () => {
    const input = buildSceneWorkflowInput(
      'Reference',
      ['Prompt 1'],
    );

    expect(input.reference_prompt).toBe('Reference');
    expect(input.scene_1_prompt).toBe('Prompt 1');
    expect(input.seed).toBeUndefined();
    expect(input.aspect_ratio).toBeUndefined();
  });

  it('should build output mapping for scene IDs', () => {
    const mapping = buildSceneOutputMapping(
      ['scene_1', 'scene_2', 'scene_3'],
      (id) => `/tmp/assets/${id}.png`,
    );

    expect(mapping).toHaveLength(3);
    expect(mapping[0]).toEqual({
      field: 'scene_1_image',
      sceneId: 'scene_1',
      downloadPath: '/tmp/assets/scene_1.png',
    });
    expect(mapping[1].field).toBe('scene_2_image');
    expect(mapping[2].field).toBe('scene_3_image');
  });
});
