# 功能说明书自动生成工作流

> 一个完整的工作流程，从功能开发完成 → 自动生成说明书 → 提交代码

## 📌 概述

此工作流旨在确保**每个功能完成后都有对应的设计文档**，涵盖需求、实现、API、故障排除等全面内容。

### 核心三步

```
1. 🛠️  完成功能开发 (git commit)
   ↓
2. 📚 生成设计说明书 (/feature-doc)
   ↓
3. ✅ 提交代码和文档 (/commit)
```

## 🚀 快速开始

### 步骤 1: 完成功能开发

正常地完成代码实现，准备提交：

```bash
# 修改代码
git add src/pages/workflow/FlowDiagramEditor.vue

# 提交功能实现
git commit -m "功能: 实现自动保存"
```

### 步骤 2: 生成说明书

在**同一个分支**上运行：

```bash
/feature-doc 自动保存功能
```

这会自动：
1. 分析最近的代码变更
2. 提取技术细节（前端、后端、数据库）
3. 生成完整的设计文档
4. 保存到项目根目录

### 步骤 3: 提交代码和文档

生成的文档会自动放入工作区，直接使用 `/commit` 提交：

```bash
/commit
```

## 📋 工作流示例

### 示例 1: 实现一个 UI 组件

```
需求: 在流程列表中显示步骤预览

第一步 - 代码实现
─────────────────
git commit -m "功能: 步骤预览组件"

第二步 - 生成说明书
──────────────────
/feature-doc 步骤预览功能

生成的文档:
- STEP_PREVIEW_DESIGN_GUIDE.md (550 行)
- STEP_PREVIEW_USER_GUIDE.md (280 行)
- STEP_PREVIEW_QUICK_FIX.md (150 行)

第三步 - 提交所有内容
────────────────────
/commit

提交信息:
- 功能: 步骤预览组件
- 文档: 添加步骤预览设计文档和用户指南
```

### 示例 2: 修复一个 Bug

```
需求: 修复 "Duplicate entry" 错误

第一步 - 问题修复
─────────────────
git commit -m "修复: 流程编辑时 Duplicate entry 错误"

第二步 - 生成说明书
──────────────────
/feature-doc Duplicate Entry 错误修复

生成的文档:
- DUPLICATE_ENTRY_FIX_QUICK_FIX.md (200 行)
- DUPLICATE_ENTRY_FIX_TROUBLESHOOTING.md (350 行)

第三步 - 提交所有内容
────────────────────
/commit

提交信息:
- 修复: 流程编辑时 Duplicate entry 错误
- 文档: 添加错误修复指南
```

### 示例 3: 优化性能

```
需求: 优化列表渲染性能

第一步 - 性能优化
─────────────────
git commit -m "优化: 流程列表虚拟滚动"

第二步 - 生成说明书
──────────────────
/feature-doc 列表虚拟滚动优化

生成的文档:
- VIRTUAL_SCROLL_DESIGN_GUIDE.md (600 行)
- VIRTUAL_SCROLL_TROUBLESHOOTING.md (280 行)

第三步 - 提交所有内容
────────────────────
/commit

提交信息:
- 优化: 流程列表虚拟滚动
- 文档: 添加性能优化设计文档
```

## 🎯 /feature-doc 命令详解

### 基本用法

```bash
/feature-doc <功能名称>
```

### 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| 功能名称 | 功能的自然语言描述 | "自动保存功能"、"移动端响应式" |

### 常用示例

```bash
# UI 组件相关
/feature-doc 步骤预览功能
/feature-doc 流程卡片设计

# 功能实现
/feature-doc 自动保存功能
/feature-doc 移动端编辑

# Bug 修复
/feature-doc Duplicate Entry 错误修复
/feature-doc 响应式问题修复

# 性能优化
/feature-doc 列表渲染优化
/feature-doc 加载性能优化

# 系统设计
/feature-doc 工作流管理系统
/feature-doc 数据持久化架构
```

## 📚 生成的文档类型

根据功能类型，自动生成对应的文档：

### 1. UI 组件 → 生成这些文档

```
COMPONENT_NAME_DESIGN_GUIDE.md
├─ 功能概述
├─ 核心特性
├─ 技术实现
│  ├─ 组件结构
│  ├─ 数据绑定
│  └─ 样式系统
├─ 使用示例
└─ 故障排除

COMPONENT_NAME_USER_GUIDE.md
├─ 快速开始
├─ 详细步骤
├─ 关键交互
└─ 最佳实践
```

### 2. 数据持久化 → 生成这些文档

```
FEATURE_NAME_DESIGN_GUIDE.md
├─ 技术实现
├─ 数据结构
├─ API 文档
│  ├─ 端点列表
│  ├─ 请求格式
│  └─ 响应格式
└─ 性能考虑

FEATURE_NAME_API_REFERENCE.md
├─ API 概览
├─ 认证
├─ 端点详解
├─ 示例代码
└─ 错误处理

FEATURE_NAME_TROUBLESHOOTING.md
├─ 常见错误
├─ 根本原因
├─ 解决方案
└─ 调试技巧
```

### 3. Bug 修复 → 生成这些文档

```
BUG_NAME_QUICK_FIX.md
├─ 问题描述
├─ 根本原因
├─ 修复内容
├─ 验证清单
└─ FAQ

BUG_NAME_TROUBLESHOOTING.md
├─ 问题重现
├─ 诊断步骤
├─ 多个解决方案
└─ 预防措施
```

## 💡 最佳实践

### ✅ DO: 按时生成

```bash
# ✅ 正确的时机
git commit -m "功能: 实现 xxx"
/feature-doc xxx功能          # ← 立即生成
/commit                      # ← 提交所有内容
```

### ❌ DON'T: 延后生成

```bash
# ❌ 错误的做法
# 完成 5 个功能后才生成文档
# 容易遗漏细节和背景信息
```

### ✅ DO: 充分的文档

对复杂功能生成多个文档：

```bash
/feature-doc 自动保存功能

生成的文档:
- AUTO_SAVE_DESIGN_GUIDE.md - 设计和实现
- AUTO_SAVE_USER_GUIDE.md - 用户使用方法
- AUTO_SAVE_TROUBLESHOOTING.md - 问题排查
- AUTO_SAVE_QUICK_FIX.md - 快速参考
```

### ✅ DO: 定期更新文档

当功能有变更时：

```bash
# 更新代码
git commit -m "更新: 自动保存间隔改为 5 秒"

# 更新对应的文档
# (编辑现有的 AUTO_SAVE_DESIGN_GUIDE.md)

# 提交
/commit -m "文档: 更新自动保存文档"
```

## 🔍 文档质量检查清单

在 `/feature-doc` 完成后，检查生成的文档：

### 结构检查
- [ ] 标题层级正确（# ## ###）
- [ ] 目录结构清晰
- [ ] 章节顺序合理

### 内容检查
- [ ] 功能说明清楚
- [ ] 技术细节准确
- [ ] 代码示例可运行
- [ ] 没有过期信息

### 示例检查
- [ ] 至少 3 个代码示例
- [ ] 示例来自实际项目
- [ ] 包含预期输出或结果

### 故障排除检查
- [ ] 覆盖常见问题
- [ ] 提供解决步骤
- [ ] 包含调试技巧

### 元数据检查
- [ ] 版本号已更新
- [ ] 日期已更新
- [ ] 维护人已标注
- [ ] 相关链接完整

## 📊 文档生成流程图

```
输入: 功能名称
  ↓
分析 git diff
  ├─ 提取修改的文件
  ├─ 统计代码行数
  └─ 识别功能类型
  ↓
确定功能类别
  ├─ UI 组件?
  ├─ 数据持久化?
  ├─ Bug 修复?
  ├─ 性能优化?
  └─ 系统设计?
  ↓
选择文档模板
  ├─ 根据类别自动选择
  ├─ 可选择多个模板
  └─ 每个模板 1-2 份文档
  ↓
抽取代码信息
  ├─ 关键文件路径
  ├─ 数据结构
  ├─ API 端点
  ├─ 配置选项
  └─ 故障场景
  ↓
生成文档内容
  ├─ 填充模板
  ├─ 插入代码示例
  ├─ 创建图表
  └─ 添加元数据
  ↓
保存文档文件
  ├─ 确定文件名
  ├─ 确定保存位置
  ├─ 避免覆盖现有文件
  └─ 创建必要的目录
  ↓
输出总结
  ├─ 生成的文件列表
  ├─ 文档行数统计
  ├─ 建议的后续步骤
  └─ 质量检查提示
  ↓
输出: 生成完成
```

## 🔗 相关技能

### /commit - 智能提交

生成的文档会被 `/commit` 自动识别为**文档类**文件，并给予特殊处理：

```
git diff 发现:
- src/pages/workflow/FlowDiagramEditor.vue (修改)
- AUTO_SAVE_GUIDE.md (新增)
- DUPLICATE_ENTRY_FIX.md (新增)

/commit 的处理:
1. 前端代码 → "功能: 实现自动保存"
2. 文档文件 → "文档: 添加自动保存完整指南"
3. 多个提交，每个主题一个
```

## 📖 文档保存位置

### 默认位置

项目根目录（易于查找和版本控制）

```
/Users/mac/vue-learning-app/
├─ AUTO_SAVE_GUIDE.md
├─ DUPLICATE_ENTRY_FIX.md
├─ WORKFLOW_DESIGN_GUIDE.md
└─ ...
```

### 可选位置

如果项目有专门的文档目录：

```
/Users/mac/vue-learning-app/
├─ docs/
│  ├─ workflow/
│  │  ├─ AUTO_SAVE_GUIDE.md
│  │  ├─ DUPLICATE_ENTRY_FIX.md
│  │  └─ WORKFLOW_DESIGN_GUIDE.md
│  ├─ guides/
│  ├─ api/
│  └─ troubleshooting/
```

## 🎓 学习资源

### 查看现有文档示例

```bash
# 已生成的文档
ls -la *.md

# 查看一个
cat AUTO_SAVE_GUIDE.md

# 快速查看目录
head -50 DUPLICATE_ENTRY_FIX.md
```

### 提供反馈

如果生成的文档：
- 缺少某些内容
- 不符合你的需求
- 需要调整格式

可以修改 `.claude/skills/feature-doc/templates.json` 中的模板定义。

## 🐛 故障排除

### Q: /feature-doc 提示找不到?

A: 确保运行了 `/feature-doc` 命令（注意前面的 `/`）

### Q: 生成的文档不符合需求?

A: 可以手动编辑生成的文档，然后使用 `/commit` 提交修改

### Q: 想要自定义文档格式?

A: 编辑 `.claude/skills/feature-doc/templates.json` 中的模板定义

## 📞 支持

如有问题，可以：

1. 查看 `/feature-doc` skill 的详细说明
2. 参考 `.claude/skills/feature-doc/SKILL.md`
3. 检查 `templates.json` 中的配置规则

---

**工作流版本**: 1.0
**创建日期**: 2026年2月26日
**维护人**: Claude Code + Happy

下次需求时，只需：
1. 完成代码 → `git commit`
2. 生成文档 → `/feature-doc <功能名>`
3. 提交所有 → `/commit`

就会自动生成对应的设计说明书！
