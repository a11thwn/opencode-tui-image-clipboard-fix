import * as os from 'os';
import * as path from 'path';
import { ImageStorageManager } from './storage';
import { PluginConfig } from './types';
import { formatSize } from './utils';

interface PluginContext {
  config?: Partial<PluginConfig>;
}

interface MessagePart {
  type: string;
  content?: string;
}

interface MessageEvent {
  message?: {
    parts?: MessagePart[];
  };
}

type Plugin = (ctx: PluginContext) => Promise<{
  'message.updated'?: (event: MessageEvent) => Promise<void>;
  command?: Record<string, () => Promise<void>>;
}>;

const DEFAULT_CONFIG: PluginConfig = {
  maxStorageMB: 2048,
  minFreeSpaceMB: 512,
  storageDir: path.join(os.homedir(), '.local/share/opencode/storage/images'),
};

export const ImageStoragePlugin: Plugin = async (ctx) => {
  const config: PluginConfig = {
    ...DEFAULT_CONFIG,
    ...ctx.config,
  };

  const storageManager = new ImageStorageManager(config);
  await storageManager.initialize();

  return {
    'message.updated': async (event) => {
      const parts = event.message?.parts;
      if (!parts || !Array.isArray(parts)) return;

      for (const part of parts) {
        if (part.type === 'image' && typeof part.content === 'string') {
          if (part.content.startsWith('data:image/')) {
            await storageManager.saveImage(part.content);
          }
        }
      }
    },

    command: {
      'cleanup-images': async () => {
        const deletedCount = await storageManager.cleanup();
        console.log(`Deleted ${deletedCount} images`);
      },

      'show-storage': async () => {
        const stats = await storageManager.getStats();
        console.log('=== Image Storage Stats ===');
        console.log(`Total Files: ${stats.totalFiles}`);
        console.log(`Total Size: ${formatSize(stats.totalSize)}`);
        console.log(`Oldest File: ${stats.oldestFile || 'N/A'}`);
        console.log(`Newest File: ${stats.newestFile || 'N/A'}`);
        console.log(`Storage Dir: ${config.storageDir}`);
        console.log(`Max Storage: ${config.maxStorageMB} MB`);
      },
    },
  };
};

export default ImageStoragePlugin;
