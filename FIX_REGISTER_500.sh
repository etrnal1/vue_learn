#!/bin/bash

echo "🔧 正在修复注册 500 错误..."
echo ""
echo "步骤 1: 停止当前运行的后端和前端"
echo "如果有正在运行的服务，请按 Ctrl+C 停止"
echo ""
echo "步骤 2: 运行数据库初始化"
echo ""

cd /Users/mac/vue-learning-app

# 初始化测试数据库
echo "📦 初始化数据库..."
npm run init-db:test

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 数据库初始化失败"
    echo "可能的原因："
    echo "1. MySQL 未启动（请启动 MySQL）"
    echo "2. 数据库连接配置错误（检查 server/.env）"
    echo "3. 数据库权限不足"
    exit 1
fi

echo ""
echo "✅ 数据库初始化成功"
echo ""
echo "步骤 3: 重启后端"
echo "运行命令："
echo ""
echo "  npm run server:test"
echo ""
echo "步骤 4: 在新终端启动前端"
echo "运行命令："
echo ""
echo "  npm run client:test"
echo ""
echo "步骤 5: 尝试注册"
echo "访问 http://localhost:5173 并尝试注册"
echo ""
echo "✅ 修复步骤完成"
