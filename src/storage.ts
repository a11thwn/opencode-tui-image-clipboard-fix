import * as fs from 'fs/promises';
import * as path from 'path';
import { ImageMetadata, StorageStats, PluginConfig } from './types';
import { formatSize, extractImageInfo, generateHash, getImageDimensions } from './utils';

export class ImageStorageManager {
  private metadataFile: string;
  private metadata: Map<string, ImageMetadata> = new Map();

  constructor(private config: PluginConfig) {
    this.metadataFile = path.join(config.storageDir, 'metadata.json');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.config.storageDir, { recursive: true });
    await this.loadMetadata();
  }

  private async loadMetadata(): Promise<void> {
    try {
      const data = await fs.readFile(this.metadataFile, 'utf-8');
      const parsed = JSON.parse(data);
      this.metadata = new Map(Object.entries(parsed));
    } catch {
      this.metadata = new Map();
    }
  }

  private async saveMetadata(): Promise<void> {
    const obj = Object.fromEntries(this.metadata);
    await fs.writeFile(this.metadataFile, JSON.stringify(obj, null, 2));
  }

  async saveImage(dataUrl: string): Promise<ImageMetadata | null> {
    const imageInfo = extractImageInfo(dataUrl);
    if (!imageInfo) return null;

    const hash = generateHash(imageInfo.base64);
    const existingImage = Array.from(this.metadata.values()).find(m => m.hash === hash);
    
    if (existingImage) {
      console.log(`Image already exists: ${existingImage.path} (${formatSize(existingImage.size)})`);
      return existingImage;
    }

    const buffer = Buffer.from(imageInfo.base64, 'base64');
    const mimeType = `image/${imageInfo.type}`;
    const dimensions = getImageDimensions(buffer, mimeType);
    
    const timestamp = Date.now();
    const filename = `${timestamp}_${hash}.${imageInfo.type}`;
    const filepath = path.join(this.config.storageDir, filename);

    await fs.writeFile(filepath, buffer);

    const metadata: ImageMetadata = {
      filename,
      path: filepath,
      size: imageInfo.size,
      mimeType,
      width: dimensions?.width,
      height: dimensions?.height,
      createdAt: new Date(timestamp).toISOString(),
      hash,
    };

    this.metadata.set(filename, metadata);
    await this.saveMetadata();

    const dimStr = dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown';
    console.log(`Saved image: ${filepath} (${formatSize(imageInfo.size)}, ${dimStr})`);

    await this.checkAndCleanup();

    return metadata;
  }

  async getStats(): Promise<StorageStats> {
    const files = Array.from(this.metadata.values());
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalFiles = files.length;

    const sorted = files.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      totalSize,
      totalFiles,
      oldestFile: sorted[0]?.createdAt,
      newestFile: sorted[sorted.length - 1]?.createdAt,
    };
  }

  async checkAndCleanup(): Promise<void> {
    const stats = await this.getStats();
    const maxBytes = this.config.maxStorageMB * 1024 * 1024;

    if (stats.totalSize <= maxBytes) return;

    const bytesToFree = stats.totalSize - maxBytes + (this.config.minFreeSpaceMB * 1024 * 1024);
    let freedBytes = 0;

    const sorted = Array.from(this.metadata.values()).sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const file of sorted) {
      if (freedBytes >= bytesToFree) break;

      try {
        await fs.unlink(file.path);
        freedBytes += file.size;
        this.metadata.delete(file.filename);
        console.log(`Deleted old image: ${file.path} (${formatSize(file.size)})`);
      } catch (err) {
        console.error(`Failed to delete ${file.path}:`, err);
      }
    }

    await this.saveMetadata();
    console.log(`Cleanup complete. Freed ${formatSize(freedBytes)}`);
  }

  async cleanup(): Promise<number> {
    const files = Array.from(this.metadata.keys());
    let deletedCount = 0;

    for (const filename of files) {
      const meta = this.metadata.get(filename);
      if (!meta) continue;

      try {
        await fs.unlink(meta.path);
        this.metadata.delete(filename);
        deletedCount++;
      } catch (err) {
        console.error(`Failed to delete ${meta.path}:`, err);
      }
    }

    await this.saveMetadata();
    return deletedCount;
  }
}
