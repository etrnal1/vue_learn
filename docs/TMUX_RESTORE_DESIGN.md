# tmux 恢复设计（第一版）

## 目标

这套方案用于在 macOS 登录后，自动恢复一个面向开发环境的 `tmux` 工作台：

- 自动创建 `tmux session`
- 自动拉起前端与后端开发命令
- 保留一个交互 shell 窗口
- 通过 `LaunchAgent` 在登录后自动执行恢复脚本

> 注意：`tmux` 方案恢复的是“工作台结构 + 启动命令”，不是恢复重启前的原始进程现场。

## 文件说明

- 恢复脚本：`scripts/restore-tmux-services.sh`
- LaunchAgent 模板：`docs/templates/com.mac.tmux-restore.plist`

## 默认恢复结构

恢复脚本会创建一个名为 `dev` 的 `tmux session`，并包含以下窗口：

- `app`：执行 `npm run client:test`
- `server`：执行 `npm run server:test`
- `shell`：进入项目根目录，留作手工操作

## 安装步骤

### 1. 赋予脚本执行权限

```bash
chmod +x /Users/mac/vue-learning-app/scripts/restore-tmux-services.sh
```

### 2. 复制 plist 到 LaunchAgents

```bash
mkdir -p ~/Library/LaunchAgents
cp /Users/mac/vue-learning-app/docs/templates/com.mac.tmux-restore.plist ~/Library/LaunchAgents/com.mac.tmux-restore.plist
```

### 3. 加载 LaunchAgent

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.mac.tmux-restore.plist
launchctl kickstart -k gui/$(id -u)/com.mac.tmux-restore
```

### 4. 连接 tmux

```bash
tmux attach -t dev
```

## 卸载

```bash
launchctl bootout gui/$(id -u)/com.mac.tmux-restore
rm -f ~/Library/LaunchAgents/com.mac.tmux-restore.plist
```

## 适用场景

适合：

- 本机开发环境恢复
- 多窗口命令编排
- 登录后快速恢复开发现场

不适合：

- 生产常驻服务托管
- 需要自动重试/自动保活的后台进程
- 依赖严格服务状态管理的场景

## 建议组合

推荐最终采用以下分层方案：

- `brew services`：托管 `mysql`、`gitea` 等常驻服务
- `LaunchAgent`：登录后执行 `tmux` 恢复脚本
- `tmux`：承载交互式开发工作台

也就是说：

1. 正式服务交给 `brew services / launchd`
2. 开发工作台交给 `tmux`
3. 用 `LaunchAgent` 负责把两者在登录后串起来

## 后续建议

下一版可以继续补：

- 按你的真实服务拆分窗口与 pane
- 支持从页面导出恢复脚本
- 支持从“主机服务总览”直接生成 Launch 任务
- 增加多 session 模板（如 `dev` / `ops` / `crawler`）
