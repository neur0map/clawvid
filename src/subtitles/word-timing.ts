import type { TranscriptionOutput } from '../fal/types.js';
import type { TimedWord } from './generator.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('word-timing');

export function extractWordTimings(transcription: TranscriptionOutput): TimedWord[] {
  const words: TimedWord[] = [];

  for (const segment of transcription.segments) {
    // Split segment text into words and distribute timing evenly
    // TODO: Use word-level timestamps from Whisper when available
    const segmentWords = segment.text.trim().split(/\s+/);
    const segmentDuration = segment.end - segment.start;
    const wordDuration = segmentDuration / segmentWords.length;

    segmentWords.forEach((word, i) => {
      words.push({
        word,
        start: segment.start + i * wordDuration,
        end: segment.start + (i + 1) * wordDuration,
      });
    });
  }

  log.info('Extracted word timings', { wordCount: words.length });
  return words;
}
