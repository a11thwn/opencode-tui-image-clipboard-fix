# OpenCode TUI Image Clipboard Fix

修复 OpenCode TUI 中图片粘贴和拖入的问题：自动将图片保存为本地文件，并替换 `[Image N]` 占位符为实际文件路径。

[![npm version](https://badge.fury.io/js/opencode-tui-image-clipboard-fix.svg)](https://www.npmjs.com/package/opencode-tui-image-clipboard-fix)

## 安装

### 方式一：npm 安装（推荐）

在 `opencode.json` 中添加插件：

```json
{
  "plugin": ["opencode-tui-image-clipboard-fix"]
}
```

OpenCode 会自动通过 Bun 安装依赖。

### 方式二：本地安装

```bash
git clone https://github.com/chanliang/opencode-image-storage.git
cd opencode-image-storage
npm install
npm run build
```

然后在 `opencode.json` 中配置：

```json
{
  "plugin": ["/path/to/opencode-image-storage"]
}
```

## 功能特性

- ✅ **自动保存图片**：将 base64 图片数据保存为本地文件
- ✅ **路径替换**：自动替换 `[Image 1]` 占位符为 `/path/to/image.png`
- ✅ **去重检测**：使用 SHA-256 哈希避免保存重复图片
- ✅ **LRU 清理**：当存储超过限制时自动删除最旧的图片
- ✅ **移除 FilePart**：避免不支持图片的模型报错
- ✅ **PNG 尺寸提取**：自动提取 PNG 图片的宽高信息

## 工作原理

```
┌─────────────────────────────────────────────────────┐
│                OpenCode TUI                         │
│  用户粘贴/拖入图片                                    │
│  ↓                                                  │
│  生成 FilePart (url: "data:image/...;base64,...")  │
│  消息文本包含 [Image 1] 占位符                       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           Image Storage Plugin                       │
│  1. 监听 chat.message 和 messages.transform hook    │
│  2. 检测图片 FilePart                               │
│  3. 提取 base64 数据，保存为本地文件                   │
│  4. 替换文本中的 [Image N] 为实际路径                 │
│  5. 移除 FilePart（避免模型报错）                    │
│  6. 添加提示让模型使用 read 工具读取图片              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                最终消息                              │
│  "请分析这张图片 /path/to/image.png                  │
│   [Image Reference: ...]"                           │
│  模型使用 read 工具读取图片                          │
└─────────────────────────────────────────────────────┘
```

## 配置

默认配置：

- **存储目录**: `~/.local/share/opencode/storage/images`
- **最大存储**: 2048 MB
- **最小剩余空间**: 512 MB

## 命令

在 OpenCode 中可以使用以下命令：

| 命令              | 说明                   |
| ----------------- | ---------------------- |
| `/cleanup-images` | 手动删除所有存储的图片 |
| `/show-storage`   | 显示存储统计信息       |

## 支持的格式

- PNG (支持尺寸提取)
- JPEG/JPG
- GIF
- WebP

## 解决的问题

1. **粘贴图片识别问题**：将 base64 图片保存为文件，替换占位符为路径
2. **模型不支持图片报错**：移除 FilePart，只发送文本路径

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 监听模式
npm run dev

# 清理
npm run clean
```

## License

MIT
