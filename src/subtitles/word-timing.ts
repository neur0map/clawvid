import type { TimedWord } from './generator.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('word-timing');

export interface TranscriptionChunk {
  text: string;
  timestamp: [number, number];
}

export function extractWordTimings(chunks: TranscriptionChunk[]): TimedWord[] {
  const words: TimedWord[] = [];

  for (const chunk of chunks) {
    const chunkWords = chunk.text.trim().split(/\s+/);
    const chunkDuration = chunk.timestamp[1] - chunk.timestamp[0];
    const wordDuration = chunkDuration / chunkWords.length;

    chunkWords.forEach((word: string, i: number) => {
      words.push({
        word,
        start: chunk.timestamp[0] + i * wordDuration,
        end: chunk.timestamp[0] + (i + 1) * wordDuration,
      });
    });
  }

  log.info('Extracted word timings', { wordCount: words.length });
  return words;
}
