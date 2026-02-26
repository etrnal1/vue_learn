# 📚 功能说明书快速开始指南

> 简化版的工作流指南 - 快速参考

## 三步完成功能 + 说明书

### 1️⃣ 完成代码实现

```bash
# 正常地修改代码
# git add/commit 正常提交
git commit -m "功能: 实现自动保存"
```

### 2️⃣ 生成说明书

```bash
# 自动分析代码 + 生成文档
/feature-doc 自动保存功能
```

### 3️⃣ 提交所有内容

```bash
# 智能分组提交
/commit
```

完成！🎉

---

## 📋 常用命令速查表

| 功能类型 | 命令 |
|---------|------|
| 🎨 UI 组件 | `/feature-doc 步骤预览功能` |
| 💾 自动保存 | `/feature-doc 自动保存功能` |
| 🔧 Bug 修复 | `/feature-doc Duplicate Entry 错误修复` |
| ⚡ 性能优化 | `/feature-doc 列表渲染优化` |
| 📱 响应式设计 | `/feature-doc 移动端适配` |
| 🏗️ 系统设计 | `/feature-doc 工作流管理系统` |

---

## 📚 生成的文档包含

自动生成的文档涵盖：

✅ **功能概述** - 目的和价值
✅ **核心特性** - 实现的功能点
✅ **技术实现** - 代码细节和架构
✅ **API 文档** - 接口规范（如适用）
✅ **使用指南** - 用户操作步骤
✅ **故障排除** - 常见问题和解决
✅ **性能指标** - 量化的性能数据
✅ **测试清单** - 验证功能的方法
✅ **开发扩展** - 如何继续开发

---

## 🎯 示例工作流

### 添加功能：步骤预览

```bash
# 1. 完成代码
git commit -m "功能: 步骤预览组件"

# 2. 生成文档
/feature-doc 步骤预览功能

# 输出:
# ✅ STEP_PREVIEW_DESIGN_GUIDE.md (550 行)
# ✅ STEP_PREVIEW_USER_GUIDE.md (280 行)
# ✅ STEP_PREVIEW_TROUBLESHOOTING.md (350 行)

# 3. 提交所有
/commit

# 输出:
# ✅ 功能: 步骤预览组件
# ✅ 文档: 添加步骤预览设计和用户指南
```

### 修复 Bug：Duplicate Entry

```bash
# 1. 完成修复
git commit -m "修复: Duplicate Entry 错误"

# 2. 生成文档
/feature-doc Duplicate Entry 错误修复

# 输出:
# ✅ DUPLICATE_ENTRY_QUICK_FIX.md (200 行)
# ✅ DUPLICATE_ENTRY_TROUBLESHOOTING.md (350 行)

# 3. 提交所有
/commit

# 输出:
# ✅ 修复: Duplicate Entry 错误
# ✅ 文档: 添加错误修复指南
```

---

## 🔍 查看已生成的文档

```bash
# 列出所有说明书
ls -la *.md

# 快速查看一个
head -100 AUTO_SAVE_GUIDE.md

# 打开 vs 编辑器查看
code *.md
```

已有的说明书：

- 📄 **AUTO_SAVE_GUIDE.md** - 自动保存功能完整指南（399 行）
- 📄 **DUPLICATE_ENTRY_FIX.md** - 数据库错误修复指南（307 行）
- 📄 **WORKFLOW_DESIGN_GUIDE.md** - 工作流系统设计文档（1137 行）
- 📄 **WORKFLOW_TROUBLESHOOTING.md** - 故障排除指南（351 行）
- 📄 **WORKFLOW_QUICK_FIX.md** - 快速参考（147 行）

---

## 💡 技巧和最佳实践

### ✅ 立即生成

```bash
# 完成代码后立即生成，不要延迟
git commit -m "功能: xxx"
/feature-doc xxx          # ← 立即生成
/commit                  # ← 提交所有
```

### ✅ 复杂功能多个文档

```bash
# 复杂功能会自动生成多个文档
/feature-doc 自动保存功能

# 会生成:
# - AUTO_SAVE_DESIGN_GUIDE.md
# - AUTO_SAVE_USER_GUIDE.md
# - AUTO_SAVE_TROUBLESHOOTING.md
# - AUTO_SAVE_QUICK_FIX.md
```

### ✅ 功能变更时更新文档

```bash
# 修改代码后
git commit -m "更新: 自动保存间隔改为 5 秒"

# 更新对应的文档
# (编辑现有的 AUTO_SAVE_GUIDE.md)

# 提交
/commit
```

---

## ❓ 常见问题

### Q: 生成的文档在哪里?

A: 保存在项目根目录，文件名格式：`<FEATURE_NAME>_<TYPE>.md`

### Q: 可以自定义生成的文档内容吗?

A: 可以，编辑生成后的 .md 文件，然后用 `/commit` 提交修改

### Q: 如何修改文档模板?

A: 编辑 `.claude/skills/feature-doc/templates.json`

### Q: 文档太长怎么办?

A: 这是正常的，详细的文档对团队更有帮助。可以使用 markdown 目录快速导航

---

## 📖 完整指南

想了解更多细节？查看：

- 📚 `.claude/FEATURE_DOC_WORKFLOW.md` - 完整工作流指南
- 📚 `.claude/skills/feature-doc/SKILL.md` - 技能详细说明
- 📚 `.claude/skills/feature-doc/templates.json` - 文档模板配置

---

## 🚀 下次需求时

只需三步：

```bash
# 1. 完成你的功能
# ... 修改代码 ...
git commit -m "功能/修复/优化: 描述"

# 2. 生成说明书
/feature-doc <功能名称>

# 3. 提交所有
/commit
```

**就会自动生成对应的完整设计说明书！** ✨

---

**最后更新**: 2026年2月26日
**版本**: 1.0
**维护**: Claude Code + Happy
