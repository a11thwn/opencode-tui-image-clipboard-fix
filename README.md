# OpenCode TUI Image Clipboard Fix

修复 OpenCode TUI 中图片粘贴的问题：自动将剪贴板中的图片保存为本地文件，并替换 `[Image N]` 占位符为实际文件路径。

## 🚀 安装

在 `~/.config/opencode/opencode.json` 的 `plugin` 数组中添加：

```json
{
  "plugin": ["opencode-tui-image-clipboard-fix@latest"]
}
```

重启 OpenCode 即可，插件会自动下载安装。

## 🗑️ 卸载

从配置中删除该行，重启 OpenCode。

## ✨ 功能特性

- ✅ **自动保存图片**：将 base64 图片数据保存为本地文件
- ✅ **路径替换**：自动替换 `[Image 1]` 占位符为 `/path/to/image.png`
- ✅ **去重检测**：使用 SHA-256 哈希避免保存重复图片
- ✅ **LRU 清理**：当存储超过限制时自动删除最旧的图片
- ✅ **移除 FilePart**：避免不支持图片的模型报错
- ✅ **自动提示**：添加提示让模型使用 `read` 工具读取图片

## 🔧 工作原理

```
┌─────────────────────────────────────────────────────┐
│                OpenCode TUI                         │
│  用户粘贴图片                                        │
│  ↓                                                  │
│  生成 FilePart (url: "data:image/...;base64,...")  │
│  消息文本包含 [Image 1] 占位符                       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           Image Clipboard Fix Plugin                │
│  1. 监听 chat.message hook                          │
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

## ⚙️ 配置

默认配置：

- **存储目录**: `~/.local/share/opencode/storage/images`
- **最大存储**: 2048 MB
- **最小剩余空间**: 512 MB

## 📝 支持的格式

- PNG (支持尺寸提取)
- JPEG/JPG
- GIF
- WebP

## 🐛 解决的问题

1. **粘贴图片识别问题**：将 base64 图片保存为文件，替换占位符为路径
2. **模型不支持图片报错**：移除 FilePart，只发送文本路径
3. **图片读取提示**：自动添加提示让模型使用 read 工具读取图片

## 🔗 相关链接

- [OpenCode](https://opencode.ai)
- [GitHub Issues](https://github.com/chanliang/opencode-tui-image-clipboard-fix/issues)

## 📄 License

MIT
