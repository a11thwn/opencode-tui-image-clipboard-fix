/**
 * 图片元数据
 */
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

/**
 * 存储统计信息
 */
export interface StorageStats {
  totalSize: number;
  totalFiles: number;
  oldestFile?: string;
  newestFile?: string;
}

/**
 * 插件配置
 */
export interface PluginConfig {
  maxStorageMB: number;
  minFreeSpaceMB: number;
  storageDir: string;
}

/**
 * 图片信息（从 data URL 提取）
 */
export interface ImageInfo {
  type: string;
  size: number;
  base64: string;
}
