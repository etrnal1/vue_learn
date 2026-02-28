#!/bin/bash
# Stop Hook: 任务完成后自动检测未提交变更并触发 /commit 技能
# 触发时机: Claude Code 准备结束任务时
# 行为: 有未提交变更 → 阻止退出，要求执行 /commit
#       无变更 → 放行

set -euo pipefail

# 读取 hook 输入（JSON 格式，包含 session 信息）
INPUT=$(cat)

# --- 防止无限循环 ---
# 提交操作本身会再次触发 Stop hook
# 用标志文件跳过二次触发
LOCK_FILE="/tmp/claude_stop_hook_active_$$"

# 检查是否在提交流程中（父进程可能设置了标志）
PROJECT_LOCK="/tmp/claude_auto_commit_lock"
if [ -f "$PROJECT_LOCK" ]; then
  # 正在提交中，检查是否超时（超过 120 秒视为残留锁）
  LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$PROJECT_LOCK" 2>/dev/null || echo 0) ))
  if [ "$LOCK_AGE" -lt 120 ]; then
    exit 0  # 提交流程中，正常放行
  else
    rm -f "$PROJECT_LOCK"  # 清理过期锁
  fi
fi

# --- 切换到项目目录 ---
if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  cd "$CLAUDE_PROJECT_DIR"
elif [ -n "${PROJECT_DIR:-}" ]; then
  cd "$PROJECT_DIR"
fi

# 确认在 git 仓库中
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  exit 0  # 不是 git 仓库，直接放行
fi

# --- 检测未提交的变更 ---
# 1. 已暂存但未提交的文件 (git diff --cached)
# 2. 已修改但未暂存的文件 (git diff)
# 3. 新增的未跟踪文件 (git ls-files --others)
HAS_STAGED=false
HAS_MODIFIED=false
HAS_UNTRACKED=false

if ! git diff --cached --quiet 2>/dev/null; then
  HAS_STAGED=true
fi

if ! git diff --quiet 2>/dev/null; then
  HAS_MODIFIED=true
fi

UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)
if [ -n "$UNTRACKED" ]; then
  HAS_UNTRACKED=true
fi

# 没有任何变更，正常放行
if [ "$HAS_STAGED" = false ] && [ "$HAS_MODIFIED" = false ] && [ "$HAS_UNTRACKED" = false ]; then
  exit 0
fi

# --- 统计变更概要 ---
STAGED_COUNT=0
MODIFIED_COUNT=0
UNTRACKED_COUNT=0

if [ "$HAS_STAGED" = true ]; then
  STAGED_COUNT=$(git diff --cached --name-only | wc -l | tr -d ' ')
fi
if [ "$HAS_MODIFIED" = true ]; then
  MODIFIED_COUNT=$(git diff --name-only | wc -l | tr -d ' ')
fi
if [ "$HAS_UNTRACKED" = true ]; then
  UNTRACKED_COUNT=$(echo "$UNTRACKED" | wc -l | tr -d ' ')
fi

TOTAL=$(( STAGED_COUNT + MODIFIED_COUNT + UNTRACKED_COUNT ))

# --- 创建锁文件防止循环 ---
touch "$PROJECT_LOCK"

# --- 阻止退出，要求提交 ---
REASON="检测到 ${TOTAL} 个未提交的变更"
if [ "$MODIFIED_COUNT" -gt 0 ]; then
  REASON="${REASON}（${MODIFIED_COUNT} 个已修改）"
fi
if [ "$UNTRACKED_COUNT" -gt 0 ]; then
  REASON="${REASON}（${UNTRACKED_COUNT} 个新文件）"
fi
if [ "$STAGED_COUNT" -gt 0 ]; then
  REASON="${REASON}（${STAGED_COUNT} 个已暂存）"
fi
REASON="${REASON}，请调用 /commit 技能提交更新后再结束任务。"

# 输出 JSON 格式的阻止指令
cat <<EOF
{"decision": "block", "reason": "$REASON"}
EOF
