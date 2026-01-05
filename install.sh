#!/bin/bash

# OpenCode TUI Image Clipboard Fix - 一键安装脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/A11thwn/opencode-tui-image-clipboard-fix/main/install.sh | bash

set -e

PLUGIN_NAME="github:A11thwn/opencode-tui-image-clipboard-fix"
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
    echo "   如需重新安装，请先从配置中移除插件"
    exit 0
fi

# 备份配置文件
cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
echo "📦 已备份配置文件到: $CONFIG_FILE.backup"

# 检查是否有 jq 命令
if command -v jq &> /dev/null; then
    # 使用 jq 添加插件
    jq --arg plugin "$PLUGIN_NAME" '.plugin += [$plugin]' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    echo "✅ 已使用 jq 添加插件到配置"
else
    # 使用 sed 添加插件（简单方式）
    # 查找 "plugin": [ 并在下一行添加插件
    if grep -q '"plugin"' "$CONFIG_FILE"; then
        # macOS 和 Linux 的 sed 语法不同
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' 's/"plugin": \[/"plugin": [\
        "'"$PLUGIN_NAME"'",/' "$CONFIG_FILE"
        else
            sed -i 's/"plugin": \[/"plugin": [\n        "'"$PLUGIN_NAME"'",/' "$CONFIG_FILE"
        fi
        echo "✅ 已使用 sed 添加插件到配置"
    else
        echo "❌ 错误: 配置文件中没有找到 plugin 数组"
        echo "   请手动添加以下内容到 opencode.json 的 plugin 数组中:"
        echo '   "github:A11thwn/opencode-tui-image-clipboard-fix"'
        exit 1
    fi
fi

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
