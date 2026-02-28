---
name: commit
description: 智能分析变更文件并按主题分组提交，自动生成中文 commit message
---

# /commit 智能提交技能

## 触发场景

- Stop Hook 检测到未提交变更后自动触发
- 用户手动输入 `/commit` 触发

## 执行流程

### 第一步：分析变更

1. 运行 `git status --porcelain` 获取所有变更文件
2. 运行 `git diff --stat` 查看变更统计
3. 如果没有任何变更，输出"没有需要提交的内容"然后结束
4. 删除锁文件：`rm -f /tmp/claude_auto_commit_lock`

### 第二步：文件分类

按文件路径和类型将变更分组：

| 路径模式 | 分类 | commit 前缀 |
|---------|------|------------|
| `src/pages/**` | 页面模块 | 更新/添加 + 模块名 |
| `src/components/**` | 组件 | 更新/添加 + 组件名 |
| `.claude/**` | Claude 配置 | 配置: + 功能描述 |
| `*.md` | 文档 | 文档: + 主题 |
| `*.json` (package.json, vite.config 等) | 项目配置 | 配置: + 变更说明 |
| `dist/**` | 构建产物 | 跳过，不提交 |
| `node_modules/**` | 依赖 | 跳过，不提交 |
| 其他 | 杂项 | 更新: + 文件说明 |

### 第三步：分组提交

**核心原则：按主题分组，不要把所有文件塞进一个 commit。**

分组规则：
- 同一个功能模块的文件归为一组（如 `IncidentSection.vue` + `TicketCard.vue` + `TicketForm.vue` = "事件管理模块"）
- 同一个页面的修改归为一组
- 文档类文件单独一组
- 配置文件单独一组
- 如果所有变更都属于同一个主题，可以合并为一次提交

### 第四步：执行提交

对每个分组执行：

1. **明确指定文件**：使用 `git add <具体文件路径>` 逐个添加，**绝对不要使用 `git add .` 或 `git add -A`**
2. **排除文件**：跳过以下文件，不要提交：
   - `dist/` 目录下的构建产物
   - `node_modules/` 下的依赖
   - `.DS_Store`
   - `*.log` 日志文件
   - `*.tmp` / `*.bak` 临时文件
   - `.env` 环境变量文件
3. **生成 commit message**：使用中文，格式如下

## Commit Message 规范

### 格式

```
<类型>: <主题描述>
```

### 类型映射

| 场景 | 类型 | 示例 |
|------|------|------|
| 新增页面/组件 | 添加 | `添加: ITSM 事件管理模块` |
| 修改现有文件 | 更新 | `更新: 知识库文章响应式布局` |
| 修复问题 | 修复 | `修复: 移动端文章详情无法显示` |
| 新增文档 | 文档 | `文档: 添加响应式设计指南` |
| 配置变更 | 配置 | `配置: Vite 启用局域网访问` |
| 代码重构 | 重构 | `重构: 提取公共 Modal 组件` |
| 样式调整 | 样式 | `样式: 优化手机端知识库布局` |
| 删除文件 | 移除 | `移除: 清理过期临时文件` |

### 示例 git log

```
a1b2c3d 配置: 添加 Claude Code 自动提交 Hook 和 Skill
d4e5f6a 添加: 代码编辑器深度分析知识文章
7890abc 样式: 知识库文章手机端钻入式导航
def1234 更新: 仪表板统计卡片响应式布局
```

### 要求

- **中文**描述，简洁明了
- 不超过 50 个字符
- 不要写"update files"、"misc changes"等无意义信息
- 描述**做了什么**，而不是**改了哪个文件**
- 使用 HEREDOC 格式传递 commit message 以确保格式正确

### Commit 命令格式

```bash
git commit -m "$(cat <<'EOF'
<类型>: <主题描述>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

## 完成后

1. 运行 `git log --oneline -5` 展示最近提交
2. 运行 `git status` 确认工作区干净
3. 删除锁文件：`rm -f /tmp/claude_auto_commit_lock`
4. 简要汇报提交了哪些内容

## 注意事项

- 如果遇到 pre-commit hook 失败，修复问题后重新提交，不要用 --no-verify 跳过
- 不要自动 push，只做本地 commit
- 如果有 merge conflict，提示用户手动解决，不要自动处理
