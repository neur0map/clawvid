import { join, resolve } from 'node:path';
import { pathExists } from 'fs-extra';
import { createLogger } from '../utils/logger.js';

const log = createLogger('renderer');

export interface RenderInput {
  compositionId: 'LandscapeVideo' | 'PortraitVideo';
  outputPath: string;
  props: Record<string, unknown>;
  fps?: number;
}

export async function renderComposition(input: RenderInput): Promise<string> {
  log.info('Rendering composition', {
    composition: input.compositionId,
    output: input.outputPath,
  });

  try {
    // Dynamic import to avoid loading Remotion unless rendering
    const { bundle } = await import('@remotion/bundler');
    const { renderMedia, selectComposition } = await import('@remotion/renderer');

    const entryPoint = resolve('src/render/root.tsx');

    log.info('Bundling Remotion project...');
    const bundleLocation = await bundle({
      entryPoint,
      // Webpack override not needed for basic bundling
    });

    log.info('Selecting composition...', { id: input.compositionId });
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: input.compositionId,
      inputProps: input.props,
    });

    log.info('Rendering video...', {
      width: composition.width,
      height: composition.height,
      durationInFrames: composition.durationInFrames,
    });

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: input.outputPath,
      inputProps: input.props,
    });

    log.info('Render complete', { output: input.outputPath });
    return input.outputPath;
  } catch (err) {
    // Fallback: if Remotion renderer isn't available, use FFmpeg slideshow
    log.warn('Remotion render failed, falling back to FFmpeg slideshow', {
      error: String(err),
    });
    return fallbackRender(input);
  }
}

async function fallbackRender(input: RenderInput): Promise<string> {
  // FFmpeg-based fallback: create a simple slideshow from scene images
  const { spawn } = await import('node:child_process');
  const scenes = (input.props.scenes as Array<{ src: string; durationFrames: number }>) ?? [];
  const fps = input.fps ?? 30;

  if (scenes.length === 0) {
    throw new Error('No scenes to render');
  }

  const runCmd = (cmd: string, args: string[]): Promise<void> =>
    new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: 'pipe' });
      const stderrChunks: Buffer[] = [];
      child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
      child.on('close', (code) => {
        if (code === 0) return resolve();
        const stderr = Buffer.concat(stderrChunks).toString().slice(-500);
        reject(new Error(`${cmd} exited with code ${code}${stderr ? `: ${stderr}` : ''}`));
      });
      child.on('error', reject);
    });

  // For each image scene, create a segment, then concatenate
  const segmentPaths: string[] = [];
  const outputDir = input.outputPath.replace(/[^/]+$/, '');

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const duration = scene.durationFrames / fps;
    const segmentPath = join(outputDir, `segment-${i}.mp4`);

    if (scene.src.endsWith('.mp4') && await pathExists(scene.src)) {
      // Video scene — use as-is
      segmentPaths.push(scene.src);
    } else if (await pathExists(scene.src)) {
      // Image scene — create video from still image
      await runCmd('ffmpeg', [
        '-loop', '1',
        '-i', scene.src,
        '-c:v', 'libx264',
        '-t', String(duration),
        '-pix_fmt', 'yuv420p',
        '-r', String(fps),
        '-y',
        segmentPath,
      ]);
      segmentPaths.push(segmentPath);
    }
  }

  if (segmentPaths.length === 0) {
    throw new Error('No valid segments to render');
  }

  // Concatenate segments
  const { writeFile, unlink } = await import('node:fs/promises');
  const concatList = join(outputDir, 'concat-list.txt');
  const escapeForConcat = (p: string) => p.replace(/'/g, "'\\''");
  await writeFile(concatList, segmentPaths.map((p) => `file '${escapeForConcat(p)}'`).join('\n'));

  const audioArgs = input.props.audioUrl
    ? ['-i', String(input.props.audioUrl), '-c:a', 'aac', '-shortest']
    : ['-an'];

  try {
    await runCmd('ffmpeg', [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatList,
      ...audioArgs,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      '-y',
      input.outputPath,
    ]);
  } finally {
    // Clean up temporary files
    await unlink(concatList).catch(() => {});
    for (let i = 0; i < scenes.length; i++) {
      const segmentPath = join(outputDir, `segment-${i}.mp4`);
      await unlink(segmentPath).catch(() => {});
    }
  }

  log.info('Fallback render complete', { output: input.outputPath });
  return input.outputPath;
}
