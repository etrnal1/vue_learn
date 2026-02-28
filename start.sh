#!/bin/bash

# Vue Learning App 快速启动脚本

echo "🚀 Vue 学习参考应用启动脚本"
echo "================================"

# 检查 Node.js
echo "✅ 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    echo "请访问 https://nodejs.org 下载安装"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 检查依赖
echo ""
echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "⏳ 安装依赖中... (首次启动会较慢)"
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已安装"
fi

# 启动服务器
echo ""
echo "🎯 启动开发服务器..."
echo "📍 访问地址: http://localhost:5173"
echo ""
echo "💡 快捷键:"
echo "   - h: 显示帮助"
echo "   - q: 停止服务器"
echo ""

npm run dev
