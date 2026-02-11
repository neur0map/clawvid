import { falRequest } from './client.js';
import type { TTSInput, TTSOutput, TranscriptionInput, TranscriptionOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-audio');

export async function generateSpeech(
  modelId: string,
  input: TTSInput,
): Promise<TTSOutput> {
  log.info('Generating speech', { model: modelId, textLength: input.gen_text.length });
  return falRequest<TTSInput, TTSOutput>(modelId, input);
}

export async function transcribe(
  modelId: string,
  input: TranscriptionInput,
): Promise<TranscriptionOutput> {
  log.info('Transcribing audio', { model: modelId });
  return falRequest<TranscriptionInput, TranscriptionOutput>(modelId, input);
}
