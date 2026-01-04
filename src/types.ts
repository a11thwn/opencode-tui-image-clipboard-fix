export interface ImageMetadata {
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  createdAt: string;
  hash: string;
}

export interface StorageStats {
  totalSize: number;
  totalFiles: number;
  oldestFile?: string;
  newestFile?: string;
}

export interface PluginConfig {
  maxStorageMB: number;
  minFreeSpaceMB: number;
  storageDir: string;
}

export interface ImageInfo {
  type: string;
  size: number;
  base64: string;
}
