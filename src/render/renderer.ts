import { join, resolve, basename, dirname } from 'node:path';
import fsExtra from 'fs-extra';
const { pathExists } = fsExtra;
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
    const { link, copyFile, mkdir } = await import('node:fs/promises');

    const entryPoint = resolve('src/render/root.tsx');

    log.info('Bundling Remotion project...');
    const bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (config) => ({
        ...config,
        resolve: {
          ...config.resolve,
          extensionAlias: {
            '.js': ['.tsx', '.ts', '.jsx', '.js'],
          },
        },
      }),
    });

    // Hard-link (or copy) scene assets into the bundle's public/ dir
    // so Remotion's HTTP server can serve them
    const bundlePublicDir = join(bundleLocation, 'public');
    await mkdir(bundlePublicDir, { recursive: true });

    const scenes = (input.props.scenes as Array<{ src: string; [k: string]: unknown }>) ?? [];
    const rewrittenScenes = await Promise.all(
      scenes.map(async (scene) => {
        const localSrc = scene.src;
        if (!localSrc || !(await pathExists(localSrc))) return scene;
        const filename = basename(localSrc);
        const dest = join(bundlePublicDir, filename);
        try {
          await link(localSrc, dest);
        } catch {
          await copyFile(localSrc, dest);
        }
        return { ...scene, src: `/public/${filename}` };
      }),
    );

    // Also link the audio file
    let audioUrl = input.props.audioUrl as string | undefined;
    if (audioUrl && typeof audioUrl === 'string' && !audioUrl.startsWith('http') && await pathExists(audioUrl)) {
      const audioFilename = basename(audioUrl);
      const audioDest = join(bundlePublicDir, audioFilename);
      try {
        await link(audioUrl, audioDest);
      } catch {
        await copyFile(audioUrl, audioDest);
      }
      audioUrl = `/public/${audioFilename}`;
    }

    const rewrittenProps = {
      ...input.props,
      scenes: rewrittenScenes,
      audioUrl,
    };

    log.info('Selecting composition...', { id: input.compositionId });
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: input.compositionId,
      inputProps: rewrittenProps,
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
      inputProps: rewrittenProps,
    });

    log.info('Render complete', { output: input.outputPath });
    return input.outputPath;
  } catch (err) {
    // Fallback: if Remotion renderer isn't available, use FFmpeg
    log.warn('Remotion render failed, falling back to FFmpeg', {
      error: String(err),
    });
    return fallbackRender(input);
  }
}

async function fallbackRender(input: RenderInput): Promise<string> {
  const { spawn } = await import('node:child_process');
  const scenes = (input.props.scenes as Array<{ src: string; durationFrames: number }>) ?? [];
  const fps = input.fps ?? 30;

  if (scenes.length === 0) {
    throw new Error('No scenes to render');
  }

  // Determine target resolution from composition type
  const isLandscape = input.compositionId === 'LandscapeVideo';
  const targetW = isLandscape ? 1920 : 1080;
  const targetH = isLandscape ? 1080 : 1920;

  // Scale filter: scale to fit within target dimensions preserving aspect ratio,
  // then pad to exact target size with black bars. Force even dimensions.
  const scaleFilter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;

  log.info('Fallback render', { compositionId: input.compositionId, target: `${targetW}x${targetH}` });

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

  const segmentPaths: string[] = [];
  const outputDir = dirname(input.outputPath);

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const localSrc = scene.src;
    const duration = scene.durationFrames / fps;
    const segmentPath = join(outputDir, `segment-${i}.mp4`);

    if (localSrc.endsWith('.mp4') && await pathExists(localSrc)) {
      // Video scene — loop/extend to fill the scene duration, scale to target
      await runCmd('ffmpeg', [
        '-stream_loop', '-1',
        '-t', String(duration),
        '-i', localSrc,
        '-vf', scaleFilter,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', String(fps),
        '-an',
        '-y',
        segmentPath,
      ]);
      segmentPaths.push(segmentPath);
    } else if (await pathExists(localSrc)) {
      // Image scene — create video from still image, scale to target
      await runCmd('ffmpeg', [
        '-loop', '1',
        '-i', localSrc,
        '-vf', scaleFilter,
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

  const audioPath = input.props.audioUrl ? String(input.props.audioUrl) : '';
  const hasAudio = audioPath && await pathExists(audioPath);
  const audioArgs = hasAudio
    ? ['-i', audioPath, '-c:a', 'aac', '-shortest']
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
