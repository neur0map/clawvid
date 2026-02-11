import { falRequest, downloadFile } from './client.js';
import type { TTSConfig } from '../schemas/workflow.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-audio');

interface FalTTSOutput {
  audio_url: { url: string };
}

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
): Promise<{ url: string }> {
  log.info('Generating speech', {
    model: ttsConfig.model,
    textLength: text.length,
  });

  const input: Record<string, unknown> = {
    gen_text: text,
  };

  if (ttsConfig.voice_reference) {
    input.ref_audio_url = ttsConfig.voice_reference;
  }
  if (ttsConfig.speed) {
    input.speed = ttsConfig.speed;
  }

  const result = await falRequest<FalTTSOutput>(ttsConfig.model, input);

  if (!result.audio_url?.url) {
    throw new Error('No audio returned from fal.ai');
  }

  await downloadFile(result.audio_url.url, outputPath);

  return { url: result.audio_url.url };
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
