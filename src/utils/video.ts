import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { createLogger } from './logger.js';

const execAsync = promisify(exec);
const log = createLogger('video-utils');

/**
 * Extract the last frame from a video file.
 * Uses ffmpeg to seek to the end and grab the final frame.
 * 
 * @param videoPath - Path to input video
 * @param outputPath - Where to save the extracted frame (jpg/png)
 * @returns Path to the extracted frame
 */
export async function extractLastFrame(
  videoPath: string,
  outputPath: string,
): Promise<string> {
  if (!existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  log.info('Extracting last frame', { videoPath, outputPath });

  // -sseof -0.1 seeks to 0.1 seconds before end
  // -frames:v 1 grabs one frame
  // -q:v 2 sets quality (1-31, lower is better)
  const cmd = `ffmpeg -y -sseof -0.1 -i "${videoPath}" -frames:v 1 -q:v 2 "${outputPath}"`;

  try {
    await execAsync(cmd);
    
    if (!existsSync(outputPath)) {
      throw new Error('Frame extraction failed - output file not created');
    }

    log.info('Last frame extracted', { outputPath });
    return outputPath;
  } catch (error) {
    log.error('Failed to extract last frame', { error });
    throw error;
  }
}

/**
 * Extract the first frame from a video file.
 * 
 * @param videoPath - Path to input video
 * @param outputPath - Where to save the extracted frame
 * @returns Path to the extracted frame
 */
export async function extractFirstFrame(
  videoPath: string,
  outputPath: string,
): Promise<string> {
  if (!existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  log.info('Extracting first frame', { videoPath, outputPath });

  const cmd = `ffmpeg -y -i "${videoPath}" -frames:v 1 -q:v 2 "${outputPath}"`;

  try {
    await execAsync(cmd);
    
    if (!existsSync(outputPath)) {
      throw new Error('Frame extraction failed - output file not created');
    }

    log.info('First frame extracted', { outputPath });
    return outputPath;
  } catch (error) {
    log.error('Failed to extract first frame', { error });
    throw error;
  }
}

/**
 * Get video duration in seconds.
 * 
 * @param videoPath - Path to video file
 * @returns Duration in seconds
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
  
  const { stdout } = await execAsync(cmd);
  return parseFloat(stdout.trim());
}
