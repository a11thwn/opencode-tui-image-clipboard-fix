import { createHash } from 'crypto';
import { ImageInfo } from './types';

/**
 * Format bytes to human-readable size
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Extract image info from data URL
 */
export function extractImageInfo(dataUrl: string): ImageInfo | null {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
  if (!match) return null;

  const type = match[1];
  const base64 = match[2];
  const size = Buffer.from(base64, 'base64').byteLength;

  return { type, size, base64 };
}

/**
 * Generate hash from base64 data
 */
export function generateHash(base64: string): string {
  return createHash('sha256').update(base64).digest('hex').substring(0, 16);
}

/**
 * Get PNG dimensions from buffer
 */
export function getPNGDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    // PNG signature check
    if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
      return null;
    }

    // IHDR chunk contains dimensions (starts at byte 16)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    return { width, height };
  } catch {
    return null;
  }
}

/**
 * Get image dimensions (currently supports PNG only)
 */
export function getImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } | null {
  if (mimeType === 'image/png') {
    return getPNGDimensions(buffer);
  }
  return null;
}
