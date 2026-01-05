import { createHash } from 'crypto';
import { ImageInfo } from './types';

/**
 * 格式化字节大小为人类可读格式
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
 * 从 data URL 提取图片信息
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
 * 生成 base64 数据的哈希值
 */
export function generateHash(base64: string): string {
  return createHash('sha256').update(base64).digest('hex').substring(0, 16);
}

/**
 * 获取 PNG 图片尺寸
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
 * 获取图片尺寸（目前仅支持 PNG）
 */
export function getImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } | null {
  if (mimeType === 'image/png') {
    return getPNGDimensions(buffer);
  }
  return null;
}
