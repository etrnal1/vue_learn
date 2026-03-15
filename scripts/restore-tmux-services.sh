#!/bin/bash

set -euo pipefail

ROOT_DIR="/Users/mac/vue-learning-app"
TMUX_SESSION="dev"

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux 未安装，请先安装 tmux。" >&2
  exit 1
fi

if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
  echo "tmux session '$TMUX_SESSION' 已存在，跳过重建。"
  exit 0
fi

tmux new-session -d -s "$TMUX_SESSION" -n app
tmux send-keys -t "$TMUX_SESSION":app "cd $ROOT_DIR && npm run client:test" C-m

tmux new-window -t "$TMUX_SESSION" -n server
tmux send-keys -t "$TMUX_SESSION":server "cd $ROOT_DIR && npm run server:test" C-m

tmux new-window -t "$TMUX_SESSION" -n shell
tmux send-keys -t "$TMUX_SESSION":shell "cd $ROOT_DIR" C-m

echo "tmux 恢复完成，可执行: tmux attach -t $TMUX_SESSION"
