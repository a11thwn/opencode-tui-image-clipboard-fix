# OpenCode Image Storage Plugin

Automatically save base64-encoded images as standalone files with intelligent storage management.

## Features

- **Automatic Conversion**: Converts base64 image data URLs to standalone files
- **Intelligent Storage**: LRU cleanup when storage exceeds configured limits
- **Duplicate Detection**: Avoids saving the same image multiple times using hash comparison
- **PNG Dimension Extraction**: Automatically extracts width/height for PNG images
- **Storage Statistics**: View total files, size, and date range via command

## Installation

```bash
cd ~/.local/share/opencode/plugins
git clone <repository-url> opencode-image-storage
cd opencode-image-storage
npm install
npm run build
```

## Configuration

Default configuration:
```json
{
  "maxStorageMB": 2048,
  "minFreeSpaceMB": 512,
  "storageDir": "~/.local/share/opencode/storage/images"
}
```

Override in your OpenCode config:
```json
{
  "plugins": {
    "opencode-image-storage": {
      "maxStorageMB": 4096,
      "minFreeSpaceMB": 1024,
      "storageDir": "/custom/path/to/images"
    }
  }
}
```

## Commands

### `opencode:cleanup-images`
Manually delete all stored images.

### `opencode:show-storage`
Display storage statistics:
- Total files count
- Total storage size
- Oldest/newest file timestamps
- Storage directory path
- Max storage limit

## How It Works

1. **Image Detection**: Listens to `message.updated` events
2. **Extraction**: Finds base64 data URLs in message parts
3. **Deduplication**: Checks SHA-256 hash to avoid duplicates
4. **Storage**: Saves images as `{timestamp}_{hash}.{ext}`
5. **Metadata**: Tracks file info in `metadata.json`
6. **Cleanup**: Auto-deletes oldest files when limit exceeded

## Output Example

```
Saved image: ~/.local/share/opencode/storage/images/1704067200000_a1b2c3d4e5f6g7h8.png (342.5 KB, 1920x1080)
Image already exists: ~/.local/share/opencode/storage/images/1704067100000_xyz123abc456.jpg (128.3 KB)
Cleanup complete. Freed 512.0 MB
```

## Supported Formats

- PNG (with dimension extraction)
- JPEG/JPG
- GIF
- WebP

## License

MIT
