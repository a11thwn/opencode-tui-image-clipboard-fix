#!/bin/bash

# OpenCode TUI Image Clipboard Fix - 一键安装脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/chanliang/opencode-tui-image-clipboard-fix/main/install.sh | bash

PLUGIN_NAME="github:chanliang/opencode-tui-image-clipboard-fix"
CONFIG_FILE="$HOME/.config/opencode/opencode.json"

echo "🔧 OpenCode TUI Image Clipboard Fix 安装脚本"
echo "============================================"
echo ""

# 检查 opencode.json 是否存在
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 错误: 找不到 OpenCode 配置文件: $CONFIG_FILE"
    echo "   请先安装并运行一次 OpenCode"
    exit 1
fi

# 检查是否已经安装
if grep -q "opencode-tui-image-clipboard-fix" "$CONFIG_FILE"; then
    echo "✅ 插件已经安装!"
    exit 0
fi

# 备份配置文件
cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
echo "📦 已备份配置文件到: $CONFIG_FILE.backup"

# 使用 Python 添加插件（macOS 和 Linux 都有 Python）
if command -v python3 &> /dev/null; then
    python3 << EOF
import json
import sys

config_file = "$CONFIG_FILE"
plugin_name = "$PLUGIN_NAME"

try:
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    if 'plugin' not in config:
        config['plugin'] = []
    
    if plugin_name not in config['plugin']:
        config['plugin'].append(plugin_name)
    
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=4)
    
    print("✅ 已添加插件到配置")
except Exception as e:
    print(f"❌ 错误: {e}")
    sys.exit(1)
EOF
elif command -v python &> /dev/null; then
    python << EOF
import json
import sys

config_file = "$CONFIG_FILE"
plugin_name = "$PLUGIN_NAME"

try:
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    if 'plugin' not in config:
        config['plugin'] = []
    
    if plugin_name not in config['plugin']:
        config['plugin'].append(plugin_name)
    
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=4)
    
    print("✅ 已添加插件到配置")
except Exception as e:
    print(f"❌ 错误: {e}")
    sys.exit(1)
EOF
else
    echo "❌ 错误: 需要 Python 来安装插件"
    echo ""
    echo "📝 请手动添加以下内容到 $CONFIG_FILE 的 plugin 数组中:"
    echo "   \"$PLUGIN_NAME\""
    exit 1
fi

# 验证安装是否成功
if grep -q "opencode-tui-image-clipboard-fix" "$CONFIG_FILE"; then
    echo ""
    echo "🎉 安装完成!"
    echo ""
    echo "📋 插件功能:"
    echo "   - 自动保存粘贴/拖入的图片到本地文件"
    echo "   - 替换 [Image N] 占位符为实际文件路径"
    echo "   - 修复不支持图片的模型报错问题"
    echo ""
    echo "🚀 请重启 OpenCode 以加载插件"
    echo ""
else
    echo ""
    echo "❌ 安装失败"
    echo "📝 请手动添加以下内容到 $CONFIG_FILE 的 plugin 数组中:"
    echo "   \"$PLUGIN_NAME\""
    exit 1
fi
