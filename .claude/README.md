# Claude Code 项目配置

> 为 vue-learning-app 项目配置的 Claude Code 技能和工作流

## 📁 目录结构

```
.claude/
├─ README.md ............................ 本文件
├─ FEATURE_DOC_WORKFLOW.md .............. 完整工作流指南
│
└─ skills/
   ├─ commit/
   │  └─ SKILL.md ....................... /commit 技能说明
   │
   └─ feature-doc/
      ├─ SKILL.md ....................... /feature-doc 技能说明
      ├─ feature-doc.sh ................. 执行脚本
      └─ templates.json ................. 文档模板配置
```

## 🎯 两个核心技能

### 1. /commit - 智能提交

**用途**：自动分析变更 → 按主题分组 → 生成规范的中文 commit message

**使用**：
```bash
/commit
```

**特点**：
- 自动识别文件类型和功能模块
- 按主题分组（不会一个 commit 包含所有）
- 生成规范的中文消息
- 显示 Co-Authored-By

**文档**：`skills/commit/SKILL.md`

---

### 2. /feature-doc - 功能说明书生成 ⭐ NEW

**用途**：自动生成完整的设计文档（包含 API、使用指南、故障排除等）

**使用**：
```bash
/feature-doc <功能名称>
```

**特点**：
- 自动识别功能类型
- 生成多份相关文档（设计、指南、故障排除等）
- 从代码提取技术细节
- 包含完整的示例和测试清单

**文档**：`skills/feature-doc/SKILL.md`

---

## 🚀 标准工作流

### 三步完成功能 + 说明书

```bash
# 第 1 步：完成代码实现
git commit -m "功能/修复/优化: 描述"

# 第 2 步：自动生成设计说明书
/feature-doc <功能名称>

# 第 3 步：智能提交所有内容
/commit
```

完成！代码和文档都已提交。

---

## 📚 文档资源

### 用户指南（按推荐阅读顺序）

1. **FEATURE_DOC_QUICK_START.md** (项目根目录)
   - 快速入门指南（5 分钟阅读）
   - 常用命令速查表
   - 工作流示例

2. **CLAUDE_CODE_SKILLS_SUMMARY.md** (项目根目录)
   - 系统总结（10 分钟阅读）
   - 功能对比
   - 常见问题

3. **FEATURE_DOC_WORKFLOW.md** (本目录)
   - 完整工作流指南（15 分钟阅读）
   - 最佳实践
   - 高级用法

### 技能文档（参考）

- **skills/commit/SKILL.md**
  - /commit 技能的详细说明
  - 配置规则
  - 实现细节

- **skills/feature-doc/SKILL.md**
  - /feature-doc 技能的详细说明
  - 文档模板
  - 自定义配置

---

## 🔧 配置文件

### templates.json

`.claude/skills/feature-doc/templates.json` 包含：

- **documentTemplates** - 文档模板定义
  - DESIGN_GUIDE - 设计文档
  - USER_GUIDE - 用户指南
  - TROUBLESHOOTING - 故障排除
  - QUICK_FIX - 快速参考
  - API_REFERENCE - API 文档

- **featureCategories** - 功能类型分类
  - data-persistence - 数据持久化
  - ui-component - UI 组件
  - bug-fix - Bug 修复
  - performance - 性能优化
  - responsive-design - 响应式设计

- **documentationRules** - 文档规则
  - 命名规范
  - 保存位置
  - 版本管理
  - 元数据要求

- **contentStandards** - 内容标准
  - 代码块格式
  - 示例要求
  - 图表工具
  - 语言规范

- **qualityChecklist** - 质量检查清单
  - 结构检查
  - 内容检查
  - 格式检查
  - 完整性检查

---

## 📊 生成的说明书示例

### 项目中已有的说明书

这些是之前按需生成的说明书示例：

| 文档 | 行数 | 内容 |
|------|------|------|
| AUTO_SAVE_GUIDE.md | 399 | 自动保存功能完整指南 |
| DUPLICATE_ENTRY_FIX.md | 306 | 数据库错误修复指南 |
| WORKFLOW_DESIGN_GUIDE.md | 1137 | 工作流系统设计文档 |
| WORKFLOW_TROUBLESHOOTING.md | 351 | 故障排除和最佳实践 |

### 每份说明书通常包含

✅ 功能概述
✅ 核心特性列表
✅ 工作原理说明
✅ 技术实现细节
✅ 数据结构文档
✅ API 文档（如适用）
✅ 使用指南
✅ 常见问题和解决方案
✅ 性能考虑
✅ 测试清单
✅ 开发扩展指南

---

## 🎓 如何使用这个系统

### 场景 1：实现新功能

```bash
# 完成代码
git commit -m "功能: 实现自动保存"

# 自动生成说明书
/feature-doc 自动保存功能

# 提交所有内容
/commit
```

### 场景 2：修复 Bug

```bash
# 完成修复
git commit -m "修复: 流程编辑错误"

# 生成修复指南
/feature-doc 流程编辑错误修复

# 提交所有
/commit
```

### 场景 3：性能优化

```bash
# 完成优化
git commit -m "优化: 列表渲染性能"

# 生成优化文档
/feature-doc 列表渲染优化

# 提交所有
/commit
```

---

## 🔄 技能的工作流程

### /commit 工作流

```
git diff 分析
   ↓
识别文件类型和模块
   ↓
按主题分组
   ↓
依次提交每组文件
   ↓
完成
```

### /feature-doc 工作流

```
分析 git diff
   ↓
识别功能类型
   ↓
选择文档模板
   ↓
抽取代码信息
   ↓
生成文档文件
   ↓
保存到项目
   ↓
完成
```

---

## 💡 最佳实践

### DO: 立即生成

```bash
# ✅ 好做法：功能完成就立即生成
git commit -m "功能: xxx"
/feature-doc xxx
/commit
```

### DO: 多个文档

```bash
# ✅ 复杂功能会生成多份文档
# - 设计文档（技术实现）
# - 用户指南（使用方法）
# - 故障排除（问题解决）
```

### DO: 定期更新

```bash
# ✅ 功能变更时更新对应文档
git commit -m "更新: xxx 参数"
# 手动编辑对应的说明书
/commit
```

### DON'T: 延后生成

```bash
# ❌ 不要等到完成多个功能后再生成
# 容易遗漏细节和背景信息
```

---

## 🔧 自定义配置

### 修改文档模板

编辑 `skills/feature-doc/templates.json`：

```json
{
  "documentTemplates": {
    "YOUR_TEMPLATE": {
      "name": "你的模板名称",
      "suffix": "YOUR_TEMPLATE.md",
      "sections": [
        "第一章",
        "第二章"
      ]
    }
  }
}
```

### 添加新的功能类别

在 `templates.json` 的 `featureCategories` 中添加：

```json
{
  "your-category": {
    "name": "你的类别",
    "examples": ["例子1", "例子2"],
    "requiredSections": ["必需的章节"],
    "templates": ["DESIGN_GUIDE", "USER_GUIDE"]
  }
}
```

---

## 📞 常见问题

### Q: 如何查看已经生成的说明书？

A: 项目根目录中的 `*_GUIDE.md` 和 `*_FIX.md` 文件就是生成的说明书

### Q: 生成的文档可以编辑吗？

A: 可以！生成后你可以随时修改，然后用 `/commit` 提交

### Q: 说明书会很长吗？

A: 是的，这是好的。详细文档对团队帮助更大：
- 简单功能：200-300 行
- 中等功能：500-800 行
- 复杂功能：1000+ 行

### Q: 会覆盖现有的文档吗？

A: 系统会避免覆盖现有文件，或提示你是否要更新

### Q: 可以为同一功能生成多份文档吗？

A: 可以！复杂功能会自动生成多份相关文档

---

## 🛠️ 故障排除

### /feature-doc 提示找不到

A: 确保运行了 `/feature-doc` 命令（注意前面的 `/`）

### 生成的文档格式不符合需求

A: 可以修改 `templates.json` 中的文档模板定义

### 想要添加自定义文档类型

A: 编辑 `.claude/skills/feature-doc/templates.json`，参考上面的"自定义配置"部分

---

## 📖 继续学习

### 详细文档

- `FEATURE_DOC_WORKFLOW.md` - 完整工作流指南（推荐）
- `skills/feature-doc/SKILL.md` - 技能详细说明

### 项目文档

- `FEATURE_DOC_QUICK_START.md` - 快速开始指南
- `CLAUDE_CODE_SKILLS_SUMMARY.md` - 系统总结

### 示例文档

- `AUTO_SAVE_GUIDE.md` - 参考示例
- `DUPLICATE_ENTRY_FIX.md` - 参考示例

---

## 📈 系统统计

### 已配置的技能

- ✅ /commit - 智能提交技能
- ✅ /feature-doc - 功能说明书生成技能

### 文档模板

- ✅ DESIGN_GUIDE - 设计文档模板
- ✅ USER_GUIDE - 用户指南模板
- ✅ TROUBLESHOOTING - 故障排除模板
- ✅ QUICK_FIX - 快速参考模板
- ✅ API_REFERENCE - API 文档模板

### 功能分类

- ✅ data-persistence - 数据持久化
- ✅ ui-component - UI 组件
- ✅ bug-fix - Bug 修复
- ✅ performance - 性能优化
- ✅ responsive-design - 响应式设计

---

## 🎉 开始使用

### 第一步：了解系统（10 分钟）

1. 阅读 `FEATURE_DOC_QUICK_START.md`（项目根目录）
2. 阅读 `CLAUDE_CODE_SKILLS_SUMMARY.md`（项目根目录）

### 第二步：下次编码时使用（立即）

```bash
git commit -m "功能: xxx"
/feature-doc <功能名>
/commit
```

### 第三步：查看生成的文档（可选）

```bash
ls -la *.md  # 查看所有说明书
cat <文档名>.md  # 查看内容
```

---

## 📞 支持

如有问题，可以：

1. 查看 `FEATURE_DOC_WORKFLOW.md` 中的"常见问题"部分
2. 参考 `skills/feature-doc/SKILL.md` 的详细说明
3. 查看 `templates.json` 中的配置规则

---

**系统版本**: 1.0
**创建日期**: 2026年2月26日
**维护**: Claude Code + Happy

下次需求时，使用三步法：**完成代码 → 生成文档 → 提交所有** 🚀
