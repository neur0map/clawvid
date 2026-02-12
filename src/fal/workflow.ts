import { fal } from '@fal-ai/client';
import { ensureInitialized, downloadFile } from './client.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-workflow');

export interface WorkflowInput {
  [key: string]: unknown;
}

export interface WorkflowSceneResult {
  sceneId: string;
  imageUrl: string;
  downloadPath: string;
}

/**
 * Calls a fal.ai workflow endpoint via streaming.
 * The workflow must be uploaded to fal.ai first, then referenced by its ID
 * (e.g. "workflows/neur0map/clawvid-scenes").
 *
 * @returns The workflow output fields as a key-value map of URLs.
 */
export async function runWorkflow(
  workflowId: string,
  input: WorkflowInput,
): Promise<Record<string, string>> {
  ensureInitialized();

  log.info('Running fal.ai workflow', {
    workflowId,
    inputKeys: Object.keys(input).join(', '),
  });

  const stream = await fal.stream(workflowId, { input });

  for await (const event of stream) {
    const summary = JSON.stringify(event).slice(0, 200);
    log.info('Workflow progress', { event: summary });
  }

  const result = await stream.done();
  const data = (result as { data?: Record<string, string> }).data ?? (result as Record<string, string>);

  log.info('Workflow complete', {
    outputKeys: Object.keys(data).join(', '),
  });

  return data;
}

/**
 * Runs a fal.ai workflow and downloads all output images to local paths.
 *
 * @param workflowId - The fal.ai workflow endpoint (e.g. "workflows/neur0map/clawvid-scenes")
 * @param input - The workflow input payload
 * @param outputMapping - Maps workflow output field names to scene IDs and local download paths
 * @returns Array of scene results with image URLs
 */
export async function runWorkflowAndDownload(
  workflowId: string,
  input: WorkflowInput,
  outputMapping: Array<{ field: string; sceneId: string; downloadPath: string }>,
): Promise<WorkflowSceneResult[]> {
  const output = await runWorkflow(workflowId, input);

  const results: WorkflowSceneResult[] = [];

  for (const mapping of outputMapping) {
    const imageUrl = output[mapping.field];
    if (!imageUrl) {
      log.warn('Workflow output field missing, skipping', { field: mapping.field });
      continue;
    }

    await downloadFile(imageUrl, mapping.downloadPath);

    results.push({
      sceneId: mapping.sceneId,
      imageUrl,
      downloadPath: mapping.downloadPath,
    });

    log.info('Scene image downloaded', {
      sceneId: mapping.sceneId,
      field: mapping.field,
    });
  }

  return results;
}

/**
 * Builds the input payload for the clawvid-scenes workflow template.
 * Maps scene prompts (in order) to scene_1_prompt, scene_2_prompt, etc.
 */
export function buildSceneWorkflowInput(
  referencePrompt: string,
  scenePrompts: string[],
  options?: { seed?: number; aspectRatio?: string },
): WorkflowInput {
  const input: WorkflowInput = {
    reference_prompt: referencePrompt,
  };

  for (let i = 0; i < scenePrompts.length; i++) {
    input[`scene_${i + 1}_prompt`] = scenePrompts[i];
  }

  if (options?.seed !== undefined) {
    input.seed = options.seed;
  }
  if (options?.aspectRatio) {
    input.aspect_ratio = options.aspectRatio;
  }

  return input;
}

/**
 * Builds the output mapping for the clawvid-scenes workflow template.
 * Maps scene_1_image, scene_2_image, etc. to scene IDs and download paths.
 */
export function buildSceneOutputMapping(
  sceneIds: string[],
  getDownloadPath: (sceneId: string) => string,
): Array<{ field: string; sceneId: string; downloadPath: string }> {
  return sceneIds.map((sceneId, i) => ({
    field: `scene_${i + 1}_image`,
    sceneId,
    downloadPath: getDownloadPath(sceneId),
  }));
}
