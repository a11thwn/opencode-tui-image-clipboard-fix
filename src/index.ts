import * as os from "os";
import * as path from "path";
import { ImageStorageManager } from "./storage";
import { PluginConfig } from "./types";
import { formatSize } from "./utils";

// Plugin 类型定义
interface PluginInput {
  client: any;
  project: any;
  directory: string;
  worktree: string;
  serverUrl: URL;
  $: any;
}

interface FilePart {
  id?: string;
  sessionID?: string;
  messageID?: string;
  type: "file";
  mime: string;
  filename?: string;
  url: string;
  source?: {
    type: string;
    path: string;
    text?: {
      start: number;
      end: number;
      value: string;
    };
  };
}

interface TextPart {
  id?: string;
  sessionID?: string;
  messageID?: string;
  type: "text";
  text: string;
  source?: {
    text?: {
      start: number;
      end: number;
      value: string;
    };
  };
}

type Part = FilePart | TextPart | { type: string; [key: string]: any };

interface Message {
  id?: string;
  sessionID?: string;
  role?: string;
  [key: string]: any;
}

interface ChatMessageInput {
  sessionID: string;
  agent?: string;
  model?: { providerID: string; modelID: string };
  messageID?: string;
  variant?: string;
}

interface ChatMessageOutput {
  message: any;
  parts: Part[];
}

interface MessagesTransformOutput {
  messages: {
    info: Message;
    parts: Part[];
  }[];
}

type Plugin = (input: PluginInput) => Promise<{
  "chat.message"?: (
    input: ChatMessageInput,
    output: ChatMessageOutput
  ) => Promise<void>;
  "experimental.chat.messages.transform"?: (
    input: {},
    output: MessagesTransformOutput
  ) => Promise<void>;
  command?: Record<string, () => Promise<void>>;
}>;

const DEFAULT_CONFIG: PluginConfig = {
  maxStorageMB: 2048,
  minFreeSpaceMB: 512,
  storageDir: path.join(os.homedir(), ".local/share/opencode/storage/images"),
};

/**
 * OpenCode Image Storage Plugin
 *
 * 功能：
 * 1. 监听用户消息中的图片（粘贴或拖入）
 * 2. 将 base64 图片保存为本地文件
 * 3. 替换消息中的 [Image N] 占位符为实际文件路径
 * 4. 移除 FilePart，只保留文本（避免不支持图片的模型报错）
 */
export const ImageStoragePlugin: Plugin = async ({ client, directory }) => {
  const config: PluginConfig = {
    ...DEFAULT_CONFIG,
  };

  const storageManager = new ImageStorageManager(config);
  await storageManager.initialize();

  console.log(
    `[ImageStoragePlugin] Initialized. Storage dir: ${config.storageDir}`
  );

  /**
   * 处理消息中的图片
   */
  async function processImageParts(parts: Part[]): Promise<{
    modified: boolean;
    imagePaths: Map<string, string>;
  }> {
    const imagePathMap = new Map<string, string>();

    // 查找所有图片 parts
    const imageParts = parts.filter(
      (p): p is FilePart =>
        p.type === "file" &&
        typeof (p as FilePart).mime === "string" &&
        (p as FilePart).mime.startsWith("image/")
    );

    if (imageParts.length === 0) {
      return { modified: false, imagePaths: imagePathMap };
    }

    console.log(
      `[ImageStoragePlugin] Processing ${imageParts.length} image(s)...`
    );

    for (let i = 0; i < imageParts.length; i++) {
      const imagePart = imageParts[i];
      const imageIndex = i + 1;
      const placeholder = `[Image ${imageIndex}]`;

      try {
        // 检查是否是 base64 data URL
        if (imagePart.url && imagePart.url.startsWith("data:image/")) {
          const imagePath = await storageManager.saveImageAndReturnPath(
            imagePart.url,
            `msg_${Date.now()}`
          );

          if (imagePath) {
            imagePathMap.set(placeholder, imagePath);
            console.log(
              `[ImageStoragePlugin] ✅ Saved ${placeholder} -> ${imagePath}`
            );
          }
        } else if (
          imagePart.source?.path &&
          imagePart.source.path !== "clipboard" &&
          imagePart.source.path !== ""
        ) {
          // 已经是文件路径（拖入的文件）
          const existingPath = imagePart.source.path;
          imagePathMap.set(placeholder, existingPath);
          console.log(
            `[ImageStoragePlugin] ℹ️ Using existing path for ${placeholder}: ${existingPath}`
          );
        }
      } catch (error) {
        console.error(
          `[ImageStoragePlugin] ❌ Error processing ${placeholder}:`,
          error
        );
      }
    }

    return { modified: imagePathMap.size > 0, imagePaths: imagePathMap };
  }

  /**
   * 修改文本内容：替换占位符、去重路径、添加提示
   */
  function modifyTextContent(
    text: string,
    imagePathMap: Map<string, string>
  ): string {
    let newText = text;
    const allPaths = Array.from(imagePathMap.values());

    // 1. 先从文本中移除所有已知的图片路径（去重）
    for (const imagePath of allPaths) {
      const escapedPath = imagePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // 移除所有该路径的出现（包括前后的空格）
      const pathPattern = new RegExp(`\\s*${escapedPath}`, "g");
      newText = newText.replace(pathPattern, "");
    }

    // 2. 替换 [Image N] 占位符为路径
    for (const [placeholder, imagePath] of imagePathMap) {
      const escapedPlaceholder = placeholder.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const placeholderPattern = new RegExp(escapedPlaceholder, "g");
      newText = newText.replace(placeholderPattern, imagePath);
    }

    // 3. 清理多余的空格和换行
    newText = newText.replace(/\s+/g, " ").trim();

    // 4. 添加图片读取提示
    const hint = `\n\n[Image Reference: The above path(s) point to local image file(s). Please use the "read" tool to view the image content.]`;
    newText = newText + hint;

    return newText;
  }

  /**
   * 移除图片 FilePart
   */
  function removeImageParts(parts: Part[]): void {
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (
        part.type === "file" &&
        (part as FilePart).mime?.startsWith("image/")
      ) {
        const removed = parts.splice(i, 1)[0] as FilePart;
        console.log(
          `[ImageStoragePlugin] 🗑️ Removed FilePart: ${removed.filename || "clipboard"}`
        );
      }
    }
  }

  return {
    /**
     * chat.message hook - 在用户消息发送时处理
     */
    "chat.message": async (
      input: ChatMessageInput,
      output: ChatMessageOutput
    ) => {
      console.log("[ImageStoragePlugin] chat.message hook triggered");
      
      const { parts } = output;
      const { modified, imagePaths } = await processImageParts(parts);

      if (!modified) {
        return;
      }

      // 查找文本 part
      const textPart = parts.find((p): p is TextPart => p.type === "text");

      if (textPart && textPart.text) {
        textPart.text = modifyTextContent(textPart.text, imagePaths);
        console.log(
          `[ImageStoragePlugin] ✅ Updated text: "${textPart.text.substring(0, 150)}..."`
        );
      }

      // 移除图片 FilePart
      removeImageParts(parts);
      console.log(`[ImageStoragePlugin] ✅ Final parts count: ${parts.length}`);
    },

    /**
     * experimental.chat.messages.transform hook - 在发送给模型前转换消息
     * 这是一个更底层的 hook，可以修改整个消息历史
     */
    "experimental.chat.messages.transform": async (
      input: {},
      output: MessagesTransformOutput
    ) => {
      console.log("[ImageStoragePlugin] messages.transform hook triggered");
      
      for (const message of output.messages) {
        // 只处理用户消息
        if (message.info?.role !== "user") continue;

        const { parts } = message;
        const { modified, imagePaths } = await processImageParts(parts);

        if (!modified) {
          continue;
        }

        // 查找文本 part
        const textPart = parts.find((p): p is TextPart => p.type === "text");

        if (textPart && textPart.text) {
          textPart.text = modifyTextContent(textPart.text, imagePaths);
          console.log(
            `[ImageStoragePlugin] ✅ [transform] Updated text: "${textPart.text.substring(0, 100)}..."`
          );
        }

        // 移除图片 FilePart
        removeImageParts(parts);
        console.log(
          `[ImageStoragePlugin] ✅ [transform] Final parts count: ${parts.length}`
        );
      }
    },

    command: {
      "cleanup-images": async () => {
        const deletedCount = await storageManager.cleanup();
        console.log(`[ImageStoragePlugin] Deleted ${deletedCount} images`);
      },

      "show-storage": async () => {
        const stats = await storageManager.getStats();
        console.log("=== Image Storage Stats ===");
        console.log(`Total Files: ${stats.totalFiles}`);
        console.log(`Total Size: ${formatSize(stats.totalSize)}`);
        console.log(`Oldest File: ${stats.oldestFile || "N/A"}`);
        console.log(`Newest File: ${stats.newestFile || "N/A"}`);
        console.log(`Storage Dir: ${config.storageDir}`);
        console.log(`Max Storage: ${config.maxStorageMB} MB`);
      },
    },
  };
};

export default ImageStoragePlugin;
