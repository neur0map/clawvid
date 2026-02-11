import probe from 'probe-image-size';
import { fileTypeFromFile } from 'file-type';
import { createReadStream } from 'node:fs';
import { createLogger } from '../utils/logger.js';

const log = createLogger('validate-image');

export interface ImageValidationResult {
  valid: boolean;
  width?: number;
  height?: number;
  format?: string;
  errors: string[];
}

export async function validateImage(
  filePath: string,
  expectedWidth?: number,
  expectedHeight?: number,
): Promise<ImageValidationResult> {
  const errors: string[] = [];

  const type = await fileTypeFromFile(filePath);
  if (!type || !type.mime.startsWith('image/')) {
    return { valid: false, errors: ['File is not a valid image'] };
  }

  const stream = createReadStream(filePath);
  const dimensions = await probe(stream);

  if (expectedWidth && dimensions.width !== expectedWidth) {
    errors.push(`Expected width ${expectedWidth}, got ${dimensions.width}`);
  }
  if (expectedHeight && dimensions.height !== expectedHeight) {
    errors.push(`Expected height ${expectedHeight}, got ${dimensions.height}`);
  }

  const result: ImageValidationResult = {
    valid: errors.length === 0,
    width: dimensions.width,
    height: dimensions.height,
    format: type.ext,
    errors,
  };

  if (!result.valid) {
    log.warn('Image validation failed', { filePath, errors });
  }

  return result;
}
