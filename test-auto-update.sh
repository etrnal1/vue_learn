#!/bin/bash

echo "🧪 测试 Git 提交历史自动更新功能"
echo "=================================="
echo ""

# 1. 检查 git hook
echo "1️⃣ 检查 Git Hook..."
if [ -f ".git/hooks/post-commit" ]; then
    echo "   ✅ post-commit hook 存在"
    if [ -x ".git/hooks/post-commit" ]; then
        echo "   ✅ hook 有执行权限"
    else
        echo "   ❌ hook 没有执行权限，正在修复..."
        chmod +x .git/hooks/post-commit
        echo "   ✅ 已添加执行权限"
    fi
else
    echo "   ❌ post-commit hook 不存在"
fi
echo ""

# 2. 创建测试提交
echo "2️⃣ 创建测试提交..."
TEST_FILE="test-auto-update-$(date +%s).txt"
echo "Test auto-update at $(date)" > "$TEST_FILE"
git add "$TEST_FILE"
git commit -m "测试: 自动更新功能测试 $(date +%H:%M:%S)"
echo ""

# 3. 检查 git-log.json 是否更新
echo "3️⃣ 检查 git-log.json 文件..."
if [ -f "public/git-log.json" ]; then
    LAST_MODIFIED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" public/git-log.json)
    echo "   ✅ 文件存在"
    echo "   📅 最后修改: $LAST_MODIFIED"

    # 检查生成时间
    GENERATED_AT=$(grep -o '"generatedAt":"[^"]*"' public/git-log.json | cut -d'"' -f4)
    echo "   🕒 生成时间: $GENERATED_AT"
else
    echo "   ❌ 文件不存在"
fi
echo ""

# 4. 清理测试文件
echo "4️⃣ 清理测试文件..."
git rm "$TEST_FILE"
git commit -m "清理: 删除自动更新测试文件"
echo "   ✅ 测试文件已清理"
echo ""

echo "=================================="
echo "✅ 测试完成！"
echo ""
echo "📋 下一步操作："
echo "   1. 打开浏览器访问 http://localhost:5173"
echo "   2. 进入 ITSM → 📋 提交历史"
echo "   3. 打开浏览器控制台 (F12)"
echo "   4. 观察控制台输出，应该看到："
echo "      - 🔍 检查新的提交..."
echo "      - 🔄 检测到新的提交，自动更新数据..."
echo ""
echo "⏱️  等待最多 30 秒，页面会自动显示新提交"
