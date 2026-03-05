# M9 流水线模块 - 快速开始指南

> 🎯 **Vue Learning App - M9 Pipeline Engine**
>
> 可视化流式任务执行引擎，支持自定义模块和动态流水线组装

## 📋 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [核心功能](#核心功能)
- [架构设计](#架构设计)
- [API 文档](#api-文档)
- [使用示例](#使用示例)
- [扩展开发](#扩展开发)

---

## 概述

M9 流水线模块是一个灵活的流式任务执行引擎，允许用户通过可视化方式组装不同的处理模块，形成自定义的数据处理流水线。

### 特性亮点

✅ **模块化设计** - 每个处理单元是独立的模块
✅ **流式执行** - 数据在模块间流动，支持异步处理
✅ **可视化编排** - 直观的流水线设计界面
✅ **动态组合** - 运行时动态加载和组合模块
✅ **状态监控** - 实时查看每个模块的执行状态
✅ **错误处理** - 支持重试、降级、错误传播
✅ **持久化** - 保存和加载流水线配置

### 实现状态

本次实现完成了 **M9 流水线模块的核心功能**：

- ✅ **核心引擎** - 流水线执行引擎、并发控制器、模块注册表
- ✅ **API 服务** - 完整的 RESTful API（流水线 CRUD、执行控制）
- ✅ **内置模块** - 4 个示例模块（数据生成、转换、过滤、输出）
- ✅ **前端界面** - 流水线管理页面（列表、编辑器、模块市场）
- ✅ **数据库** - 完整的数据表设计和初始化脚本

---

## 快速开始

### 1. 数据库初始化

运行数据库迁移脚本创建所需的表：

```bash
# 进入 server 目录
cd server

# 执行数据库迁移
mysql -u root -p vue_learning_app < migrations/009_create_pipeline_tables.sql
```

### 2. 启动服务

```bash
# 启动后端服务
cd server
npm start

# 启动前端开发服务器（新终端）
cd ..
npm run dev
```

### 3. 访问应用

打开浏览器访问：`http://localhost:5173`

在主界面中点击 **"M9 流水线"** 标签页。

### 4. 创建第一个流水线

1. 点击 **"流水线编辑器"** 标签
2. 点击 **"加载示例"** 按钮
3. 点击 **"测试运行"** 按钮
4. 查看控制台输出结果

---

## 核心功能

### 1. 流水线管理

- **创建流水线** - 定义节点、边和配置
- **编辑流水线** - 修改现有流水线
- **删除流水线** - 删除不需要的流水线
- **执行流水线** - 触发流水线运行
- **查看状态** - 实时监控执行状态

### 2. 模块市场

查看所有可用的模块：

- **Source (数据源)** - 数据生成器
- **Transform (转换)** - 数据转换器
- **Filter (过滤)** - 条件过滤器
- **Sink (数据汇)** - 控制台输出

### 3. 执行监控

- 查看执行历史
- 实时进度显示
- 节点状态追踪
- 错误日志查询

---

## 架构设计

### 系统架构

```
┌─────────────────────────────────┐
│      前端层 (Vue 3)              │
├─────────────────────────────────┤
│  PipelineManager.vue             │
│  - 流水线列表                     │
│  - 模块市场                       │
│  - 执行监控                       │
│  - 流水线编辑器                    │
└─────────────────────────────────┘
                 │
                 │ HTTP API
                 ▼
┌─────────────────────────────────┐
│    后端层 (Node.js + Express)    │
├─────────────────────────────────┤
│  API Routes:                     │
│  - /api/pipelines                │
│  - /api/modules                  │
│  - /api/executions               │
│                                  │
│  Core Engines:                   │
│  - PipelineExecutor              │
│  - ModuleRegistry                │
│  - ConcurrencyController         │
└─────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       数据层 (MySQL)             │
├─────────────────────────────────┤
│  - pipelines                     │
│  - executions                    │
│  - execution_nodes               │
│  - modules                       │
│  - execution_logs                │
└─────────────────────────────────┘
```

### 核心组件

#### 1. PipelineExecutor (执行引擎)

负责执行流水线的核心逻辑：

- **拓扑排序** - 确定节点执行顺序
- **模块加载** - 动态加载模块实例
- **数据流转** - 在节点间传递数据
- **状态管理** - 跟踪执行状态
- **错误处理** - 捕获和处理错误

```javascript
// 使用示例
import { PipelineExecutor } from './core/PipelineExecutor.js'

const executor = new PipelineExecutor(pipeline, context, moduleRegistry)
await executor.execute()
```

#### 2. ModuleRegistry (模块注册表)

管理所有模块的注册和加载：

- **模块注册** - 注册新模块
- **动态加载** - 按需加载模块
- **模块查询** - 获取模块信息

```javascript
// 使用示例
import { ModuleRegistry } from './core/ModuleRegistry.js'

const registry = new ModuleRegistry()
registry.register('my-module', './modules/MyModule.js', metadata)
const module = await registry.load('my-module', config)
```

#### 3. Module (模块基类)

所有模块必须继承的基类：

```javascript
import { Module } from './modules/base/Module.js'

export default class MyModule extends Module {
  constructor(config) {
    super({
      type: 'my-module',
      name: '我的模块',
      category: 'transform',
      // ...
    })
  }

  async execute(input, context) {
    // 实现模块逻辑
    return {
      output: processedData,
      metadata: { /* ... */ }
    }
  }
}
```

---

## API 文档

### Pipeline API

#### 创建流水线

```http
POST /api/pipelines
Content-Type: application/json

{
  "name": "我的流水线",
  "description": "描述",
  "nodes": [...],
  "edges": [...],
  "config": {...}
}
```

#### 获取流水线列表

```http
GET /api/pipelines?status=active&page=1&limit=20
```

#### 执行流水线

```http
POST /api/pipelines/:id/execute
Content-Type: application/json

{
  "variables": {
    "key": "value"
  }
}
```

### Module API

#### 获取模块列表

```http
GET /api/modules?category=transform
```

#### 获取模块详情

```http
GET /api/modules/:type
```

### Execution API

#### 获取执行状态

```http
GET /api/executions/:id
```

#### 暂停/恢复/取消

```http
POST /api/executions/:id/pause
POST /api/executions/:id/resume
POST /api/executions/:id/cancel
```

---

## 使用示例

### 示例 1: 简单数据处理

```json
{
  "name": "数据处理流水线",
  "description": "生成数据 → 转换 → 过滤 → 输出",
  "nodes": [
    {
      "id": "node_1",
      "type": "data-generator",
      "name": "生成数据",
      "config": {
        "count": 20,
        "dataType": "number",
        "min": 1,
        "max": 100
      }
    },
    {
      "id": "node_2",
      "type": "data-transform",
      "name": "数据加倍",
      "config": {
        "operation": "double"
      }
    },
    {
      "id": "node_3",
      "type": "condition-filter",
      "name": "过滤大于50",
      "config": {
        "condition": "item > 50",
        "mode": "filter"
      }
    },
    {
      "id": "node_4",
      "type": "console-output",
      "name": "控制台输出",
      "config": {
        "format": "json"
      }
    }
  ],
  "edges": [
    { "id": "edge_1", "source": "node_1", "target": "node_2" },
    { "id": "edge_2", "source": "node_2", "target": "node_3" },
    { "id": "edge_3", "source": "node_3", "target": "node_4" }
  ],
  "config": {
    "maxConcurrency": 5,
    "timeout": 300000,
    "errorHandling": "stop"
  }
}
```

### 执行流程

1. **node_1** 生成 20 个随机数（1-100）
2. **node_2** 将每个数字乘以 2
3. **node_3** 过滤掉小于等于 50 的数字
4. **node_4** 将结果输出到控制台

### 预期输出

```json
[52, 66, 78, 94, 100, 108, 132, 156, 180, 200]
```

---

## 扩展开发

### 1. 创建自定义模块

创建文件 `server/modules/transform/MyTransform.js`：

```javascript
import { Module } from '../base/Module.js'

export default class MyTransform extends Module {
  constructor(config = {}) {
    super({
      type: 'my-transform',
      name: '我的转换器',
      category: 'transform',
      description: '自定义数据转换',
      version: '1.0.0',
      inputs: [
        { name: 'input', type: 'array', required: true }
      ],
      outputs: [
        { name: 'output', type: 'array' }
      ],
      parameters: [
        {
          name: 'multiplier',
          type: 'number',
          default: 10,
          description: '乘数'
        }
      ],
      ...config
    })
  }

  async execute(input, context) {
    const { multiplier } = this.config

    context.logger?.info(`Transforming with multiplier ${multiplier}`)

    const output = input.map(item => item * multiplier)

    return {
      output,
      metadata: {
        multiplier,
        count: output.length
      }
    }
  }
}
```

### 2. 注册模块

在 `server/routes/modules.js` 中注册：

```javascript
registry.register(
  'my-transform',
  path.join(modulesBasePath, 'transform/MyTransform.js'),
  {
    name: '我的转换器',
    category: 'transform',
    description: '自定义数据转换',
    version: '1.0.0',
    icon: '⚡'
  }
)
```

### 3. 使用模块

在流水线中使用：

```json
{
  "id": "node_x",
  "type": "my-transform",
  "name": "乘以10",
  "config": {
    "multiplier": 10
  }
}
```

---

## 技术栈

### 后端
- **Node.js** - 运行环境
- **Express** - Web 框架
- **MySQL** - 数据库
- **ES Modules** - 模块系统

### 前端
- **Vue 3** - 前端框架
- **Vite** - 构建工具
- **Composition API** - 组合式 API

---

## 文件结构

```
vue-learning-app/
├── server/
│   ├── core/                      # 核心引擎
│   │   ├── PipelineExecutor.js   # 执行引擎
│   │   ├── ModuleRegistry.js      # 模块注册表
│   │   └── ConcurrencyController.js # 并发控制器
│   ├── modules/                   # 模块目录
│   │   ├── base/
│   │   │   └── Module.js          # 模块基类
│   │   ├── source/
│   │   │   └── DataGenerator.js   # 数据生成器
│   │   ├── transform/
│   │   │   └── DataTransform.js   # 数据转换器
│   │   ├── filter/
│   │   │   └── ConditionFilter.js # 条件过滤器
│   │   └── sink/
│   │       └── ConsoleOutput.js   # 控制台输出
│   ├── routes/
│   │   ├── pipelines.js           # 流水线 API
│   │   └── modules.js             # 模块 API
│   ├── migrations/
│   │   └── 009_create_pipeline_tables.sql # 数据库脚本
│   └── server/data/pipelines/     # 数据存储
├── src/
│   └── pages/
│       └── PipelineManager.vue    # 流水线管理页面
└── docs/
    ├── M9_PIPELINE_DESIGN.md      # 完整设计文档
    └── M9_PIPELINE_README.md      # 本文件
```

---

## 下一步计划

### Phase 1: 增强功能
- [ ] 完整的可视化流程图编辑器（拖拽式）
- [ ] WebSocket 实时状态推送
- [ ] 更多内置模块（文件处理、HTTP 请求等）
- [ ] 模块参数验证和类型检查

### Phase 2: 优化
- [ ] Redis 状态缓存
- [ ] 任务队列（Bull/Agenda）
- [ ] 断点续传和故障恢复
- [ ] 性能监控和分析

### Phase 3: 扩展
- [ ] 模块市场和插件系统
- [ ] 模块版本管理
- [ ] 流水线模板库
- [ ] 定时执行和触发器

---

## 常见问题

### Q: 如何查看流水线执行日志？

A: 目前日志输出到服务器控制台。查看 `node server/index.js` 的输出。

### Q: 如何添加新的模块？

A: 参考 [扩展开发](#扩展开发) 部分的步骤。

### Q: 流水线执行失败了怎么办？

A: 检查：
1. 流水线配置是否正确
2. 节点之间的连接是否有效
3. 模块参数是否符合要求
4. 服务器控制台是否有错误信息

### Q: 如何实现并行执行？

A: 在流水线配置中设置 `maxConcurrency` 参数：

```json
{
  "config": {
    "maxConcurrency": 5
  }
}
```

---

## 贡献

欢迎提交 Issue 和 Pull Request！

---

## 许可证

MIT License

---

## 联系方式

- **项目：** Vue Learning App
- **模块：** M9 Pipeline Engine
- **版本：** v1.0.0
- **更新日期：** 2026-03-05

---

**🎉 开始使用 M9 流水线模块，构建你的自动化工作流！**
