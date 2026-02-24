# 文档中心使用指南

## 📚 概述

文档中心是一个集成在应用中的**实时文档管理和展示系统**，能够自动从磁盘扫描、加载和呈现项目中的 Markdown 文档。

## ✨ 主要功能

### 1. 文档列表 (Sidebar)
- 自动扫描项目根目录的所有 `.md` 文件
- 按优先级排序（`LEARNING_GUIDE.md` 优先）
- 显示文件大小和修改时间
- 点击选择文档进行查看

### 2. Markdown 解析
- 使用 `marked` 库进行高效解析
- 支持完整的 Markdown 语法：
  - 标题、列表、代码块
  - 表格、链接、图片
  - 代码行内高亮、引用块

### 3. 自动目录生成 (TOC)
- 从文档中自动提取所有标题（# ## ###）
- 右侧面板显示目录树
- 点击目录项自动跳转到对应章节
- 高亮当前浏览的章节

### 4. 文档搜索
- 左侧搜索框按文件名过滤
- 实时更新文档列表
- 支持模糊匹配

### 5. 同步功能
- "🔄 同步" 按钮重新扫描磁盘
- 自动检测新添加的 markdown 文件
- 显示同步统计信息

### 6. 主题集成
- 完全继承应用的 6 种主题
- 自动适配深色模式
- 响应式设计，支持桌面和移动设备

## 🚀 快速开始

### 访问文档中心
1. 启动应用：`npm run dev`
2. 打开浏览器访问：http://localhost:5173
3. 点击顶部导航栏中的 **"📚 文档中心"** 标签

### 查看现有文档
应用已包含两份主要文档：
- **LEARNING_GUIDE.md** - 完整的项目学习指南（5000+ 行）
- **QUICK_REFERENCE.md** - 快速参考卡和代码片段

### 添加新文档
非常简单！只需：

1. **创建 Markdown 文件** 在项目根目录
   ```bash
   touch /Users/mac/vue-learning-app/MY_DOCS.md
   ```

2. **编写内容**
   ```markdown
   # 我的文档

   ## 章节1
   这是内容...

   ## 章节2
   更多内容...
   ```

3. **点击"同步"按钮** 在文档中心右上角

4. **选择新文档** 从左侧列表查看

## 🎨 界面布局

```
┌─────────────────────────────────────────────┐
│  📚 文档中心          🔍 [搜索] 🔄 同步     │  ← Header
├─────────────────────────────────────────────┤
│            │                      │          │
│  文档列表  │   Markdown 内容     │  TOC    │
│            │                      │ 目录    │
│  ┌──────┐ │  ┌──────────────────┐│┌──────┐│
│  │LEARN─│ │  │ # 第一章        │││ 第一章││
│  │QUICK─│ │  │ ## 小节         │││ 小节 ││
│  │ ...  │ │  │                 │││ ...  ││
│  └──────┘ │  └──────────────────┘│└──────┘│
│            │                      │        │
└─────────────────────────────────────────────┘
```

## 🔧 API 端点

### GET /api/docs/list
获取所有可用文档的列表

**响应示例：**
```json
{
  "files": [
    {
      "name": "LEARNING_GUIDE.md",
      "filename": "LEARNING_GUIDE.md",
      "size": 85234,
      "sizeKB": 83,
      "lastModified": "2026-02-24T10:30:00.000Z",
      "extension": ".md"
    }
  ],
  "summary": {
    "total": 2,
    "totalSize": 120456,
    "lastUpdated": "2026-02-24T10:30:00.000Z"
  }
}
```

### GET /api/docs/content?file=FILENAME
获取特定文档的内容

**参数：**
- `file` (required): 文件名（如 `LEARNING_GUIDE.md`）

**响应示例：**
```json
{
  "filename": "LEARNING_GUIDE.md",
  "content": "# Vue Learning App - 完整学习指南\n\n## 📚 目录\n...",
  "size": 85234,
  "lastModified": "2026-02-24T10:30:00.000Z"
}
```

### POST /api/docs/sync
重新扫描磁盘并返回更新的文件列表

**响应示例：**
```json
{
  "files": [...],
  "summary": {...},
  "message": "已同步 2 个文档",
  "syncTime": "2026-02-24T10:31:00.000Z"
}
```

## 📝 添加文档最佳实践

### 1. 文件命名
- 使用清晰的英文文件名：`PROJECT_SETUP.md`
- 使用大写和下划线分隔：`API_DOCUMENTATION.md`
- 避免特殊字符和空格

### 2. Markdown 结构
```markdown
# 文档标题（顶级标题）

## 第一个主章节

### 子章节

内容段落...

#### 更深的子标题

代码块：
\`\`\`javascript
const example = 'code'
\`\`\`

- 列表项 1
- 列表项 2

| 表头 1 | 表头 2 |
|--------|--------|
| 数据 1 | 数据 2 |
```

### 3. 文件大小建议
- 保持在 100KB 以下便于性能
- 超大文档可以分解为多个文件

## 🎓 文档中心代码解析

### 前端组件 (DocumentationCenter.vue)
```javascript
// 主要数据属性
- docsList          // 所有文档
- selectedDocName   // 当前选中的文档
- searchQuery       // 搜索关键词
- tableOfContents   // 提取的目录
- renderedHtml      // 解析后的 HTML

// 主要方法
- loadDocsList()         // 从 API 加载列表
- selectDocument()       // 选择文档
- loadDocContent()       // 获取文档内容
- parseTableOfContents() // 从 markdown 提取标题
- scrollToHeading()      // 跳转到章节
- syncDocuments()        // 同步文件列表
```

### 后端 API (routes/docs.js)
```javascript
// 三个主要端点
- GET /list         // 列出所有文档
- GET /content      // 获取文档内容（带路径验证）
- POST /sync        // 重新扫描

// 安全特性
- 路径验证防止目录遍历
- 只读取 .md 文件
- 防止访问项目外文件
```

## 🛡️ 安全特性

### 路径验证
```javascript
// ✓ 正常文件
LEARNING_GUIDE.md
QUICK_REFERENCE.md

// ✗ 被拒绝的
../../../etc/passwd
./../../secret.md
/etc/passwd
C:\Windows\System32
```

### 访问控制
- 仅限读取项目根目录 `.md` 文件
- 禁止访问子目录中的文件
- 禁止访问项目外的文件

## 📱 响应式设计

### 桌面端 (> 1024px)
- 三列布局：文档列表 | 内容 | 目录
- 固定宽度侧边栏
- TOC 面板始终可见

### 平板端 (768-1024px)
- 两列布局：文档列表 | 内容
- TOC 隐藏，但可通过导航访问

### 移动端 (< 768px)
- 单列堆叠布局
- 文档列表变为可折叠
- 所有元素全宽

## 🎯 常见用例

### 用例 1：快速参考
新手开发者可以快速访问代码片段和最佳实践：
1. 点击"文档中心"标签
2. 选择"QUICK_REFERENCE"
3. 使用目录快速跳转到需要的部分

### 用例 2：深入学习
系统学习项目架构和开发模式：
1. 选择"LEARNING_GUIDE"
2. 从"项目架构"开始阅读
3. 通过目录导航按顺序学习

### 用例 3：团队协作
添加团队内部的流程文档：
1. 在项目根目录创建 `TEAM_GUIDELINES.md`
2. 点击"同步"按钮
3. 与团队分享文档链接

### 用例 4：API 文档
维护 API 变更日志：
1. 创建 `API_CHANGELOG.md`
2. 记录版本更新和变更
3. 实时同步显示

## 🐛 故障排除

### 问题：新文档不显示
**解决方案：**
1. 检查文件是否在项目根目录
2. 确保文件扩展名为 `.md`
3. 点击"同步"按钮刷新列表

### 问题：Markdown 渲染不正确
**解决方案：**
1. 检查 Markdown 语法
2. 确保代码块正确用 ` 包裹
3. 验证表格格式

### 问题：搜索不工作
**解决方案：**
1. 清除浏览器缓存
2. 重新加载页面 (Ctrl+R)
3. 尝试不同的搜索关键词

## 📚 扩展功能想法

### 待实现的功能
- [ ] 代码语法高亮 (Prism.js)
- [ ] PDF 导出
- [ ] 文档编辑模式
- [ ] 全文搜索
- [ ] 文档版本历史
- [ ] 协作注释
- [ ] 离线支持 (Service Workers)

## 🤝 贡献指南

### 为文档中心改进做贡献

1. **报告问题**
   - 在 GitHub Issues 中描述问题
   - 提供重现步骤和浏览器信息

2. **添加功能**
   - Fork 项目
   - 在功能分支上开发
   - 提交 Pull Request

3. **改进文档**
   - 直接编辑 `.md` 文件
   - 按照 Markdown 最佳实践
   - 提交更新

## 📖 相关资源

- [marked.js 文档](https://marked.js.org/)
- [Markdown 语法指南](https://guides.github.com/features/mastering-markdown/)
- [Vue 3 异步组件](https://vuejs.org/guide/components/async.html)

---

**提示：** 文档中心会自动检测新添加的文档，无需重启应用！✨
