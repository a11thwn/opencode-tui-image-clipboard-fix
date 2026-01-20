import * as os from "os";
import * as path from "path";
import { ImageStorageManager } from "./storage.js";
import { PluginConfig } from "./types.js";
import { formatSize } from "./utils.js";

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

// 存储每个消息的图片路径映射（messageID -> imagePaths）
const messageImagePaths = new Map<string, Map<string, string>>();

/**
 * OpenCode Image Storage Plugin
 *
 * 功能：
 * 1. 监听用户消息中的图片（粘贴或拖入）
 * 2. 将 base64 图片保存为本地文件
 * 3. 在发送给模型时替换 [Image N] 占位符为实际文件路径（不影响界面显示）
 * 4. 移除 FilePart，只保留文本（避免不支持图片的模型报错）
 */
// Plugin implementation with specific function name for better identification
export const ImageClipboardFix: Plugin = async ({ client, directory }: PluginInput) => {
  const config: PluginConfig = {
    ...DEFAULT_CONFIG,
  };

  const storageManager = new ImageStorageManager(config);
  await storageManager.initialize();

  /**
   * 处理消息中的图片，保存并返回路径映射
   * @param parts 消息的 parts 数组
   * @param saveImages 是否保存图片（chat.message 时保存，transform 时不保存）
   */
  async function processImageParts(
    parts: Part[],
    saveImages: boolean = true
  ): Promise<{
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

    for (let i = 0; i < imageParts.length; i++) {
      const imagePart = imageParts[i];
      const imageIndex = i + 1;
      const placeholder = `[Image ${imageIndex}]`;

      try {
        // 检查是否是 base64 data URL（粘贴的图片）
        if (imagePart.url && imagePart.url.startsWith("data:image/")) {
          if (saveImages) {
            const imagePath = await storageManager.saveImageAndReturnPath(
              imagePart.url,
              `msg_${Date.now()}`
            );
            if (imagePath) {
              imagePathMap.set(placeholder, imagePath);
            }
          }
        } else if (
          imagePart.source?.path &&
          imagePart.source.path !== "clipboard" &&
          imagePart.source.path !== ""
        ) {
          // 已经是文件路径（拖入的文件）
          imagePathMap.set(placeholder, imagePart.source.path);
        }
      } catch (error) {
        console.error(
          `[ImageStoragePlugin] Error processing image ${imageIndex}:`,
          error
        );
      }
    }

    return { modified: imagePathMap.size > 0, imagePaths: imagePathMap };
  }

  /**
   * 修改文本内容：替换占位符、去重路径、添加提示
   * 只在 transform hook 中使用，不影响界面显示
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
   * 移除图片 FilePart（静默，不打印日志）
   */
  function removeImagePartsSilently(parts: Part[]): void {
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (
        part.type === "file" &&
        (part as FilePart).mime?.startsWith("image/")
      ) {
        parts.splice(i, 1);
      }
    }
  }

  return {
    /**
     * chat.message hook - 在用户消息发送时处理
     * 只负责：1. 保存图片 2. 记录路径映射 3. 移除 FilePart
     * 不修改 textPart.text，避免修改后的内容显示在界面上
     */
    "chat.message": async (
      input: ChatMessageInput,
      output: ChatMessageOutput
    ) => {
      const { parts } = output;
      const { modified, imagePaths } = await processImageParts(parts, true);

      if (!modified) {
        return;
      }

      // 保存图片路径映射，供 transform hook 使用
      const messageKey = input.messageID || `msg_${Date.now()}`;
      messageImagePaths.set(messageKey, imagePaths);

      // 移除图片 FilePart（避免不支持图片的模型报错）
      removeImagePartsSilently(parts);
    },

    /**
     * experimental.chat.messages.transform hook - 在发送给模型前转换消息
     * 在这里进行文本替换，确保模型收到的是完整的图片路径
     * 这个修改只影响发送给模型的内容，不影响界面显示
     */
    "experimental.chat.messages.transform": async (
      input: {},
      output: MessagesTransformOutput
    ) => {
      for (const message of output.messages) {
        // 只处理用户消息
        if (message.info?.role !== "user") continue;

        const { parts } = message;

        // 尝试从缓存获取图片路径
        let imagePaths: Map<string, string> | undefined;
        if (message.info?.id) {
          imagePaths = messageImagePaths.get(message.info.id);
        }

        // 如果缓存中没有，尝试从 parts 中提取（可能是历史消息）
        if (!imagePaths || imagePaths.size === 0) {
          const result = await processImageParts(parts, false);
          if (result.modified) {
            imagePaths = result.imagePaths;
          }
        }

        // 如果有图片路径，替换文本中的占位符
        if (imagePaths && imagePaths.size > 0) {
          const textPart = parts.find((p): p is TextPart => p.type === "text");
          if (textPart && textPart.text && !textPart.text.includes("[Image Reference:")) {
            textPart.text = modifyTextContent(textPart.text, imagePaths);
          }
        }

        // 移除图片 FilePart
        removeImagePartsSilently(parts);
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

      "clear-cache": async () => {
        messageImagePaths.clear();
        console.log(`[ImageStoragePlugin] Cleared image path cache`);
      },
    },
  };
};

export default ImageClipboardFix;
