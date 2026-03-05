# M9 流水线模块设计文档

> **项目：** Vue Learning App - 流式执行引擎
> **模块代号：** M9 Pipeline Engine
> **版本：** v1.0.0
> **最后更新：** 2026-03-05

---

## 📋 目录

- [1. 需求分析](#1-需求分析)
- [2. 架构设计](#2-架构设计)
- [3. 核心概念](#3-核心概念)
- [4. 技术方案](#4-技术方案)
- [5. API 设计](#5-api-设计)
- [6. 数据模型](#6-数据模型)
- [7. 实现细节](#7-实现细节)
- [8. 使用示例](#8-使用示例)
- [9. 扩展性设计](#9-扩展性设计)
- [10. 故障排除](#10-故障排除)

---

## 1. 需求分析

### 1.1 核心需求

**目标：** 构建一个灵活的流式任务执行引擎，允许用户通过可视化方式组装不同的处理模块，形成自定义的数据处理流水线。

**核心特性：**
- ✅ **模块化设计** - 每个处理单元是独立的模块
- ✅ **流式执行** - 数据在模块间流动，支持异步处理
- ✅ **可视化编排** - 拖拽式流水线设计界面
- ✅ **动态组合** - 运行时动态加载和组合模块
- ✅ **状态监控** - 实时查看每个模块的执行状态
- ✅ **错误处理** - 支持重试、降级、错误传播
- ✅ **持久化** - 保存和加载流水线配置

### 1.2 应用场景

| 场景 | 描述 | 示例流水线 |
|------|------|------------|
| **数据处理** | ETL 数据转换 | 读取 → 清洗 → 转换 → 写入 |
| **内容生成** | AI 内容创作 | 获取主题 → 生成大纲 → 扩写 → 格式化 |
| **视频处理** | 批量视频处理 | 扫描文件 → 转码 → 压缩 → 上传 |
| **任务自动化** | 定时任务编排 | 检测条件 → 执行操作 → 通知 → 记录日志 |
| **Web 爬虫** | 数据采集流程 | 请求页面 → 解析 → 过滤 → 存储 |

### 1.3 非功能性需求

- **性能：** 支持并发执行，单个流水线处理 1000+ 任务/分钟
- **可靠性：** 支持断点续传，故障自动恢复
- **易用性：** 5 分钟内完成首个流水线创建
- **扩展性：** 支持自定义模块开发和插件系统
- **监控：** 提供实时监控和历史记录查询

---

## 2. 架构设计

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      前端层 (Vue 3)                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 流水线编辑器  │  │ 执行监控面板  │  │ 模块市场      │      │
│  │ (Pipeline    │  │ (Execution   │  │ (Module      │      │
│  │  Editor)     │  │  Monitor)    │  │  Store)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  Pipeline API  │                        │
│                    │   (api.js)     │                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP/WebSocket
┌────────────────────────────▼─────────────────────────────────┐
│                     后端层 (Node.js + Express)                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Pipeline     │  │ Execution    │  │ Module       │      │
│  │ Controller   │  │ Engine       │  │ Registry     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│         ┌──────────────────┴──────────────────┐              │
│         │                                      │              │
│  ┌──────▼────────┐                   ┌────────▼────────┐    │
│  │ Task Queue    │                   │ Module Loader   │    │
│  │ (Bull/Agenda) │                   │ (Dynamic Import)│    │
│  └───────────────┘                   └─────────────────┘    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ State Store  │  │ Event Bus    │  │ Logger       │      │
│  │ (Redis)      │  │ (EventEmitter│  │ (Winston)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                        数据层                                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Pipeline DB  │  │ Execution DB │  │ Module DB    │      │
│  │ (MySQL)      │  │ (MySQL)      │  │ (JSON/MySQL) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 分层职责

| 层级 | 职责 | 技术选型 |
|------|------|----------|
| **前端层** | 可视化编辑、状态展示、用户交互 | Vue 3 + Vite + Vue Flow |
| **API 层** | 请求转发、数据验证、权限控制 | Express Router |
| **业务层** | 流水线编排、执行引擎、模块管理 | Node.js + TypeScript |
| **数据层** | 数据持久化、状态存储、日志记录 | MySQL + Redis |

---

## 3. 核心概念

### 3.1 Pipeline（流水线）

**定义：** 由多个 Module 组成的有向无环图（DAG），定义了数据处理的完整流程。

**属性：**
```javascript
{
  id: 'pipeline_001',
  name: '视频处理流水线',
  description: '批量转码和压缩视频',
  version: '1.0.0',
  status: 'active', // active | paused | archived
  nodes: [/* Module 配置 */],
  edges: [/* 连接关系 */],
  config: {
    maxConcurrency: 5,      // 最大并发数
    timeout: 300000,         // 超时时间（毫秒）
    retryPolicy: {          // 重试策略
      maxAttempts: 3,
      backoff: 'exponential'
    },
    errorHandling: 'continue' // continue | stop | rollback
  },
  created: '2026-03-05T10:00:00Z',
  updated: '2026-03-05T12:00:00Z'
}
```

### 3.2 Module（模块）

**定义：** 流水线中的最小执行单元，封装特定的业务逻辑。

**类型：**

| 类型 | 描述 | 输入 | 输出 |
|------|------|------|------|
| **Source** | 数据源模块 | 无 | 数据流 |
| **Transform** | 转换模块 | 数据流 | 转换后数据流 |
| **Filter** | 过滤模块 | 数据流 | 过滤后数据流 |
| **Sink** | 数据汇模块 | 数据流 | 无 |
| **Branch** | 分支模块 | 数据流 | 多路数据流 |
| **Merge** | 合并模块 | 多路数据流 | 单路数据流 |

**接口规范：**
```javascript
class Module {
  constructor(config) {
    this.id = config.id
    this.type = config.type
    this.name = config.name
    this.config = config
  }

  // 初始化模块
  async init() {}

  // 执行模块逻辑
  async execute(input, context) {
    // 返回 { output, metadata }
  }

  // 验证输入数据
  validate(input) {
    // 返回 { valid: boolean, errors: [] }
  }

  // 清理资源
  async cleanup() {}
}
```

### 3.3 Context（上下文）

**定义：** 贯穿整个流水线执行过程的共享状态对象。

**结构：**
```javascript
{
  executionId: 'exec_12345',
  pipelineId: 'pipeline_001',
  startTime: 1709654400000,
  variables: {
    // 全局变量
    sourceDir: '/data/videos',
    outputDir: '/data/processed'
  },
  state: {
    // 执行状态
    currentNode: 'node_003',
    processedCount: 150,
    failedCount: 2
  },
  metadata: {
    // 元数据
    triggeredBy: 'user_001',
    environment: 'production'
  }
}
```

### 3.4 Execution（执行实例）

**定义：** 每次流水线运行产生的独立执行实例。

**生命周期：**
```
pending → running → [paused] → completed / failed / cancelled
```

**状态转换：**
- `pending`: 等待执行
- `running`: 正在执行
- `paused`: 暂停（可恢复）
- `completed`: 成功完成
- `failed`: 执行失败
- `cancelled`: 用户取消

---

## 4. 技术方案

### 4.1 核心技术栈

| 组件 | 技术选型 | 用途 |
|------|----------|------|
| **前端框架** | Vue 3 + Composition API | UI 组件和状态管理 |
| **流程图** | Vue Flow / X6 | 可视化流水线编辑器 |
| **后端框架** | Express.js | HTTP API 服务 |
| **执行引擎** | Bull / Agenda.js | 任务队列和调度 |
| **数据库** | MySQL 8.0 | 持久化存储 |
| **缓存** | Redis | 状态缓存和消息队列 |
| **实时通信** | WebSocket (ws) | 执行状态推送 |
| **日志** | Winston | 日志记录和查询 |

### 4.2 执行引擎设计

#### 4.2.1 执行模型

采用 **基于事件的异步流式执行模型**：

```javascript
class PipelineExecutor {
  constructor(pipeline, context) {
    this.pipeline = pipeline
    this.context = context
    this.eventBus = new EventEmitter()
    this.nodeStates = new Map()
  }

  async execute() {
    // 1. 拓扑排序，确定执行顺序
    const executionOrder = this.topologicalSort()

    // 2. 初始化所有模块
    await this.initModules()

    // 3. 按顺序执行节点
    for (const nodeId of executionOrder) {
      await this.executeNode(nodeId)
    }

    // 4. 清理资源
    await this.cleanup()
  }

  async executeNode(nodeId) {
    const node = this.pipeline.nodes.find(n => n.id === nodeId)
    const module = this.loadModule(node.type)

    // 获取输入数据
    const input = await this.gatherInput(nodeId)

    // 执行模块
    this.nodeStates.set(nodeId, 'running')
    this.eventBus.emit('node:start', { nodeId, input })

    try {
      const result = await module.execute(input, this.context)

      this.nodeStates.set(nodeId, 'completed')
      this.eventBus.emit('node:complete', { nodeId, result })

      // 传递输出到下游节点
      await this.propagateOutput(nodeId, result.output)

      return result
    } catch (error) {
      this.nodeStates.set(nodeId, 'failed')
      this.eventBus.emit('node:error', { nodeId, error })

      await this.handleError(nodeId, error)
    }
  }

  async propagateOutput(nodeId, output) {
    const downstreamNodes = this.getDownstreamNodes(nodeId)

    for (const targetId of downstreamNodes) {
      await this.queueNodeInput(targetId, output)
    }
  }
}
```

#### 4.2.2 并发控制

使用 **并发池 + 依赖图** 实现智能并发：

```javascript
class ConcurrencyController {
  constructor(maxConcurrency = 5) {
    this.maxConcurrency = maxConcurrency
    this.runningTasks = new Set()
    this.pendingTasks = []
    this.dependencyGraph = new Map()
  }

  async schedule(task, dependencies = []) {
    // 等待依赖任务完成
    await Promise.all(dependencies)

    // 等待空闲槽位
    while (this.runningTasks.size >= this.maxConcurrency) {
      await this.waitForSlot()
    }

    // 执行任务
    this.runningTasks.add(task.id)
    try {
      const result = await task.execute()
      return result
    } finally {
      this.runningTasks.delete(task.id)
      this.notifySlotAvailable()
    }
  }
}
```

### 4.3 模块加载机制

采用 **动态导入 + 注册表** 模式：

```javascript
class ModuleRegistry {
  constructor() {
    this.modules = new Map()
    this.loadedModules = new Map()
  }

  // 注册模块
  register(type, modulePath, metadata) {
    this.modules.set(type, {
      path: modulePath,
      metadata,
      loaded: false
    })
  }

  // 动态加载模块
  async load(type) {
    if (this.loadedModules.has(type)) {
      return this.loadedModules.get(type)
    }

    const moduleInfo = this.modules.get(type)
    if (!moduleInfo) {
      throw new Error(`Module type '${type}' not registered`)
    }

    // 动态导入
    const ModuleClass = await import(moduleInfo.path)
    const instance = new ModuleClass.default()

    this.loadedModules.set(type, instance)
    return instance
  }

  // 列出所有可用模块
  listModules() {
    return Array.from(this.modules.entries()).map(([type, info]) => ({
      type,
      ...info.metadata
    }))
  }
}
```

### 4.4 状态管理

使用 **Redis + MySQL** 混合存储：

| 数据类型 | 存储位置 | TTL | 用途 |
|----------|----------|-----|------|
| **执行状态** | Redis | 24h | 实时状态查询 |
| **节点输出** | Redis | 1h | 节点间数据传递 |
| **执行历史** | MySQL | 永久 | 历史记录和审计 |
| **流水线配置** | MySQL | 永久 | 配置持久化 |

**Redis Key 设计：**
```
pipeline:execution:{executionId}:state       → 执行状态
pipeline:execution:{executionId}:nodes       → 节点状态集合
pipeline:execution:{executionId}:output:{nodeId} → 节点输出数据
pipeline:locks:{pipelineId}                  → 流水线锁
```

---

## 5. API 设计

### 5.1 Pipeline Management API

#### 创建流水线
```http
POST /api/pipelines
Content-Type: application/json

{
  "name": "视频处理流水线",
  "description": "批量转码和压缩",
  "nodes": [...],
  "edges": [...],
  "config": {...}
}

Response 201:
{
  "id": "pipeline_001",
  "status": "active",
  "created": "2026-03-05T10:00:00Z"
}
```

#### 获取流水线列表
```http
GET /api/pipelines?status=active&page=1&limit=20

Response 200:
{
  "data": [
    {
      "id": "pipeline_001",
      "name": "视频处理流水线",
      "status": "active",
      "lastExecuted": "2026-03-05T09:30:00Z",
      "executionCount": 127
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### 更新流水线
```http
PUT /api/pipelines/:id
Content-Type: application/json

{
  "name": "更新后的名称",
  "nodes": [...],
  "edges": [...]
}

Response 200:
{
  "id": "pipeline_001",
  "updated": "2026-03-05T11:00:00Z"
}
```

#### 删除流水线
```http
DELETE /api/pipelines/:id

Response 204 No Content
```

### 5.2 Execution API

#### 触发执行
```http
POST /api/pipelines/:id/execute
Content-Type: application/json

{
  "variables": {
    "sourceDir": "/data/videos",
    "outputDir": "/data/processed"
  },
  "config": {
    "priority": "high"
  }
}

Response 202:
{
  "executionId": "exec_12345",
  "status": "pending",
  "estimatedDuration": 180
}
```

#### 查询执行状态
```http
GET /api/executions/:executionId

Response 200:
{
  "executionId": "exec_12345",
  "pipelineId": "pipeline_001",
  "status": "running",
  "progress": 0.65,
  "startTime": "2026-03-05T10:00:00Z",
  "nodes": [
    {
      "nodeId": "node_001",
      "status": "completed",
      "duration": 2300
    },
    {
      "nodeId": "node_002",
      "status": "running",
      "progress": 0.8
    }
  ],
  "statistics": {
    "totalNodes": 5,
    "completedNodes": 2,
    "failedNodes": 0
  }
}
```

#### 暂停执行
```http
POST /api/executions/:executionId/pause

Response 200:
{
  "executionId": "exec_12345",
  "status": "paused"
}
```

#### 恢复执行
```http
POST /api/executions/:executionId/resume

Response 200:
{
  "executionId": "exec_12345",
  "status": "running"
}
```

#### 取消执行
```http
POST /api/executions/:executionId/cancel

Response 200:
{
  "executionId": "exec_12345",
  "status": "cancelled"
}
```

#### 获取执行日志
```http
GET /api/executions/:executionId/logs?nodeId=node_002&level=error

Response 200:
{
  "logs": [
    {
      "timestamp": "2026-03-05T10:15:23Z",
      "level": "error",
      "nodeId": "node_002",
      "message": "Failed to process file: corrupt data",
      "details": {...}
    }
  ]
}
```

### 5.3 Module API

#### 获取模块列表
```http
GET /api/modules?category=transform&page=1&limit=20

Response 200:
{
  "data": [
    {
      "type": "video-transcode",
      "name": "视频转码",
      "category": "transform",
      "description": "转换视频格式和编码",
      "version": "1.0.0",
      "author": "System",
      "config": {
        "inputs": [
          { "name": "input", "type": "file", "required": true }
        ],
        "outputs": [
          { "name": "output", "type": "file" }
        ],
        "parameters": [
          { "name": "codec", "type": "string", "default": "h264" },
          { "name": "quality", "type": "number", "default": 23 }
        ]
      }
    }
  ]
}
```

#### 获取模块详情
```http
GET /api/modules/:type

Response 200:
{
  "type": "video-transcode",
  "name": "视频转码",
  "description": "...",
  "documentation": "...",
  "examples": [...],
  "changelog": [...]
}
```

#### 安装模块（扩展）
```http
POST /api/modules/install
Content-Type: application/json

{
  "source": "npm",
  "package": "@my-modules/custom-processor",
  "version": "1.2.0"
}

Response 201:
{
  "type": "custom-processor",
  "installed": true
}
```

### 5.4 WebSocket API

#### 连接
```javascript
const ws = new WebSocket('ws://localhost:3000/api/executions/:executionId/stream')

ws.onopen = () => {
  console.log('Connected to execution stream')
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)

  switch (data.type) {
    case 'status':
      // 状态更新
      console.log('Status:', data.status)
      break
    case 'node:start':
      // 节点开始
      console.log('Node started:', data.nodeId)
      break
    case 'node:complete':
      // 节点完成
      console.log('Node completed:', data.nodeId, data.result)
      break
    case 'node:error':
      // 节点错误
      console.error('Node error:', data.nodeId, data.error)
      break
    case 'log':
      // 日志消息
      console.log('Log:', data.message)
      break
  }
}
```

---

## 6. 数据模型

### 6.1 数据库表设计

#### pipelines 表
```sql
CREATE TABLE pipelines (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(20) DEFAULT '1.0.0',
  status ENUM('active', 'paused', 'archived') DEFAULT 'active',
  config JSON NOT NULL,
  nodes JSON NOT NULL,
  edges JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(50),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### executions 表
```sql
CREATE TABLE executions (
  id VARCHAR(50) PRIMARY KEY,
  pipeline_id VARCHAR(50) NOT NULL,
  status ENUM('pending', 'running', 'paused', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  progress DECIMAL(5,4) DEFAULT 0,
  variables JSON,
  context JSON,
  result JSON,
  error_message TEXT,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  duration_ms INT,
  triggered_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
  INDEX idx_pipeline_status (pipeline_id, status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### execution_nodes 表
```sql
CREATE TABLE execution_nodes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  execution_id VARCHAR(50) NOT NULL,
  node_id VARCHAR(50) NOT NULL,
  node_type VARCHAR(100) NOT NULL,
  status ENUM('pending', 'running', 'completed', 'failed', 'skipped') DEFAULT 'pending',
  input JSON,
  output JSON,
  error_message TEXT,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  duration_ms INT,
  retry_count INT DEFAULT 0,
  FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE,
  INDEX idx_execution_node (execution_id, node_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### modules 表
```sql
CREATE TABLE modules (
  type VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  version VARCHAR(20) DEFAULT '1.0.0',
  author VARCHAR(100),
  config JSON NOT NULL,
  source_path VARCHAR(500) NOT NULL,
  is_builtin BOOLEAN DEFAULT FALSE,
  is_enabled BOOLEAN DEFAULT TRUE,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### execution_logs 表
```sql
CREATE TABLE execution_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  execution_id VARCHAR(50) NOT NULL,
  node_id VARCHAR(50),
  level ENUM('debug', 'info', 'warn', 'error') DEFAULT 'info',
  message TEXT NOT NULL,
  details JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE,
  INDEX idx_execution_level (execution_id, level),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6.2 JSON Schema 定义

#### Pipeline Config Schema
```json
{
  "type": "object",
  "properties": {
    "maxConcurrency": {
      "type": "integer",
      "minimum": 1,
      "maximum": 50,
      "default": 5
    },
    "timeout": {
      "type": "integer",
      "minimum": 1000,
      "default": 300000
    },
    "retryPolicy": {
      "type": "object",
      "properties": {
        "maxAttempts": { "type": "integer", "minimum": 0, "default": 3 },
        "backoff": { "enum": ["fixed", "exponential"], "default": "exponential" },
        "initialDelay": { "type": "integer", "default": 1000 }
      }
    },
    "errorHandling": {
      "enum": ["continue", "stop", "rollback"],
      "default": "continue"
    }
  }
}
```

#### Node Schema
```json
{
  "type": "object",
  "required": ["id", "type"],
  "properties": {
    "id": { "type": "string" },
    "type": { "type": "string" },
    "name": { "type": "string" },
    "config": { "type": "object" },
    "position": {
      "type": "object",
      "properties": {
        "x": { "type": "number" },
        "y": { "type": "number" }
      }
    }
  }
}
```

#### Edge Schema
```json
{
  "type": "object",
  "required": ["id", "source", "target"],
  "properties": {
    "id": { "type": "string" },
    "source": { "type": "string" },
    "target": { "type": "string" },
    "sourceHandle": { "type": "string" },
    "targetHandle": { "type": "string" },
    "condition": { "type": "string" }
  }
}
```

---

## 7. 实现细节

### 7.1 内置模块示例

#### Source Module: File Reader
```javascript
// server/modules/source/file-reader.js
import fs from 'fs/promises'
import path from 'path'
import { Module } from '../base/Module.js'

export default class FileReaderModule extends Module {
  constructor() {
    super({
      type: 'file-reader',
      name: '文件读取器',
      category: 'source',
      description: '从文件系统读取文件',
      inputs: [],
      outputs: [
        { name: 'output', type: 'file[]' }
      ],
      parameters: [
        { name: 'directory', type: 'string', required: true, description: '目录路径' },
        { name: 'pattern', type: 'string', default: '**/*', description: '文件匹配模式' },
        { name: 'recursive', type: 'boolean', default: true, description: '递归扫描' }
      ]
    })
  }

  async execute(input, context) {
    const { directory, pattern, recursive } = this.config

    // 验证目录
    const dirPath = path.resolve(directory)
    const stats = await fs.stat(dirPath)
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${dirPath}`)
    }

    // 扫描文件
    const files = await this.scanDirectory(dirPath, pattern, recursive)

    context.logger.info(`Found ${files.length} files in ${dirPath}`)

    return {
      output: files.map(file => ({
        path: file,
        name: path.basename(file),
        size: fs.stat(file).then(s => s.size)
      })),
      metadata: {
        totalFiles: files.length,
        directory: dirPath
      }
    }
  }

  async scanDirectory(dir, pattern, recursive) {
    // 实现文件扫描逻辑
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory() && recursive) {
        const subFiles = await this.scanDirectory(fullPath, pattern, recursive)
        files.push(...subFiles)
      } else if (entry.isFile()) {
        // 匹配模式
        if (this.matchPattern(entry.name, pattern)) {
          files.push(fullPath)
        }
      }
    }

    return files
  }

  matchPattern(filename, pattern) {
    // 简单的通配符匹配
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return regex.test(filename)
  }
}
```

#### Transform Module: Video Transcode
```javascript
// server/modules/transform/video-transcode.js
import { exec } from 'child_process'
import { promisify } from 'util'
import { Module } from '../base/Module.js'

const execAsync = promisify(exec)

export default class VideoTranscodeModule extends Module {
  constructor() {
    super({
      type: 'video-transcode',
      name: '视频转码',
      category: 'transform',
      description: '使用 FFmpeg 转换视频格式',
      inputs: [
        { name: 'input', type: 'file', required: true }
      ],
      outputs: [
        { name: 'output', type: 'file' }
      ],
      parameters: [
        { name: 'codec', type: 'string', default: 'h264', enum: ['h264', 'h265', 'vp9'] },
        { name: 'quality', type: 'number', default: 23, minimum: 0, maximum: 51 },
        { name: 'resolution', type: 'string', default: 'original' },
        { name: 'outputFormat', type: 'string', default: 'mp4' }
      ]
    })
  }

  async execute(input, context) {
    const { codec, quality, resolution, outputFormat } = this.config
    const inputFile = input.path

    // 生成输出文件名
    const outputFile = this.generateOutputPath(inputFile, outputFormat)

    // 构建 FFmpeg 命令
    const command = this.buildFFmpegCommand(inputFile, outputFile, {
      codec,
      quality,
      resolution
    })

    context.logger.info(`Transcoding: ${inputFile} -> ${outputFile}`)
    context.logger.debug(`FFmpeg command: ${command}`)

    // 执行转码
    const startTime = Date.now()
    try {
      const { stdout, stderr } = await execAsync(command)
      const duration = Date.now() - startTime

      context.logger.info(`Transcode completed in ${duration}ms`)

      return {
        output: {
          path: outputFile,
          name: path.basename(outputFile),
          size: await this.getFileSize(outputFile)
        },
        metadata: {
          duration,
          codec,
          quality,
          originalFile: inputFile
        }
      }
    } catch (error) {
      context.logger.error(`Transcode failed: ${error.message}`)
      throw new Error(`FFmpeg error: ${error.message}`)
    }
  }

  buildFFmpegCommand(input, output, options) {
    const { codec, quality, resolution } = options
    const parts = ['ffmpeg', '-i', `"${input}"`]

    // 视频编码
    if (codec === 'h264') {
      parts.push('-c:v', 'libx264', '-crf', quality)
    } else if (codec === 'h265') {
      parts.push('-c:v', 'libx265', '-crf', quality)
    } else if (codec === 'vp9') {
      parts.push('-c:v', 'libvpx-vp9', '-crf', quality)
    }

    // 分辨率
    if (resolution !== 'original') {
      parts.push('-vf', `scale=${resolution}`)
    }

    // 音频编码
    parts.push('-c:a', 'aac', '-b:a', '128k')

    // 输出
    parts.push('-y', `"${output}"`)

    return parts.join(' ')
  }

  generateOutputPath(inputFile, format) {
    const parsed = path.parse(inputFile)
    return path.join(parsed.dir, 'processed', `${parsed.name}.${format}`)
  }

  async getFileSize(filePath) {
    const stats = await fs.stat(filePath)
    return stats.size
  }
}
```

#### Filter Module: Condition Filter
```javascript
// server/modules/filter/condition-filter.js
import { Module } from '../base/Module.js'

export default class ConditionFilterModule extends Module {
  constructor() {
    super({
      type: 'condition-filter',
      name: '条件过滤器',
      category: 'filter',
      description: '根据条件过滤数据',
      inputs: [
        { name: 'input', type: 'any[]', required: true }
      ],
      outputs: [
        { name: 'matched', type: 'any[]' },
        { name: 'unmatched', type: 'any[]' }
      ],
      parameters: [
        { name: 'condition', type: 'string', required: true, description: 'JavaScript 表达式' },
        { name: 'mode', type: 'string', default: 'filter', enum: ['filter', 'split'] }
      ]
    })
  }

  async execute(input, context) {
    const { condition, mode } = this.config
    const items = Array.isArray(input) ? input : [input]

    // 编译条件表达式
    const conditionFn = this.compileCondition(condition)

    const matched = []
    const unmatched = []

    for (const item of items) {
      try {
        const result = conditionFn(item, context)
        if (result) {
          matched.push(item)
        } else {
          unmatched.push(item)
        }
      } catch (error) {
        context.logger.warn(`Condition evaluation error: ${error.message}`)
        unmatched.push(item)
      }
    }

    context.logger.info(`Filtered: ${matched.length} matched, ${unmatched.length} unmatched`)

    if (mode === 'filter') {
      return {
        output: matched,
        metadata: {
          matchedCount: matched.length,
          unmatchedCount: unmatched.length
        }
      }
    } else {
      // split 模式返回两路输出
      return {
        output: {
          matched,
          unmatched
        },
        metadata: {
          matchedCount: matched.length,
          unmatchedCount: unmatched.length
        }
      }
    }
  }

  compileCondition(condition) {
    // 安全的表达式编译（受限环境）
    return new Function('item', 'context', `
      with (item) {
        return (${condition})
      }
    `)
  }
}
```

### 7.2 前端组件实现

#### PipelineEditor.vue（流水线编辑器）
```vue
<template>
  <div class="pipeline-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <button @click="savePipeline">保存</button>
      <button @click="runPipeline">运行</button>
      <button @click="validatePipeline">验证</button>
    </div>

    <!-- 模块面板 -->
    <div class="module-panel">
      <h3>模块库</h3>
      <div class="module-categories">
        <div v-for="category in categories" :key="category.id">
          <h4>{{ category.name }}</h4>
          <div
            v-for="module in category.modules"
            :key="module.type"
            class="module-item"
            draggable="true"
            @dragstart="onModuleDragStart($event, module)"
          >
            <div class="module-icon">{{ module.icon }}</div>
            <div class="module-name">{{ module.name }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 画布 -->
    <div class="canvas-container">
      <VueFlow
        v-model="elements"
        @drop="onCanvasDrop"
        @dragover.prevent
        @connect="onConnect"
        @node-click="onNodeClick"
      >
        <Background />
        <Controls />
        <MiniMap />
      </VueFlow>
    </div>

    <!-- 属性面板 -->
    <div class="property-panel" v-if="selectedNode">
      <h3>节点配置</h3>
      <div class="property-form">
        <div v-for="param in selectedNode.parameters" :key="param.name" class="form-field">
          <label>{{ param.description || param.name }}</label>
          <input
            v-if="param.type === 'string'"
            v-model="selectedNode.config[param.name]"
            type="text"
            :placeholder="param.default"
          />
          <input
            v-else-if="param.type === 'number'"
            v-model.number="selectedNode.config[param.name]"
            type="number"
            :min="param.minimum"
            :max="param.maximum"
            :placeholder="param.default"
          />
          <select
            v-else-if="param.enum"
            v-model="selectedNode.config[param.name]"
          >
            <option v-for="opt in param.enum" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue'
import { VueFlow, Background, Controls, MiniMap } from '@vue-flow/core'
import api from '@/utils/api'

export default {
  name: 'PipelineEditor',
  components: {
    VueFlow,
    Background,
    Controls,
    MiniMap
  },
  setup() {
    const elements = ref([])
    const selectedNode = ref(null)
    const categories = reactive([])

    // 加载模块库
    const loadModules = async () => {
      const modules = await api.modules.list()

      // 按类别分组
      const grouped = modules.reduce((acc, module) => {
        if (!acc[module.category]) {
          acc[module.category] = {
            id: module.category,
            name: getCategoryName(module.category),
            modules: []
          }
        }
        acc[module.category].modules.push(module)
        return acc
      }, {})

      categories.splice(0, categories.length, ...Object.values(grouped))
    }

    // 拖拽模块到画布
    const onModuleDragStart = (event, module) => {
      event.dataTransfer.setData('application/json', JSON.stringify(module))
      event.dataTransfer.effectAllowed = 'copy'
    }

    const onCanvasDrop = (event) => {
      event.preventDefault()
      const module = JSON.parse(event.dataTransfer.getData('application/json'))

      // 计算画布坐标
      const bounds = event.target.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top

      // 添加节点
      const node = {
        id: `node_${Date.now()}`,
        type: module.type,
        name: module.name,
        position: { x, y },
        config: getDefaultConfig(module),
        parameters: module.config.parameters
      }

      elements.value.push(node)
    }

    // 连接节点
    const onConnect = (params) => {
      const edge = {
        id: `edge_${Date.now()}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle
      }

      elements.value.push(edge)
    }

    // 选择节点
    const onNodeClick = (event) => {
      selectedNode.value = event.node
    }

    // 保存流水线
    const savePipeline = async () => {
      const nodes = elements.value.filter(el => !el.source)
      const edges = elements.value.filter(el => el.source)

      const pipeline = {
        name: '未命名流水线',
        nodes,
        edges,
        config: {
          maxConcurrency: 5,
          timeout: 300000
        }
      }

      try {
        const result = await api.pipelines.create(pipeline)
        alert(`流水线已保存: ${result.id}`)
      } catch (error) {
        alert(`保存失败: ${error.message}`)
      }
    }

    // 验证流水线
    const validatePipeline = () => {
      const nodes = elements.value.filter(el => !el.source)
      const edges = elements.value.filter(el => el.source)

      // 检查循环依赖
      if (hasCycle(nodes, edges)) {
        alert('错误: 流水线包含循环依赖')
        return false
      }

      // 检查孤立节点
      const isolated = findIsolatedNodes(nodes, edges)
      if (isolated.length > 0) {
        alert(`警告: 发现 ${isolated.length} 个孤立节点`)
      }

      alert('验证通过')
      return true
    }

    // 运行流水线
    const runPipeline = async () => {
      if (!validatePipeline()) return

      // 触发执行
      const nodes = elements.value.filter(el => !el.source)
      const edges = elements.value.filter(el => el.source)

      try {
        const execution = await api.pipelines.execute({
          nodes,
          edges
        })

        // 跳转到执行监控页面
        window.open(`/executions/${execution.executionId}`, '_blank')
      } catch (error) {
        alert(`执行失败: ${error.message}`)
      }
    }

    // 工具函数
    const getCategoryName = (category) => {
      const names = {
        source: '数据源',
        transform: '转换',
        filter: '过滤',
        sink: '数据汇',
        control: '控制'
      }
      return names[category] || category
    }

    const getDefaultConfig = (module) => {
      const config = {}
      module.config.parameters.forEach(param => {
        if (param.default !== undefined) {
          config[param.name] = param.default
        }
      })
      return config
    }

    const hasCycle = (nodes, edges) => {
      // 拓扑排序检测循环
      const graph = new Map()
      nodes.forEach(node => graph.set(node.id, []))
      edges.forEach(edge => {
        graph.get(edge.source).push(edge.target)
      })

      const visited = new Set()
      const recStack = new Set()

      const dfs = (nodeId) => {
        visited.add(nodeId)
        recStack.add(nodeId)

        for (const neighbor of graph.get(nodeId) || []) {
          if (!visited.has(neighbor)) {
            if (dfs(neighbor)) return true
          } else if (recStack.has(neighbor)) {
            return true
          }
        }

        recStack.delete(nodeId)
        return false
      }

      for (const nodeId of graph.keys()) {
        if (!visited.has(nodeId)) {
          if (dfs(nodeId)) return true
        }
      }

      return false
    }

    const findIsolatedNodes = (nodes, edges) => {
      const connected = new Set()
      edges.forEach(edge => {
        connected.add(edge.source)
        connected.add(edge.target)
      })

      return nodes.filter(node => !connected.has(node.id))
    }

    // 初始化
    loadModules()

    return {
      elements,
      selectedNode,
      categories,
      onModuleDragStart,
      onCanvasDrop,
      onConnect,
      onNodeClick,
      savePipeline,
      validatePipeline,
      runPipeline
    }
  }
}
</script>

<style scoped>
.pipeline-editor {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  grid-template-rows: 60px 1fr;
  height: 100vh;
  gap: 10px;
  padding: 10px;
}

.toolbar {
  grid-column: 1 / -1;
  display: flex;
  gap: 10px;
  padding: 15px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.module-panel {
  grid-row: 2;
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.module-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  margin: 5px 0;
  background: #f5f5f5;
  border-radius: 6px;
  cursor: move;
  transition: all 0.2s;
}

.module-item:hover {
  background: #e0e0e0;
  transform: translateX(5px);
}

.canvas-container {
  grid-row: 2;
  background: #fafafa;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.property-panel {
  grid-row: 2;
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-field {
  margin-bottom: 15px;
}

.form-field label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-field input,
.form-field select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}
</style>
```

#### ExecutionMonitor.vue（执行监控面板）
```vue
<template>
  <div class="execution-monitor">
    <div class="header">
      <h2>执行监控: {{ execution.id }}</h2>
      <div class="status-badge" :class="execution.status">
        {{ getStatusText(execution.status) }}
      </div>
    </div>

    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-label">进度</div>
        <div class="stat-value">{{ (execution.progress * 100).toFixed(1) }}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已完成</div>
        <div class="stat-value">{{ execution.statistics.completedNodes }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">运行中</div>
        <div class="stat-value">{{ execution.statistics.runningNodes }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">失败</div>
        <div class="stat-value error">{{ execution.statistics.failedNodes }}</div>
      </div>
    </div>

    <div class="controls">
      <button @click="pauseExecution" :disabled="execution.status !== 'running'">
        暂停
      </button>
      <button @click="resumeExecution" :disabled="execution.status !== 'paused'">
        恢复
      </button>
      <button @click="cancelExecution" :disabled="isTerminalStatus">
        取消
      </button>
    </div>

    <div class="node-list">
      <h3>节点状态</h3>
      <div
        v-for="node in execution.nodes"
        :key="node.nodeId"
        class="node-item"
        :class="node.status"
      >
        <div class="node-header">
          <span class="node-name">{{ node.name }}</span>
          <span class="node-status">{{ getStatusText(node.status) }}</span>
        </div>
        <div class="node-progress" v-if="node.status === 'running'">
          <div class="progress-bar" :style="{ width: `${node.progress * 100}%` }"></div>
        </div>
        <div class="node-details" v-if="node.duration">
          <span>耗时: {{ formatDuration(node.duration) }}</span>
        </div>
        <div class="node-error" v-if="node.error">
          <span class="error-icon">⚠️</span>
          <span>{{ node.error }}</span>
        </div>
      </div>
    </div>

    <div class="logs">
      <h3>执行日志</h3>
      <div class="log-filters">
        <select v-model="logLevel">
          <option value="all">全部</option>
          <option value="info">信息</option>
          <option value="warn">警告</option>
          <option value="error">错误</option>
        </select>
      </div>
      <div class="log-list">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="log-item"
          :class="log.level"
        >
          <span class="log-timestamp">{{ formatTime(log.timestamp) }}</span>
          <span class="log-level">{{ log.level.toUpperCase() }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/utils/api'

export default {
  name: 'ExecutionMonitor',
  props: {
    executionId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const execution = ref({
      id: props.executionId,
      status: 'pending',
      progress: 0,
      nodes: [],
      statistics: {
        totalNodes: 0,
        completedNodes: 0,
        runningNodes: 0,
        failedNodes: 0
      }
    })

    const logs = ref([])
    const logLevel = ref('all')
    const ws = ref(null)

    const filteredLogs = computed(() => {
      if (logLevel.value === 'all') return logs.value
      return logs.value.filter(log => log.level === logLevel.value)
    })

    const isTerminalStatus = computed(() => {
      return ['completed', 'failed', 'cancelled'].includes(execution.value.status)
    })

    // 加载执行状态
    const loadExecution = async () => {
      try {
        const data = await api.executions.get(props.executionId)
        execution.value = data
      } catch (error) {
        console.error('Failed to load execution:', error)
      }
    }

    // 加载日志
    const loadLogs = async () => {
      try {
        const data = await api.executions.getLogs(props.executionId)
        logs.value = data.logs
      } catch (error) {
        console.error('Failed to load logs:', error)
      }
    }

    // 建立 WebSocket 连接
    const connectWebSocket = () => {
      ws.value = new WebSocket(
        `ws://localhost:3000/api/executions/${props.executionId}/stream`
      )

      ws.value.onmessage = (event) => {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'status':
            execution.value.status = data.status
            execution.value.progress = data.progress
            break

          case 'node:start':
            updateNodeStatus(data.nodeId, 'running')
            break

          case 'node:complete':
            updateNodeStatus(data.nodeId, 'completed', data.result)
            break

          case 'node:error':
            updateNodeStatus(data.nodeId, 'failed', { error: data.error })
            break

          case 'log':
            logs.value.unshift(data.log)
            if (logs.value.length > 1000) {
              logs.value = logs.value.slice(0, 1000)
            }
            break
        }
      }

      ws.value.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.value.onclose = () => {
        console.log('WebSocket closed')
      }
    }

    const updateNodeStatus = (nodeId, status, extra = {}) => {
      const node = execution.value.nodes.find(n => n.nodeId === nodeId)
      if (node) {
        node.status = status
        Object.assign(node, extra)

        // 更新统计
        updateStatistics()
      }
    }

    const updateStatistics = () => {
      const stats = {
        totalNodes: execution.value.nodes.length,
        completedNodes: 0,
        runningNodes: 0,
        failedNodes: 0
      }

      execution.value.nodes.forEach(node => {
        if (node.status === 'completed') stats.completedNodes++
        else if (node.status === 'running') stats.runningNodes++
        else if (node.status === 'failed') stats.failedNodes++
      })

      execution.value.statistics = stats
    }

    // 控制操作
    const pauseExecution = async () => {
      try {
        await api.executions.pause(props.executionId)
        execution.value.status = 'paused'
      } catch (error) {
        alert(`暂停失败: ${error.message}`)
      }
    }

    const resumeExecution = async () => {
      try {
        await api.executions.resume(props.executionId)
        execution.value.status = 'running'
      } catch (error) {
        alert(`恢复失败: ${error.message}`)
      }
    }

    const cancelExecution = async () => {
      if (!confirm('确定要取消执行吗?')) return

      try {
        await api.executions.cancel(props.executionId)
        execution.value.status = 'cancelled'
      } catch (error) {
        alert(`取消失败: ${error.message}`)
      }
    }

    // 工具函数
    const getStatusText = (status) => {
      const texts = {
        pending: '等待中',
        running: '运行中',
        paused: '已暂停',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消'
      }
      return texts[status] || status
    }

    const formatDuration = (ms) => {
      if (ms < 1000) return `${ms}ms`
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
      return `${(ms / 60000).toFixed(1)}min`
    }

    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      return date.toLocaleTimeString()
    }

    // 生命周期
    onMounted(() => {
      loadExecution()
      loadLogs()
      connectWebSocket()
    })

    onUnmounted(() => {
      if (ws.value) {
        ws.value.close()
      }
    })

    return {
      execution,
      logs,
      logLevel,
      filteredLogs,
      isTerminalStatus,
      pauseExecution,
      resumeExecution,
      cancelExecution,
      getStatusText,
      formatDuration,
      formatTime
    }
  }
}
</script>

<style scoped>
.execution-monitor {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.status-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 12px;
}

.status-badge.running {
  background: #e3f2fd;
  color: #1976d2;
}

.status-badge.completed {
  background: #e8f5e9;
  color: #388e3c;
}

.status-badge.failed {
  background: #ffebee;
  color: #d32f2f;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #333;
}

.stat-value.error {
  color: #d32f2f;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.node-list {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.node-item {
  padding: 15px;
  border-left: 4px solid #ddd;
  margin: 10px 0;
  background: #f9f9f9;
  border-radius: 4px;
}

.node-item.running {
  border-left-color: #2196f3;
}

.node-item.completed {
  border-left-color: #4caf50;
}

.node-item.failed {
  border-left-color: #f44336;
}

.node-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.node-name {
  font-weight: 600;
}

.node-progress {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-bar {
  height: 100%;
  background: #2196f3;
  transition: width 0.3s;
}

.logs {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.log-list {
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

.log-item {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 10px;
}

.log-item.error {
  background: #ffebee;
}

.log-item.warn {
  background: #fff3e0;
}

.log-timestamp {
  color: #999;
  min-width: 80px;
}

.log-level {
  min-width: 50px;
  font-weight: 600;
}

.log-message {
  flex: 1;
}
</style>
```

---

## 8. 使用示例

### 8.1 创建简单的文件处理流水线

```javascript
// 1. 定义流水线
const pipeline = {
  name: '视频批量处理',
  description: '扫描目录，转码视频，生成缩略图',
  nodes: [
    {
      id: 'source_001',
      type: 'file-reader',
      name: '扫描视频文件',
      config: {
        directory: '/data/videos/raw',
        pattern: '**/*.{mp4,avi,mov}',
        recursive: true
      },
      position: { x: 100, y: 100 }
    },
    {
      id: 'transform_001',
      type: 'video-transcode',
      name: '转码为 H264',
      config: {
        codec: 'h264',
        quality: 23,
        resolution: '1920x1080',
        outputFormat: 'mp4'
      },
      position: { x: 400, y: 100 }
    },
    {
      id: 'transform_002',
      type: 'thumbnail-generator',
      name: '生成缩略图',
      config: {
        width: 320,
        height: 180,
        count: 3
      },
      position: { x: 700, y: 100 }
    },
    {
      id: 'sink_001',
      type: 'file-writer',
      name: '保存结果',
      config: {
        outputDir: '/data/videos/processed'
      },
      position: { x: 1000, y: 100 }
    }
  ],
  edges: [
    {
      id: 'edge_001',
      source: 'source_001',
      target: 'transform_001'
    },
    {
      id: 'edge_002',
      source: 'transform_001',
      target: 'transform_002'
    },
    {
      id: 'edge_003',
      source: 'transform_002',
      target: 'sink_001'
    }
  ],
  config: {
    maxConcurrency: 3,
    timeout: 600000,
    errorHandling: 'continue'
  }
}

// 2. 创建流水线
const created = await api.pipelines.create(pipeline)
console.log('Pipeline created:', created.id)

// 3. 执行流水线
const execution = await api.pipelines.execute(created.id, {
  variables: {
    environment: 'production'
  }
})

console.log('Execution started:', execution.executionId)

// 4. 监控执行状态
const status = await api.executions.get(execution.executionId)
console.log('Status:', status.status, 'Progress:', status.progress)
```

### 8.2 创建条件分支流水线

```javascript
const pipeline = {
  name: '智能视频处理',
  description: '根据视频大小选择不同的处理策略',
  nodes: [
    {
      id: 'source_001',
      type: 'file-reader',
      name: '读取视频',
      config: { directory: '/videos' }
    },
    {
      id: 'filter_001',
      type: 'condition-filter',
      name: '按大小分类',
      config: {
        condition: 'size > 1024 * 1024 * 100', // 100MB
        mode: 'split'
      }
    },
    {
      id: 'transform_large',
      type: 'video-transcode',
      name: '高压缩转码',
      config: { codec: 'h265', quality: 28 }
    },
    {
      id: 'transform_small',
      type: 'video-transcode',
      name: '快速转码',
      config: { codec: 'h264', quality: 23 }
    },
    {
      id: 'merge_001',
      type: 'merge',
      name: '合并结果'
    },
    {
      id: 'sink_001',
      type: 'file-writer',
      name: '保存'
    }
  ],
  edges: [
    { source: 'source_001', target: 'filter_001' },
    { source: 'filter_001', target: 'transform_large', sourceHandle: 'matched' },
    { source: 'filter_001', target: 'transform_small', sourceHandle: 'unmatched' },
    { source: 'transform_large', target: 'merge_001' },
    { source: 'transform_small', target: 'merge_001' },
    { source: 'merge_001', target: 'sink_001' }
  ]
}
```

### 8.3 创建并行处理流水线

```javascript
const pipeline = {
  name: '并行多格式转换',
  description: '同时生成多种格式的视频',
  nodes: [
    {
      id: 'source_001',
      type: 'file-reader',
      name: '读取源视频'
    },
    {
      id: 'fork_001',
      type: 'fork',
      name: '分发到多个处理器',
      config: { fanOut: 3 }
    },
    {
      id: 'transcode_mp4',
      type: 'video-transcode',
      name: '转 MP4',
      config: { outputFormat: 'mp4', codec: 'h264' }
    },
    {
      id: 'transcode_webm',
      type: 'video-transcode',
      name: '转 WebM',
      config: { outputFormat: 'webm', codec: 'vp9' }
    },
    {
      id: 'transcode_hls',
      type: 'hls-segmenter',
      name: '生成 HLS',
      config: { segmentDuration: 6 }
    },
    {
      id: 'join_001',
      type: 'join',
      name: '收集结果'
    },
    {
      id: 'sink_001',
      type: 'multi-file-writer',
      name: '保存所有格式'
    }
  ],
  edges: [
    { source: 'source_001', target: 'fork_001' },
    { source: 'fork_001', target: 'transcode_mp4' },
    { source: 'fork_001', target: 'transcode_webm' },
    { source: 'fork_001', target: 'transcode_hls' },
    { source: 'transcode_mp4', target: 'join_001' },
    { source: 'transcode_webm', target: 'join_001' },
    { source: 'transcode_hls', target: 'join_001' },
    { source: 'join_001', target: 'sink_001' }
  ],
  config: {
    maxConcurrency: 3 // 最多同时处理 3 个分支
  }
}
```

---

## 9. 扩展性设计

### 9.1 自定义模块开发

#### 模块开发模板
```javascript
// my-custom-module.js
import { Module } from '@/modules/base/Module.js'

export default class MyCustomModule extends Module {
  constructor() {
    super({
      type: 'my-custom-module',
      name: '我的自定义模块',
      category: 'transform',
      description: '这是一个自定义处理模块',
      version: '1.0.0',
      author: 'Your Name',
      inputs: [
        { name: 'input', type: 'any', required: true, description: '输入数据' }
      ],
      outputs: [
        { name: 'output', type: 'any', description: '输出数据' }
      ],
      parameters: [
        {
          name: 'option1',
          type: 'string',
          required: true,
          description: '选项1',
          default: 'value1'
        },
        {
          name: 'option2',
          type: 'number',
          description: '选项2',
          default: 100,
          minimum: 0,
          maximum: 1000
        }
      ]
    })
  }

  // 初始化（可选）
  async init() {
    // 执行初始化逻辑
    console.log('Module initialized')
  }

  // 验证输入（可选）
  validate(input) {
    if (!input || typeof input !== 'object') {
      return {
        valid: false,
        errors: ['Input must be an object']
      }
    }

    return { valid: true, errors: [] }
  }

  // 核心执行逻辑（必须）
  async execute(input, context) {
    const { option1, option2 } = this.config

    context.logger.info(`Processing with ${option1}, ${option2}`)

    try {
      // 执行你的业务逻辑
      const result = await this.doSomething(input, option1, option2)

      // 更新进度（可选）
      context.updateProgress(0.5, '处理中...')

      // 返回结果
      return {
        output: result,
        metadata: {
          processedAt: new Date().toISOString(),
          option1,
          option2
        }
      }
    } catch (error) {
      context.logger.error(`Processing failed: ${error.message}`)
      throw error
    }
  }

  // 自定义方法
  async doSomething(input, option1, option2) {
    // 你的逻辑
    return { ...input, processed: true }
  }

  // 清理资源（可选）
  async cleanup() {
    // 清理逻辑
    console.log('Module cleaned up')
  }
}
```

#### 注册自定义模块
```javascript
// server/index.js
import { ModuleRegistry } from './core/ModuleRegistry.js'
import MyCustomModule from './custom-modules/my-custom-module.js'

const registry = new ModuleRegistry()

// 注册模块
registry.register(
  'my-custom-module',
  './custom-modules/my-custom-module.js',
  {
    name: '我的自定义模块',
    category: 'transform',
    description: '这是一个自定义处理模块',
    version: '1.0.0',
    author: 'Your Name',
    icon: '🔧'
  }
)
```

### 9.2 插件系统

#### 插件接口
```javascript
class PipelinePlugin {
  constructor(config) {
    this.config = config
    this.name = config.name
    this.version = config.version
  }

  // 插件安装
  async install(app) {
    console.log(`Installing plugin: ${this.name}`)
  }

  // 插件卸载
  async uninstall(app) {
    console.log(`Uninstalling plugin: ${this.name}`)
  }

  // 生命周期钩子
  onPipelineCreate(pipeline) {}
  onPipelineExecute(execution) {}
  onNodeStart(node, context) {}
  onNodeComplete(node, result, context) {}
  onNodeError(node, error, context) {}
  onPipelineComplete(execution) {}
  onPipelineError(execution, error) {}
}
```

#### 插件示例：通知插件
```javascript
class NotificationPlugin extends PipelinePlugin {
  constructor(config) {
    super({
      name: 'notification-plugin',
      version: '1.0.0',
      ...config
    })
  }

  async install(app) {
    console.log('Notification plugin installed')

    // 注册邮件服务
    this.emailService = new EmailService(this.config.email)
  }

  onPipelineComplete(execution) {
    // 发送完成通知
    this.sendNotification({
      type: 'success',
      title: '流水线执行完成',
      message: `流水线 ${execution.pipelineId} 执行成功`,
      execution
    })
  }

  onPipelineError(execution, error) {
    // 发送错误通知
    this.sendNotification({
      type: 'error',
      title: '流水线执行失败',
      message: `流水线 ${execution.pipelineId} 执行失败: ${error.message}`,
      execution,
      error
    })
  }

  async sendNotification(notification) {
    if (this.config.slack) {
      await this.sendToSlack(notification)
    }

    if (this.config.email) {
      await this.emailService.send(notification)
    }

    if (this.config.webhook) {
      await this.sendToWebhook(notification)
    }
  }

  async sendToSlack(notification) {
    // 发送到 Slack
    const webhook = this.config.slack.webhook
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${notification.title}\n${notification.message}`
      })
    })
  }

  async sendToWebhook(notification) {
    // 发送到自定义 webhook
    await fetch(this.config.webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    })
  }
}
```

### 9.3 模块市场

#### 模块包规范
```json
{
  "name": "@pipeline-modules/video-processor",
  "version": "1.2.0",
  "description": "高级视频处理模块集合",
  "author": "Your Name",
  "license": "MIT",
  "main": "index.js",
  "keywords": ["pipeline", "video", "ffmpeg"],
  "pipelineModules": {
    "modules": [
      {
        "type": "advanced-transcode",
        "entry": "./modules/advanced-transcode.js",
        "category": "transform"
      },
      {
        "type": "quality-analyzer",
        "entry": "./modules/quality-analyzer.js",
        "category": "transform"
      }
    ]
  },
  "dependencies": {
    "fluent-ffmpeg": "^2.1.2"
  }
}
```

#### 安装第三方模块
```bash
# 从 npm 安装
npm install @pipeline-modules/video-processor

# 从本地安装
npm install ./custom-modules/my-module

# 从 git 安装
npm install git+https://github.com/user/pipeline-module.git
```

---

## 10. 故障排除

### 10.1 常见问题

#### Q1: 流水线执行卡住不动
**症状：** 流水线状态显示 `running`，但进度长时间不更新

**可能原因：**
1. 某个节点进入死循环
2. 节点等待外部资源超时
3. 并发控制死锁

**排查步骤：**
```bash
# 1. 查看执行日志
GET /api/executions/:executionId/logs?level=error

# 2. 检查节点状态
GET /api/executions/:executionId

# 3. 查看 Redis 队列
redis-cli
> LLEN pipeline:queue:default

# 4. 检查进程状态
ps aux | grep node
```

**解决方法：**
- 设置合理的超时时间
- 检查模块代码是否有阻塞操作
- 重启执行引擎

#### Q2: 节点执行失败但没有错误信息
**症状：** 节点状态为 `failed`，但 `error_message` 为空

**可能原因：**
1. 模块未正确抛出错误
2. 错误被吞掉
3. 异步错误未捕获

**排查步骤：**
```javascript
// 检查模块代码
async execute(input, context) {
  try {
    // 业务逻辑
  } catch (error) {
    // 确保记录错误
    context.logger.error('Error:', error)
    throw error // 重要：重新抛出错误
  }
}
```

**解决方法：**
- 在模块中添加完善的错误处理
- 使用 `context.logger` 记录详细日志
- 启用全局错误捕获

#### Q3: 内存使用持续增长
**症状：** Node.js 进程内存占用不断增加

**可能原因：**
1. 大文件未及时释放
2. 缓存积累过多
3. 事件监听器泄漏

**排查步骤：**
```bash
# 监控内存
node --inspect server/index.js

# 生成堆快照
kill -USR2 <pid>

# 分析内存泄漏
npm install -g node-memwatch
```

**解决方法：**
- 使用流式处理大文件
- 定期清理缓存
- 移除不再使用的事件监听器
- 设置 Redis TTL

#### Q4: 并发执行性能差
**症状：** 多个任务并发时速度没有提升

**可能原因：**
1. CPU 密集型任务阻塞事件循环
2. 数据库连接池耗尽
3. 磁盘 I/O 瓶颈

**排查步骤：**
```bash
# 查看 CPU 使用率
top

# 查看数据库连接
SHOW PROCESSLIST;

# 查看磁盘 I/O
iostat -x 1
```

**解决方法：**
- CPU 密集型任务使用 Worker Threads
- 增加数据库连接池大小
- 使用 SSD 提升 I/O 性能
- 合理设置 `maxConcurrency`

### 10.2 性能优化建议

#### 数据库优化
```sql
-- 为常查询字段添加索引
CREATE INDEX idx_execution_pipeline_status
ON executions(pipeline_id, status);

CREATE INDEX idx_execution_created
ON executions(created_at DESC);

-- 定期清理历史数据
DELETE FROM execution_logs
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

#### Redis 优化
```javascript
// 使用 Pipeline 批量操作
const pipeline = redis.pipeline()
pipeline.set('key1', 'value1')
pipeline.set('key2', 'value2')
pipeline.set('key3', 'value3')
await pipeline.exec()

// 设置合理的 TTL
await redis.setex('execution:state', 86400, JSON.stringify(state))
```

#### 模块优化
```javascript
// 使用流式处理
import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream'
import { promisify } from 'util'

const pipelineAsync = promisify(pipeline)

async execute(input, context) {
  const readStream = createReadStream(input.path)
  const writeStream = createWriteStream(output.path)
  const transformStream = this.createTransformStream()

  await pipelineAsync(readStream, transformStream, writeStream)
}
```

### 10.3 监控和日志

#### 监控指标
```javascript
// 执行时长监控
const startTime = Date.now()
await executor.execute()
const duration = Date.now() - startTime

metrics.record('pipeline.execution.duration', duration, {
  pipelineId: execution.pipelineId,
  status: execution.status
})

// 节点成功率
metrics.increment('pipeline.node.completed', {
  nodeType: node.type
})

metrics.increment('pipeline.node.failed', {
  nodeType: node.type,
  errorType: error.constructor.name
})
```

#### 日志规范
```javascript
// 使用结构化日志
context.logger.info('Processing file', {
  file: input.path,
  size: input.size,
  nodeId: this.id,
  executionId: context.executionId
})

// 记录性能指标
context.logger.perf('Transcode completed', {
  duration,
  inputSize,
  outputSize,
  compressionRatio: inputSize / outputSize
})
```

---

## 📚 附录

### A. 术语表

| 术语 | 定义 |
|------|------|
| **Pipeline** | 流水线，由多个节点组成的 DAG |
| **Module** | 模块，流水线中的执行单元 |
| **Node** | 节点，流水线中模块的实例 |
| **Edge** | 边，连接两个节点的关系 |
| **Execution** | 执行，流水线的一次运行实例 |
| **Context** | 上下文，贯穿执行过程的共享状态 |
| **DAG** | 有向无环图 |
| **Source** | 源节点，产生数据 |
| **Sink** | 汇节点，消费数据 |
| **Transform** | 转换节点，处理数据 |

### B. 参考资料

- **Apache Airflow** - 工作流编排平台
- **Apache NiFi** - 数据流处理系统
- **Node-RED** - 流程编排工具
- **Bull** - Node.js 任务队列
- **Vue Flow** - Vue 3 流程图组件

### C. 示例流水线仓库

```
github.com/your-org/pipeline-modules
├── modules/
│   ├── source/
│   ├── transform/
│   ├── filter/
│   └── sink/
├── examples/
│   ├── video-processing.json
│   ├── data-etl.json
│   └── web-scraping.json
└── docs/
    └── module-development.md
```

---

**文档版本：** v1.0.0
**最后更新：** 2026-03-05
**作者：** Vue Learning App Team
**联系方式：** support@example.com

---

## 🎯 下一步计划

### Phase 1: 核心功能（2 周）
- [ ] 实现基础执行引擎
- [ ] 实现模块注册和加载
- [ ] 实现流水线 CRUD API
- [ ] 实现执行控制 API

### Phase 2: 前端界面（1 周）
- [ ] 实现流水线编辑器
- [ ] 实现执行监控面板
- [ ] 实现模块市场

### Phase 3: 内置模块（1 周）
- [ ] 实现 5 个核心模块
- [ ] 编写模块文档和示例

### Phase 4: 测试和优化（1 周）
- [ ] 单元测试覆盖 80%+
- [ ] 性能测试和优化
- [ ] 文档完善

---

**本设计文档提供了完整的 M9 流水线模块架构、API、实现细节和使用示例。如需进一步讨论或调整设计方案，请随时联系开发团队。**
