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

# 尝试使用 jq 添加插件
if command -v jq &> /dev/null; then
    # 先验证 JSON 是否有效
    if jq empty "$CONFIG_FILE" 2>/dev/null; then
        jq --arg plugin "$PLUGIN_NAME" '.plugin += [$plugin]' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
        echo "✅ 已使用 jq 添加插件到配置"
    else
        echo "⚠️  JSON 语法错误，尝试使用 sed 方式..."
        # 使用 sed 方式
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' 's/"plugin": \[/"plugin": [\
        "'"$PLUGIN_NAME"'",/' "$CONFIG_FILE"
        else
            # Linux
            sed -i 's/"plugin": \[/"plugin": [\n        "'"$PLUGIN_NAME"'",/' "$CONFIG_FILE"
        fi
        echo "✅ 已使用 sed 添加插件到配置"
    fi
else
    # 没有 jq，使用 sed
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's/"plugin": \[/"plugin": [\
        "'"$PLUGIN_NAME"'",/' "$CONFIG_FILE"
    else
        sed -i 's/"plugin": \[/"plugin": [\n        "'"$PLUGIN_NAME"'",/' "$CONFIG_FILE"
    fi
    echo "✅ 已使用 sed 添加插件到配置"
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
    echo "❌ 安装失败，请手动添加以下内容到 $CONFIG_FILE 的 plugin 数组中:"
    echo '   "github:A11thwn/opencode-tui-image-clipboard-fix"'
    echo ""
    echo "📦 原配置文件已备份到: $CONFIG_FILE.backup"
    exit 1
fi
