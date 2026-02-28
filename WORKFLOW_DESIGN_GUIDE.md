# 工作流管理系统设计文档

> **文档目的**: 帮助开发者和用户理解工作流管理系统的设计思想、实现方式和使用方法。

## 📚 目录

1. [系统概览](#系统概览)
2. [核心概念](#核心概念)
3. [页面详解](#页面详解)
4. [数据流与交互](#数据流与交互)
5. [技术实现](#技术实现)
6. [移动端和主题支持](#移动端和主题支持)
7. [开发指南](#开发指南)

---

## 系统概览

工作流管理系统（Workflow Management System）是一个完整的业务流程管理解决方案，用于创建、追踪和管理复杂的工作流程。

### 系统的五大功能模块

```
工作流管理系统
├─ 流程设计器（Flow Diagram Editor）   → 创建和编辑工作流程
├─ 流程追踪（Flow Tracking）          → 监控运行中的流程实例
├─ 流程任务（Flow Tasks）             → 管理分配给用户的任务
├─ 文件管理（Flow File Manager）      → 管理工作流相关文件
└─ 工作项（Flow Work Items）          → 管理工作项（待实现扩展）
```

### 系统工作流程

```
用户创建流程
    ↓
编辑流程步骤和规则
    ↓
发布流程模板
    ↓
用户提交申请
    ↓
系统创建流程实例
    ↓
实例按步骤执行
    ↓
用户处理任务
    ↓
流程完成或拒绝
```

---

## 核心概念

### 1. 流程（Flow）
**定义**: 一个可复用的工作流程模板，定义了业务流程的结构和规则。

**属性**:
- `id`: 唯一标识符（例如：`flow_1234567890`）
- `name`: 流程名称（例如：`请假申请`）
- `description`: 流程描述
- `icon`: 流程图标（emoji）
- `steps`: 流程步骤数组
- `created_at`: 创建时间戳
- `updated_at`: 最后更新时间戳

**示例**:
```javascript
{
  id: 'flow_1708925000000',
  name: '请假申请',
  description: '员工请假审批流程',
  icon: '🌴',
  steps: [
    { name: '填写申请', description: '员工填写请假信息' },
    { name: '部门审核', description: '部门经理审核' },
    { name: '最终批准', description: '公司HR最终批准' }
  ],
  created_at: 1708925000000,
  updated_at: 1708925000000
}
```

### 2. 步骤（Step）
**定义**: 流程中的一个执行单位，代表流程的一个阶段。

**属性**:
- `name`: 步骤名称
- `description`: 步骤描述
- `assignee`: 分配给谁（可选）
- `duration`: 预计耗时（可选，单位：小时）
- `isConditional`: 是否是条件步骤（分支逻辑）

**特点**:
- 步骤是**有序的** - 按定义顺序执行
- 步骤可以**重新排序** - 通过上移/下移按钮
- 步骤可以有**条件** - 根据不同条件走不同分支

### 3. 实例（Instance）
**定义**: 流程的一个实际执行副本，代表一次具体的流程执行。

**属性**:
- `id`: 实例ID
- `flowName`: 所属流程名称
- `requester`: 提交者
- `status`: 状态（pending/in_progress/completed/rejected/cancelled）
- `currentStep`: 当前执行到哪一步
- `progress`: 完成度百分比（0-100）
- `startTime`: 开始时间
- `steps`: 步骤执行详情

**状态转换**:
```
创建 → pending（待处理）
  ↓
处理 → in_progress（进行中）
  ↓
完成 ↘ completed（已完成）
拒绝 ↘ rejected（已拒绝）
取消 ↘ cancelled（已取消）
```

### 4. 任务（Task）
**定义**: 分配给用户的具体工作项。

**属性**:
- `id`: 任务ID
- `title`: 任务标题
- `flowName`: 所属流程
- `description`: 任务描述
- `status`: 状态（pending/in_progress/completed）
- `priority`: 优先级（low/medium/high/urgent）
- `dueDate`: 截止日期
- `assignee`: 分配给谁

**优先级色彩编码**:
- 🔴 `urgent`（紧急）- 深红色
- 🟡 `high`（高）- 红色
- 🟠 `medium`（中）- 橙色
- 🔵 `low`（低）- 蓝色

---

## 页面详解

### 1. 流程设计器 (FlowDiagramEditor.vue)

**位置**: `/src/pages/workflow/FlowDiagramEditor.vue` (794 行)

**用途**: 创建、编辑和管理工作流程模板。

#### 界面布局

```
┌─────────────────────────────────────┐
│  流程图编辑  📌                      │
│  设计和发布您的工作流程模板          │
└─────────────────────────────────────┘
│ [+ 新建流程]        [🔄 刷新]        │
├─────────────────────────────────────┤
│  列表视图                            │
│  ┌─────────────────────────────────┐│
│  │ 🌀 请假申请                 [编辑]││
│  │ 员工请假审批流程            [删除]││
│  │ 3个步骤 • 创建于 Feb 25      ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 📋 出差申请                 [编辑]││
│  │ 外出出差审批流程            [删除]││
│  │ 4个步骤 • 创建于 Feb 24      ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### 功能说明

**列表视图**（Flow List）:
- 显示所有流程模板的卡片式列表
- 每个卡片显示：流程名、描述、步骤数、创建时间
- 支持新建流程

**编辑视图**（Flow Editor）:
- 分为左右两栏：编辑区和预览区
- **左栏 - 编辑区**:
  - 基本信息：流程名、描述、图标
  - 步骤列表：支持添加、编辑、删除、重新排序
  - 步骤详情：名称、描述、分配人、预计耗时、是否条件分支
  - 操作按钮：上移、下移、删除

- **右栏 - 预览区**:
  - 实时显示流程结构
  - 格式化展示各步骤
  - 帮助用户理解流程逻辑

#### 核心交互

1. **创建流程**
   ```
   点击 [+ 新建流程]
   → 进入编辑视图
   → 填写流程基本信息
   → 添加步骤
   → 点击 [保存流程]
   ```

2. **添加步骤**
   ```
   点击 [+ 添加步骤]
   → 在步骤列表末尾添加新步骤
   → 填写步骤信息
   → 自动更新预览
   ```

3. **重新排序**
   ```
   点击步骤的 [↑] 或 [↓] 按钮
   → 与前/后一个步骤交换位置
   → 预览实时更新
   ```

4. **编辑步骤**
   ```
   点击步骤的 [编辑] 按钮
   → 字段变为可编辑
   → 修改后自动保存
   → 预览更新
   ```

5. **删除步骤**
   ```
   点击步骤的 [删除] 按钮
   → 确认后移除步骤
   → 预览更新
   ```

#### 数据存储

流程保存到服务器 API:
- 创建: `POST /api/flows` - 创建新流程
- 读取: `GET /api/flows` - 获取流程列表
- 更新: `PUT /api/flows/:id` - 更新流程
- 删除: `DELETE /api/flows/:id` - 删除流程

#### 验证规则

- ✅ 流程名称必填
- ✅ 至少需要1个步骤
- ✅ 步骤名称必填
- ✅ 不允许重复的流程名称

---

### 2. 流程追踪 (FlowTracking.vue)

**位置**: `/src/pages/workflow/FlowTracking.vue` (430 行)

**用途**: 实时监控和追踪正在运行的流程实例。

#### 界面布局

```
┌─────────────────────────────────────────┐
│  流程追踪                               │
│  汇总运行中的流程实例，跟踪当前节点    │
├─────────────────────────────────────────┤
│  [搜索流程或用户...] [🔄 刷新]           │
├─────────────────────────────────────────┤
│  实例卡片网格（响应式）                 │
│  ┌──────────────┐ ┌──────────────┐     │
│  │请假申请 ⏳   │ │出差申请 ✅   │     │
│  │━━━━━━━━━━━━│ │━━━━━━━━━━━━│     │
│  │申请人：张三  │ │申请人：李四  │     │
│  │当前：部门审核│ │当前：已完成  │     │
│  │进度：50%    │ │进度：100%   │     │
│  │时间：Feb 25 │ │时间：Feb 26 │     │
│  │           │ │           │     │
│  │[查看详情] │ │[查看详情] │     │
│  │[下载日志] │ │[下载日志] │     │
│  └──────────────┘ └──────────────┘     │
└─────────────────────────────────────────┘
```

#### 功能说明

**实例卡片**:
- 网格布局，每行显示 2-3 个卡片（取决于屏幕宽度）
- 显示流程名称、状态标识、申请人、当前步骤、完成度
- 进度条可视化流程完成百分比
- 状态标签配合语义色彩（待处理=黄、进行中=蓝、已完成=绿、拒绝=红、取消=紫）

**搜索功能**:
- 实时搜索流程名称和申请人
- 不区分大小写
- 支持部分匹配

**详情面板**（Modal）:
```
┌────────────────────────────────┐
│ 请假申请 - 详情            [✕]  │
├────────────────────────────────┤
│ 基本信息                        │
│ ├─ 实例 ID: flow_inst_123456   │
│ ├─ 状态: 🟡 进行中             │
│ ├─ 申请人: 张三               │
│ └─ 开始: 2026年2月25日         │
│                                │
│ 步骤执行情况                    │
│ ├─ ✅ 填写申请          (Feb 25)│
│ ├─ 🔵 部门审核       (等待中...)│
│ ├─ ⭕ 最终批准          (待执行) │
│ └─ ⭕ 存档              (待执行) │
└────────────────────────────────┘
```

**步骤执行情况（Timeline）**:
- 已完成步骤：绿色圆点 ✅
- 当前步骤：蓝色圆点 🔵
- 待执行步骤：灰色圆点 ⭕
- 显示完成时间或"等待中..."
- 可以显示审核意见（备注）

#### 核心交互

1. **搜索实例**
   ```
   输入流程名称或申请人名字
   → 列表实时过滤
   → 显示匹配的实例
   ```

2. **查看详情**
   ```
   点击 [查看详情]
   → 打开模态窗口
   → 显示完整的流程信息和步骤时间线
   → 点击 [✕] 关闭
   ```

3. **下载日志**
   ```
   点击 [下载日志]
   → 生成 CSV 文件
   → 包含实例 ID、状态等信息
   → 浏览器自动下载
   ```

4. **实时刷新**
   ```
   点击 [刷新]
   → 从服务器重新加载实例数据
   → 更新显示
   ```

#### 数据来源

从服务器 API 获取:
- `GET /api/flows` - 获取所有流程实例

---

### 3. 流程任务 (FlowTasks.vue)

**位置**: `/src/pages/workflow/FlowTasks.vue` (280 行)

**用途**: 管理分配给用户的流程相关任务。

#### 界面布局

```
┌─────────────────────────────────────┐
│  流程任务                           │
│  查看和管理分配给你的流程任务       │
├─────────────────────────────────────┤
│  [所有状态 ▼]    [🔄 刷新]          │
├─────────────────────────────────────┤
│  任务列表                           │
│  ┌─────────────────────────────────┐│
│  │█│ 审核申请表           [开始][完成]││
│  │ │ 📋 请假申请                    ││
│  │ │ 需要审核新提交的请假申请单     ││
│  │ │ 📅 2月25日 🔴高 👤 张三       ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │█│ 批准出差单           [查看][完成]││
│  │ │ 📋 出差申请                    ││
│  │ │ 审核员工的出差申请            ││
│  │ │ 📅 2月26日 🟠中 👤 李四       ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### 功能说明

**任务卡片**:
- 左侧有彩色竖条表示状态（待处理=橙色、进行中=蓝色、已完成=绿色）
- 任务标题和所属流程
- 任务描述
- 元数据标签：截止日期、优先级、分配人
- 两个操作按钮：开始/查看 和 完成

**状态过滤**:
- 下拉菜单选择：所有状态 / 待处理 / 进行中 / 已完成
- 实时更新任务列表

**优先级配色**:
- 🔴 `urgent`（紧急）- 深红色背景
- 🔴 `high`（高）- 浅红色背景
- 🟠 `medium`（中）- 黄色背景
- 🔵 `low`（低）- 蓝色背景

#### 核心交互

1. **开始任务**
   ```
   点击 [开始]（仅待处理状态）
   → 任务状态变为"进行中"
   → 显示成功提示
   → 按钮变为 [查看]
   ```

2. **完成任务**
   ```
   点击 [完成]
   → 任务状态变为"已完成"
   → 显示成功提示
   → 按钮变为 [已完成]（禁用）
   ```

3. **过滤任务**
   ```
   选择状态过滤器
   → 列表实时过滤
   → 只显示该状态的任务
   ```

4. **刷新任务**
   ```
   点击 [刷新]
   → 从服务器重新加载任务
   → 更新显示
   ```

#### 数据结构示例

```javascript
{
  id: 'task_1',
  title: '审核申请表',
  flowName: '请假申请',
  description: '需要审核新提交的请假申请单',
  status: 'pending',           // pending/in_progress/completed
  priority: 'high',            // low/medium/high/urgent
  dueDate: 1708982400000,      // 时间戳
  assignee: '张三'
}
```

---

### 4. 文件管理 (FlowFileManager.vue)

**位置**: `/src/pages/workflow/FlowFileManager.vue` (150 行)

**用途**: 管理与工作流程相关的文件和文档。

#### 界面布局

```
┌──────────────────────────────────────┐
│  文件管理                            │
│  管理工作流相关的文件和附件           │
├──────────────────────────────────────┤
│  [+ 上传文件]         [🔄 刷新]       │
├──────────────────────────────────────┤
│  文件卡片网格                        │
│  ┌────────┐  ┌────────┐             │
│  │📄      │  │⚙️      │             │
│  │申请表  │  │配置文件│             │
│  │.pdf    │  │.json   │             │
│  │256 KB  │  │12 KB   │             │
│  │Feb 25  │  │Feb 25  │             │
│  │[下载]  │  │[下载]  │             │
│  │[删除]  │  │[删除]  │             │
│  └────────┘  └────────┘             │
│  ┌────────┐  ┌────────┐             │
│  │📊      │  │📎      │             │
│  │报表数据│  │附件    │             │
│  │.csv    │  │.zip    │             │
│  │1.2 MB  │  │5.6 MB  │             │
│  │Feb 24  │  │Feb 23  │             │
│  │[下载]  │  │[下载]  │             │
│  │[删除]  │  │[删除]  │             │
│  └────────┘  └────────┘             │
└──────────────────────────────────────┘
```

#### 功能说明

**文件卡片**:
- 网格布局（每行 3-4 张卡片）
- 文件图标（根据类型自动选择）
- 文件名称
- 文件大小（自动转换为 B/KB/MB）
- 创建日期
- 操作按钮：下载、删除

**文件类型图标**:
- 📄 `.pdf`, `.doc`, `.docx`, `.txt`
- ⚙️ `.json`, `.yaml`, `.config`
- 📊 `.csv`, `.xls`, `.xlsx`
- 📎 其他类型

#### 核心交互

1. **上传文件**
   ```
   点击 [+ 上传文件]
   → 打开文件选择器
   → 选择文件
   → 上传到服务器
   → 刷新列表
   ```

2. **下载文件**
   ```
   点击 [下载]
   → 浏览器下载文件
   ```

3. **删除文件**
   ```
   点击 [删除]
   → 确认删除
   → 从服务器删除
   → 列表更新
   ```

---

## 数据流与交互

### 整体数据流

```
用户界面 (Vue Components)
   ↓
状态管理 (data/computed)
   ↓
方法处理 (methods)
   ↓
API 调用 (api.js)
   ↓
后端服务器 (Node.js/Express)
   ↓
数据库 (JSON/SQLite)
```

### 流程创建的完整数据流

```
1. 用户在 FlowDiagramEditor 中点击 [+ 新建流程]
   ↓
2. Vue 数据: currentView = 'editor', editingFlow = newFlow()
   ↓
3. 用户输入流程信息（名称、描述、图标）
   ↓
4. 用户添加步骤
   ↓
5. 用户点击 [保存流程]
   ↓
6. 验证: 流程名称不为空 && 至少有1个步骤
   ↓
7. 调用 API: POST /api/flows
   ↓
8. 后端创建流程记录
   ↓
9. 返回新流程对象（带ID）
   ↓
10. 更新本地 flows 数组
   ↓
11. 显示成功提示
   ↓
12. 返回列表视图
```

### 任务执行的数据流

```
1. 用户在 FlowTasks 中点击 [开始]
   ↓
2. Vue 更新: task.status = 'in_progress'
   ↓
3. 显示成功提示
   ↓
4. 用户完成工作
   ↓
5. 用户点击 [完成]
   ↓
6. Vue 更新: task.status = 'completed'
   ↓
7. 可选: 调用 API 持久化状态
   ↓
8. 显示完成提示
```

### 实例追踪的数据流

```
1. 页面挂载 mounted()
   ↓
2. 调用 loadInstances()
   ↓
3. API: GET /api/flows
   ↓
4. 返回所有流程实例数组
   ↓
5. 渲染为卡片网格
   ↓
6. 用户可以搜索、查看详情、下载日志
```

---

## 技术实现

### 技术栈

```
Vue 3 (Composition/Options API)
├─ Single File Components (.vue)
├─ Template (HTML with v-directives)
├─ Script (JavaScript)
└─ Style (Scoped CSS)

核心库
├─ axios (API 调用)
├─ vue-router (页面路由)
└─ 自定义 api.js 模块

API 后端
├─ Node.js
├─ Express
└─ REST API endpoints
```

### 组件通信模式

**父子通信**:
```javascript
// 父组件 → 子组件: Props
<ChildComponent :task="task" />

// 子组件 → 父组件: Emits/Methods
this.$emit('taskComplete', taskData)
this.updateParent(data)
```

**跨组件通信**:
```javascript
// 通过共享 API 模块
import { api } from '@/utils/api.js'

// 通过事件总线（可选）
// EventBus.$emit('flowCreated', flow)
```

### 响应式数据管理

每个页面都遵循相同的数据模式:

```javascript
export default {
  data() {
    return {
      // 主数据
      items: [],           // 列表数据
      selectedItem: null,  // 当前选中项
      loading: false,      // 加载状态

      // 过滤/搜索
      filterStatus: '',
      searchQuery: '',

      // 表单数据
      editingItem: {}      // 编辑中的项
    }
  },

  computed: {
    // 过滤数据
    filteredItems() {
      return this.items.filter(...)
    }
  },

  methods: {
    // API 操作
    async loadItems() { ... },
    async createItem() { ... },
    async updateItem() { ... },
    async deleteItem() { ... },

    // 交互处理
    handleAction(item) { ... },

    // 格式化
    formatDate(timestamp) { ... }
  },

  mounted() {
    // 页面挂载时加载数据
    this.loadItems()
  }
}
```

### API 集成

所有 API 调用通过 `api.js` 模块:

```javascript
// 创建流程
const flow = await api.flows.create({ name, description, steps })

// 获取流程列表
const flows = await api.flows.getAll()

// 更新流程
const updated = await api.flows.update(id, data)

// 删除流程
await api.flows.delete(id)
```

API 错误处理:

```javascript
try {
  await api.flows.create(data)
  // 显示成功提示
} catch (error) {
  console.error('创建流程失败:', error)
  // 显示错误提示
}
```

---

## 移动端和主题支持

### 响应式设计策略

所有页面都采用 **mobile-first** 的响应式设计:

```css
/* 默认: 移动端布局 (< 480px) */
.container {
  padding: 12px;
  flex-direction: column;
}

/* 平板设备 (480px - 768px) */
@media (min-width: 480px) {
  .container {
    padding: 16px;
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 桌面设备 (> 768px) */
@media (min-width: 768px) {
  .container {
    padding: 20px;
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### 关键断点

```
┌─────────────────────────────────────┐
│  屏幕尺寸        断点        布局    │
├─────────────────────────────────────┤
│  < 480px        -        1 列      │
│  480-768px      480px    2 列      │
│  > 768px        768px    3+ 列     │
└─────────────────────────────────────┘
```

### 移动端特殊处理

**按钮大小**:
```css
/* 确保触摸目标至少 44px */
.btn {
  padding: 10px 14px;
  min-height: 44px;
  min-width: 44px;
}
```

**表单输入**:
```css
/* 移动端避免被虚拟键盘遮挡 */
input, textarea {
  font-size: 16px;  /* 防止自动放大 */
  padding: 12px;
  border-radius: 8px;
}
```

**弹窗/模态框**:
```css
/* 移动端全屏显示 */
@media (max-width: 768px) {
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 90vh;
  }
}
```

### 主题变量系统

所有颜色都使用 CSS 自定义属性（CSS Variables）:

```css
:root {
  --app-primary: #3b82f6;           /* 主色 */
  --app-on-primary: #ffffff;        /* 主色文本 */
  --app-card: #ffffff;              /* 卡片背景 */
  --app-card-elevated: #f3f4f6;     /* 提升卡片 */
  --app-text: #1f2937;              /* 正文色 */
  --app-text-muted: #6b7280;        /* 弱化文本 */
  --app-border: #e5e7eb;            /* 边框色 */
  --app-soft-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```

### 暗色模式支持

```css
/* 暗色主题 */
@media (prefers-color-scheme: dark) {
  :root {
    --app-card: #1f2937;
    --app-card-elevated: #374151;
    --app-text: #f3f4f6;
    --app-text-muted: #9ca3af;
    --app-border: #4b5563;
  }
}
```

### 主题主色变体

应用支持多个主题颜色:

```
蓝色 (Blue)      - #3b82f6
绿色 (Green)     - #10b981
紫色 (Purple)    - #a855f7
橙色 (Orange)    - #f97316
粉色 (Pink)      - #ec4899
暗色 (Dark)      - #1f2937
```

每个主题通过改变 `--app-primary` 实现全局切换。

---

## 开发指南

### 添加新页面

1. **创建 Vue 组件文件**:
```bash
touch src/pages/workflow/FlowNewFeature.vue
```

2. **基础结构**:
```vue
<template>
  <div class="flow-new-feature">
    <!-- 标题 -->
    <header class="page-header">
      <h2>新功能</h2>
      <p class="subtitle">功能描述</p>
    </header>

    <!-- 操作栏 -->
    <div class="header-actions">
      <button class="btn btn-primary" @click="doAction">按钮</button>
    </div>

    <!-- 内容区 -->
    <div v-if="loading" class="state-message">加载中...</div>
    <div v-else-if="items.length === 0" class="state-message">暂无内容</div>
    <div v-else class="items-list">
      <!-- 列表内容 -->
    </div>
  </div>
</template>

<script>
import { api } from '@/utils/api.js'

export default {
  name: 'FlowNewFeature',
  data() {
    return {
      items: [],
      loading: false
    }
  },
  methods: {
    async loadItems() {
      this.loading = true
      try {
        this.items = await api.flows.getAll()
      } catch (error) {
        console.error('加载失败:', error)
      } finally {
        this.loading = false
      }
    }
  },
  mounted() {
    this.loadItems()
  }
}
</script>

<style scoped>
.flow-new-feature {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 4px;
  font-size: 1.8em;
}

.subtitle {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.95em;
}

/* 响应式 */
@media (max-width: 768px) {
  .flow-new-feature {
    padding: 12px;
  }
}
</style>
```

3. **添加路由**:
```javascript
// src/router/index.js
{
  path: '/workflow/new-feature',
  component: () => import('@/pages/workflow/FlowNewFeature.vue')
}
```

4. **集成 API**:
```javascript
// server/routes/flows.js
router.get('/new-feature', (req, res) => {
  // 实现获取逻辑
})
```

### 扩展现有功能

**示例：为 FlowTasks 添加优先级排序**

1. 在 `data()` 中添加排序字段:
```javascript
data() {
  return {
    sortBy: 'dueDate'  // 新增排序字段
  }
}
```

2. 修改 `computed` 属性:
```javascript
computed: {
  filteredTasks() {
    let tasks = this.filterStatus
      ? this.tasks.filter(t => t.status === this.filterStatus)
      : this.tasks

    // 添加排序逻辑
    if (this.sortBy === 'priority') {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    }

    return tasks
  }
}
```

3. 在模板中添加排序选择器:
```vue
<div class="header-actions">
  <select v-model="sortBy">
    <option value="dueDate">按截止日期</option>
    <option value="priority">按优先级</option>
  </select>
</div>
```

### 常见问题解答

**Q: 如何添加新的流程状态？**
A: 修改状态枚举和对应的 CSS 类:
```javascript
const statusLabels = {
  'pending': '待处理',
  'in_progress': '进行中',
  'completed': '已完成',
  'on_hold': '暂停',        // 新增
  'rejected': '已拒绝'
}
```

**Q: 如何保存流程草稿？**
A: 在 `editingFlow` 中添加 `isDraft` 标志:
```javascript
const flow = {
  ...baseFlow,
  isDraft: true,
  savedAt: Date.now()
}
```

**Q: 如何实现流程模板复制？**
A: 创建 `duplicateFlow` 方法:
```javascript
duplicateFlow(flow) {
  const newFlow = {
    ...flow,
    id: 'flow_' + Date.now(),
    name: flow.name + ' (副本)',
    created_at: Date.now()
  }
  return api.flows.create(newFlow)
}
```

**Q: 移动端应该如何处理长列表？**
A: 使用虚拟列表或分页:
```javascript
computed: {
  paginatedTasks() {
    const start = (this.currentPage - 1) * this.pageSize
    return this.filteredTasks.slice(start, start + this.pageSize)
  }
}
```

---

## 总结

工作流管理系统是一个模块化、可扩展的解决方案，具有:

✅ **完整的功能体系** - 从设计到追踪的全流程覆盖
✅ **优秀的用户体验** - 直观的界面和流畅的交互
✅ **强大的移动支持** - 完全的响应式设计
✅ **灵活的主题系统** - 一键切换主题
✅ **清晰的代码结构** - 易于维护和扩展

通过本文档，开发者可以快速理解系统设计，扩展新功能，维护代码质量。

---

## 附录

### 文件清单

| 文件路径 | 行数 | 功能 |
|---------|------|------|
| `/src/pages/workflow/FlowDiagramEditor.vue` | 794 | 流程设计器 |
| `/src/pages/workflow/FlowTracking.vue` | 430 | 流程追踪 |
| `/src/pages/workflow/FlowTasks.vue` | 280 | 流程任务 |
| `/src/pages/workflow/FlowFileManager.vue` | 150 | 文件管理 |
| `/src/pages/workflow/FlowInstances.vue` | 20 | 实例管理（待扩展） |
| `/src/pages/workflow/FlowWorkItems.vue` | 20 | 工作项（待扩展） |

### 相关 API 端点

```
GET  /api/flows              - 获取所有流程
POST /api/flows              - 创建流程
GET  /api/flows/:id          - 获取单个流程
PUT  /api/flows/:id          - 更新流程
DELETE /api/flows/:id        - 删除流程

GET  /api/flows/instances    - 获取实例列表
GET  /api/tasks              - 获取任务列表
PUT  /api/tasks/:id          - 更新任务状态

GET  /api/files              - 获取文件列表
POST /api/files              - 上传文件
DELETE /api/files/:id        - 删除文件
```

### 推荐阅读

- [Vue 3 官方文档](https://vuejs.org)
- [项目架构文档](./PROJECT_ARCHITECTURE.md)
- [响应式设计指南](./RESPONSIVE_DESIGN.md)
- [移动端测试指南](./MOBILE_TEST_GUIDE.md)

---

**文档版本**: 1.0
**最后更新**: 2026年2月26日
**维护人**: Claude Code
