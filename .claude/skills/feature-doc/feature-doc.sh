#!/bin/bash

# Feature Doc Generator - 功能说明书生成脚本
# 用法: ./feature-doc.sh "功能名称"

set -e

FEATURE_NAME="${1:-}"

if [ -z "$FEATURE_NAME" ]; then
    echo "用法: /feature-doc <功能名称>"
    echo ""
    echo "示例:"
    echo "  /feature-doc 自动保存功能"
    echo "  /feature-doc 步骤预览"
    echo "  /feature-doc 移动端响应式"
    exit 1
fi

echo "🔍 分析功能: $FEATURE_NAME"
echo ""

# 获取最近的提交信息
LATEST_COMMIT=$(git log --oneline -1)
echo "📝 最近提交: $LATEST_COMMIT"
echo ""

# 获取修改的文件列表
echo "📋 修改的文件:"
git diff HEAD~1 HEAD --name-only | head -20
echo ""

# 分析代码变更
echo "📊 统计信息:"
git diff HEAD~1 HEAD --stat
echo ""

echo "✅ 功能分析完成！"
echo ""
echo "💡 提示: 现在请使用 /feature-doc 命令来生成完整的说明书"
echo "   Claude 会根据代码变更自动生成设计文档"
