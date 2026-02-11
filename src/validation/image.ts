import { fileTypeFromFile } from 'file-type';
import sharp from 'sharp';
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

  const metadata = await sharp(filePath).metadata();
  const width = metadata.width;
  const height = metadata.height;

  if (expectedWidth && width !== expectedWidth) {
    errors.push(`Expected width ${expectedWidth}, got ${width}`);
  }
  if (expectedHeight && height !== expectedHeight) {
    errors.push(`Expected height ${expectedHeight}, got ${height}`);
  }

  const result: ImageValidationResult = {
    valid: errors.length === 0,
    width,
    height,
    format: type.ext,
    errors,
  };

  if (!result.valid) {
    log.warn('Image validation failed', { filePath, errors });
  }

  return result;
}
