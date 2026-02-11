import { falRequest, downloadFile } from './client.js';
import type { TTSConfig } from '../schemas/workflow.js';
import type { FalQwenTTSOutput } from './types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-audio');

interface FalTranscriptionOutput {
  text: string;
  chunks?: Array<{
    text: string;
    timestamp: [number, number];
  }>;
}

export async function generateSpeech(
  ttsConfig: TTSConfig,
  text: string,
  outputPath: string,
): Promise<{ url: string; duration?: number }> {
  log.info('Generating speech', {
    model: ttsConfig.model,
    textLength: text.length,
  });

  const input: Record<string, unknown> = {
    text,
  };

  if (ttsConfig.voice_prompt) {
    input.prompt = ttsConfig.voice_prompt;
  }
  if (ttsConfig.voice_reference) {
    input.ref_audio_url = ttsConfig.voice_reference;
  }
  if (ttsConfig.speed) {
    input.speed = ttsConfig.speed;
  }
  if (ttsConfig.language) {
    input.language = ttsConfig.language;
  }
  if (ttsConfig.temperature !== undefined) {
    input.temperature = ttsConfig.temperature;
  }
  if (ttsConfig.top_k !== undefined) {
    input.top_k = ttsConfig.top_k;
  }
  if (ttsConfig.top_p !== undefined) {
    input.top_p = ttsConfig.top_p;
  }

  const result = await falRequest<FalQwenTTSOutput>(ttsConfig.model, input);

  if (!result.audio?.url) {
    throw new Error('No audio returned from fal.ai');
  }

  await downloadFile(result.audio.url, outputPath);

  return { url: result.audio.url, duration: result.audio.duration };
}

export async function transcribe(
  audioUrl: string,
  model: string = 'fal-ai/whisper',
): Promise<FalTranscriptionOutput> {
  log.info('Transcribing audio', { model });

  const result = await falRequest<FalTranscriptionOutput>(model, {
    audio_url: audioUrl,
    task: 'transcribe',
  });

  return result;
}
