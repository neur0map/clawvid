import { writeFile } from 'fs-extra';
import { createLogger } from '../utils/logger.js';

const log = createLogger('subtitles');

export interface TimedWord {
  word: string;
  start: number;
  end: number;
}

export interface SubtitleSegment {
  index: number;
  start: number;
  end: number;
  text: string;
}

export function buildSubtitleSegments(
  words: TimedWord[],
  maxWordsPerLine: number = 6,
): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  let index = 1;

  for (let i = 0; i < words.length; i += maxWordsPerLine) {
    const chunk = words.slice(i, i + maxWordsPerLine);
    segments.push({
      index: index++,
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      text: chunk.map((w) => w.word).join(' '),
    });
  }

  return segments;
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function toSRT(segments: SubtitleSegment[]): string {
  return segments
    .map(
      (seg) =>
        `${seg.index}\n${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}\n${seg.text}\n`,
    )
    .join('\n');
}

function formatVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function toVTT(segments: SubtitleSegment[]): string {
  const lines = segments.map(
    (seg) => `${formatVTTTime(seg.start)} --> ${formatVTTTime(seg.end)}\n${seg.text}\n`,
  );
  return `WEBVTT\n\n${lines.join('\n')}`;
}

export async function writeSRT(segments: SubtitleSegment[], outputPath: string): Promise<void> {
  const content = toSRT(segments);
  await writeFile(outputPath, content, 'utf-8');
  log.info('SRT file written', { path: outputPath, segments: segments.length });
}

export async function writeVTT(segments: SubtitleSegment[], outputPath: string): Promise<void> {
  const content = toVTT(segments);
  await writeFile(outputPath, content, 'utf-8');
  log.info('VTT file written', { path: outputPath, segments: segments.length });
}
