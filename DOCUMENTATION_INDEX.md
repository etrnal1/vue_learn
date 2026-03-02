# Vue 学习参考应用 - 文档索引中心

> 全面的功能设计文档和技术指南，帮助你理解应用的所有功能实现

## 📚 文档导航

### 🎯 快速开始

| 文档 | 描述 | 适合人群 |
|------|------|---------|
| **[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md)** | 完整功能体系架构设计 | 所有人（必读） |
| **[CLAUDE.md](CLAUDE.md)** | 项目概览和开发指南 | 开发者 |

### 🏗️ 架构和设计

#### 全局架构
- **文件**：[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md#-架构总览)
- **内容**：
  - 分层架构模式
  - 核心设计模式（MVC、观察者、缓存等）
  - 数据流向

#### 系统架构
- **文件**：[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md#-后端-api-体系)
- **内容**：
  - 27个 API 端点详解
  - Express 服务器架构
  - 业务逻辑层设计

#### 数据库设计
- **文件**：[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md#-数据库设计)
- **内容**：
  - 20+ 个核心数据表
  - 表关系图（ER 模型）
  - 表字段说明

---

## 💻 功能模块文档

### 前端功能模块

#### 1. 应用核心 (App.vue)
- **位置**：[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md#11-应用主体-appvue---969-行)
- **核心功能**：
  - 标签页导航管理（14个标签页）
  - 主题系统（6 个主题 + 25 个色卡预设）
  - 认证状态管理
  - 性能监控和面板

**关键代码**：
```javascript
// 标签页切换
switchTab(tabId) {
  this.activeTab = tabId
  // 动态加载组件
  // 记录性能数据
}

// 主题应用
computed: {
  appStyleVars() {
    return { '--app-primary': this.appearance.primaryColor, ... }
  }
}
```

**性能指标**：
- 首可见时间 (FCP)
- 首可交互时间 (FID)
- 初始化完成时间
- 子页面响应时间 (p50/p95)

---

#### 2. 认证系统
- **位置**：[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md#12-认证系统-appvue-auth-部分)
- **功能**：
  - 用户注册和登录
  - JWT 令牌管理
  - 权限验证
  - 会话保持

**认证流程**：
```
登录表单 → 验证密码 → 生成令牌 → 保存到 localStorage → 发送请求时附加令牌
```

**令牌管理**：
- 保存位置：`localStorage['vue_learning_auth_token']`
- 过期时间：7 天
- 请求头：`Authorization: Bearer <token>`

---

#### 3. 主题和配色系统
- **位置**：[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md#13-主题与配色系统)
- **功能**：
  - 6 个预设主题（蓝、绿、紫、橙、粉、暗）
  - 25 个色卡预设
  - 自定义颜色调整
  - 字体缩放（85%-125%）

**主题应用机制**：
```javascript
主题选择 → 生成 CSS 变量 → 注入到根元素 → CSS 使用变量
```

**CSS 变量**：
- `--app-primary` - 主色
- `--app-text` - 文字色
- `--app-bg` - 背景色
- 40+ 个其他变量

---

#### 4. 工作流管理系统

##### 4.1 拖拽编辑器 (FlowDiagramEditor.vue - 3372行)
- **位置**：[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md#21-流程拖拽编辑器-flowdiagrameditorvue---3372-行)
- **核心功能**：
  - 🖱️ 拖拽创建节点
  - 🔗 连接节点（条件表达式）
  - 📝 参数配置
  - 📤 BPMN 导出
  - 📱 移动设备触摸支持

**节点类型**：
```
StartNode (开始)
UserTaskNode (用户任务)
ExclusiveGateway (条件分支)
ParallelGateway (并行)
InclusiveGateway (包含分支)
EndNode (结束)
```

**参数传递**：
```javascript
// 4 种参数来源
- constant (常量)
- variable (流程变量)
- expression (表达式)
- previous_step (前一步输出)
```

**自动保存**：
- 触发方式：编辑后自动保存
- 保存间隔：实时（WebSocket）
- 保存内容：节点、边、变量、参数

---

##### 4.2 流程执行追踪 (FlowInstances.vue)
- **位置**：[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md#22-流程执行追踪-flowinstancesvue)
- **核心功能**：
  - 📊 实时执行监控
  - 📈 进度条可视化
  - ⚡ WebSocket 实时推送
  - ⏱️ 性能指标统计

**WebSocket 事件**：
```javascript
'execution:started'          // 流程启动
'execution:step:completed'   // 步骤完成
'execution:completed'        // 流程完成
'execution:progress'         // 进度更新
```

**实时更新机制**：
```
执行状态变化 → 后端触发事件 → WebSocket 广播 → 前端更新 UI（无需刷新）
```

---

##### 4.3 自动化规则系统 (FlowAutomation.vue)
- **位置**：[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md#23-自动化规则系统-flowautomationvue)
- **核心功能**：
  - ⏰ 定时触发（Cron 表达式）
  - 🎯 事件触发
  - 📋 条件触发
  - 🔔 自动执行流程

**规则类型**：
```javascript
trigger: {
  type: 'schedule',     // 定时
  schedule: '0 9 * * *' // 每天上午9点
}
```

---

### 📚 知识管理模块

#### 5.1 Wiki 知识库 (WikiCenter.vue)
- **位置**：[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md#31-wiki-知识库-wikicenterv)
- **核心功能**：
  - ✏️ 词条创建和编辑
  - 📝 Markdown 内容
  - 📚 版本历史管理
  - 🔍 全文搜索（评分排序）
  - 🏷️ 分类和标签
  - 📌 段落注解（Word 风格）
  - 📖 全屏阅读模式

**词条结构**：
```javascript
{
  id: '001',
  title: '词条标题',
  category: '分类',
  tags: ['标签1', '标签2'],
  content: 'Markdown 内容',
  versions: [...],        // 版本历史
  annotations: [...],     // 段落注解
  viewCount: 1250,
  isFavorite: false
}
```

**搜索评分机制**：
```
精确匹配 (100分)
  ↓
文件名包含 (50分)
  ↓
内容包含 (10分 × 匹配次数)
  ↓
学习顺序权重 + 修改时间新鲜度
  ↓
最终排序 (按总分降序)
```

**注解功能**：
- 选中文本 → 右键添加注解
- 注解显示在侧栏（Word 风格）
- 支持协作讨论

---

#### 5.2 文档中心 (DocumentationCenter.vue)
- **位置**：[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md#32-文档中心-documentationcenterv)
- **核心功能**：
  - 📂 自动扫描项目文档
  - 🔄 同步 Markdown 文档
  - 🔍 全文搜索
  - 📊 学习路径排序
  - 📥 导出和导入

**同步流程**：
```
扫描 docs/ 目录 → 检测文件版本 → 排序学习顺序 → 路径遍历防护 → 存储到数据库
```

**学习顺序**：
```
README > QUICK_START > LEARNING_GUIDE > API > REFERENCE > GUIDE > TUTORIAL
```

---

### 🛠️ 工具集成模块

#### Git 分支管理 (GitBranchManager.vue)
- **功能**：可视化分支树、提交历史、分支操作
- **支持操作**：创建、删除、合并分支
- **实现**：调用 git 命令 + 解析输出

#### FFmpeg 视频处理 (VideoManager.vue + FfmpegTool.vue)
- **功能**：
  - 上传视频
  - 格式转码 (H.264, VP9, AV1)
  - 视频剪辑
  - 元数据提取
  - 缩略图生成
  - 字幕提取

**转码流程**：
```
选择视频 → 设置参数 → 提交任务 → 轮询进度 → 获取结果 → 下载/预览
```

**FFmpeg 命令示例**：
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 23 \
  -c:a aac -b:a 128k \
  -ss 10 -t 30 \
  output.mp4
```

#### Docker 容器管理 (DockerVisualizer.vue)
- **功能**：容器和镜像可视化

#### 终端命令执行 (TerminalConsole.vue)
- **功能**：在线终端，执行系统命令

---

### 👥 系统管理模块

#### 用户管理 (UserAdminConsole.vue)
- **功能**：用户账户、认证状态、权限管理

#### 菜单管理 (MenuManagement.vue)
- **功能**：菜单树结构管理

#### 角色管理 (RoleManagement.vue)
- **功能**：角色定义、权限分配

---

## 🔌 API 文档

### 认证相关
```
POST   /api/auth/login      - 用户登录
POST   /api/auth/register   - 用户注册
POST   /api/auth/verify     - 验证令牌
POST   /api/auth/logout     - 注销登录
```

### 流程管理
```
GET    /api/flows                   - 流程列表
POST   /api/flows                   - 创建流程
GET    /api/flows/:id               - 流程详情
PUT    /api/flows/:id               - 更新流程
DELETE /api/flows/:id               - 删除流程
POST   /api/flows/:id/execute       - 执行流程
GET    /api/flows/:id/executions    - 执行历史
```

### Wiki 知识库
```
GET    /api/wiki                    - 词条列表
POST   /api/wiki                    - 创建词条
GET    /api/wiki/:id                - 词条详情
PUT    /api/wiki/:id                - 更新词条
POST   /api/wiki/:id/publish        - 发布版本
GET    /api/wiki/search             - 全文搜索
```

### 文档中心
```
GET    /api/docs/list               - 文档列表
GET    /api/docs/content            - 文档内容
POST   /api/docs/sync               - 同步文档
GET    /api/docs/search             - 文档搜索
```

### 视频管理
```
POST   /api/videos/upload           - 上传视频
POST   /api/ffmpeg/transcode        - 转码任务
GET    /api/ffmpeg/job/:id          - 任务状态
```

---

## 🔐 安全机制

### 认证流程
```
用户登录 → 验证密码（bcrypt）→ 生成 JWT → 保存令牌 → 后续请求自动附加
```

### 授权检查
```
中间件验证令牌有效性 → 解析用户身份 → 检查权限 → 允许/拒绝访问
```

### 数据验证
```
客户端验证（格式） → 服务端验证（业务逻辑） → 参数化查询（防 SQL 注入）
```

### 路径防护
```
用户输入路径 → 相对于基目录解析 → 检查是否在允许范围内 → 读取文件
```

---

## 🚀 性能优化

### 前端优化
- 代码分割（按需加载）
- 请求缓存（GET 10分钟 TTL）
- KeepAlive 组件缓存
- 虚拟滚动（大列表）
- 性能监控（FCP, FID, p50/p95）

### 后端优化
- 数据库连接池
- 查询索引优化
- 结果缓存
- 异步任务队列
- N+1 查询防护

### 网络优化
- 请求合并
- 批量操作
- gzip 压缩
- HTTP/2 Server Push

---

## 🧪 测试清单

### 功能测试
- [ ] 标签页导航正常
- [ ] 主题切换生效
- [ ] 用户认证流程
- [ ] 流程拖拽编辑
- [ ] Wiki 全文搜索
- [ ] WebSocket 实时推送
- [ ] FFmpeg 视频转码

### 性能测试
- [ ] 页面加载 < 1s
- [ ] API 响应 < 500ms
- [ ] 大列表渲染 < 200ms
- [ ] 搜索操作 < 1s

### 安全测试
- [ ] 未认证用户无法访问
- [ ] SQL 注入防护
- [ ] 路径遍历防护
- [ ] XSS 防护

---

## 📖 常见问题

### Q: 如何理解流程执行过程？
**A**: 见 [流程执行追踪](COMPLETE_ARCHITECTURE_GUIDE.md#22-流程执行追踪-flowinstancesvue) 部分，有完整的数据流图。

### Q: 如何添加新的流程节点类型？
**A**:
1. 定义节点数据结构
2. 创建对应的 Vue 组件
3. 在后端实现节点执行逻辑
4. 添加到节点类型列表

### Q: WebSocket 如何实现实时推送？
**A**: 见 [数据流和通信机制](COMPLETE_ARCHITECTURE_GUIDE.md#2-异步数据流websocket) 部分。

### Q: 如何实现自定义权限检查？
**A**: 见 [安全机制](COMPLETE_ARCHITECTURE_GUIDE.md#-安全机制) 部分的授权部分。

---

## 📞 快速导航

| 需求 | 文档位置 |
|------|---------|
| 了解项目整体架构 | [COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md) |
| 学习 API 接口 | [COMPLETE_ARCHITECTURE_GUIDE.md#-后端-api-体系](COMPLETE_ARCHITECTURE_GUIDE.md#-后端-api-体系) |
| 理解流程执行 | [COMPLETE_ARCHITECTURE_GUIDE.md#-工作流管理模块](COMPLETE_ARCHITECTURE_GUIDE.md#-工作流管理模块) |
| Wiki 功能详解 | [COMPLETE_ARCHITECTURE_GUIDE.md#31-wiki-知识库-wikicenterv](COMPLETE_ARCHITECTURE_GUIDE.md#31-wiki-知识库-wikicenterv) |
| 数据库设计 | [COMPLETE_ARCHITECTURE_GUIDE.md#-数据库设计](COMPLETE_ARCHITECTURE_GUIDE.md#-数据库设计) |
| 安全和认证 | [COMPLETE_ARCHITECTURE_GUIDE.md#-安全机制](COMPLETE_ARCHITECTURE_GUIDE.md#-安全机制) |
| 性能优化 | [COMPLETE_ARCHITECTURE_GUIDE.md#-性能优化](COMPLETE_ARCHITECTURE_GUIDE.md#-性能优化) |
| 部署指南 | [COMPLETE_ARCHITECTURE_GUIDE.md#-部署和扩展](COMPLETE_ARCHITECTURE_GUIDE.md#-部署和扩展) |

---

## 📊 项目统计

| 指标 | 数值 |
|------|------|
| 总代码行数 | 21,000+ |
| 前端代码 | 10,000+ |
| 后端代码 | 11,000+ |
| 页面组件 | 46 个 |
| API 端点 | 27 个 |
| 数据库表 | 20+ 个 |
| 主题配色 | 31 种 |
| Git 提交 | 125+ 个 |

---

**最后更新**：2026年3月1日
**维护人**：Claude Code

💡 提示：本索引中心包含指向详细文档的链接。建议从 [COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md) 开始阅读。
