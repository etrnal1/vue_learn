# 流式引擎与流水线任务编排系统 - 设计文档

## 功能概述

流式引擎（Streaming Engine）是一个灵活的任务编排系统，允许用户通过组合预定义的模块来构建自定义的数据处理流水线。类似于 Unix 管道（pipe）或 Node.js Streams，该引擎支持将多个独立的处理单元（Processor）串联起来，实现复杂的数据转换和业务逻辑。

### 核心价值

- 🔧 **模块化设计** - 每个处理单元独立开发、测试、复用
- 🔗 **灵活组合** - 通过配置快速构建不同的业务流程
- 📊 **可视化编排** - 图形化界面设计流水线拓扑
- 🚀 **高性能执行** - 支持流式处理、并行执行、错误恢复
- 📈 **可观测性** - 实时监控执行状态、性能指标、日志追踪

### 应用场景

1. **数据处理管道**
   - ETL（Extract-Transform-Load）流程
   - 日志聚合和分析
   - 实时数据清洗和转换

2. **业务流程自动化**
   - 工单审批流程
   - 文档处理流水线
   - 多步骤业务操作编排

3. **AI 模型推理链**
   - 预处理 → 模型推理 → 后处理
   - 多模型级联调用
   - A/B 测试和模型路由

## 核心特性

### ✅ 已设计功能

- ✅ **模块定义标准** - 统一的 Processor 接口规范
- ✅ **流水线配置** - JSON/YAML 格式的管道描述
- ✅ **执行引擎** - 支持串行、并行、条件分支执行
- ✅ **上下文传递** - 模块间数据共享和传递机制
- ✅ **错误处理** - 重试、降级、熔断策略
- ✅ **可视化编辑器** - 拖拽式流水线设计器
- ✅ **监控面板** - 实时执行状态和性能指标
- ✅ **内置模块库** - 常用处理器预设（HTTP、数据库、文件操作等）

### 🔄 计划中功能

- 🔄 **分布式执行** - 跨机器任务分发
- 🔄 **版本管理** - 流水线配置版本控制
- 🔄 **热更新** - 不停机更新模块逻辑
- 🔄 **性能优化** - 智能批处理、缓存策略

## 架构设计

### 系统分层

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层 (UI Layer)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 流水线编辑器  │  │ 监控仪表盘    │  │ 模块管理面板  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    编排层 (Orchestration Layer)               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Pipeline      │  │ Scheduler    │  │ Flow Control │      │
│  │ Manager       │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    执行层 (Execution Layer)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Executor      │  │ Context      │  │ Error        │      │
│  │ Engine        │  │ Manager      │  │ Handler      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    模块层 (Processor Layer)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ HTTP         │  │ Database     │  │ Transform    │      │
│  │ Processor    │  │ Processor    │  │ Processor    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ File         │  │ Validation   │  │ Custom       │      │
│  │ Processor    │  │ Processor    │  │ Processor    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                  基础设施层 (Infrastructure Layer)             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Logger       │  │ Metrics      │  │ Storage      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 核心概念

#### 1. Processor（处理器）

**定义**：最小的执行单元，负责单一职责的数据处理任务。

**接口规范**：

```javascript
/**
 * 处理器基类
 */
class Processor {
  /**
   * 构造函数
   * @param {Object} config - 处理器配置
   */
  constructor(config = {}) {
    this.id = config.id || this.generateId()
    this.name = config.name || this.constructor.name
    this.config = config
    this.metadata = {
      version: '1.0.0',
      author: 'unknown',
      description: '',
      ...config.metadata
    }
  }

  /**
   * 初始化处理器（可选）
   * @param {ExecutionContext} context - 执行上下文
   * @returns {Promise<void>}
   */
  async initialize(context) {
    // 初始化逻辑（连接数据库、加载模型等）
  }

  /**
   * 处理数据（必须实现）
   * @param {any} input - 输入数据
   * @param {ExecutionContext} context - 执行上下文
   * @returns {Promise<any>} 处理后的数据
   */
  async process(input, context) {
    throw new Error('process() must be implemented by subclass')
  }

  /**
   * 清理资源（可选）
   * @param {ExecutionContext} context - 执行上下文
   * @returns {Promise<void>}
   */
  async cleanup(context) {
    // 清理逻辑（关闭连接、释放资源等）
  }

  /**
   * 验证输入数据（可选）
   * @param {any} input - 输入数据
   * @returns {boolean} 是否有效
   */
  validate(input) {
    return true
  }

  /**
   * 获取处理器元数据
   * @returns {Object}
   */
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      version: this.metadata.version,
      author: this.metadata.author,
      description: this.metadata.description
    }
  }

  /**
   * 生成唯一 ID
   * @returns {string}
   */
  generateId() {
    return `${this.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
```

**示例实现**：

```javascript
/**
 * HTTP 请求处理器
 */
class HttpProcessor extends Processor {
  constructor(config) {
    super(config)
    this.url = config.url
    this.method = config.method || 'GET'
    this.headers = config.headers || {}
    this.timeout = config.timeout || 5000
  }

  async process(input, context) {
    const url = this.interpolate(this.url, input)

    context.logger.info(`HTTP ${this.method} ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: this.method,
        headers: this.headers,
        body: this.method !== 'GET' ? JSON.stringify(input) : undefined,
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      context.metrics.increment('http_requests_success')

      return data
    } catch (error) {
      context.metrics.increment('http_requests_failed')
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  validate(input) {
    return typeof input === 'object'
  }

  interpolate(template, data) {
    return template.replace(/\${(\w+)}/g, (match, key) => {
      return data[key] || match
    })
  }
}
```

#### 2. Pipeline（流水线）

**定义**：由多个 Processor 组成的有向无环图（DAG），定义了数据的流向和处理顺序。

**数据结构**：

```javascript
/**
 * 流水线配置
 */
const pipelineConfig = {
  id: 'user_data_etl',
  name: '用户数据 ETL 流程',
  version: '1.0.0',
  description: '从 API 获取用户数据，清洗后存入数据库',

  // 处理器定义
  processors: [
    {
      id: 'fetch_users',
      type: 'HttpProcessor',
      config: {
        url: 'https://api.example.com/users',
        method: 'GET'
      }
    },
    {
      id: 'validate_users',
      type: 'ValidationProcessor',
      config: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name', 'email']
          }
        }
      }
    },
    {
      id: 'transform_users',
      type: 'TransformProcessor',
      config: {
        mapping: {
          user_id: 'id',
          full_name: 'name',
          email_address: 'email',
          created_at: () => new Date().toISOString()
        }
      }
    },
    {
      id: 'save_to_db',
      type: 'DatabaseProcessor',
      config: {
        operation: 'bulkInsert',
        table: 'users',
        conflictStrategy: 'update'
      }
    }
  ],

  // 连接关系（边）
  edges: [
    { from: 'fetch_users', to: 'validate_users' },
    { from: 'validate_users', to: 'transform_users' },
    { from: 'transform_users', to: 'save_to_db' }
  ],

  // 执行配置
  execution: {
    mode: 'sequential',        // sequential | parallel | mixed
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true
    },
    timeout: 60000,            // 整体超时时间（毫秒）
    errorHandling: 'stop'      // stop | continue | rollback
  },

  // 触发配置
  triggers: [
    {
      type: 'cron',
      schedule: '0 0 * * *'    // 每天午夜执行
    },
    {
      type: 'webhook',
      endpoint: '/api/pipelines/user_data_etl/trigger'
    }
  ]
}
```

#### 3. ExecutionContext（执行上下文）

**定义**：流水线执行过程中的共享状态和工具集合。

```javascript
/**
 * 执行上下文
 */
class ExecutionContext {
  constructor(pipelineId, runId) {
    this.pipelineId = pipelineId
    this.runId = runId
    this.startTime = Date.now()

    // 共享数据存储
    this.data = new Map()

    // 中间结果缓存
    this.cache = new Map()

    // 执行历史
    this.history = []

    // 日志记录器
    this.logger = new Logger(`pipeline:${pipelineId}:${runId}`)

    // 指标收集器
    this.metrics = new MetricsCollector(pipelineId, runId)

    // 错误收集
    this.errors = []
  }

  /**
   * 设置共享数据
   */
  set(key, value) {
    this.data.set(key, value)
  }

  /**
   * 获取共享数据
   */
  get(key) {
    return this.data.get(key)
  }

  /**
   * 记录处理器执行
   */
  recordExecution(processorId, input, output, duration, error = null) {
    this.history.push({
      processorId,
      timestamp: Date.now(),
      duration,
      success: !error,
      error: error ? error.message : null
    })

    if (error) {
      this.errors.push({
        processorId,
        error: error.message,
        stack: error.stack,
        timestamp: Date.now()
      })
    }
  }

  /**
   * 获取执行摘要
   */
  getSummary() {
    const totalDuration = Date.now() - this.startTime
    const successCount = this.history.filter(h => h.success).length
    const failureCount = this.history.filter(h => !h.success).length

    return {
      pipelineId: this.pipelineId,
      runId: this.runId,
      totalDuration,
      processorsExecuted: this.history.length,
      successCount,
      failureCount,
      errors: this.errors
    }
  }
}
```

#### 4. Executor（执行引擎）

**定义**：负责解析流水线配置、调度处理器执行、管理数据流转。

```javascript
/**
 * 流水线执行引擎
 */
class PipelineExecutor {
  constructor() {
    this.processorRegistry = new Map()
    this.runningPipelines = new Map()
  }

  /**
   * 注册处理器类型
   */
  registerProcessor(type, ProcessorClass) {
    this.processorRegistry.set(type, ProcessorClass)
  }

  /**
   * 执行流水线
   * @param {Object} pipelineConfig - 流水线配置
   * @param {any} initialInput - 初始输入数据
   * @returns {Promise<Object>} 执行结果
   */
  async execute(pipelineConfig, initialInput = null) {
    const runId = this.generateRunId()
    const context = new ExecutionContext(pipelineConfig.id, runId)

    context.logger.info(`开始执行流水线: ${pipelineConfig.name}`)

    try {
      // 1. 构建执行图
      const graph = this.buildExecutionGraph(pipelineConfig)

      // 2. 实例化所有处理器
      const processors = await this.instantiateProcessors(pipelineConfig, context)

      // 3. 拓扑排序（确定执行顺序）
      const executionOrder = this.topologicalSort(graph)

      // 4. 顺序执行处理器
      let currentData = initialInput

      for (const processorId of executionOrder) {
        const processor = processors.get(processorId)
        const startTime = Date.now()

        try {
          context.logger.info(`执行处理器: ${processorId}`)

          // 验证输入
          if (!processor.validate(currentData)) {
            throw new Error(`输入数据验证失败: ${processorId}`)
          }

          // 执行处理
          const output = await this.executeWithRetry(
            processor,
            currentData,
            context,
            pipelineConfig.execution.retryPolicy
          )

          // 记录执行
          const duration = Date.now() - startTime
          context.recordExecution(processorId, currentData, output, duration)

          // 更新当前数据
          currentData = output

          context.logger.info(`处理器执行成功: ${processorId} (耗时: ${duration}ms)`)

        } catch (error) {
          const duration = Date.now() - startTime
          context.recordExecution(processorId, currentData, null, duration, error)

          context.logger.error(`处理器执行失败: ${processorId}`, error)

          // 根据错误处理策略决定是否继续
          if (pipelineConfig.execution.errorHandling === 'stop') {
            throw error
          }
        }
      }

      // 5. 清理资源
      await this.cleanupProcessors(processors, context)

      context.logger.info('流水线执行完成')

      return {
        success: true,
        output: currentData,
        summary: context.getSummary()
      }

    } catch (error) {
      context.logger.error('流水线执行失败', error)

      return {
        success: false,
        error: error.message,
        summary: context.getSummary()
      }
    } finally {
      this.runningPipelines.delete(runId)
    }
  }

  /**
   * 构建执行图
   */
  buildExecutionGraph(pipelineConfig) {
    const graph = new Map()

    // 初始化节点
    pipelineConfig.processors.forEach(p => {
      graph.set(p.id, { processor: p, dependencies: [], dependents: [] })
    })

    // 添加边
    pipelineConfig.edges.forEach(edge => {
      const fromNode = graph.get(edge.from)
      const toNode = graph.get(edge.to)

      toNode.dependencies.push(edge.from)
      fromNode.dependents.push(edge.to)
    })

    return graph
  }

  /**
   * 实例化所有处理器
   */
  async instantiateProcessors(pipelineConfig, context) {
    const processors = new Map()

    for (const processorConfig of pipelineConfig.processors) {
      const ProcessorClass = this.processorRegistry.get(processorConfig.type)

      if (!ProcessorClass) {
        throw new Error(`未知的处理器类型: ${processorConfig.type}`)
      }

      const processor = new ProcessorClass(processorConfig.config)
      await processor.initialize(context)

      processors.set(processorConfig.id, processor)
    }

    return processors
  }

  /**
   * 拓扑排序（Kahn 算法）
   */
  topologicalSort(graph) {
    const inDegree = new Map()
    const queue = []
    const result = []

    // 计算入度
    graph.forEach((node, id) => {
      inDegree.set(id, node.dependencies.length)
      if (node.dependencies.length === 0) {
        queue.push(id)
      }
    })

    // 拓扑排序
    while (queue.length > 0) {
      const current = queue.shift()
      result.push(current)

      const currentNode = graph.get(current)
      currentNode.dependents.forEach(dependent => {
        const degree = inDegree.get(dependent) - 1
        inDegree.set(dependent, degree)

        if (degree === 0) {
          queue.push(dependent)
        }
      })
    }

    // 检测环
    if (result.length !== graph.size) {
      throw new Error('流水线配置存在循环依赖')
    }

    return result
  }

  /**
   * 带重试的执行
   */
  async executeWithRetry(processor, input, context, retryPolicy) {
    let lastError

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        return await processor.process(input, context)
      } catch (error) {
        lastError = error

        if (attempt < retryPolicy.maxRetries) {
          const delay = retryPolicy.exponentialBackoff
            ? retryPolicy.retryDelay * Math.pow(2, attempt)
            : retryPolicy.retryDelay

          context.logger.warn(`处理器执行失败，${delay}ms 后重试 (${attempt + 1}/${retryPolicy.maxRetries})`)

          await this.sleep(delay)
        }
      }
    }

    throw lastError
  }

  /**
   * 清理所有处理器
   */
  async cleanupProcessors(processors, context) {
    for (const processor of processors.values()) {
      try {
        await processor.cleanup(context)
      } catch (error) {
        context.logger.error('处理器清理失败', error)
      }
    }
  }

  /**
   * 生成运行 ID
   */
  generateRunId() {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### 高级特性

#### 1. 条件分支

支持根据数据内容动态选择执行路径：

```javascript
{
  id: 'conditional_branch',
  type: 'ConditionalProcessor',
  config: {
    condition: (input) => input.amount > 1000,
    trueBranch: 'high_value_processor',
    falseBranch: 'normal_processor'
  }
}
```

#### 2. 并行执行

支持同时执行多个独立的处理器：

```javascript
{
  id: 'parallel_group',
  type: 'ParallelProcessor',
  config: {
    processors: [
      'processor_a',
      'processor_b',
      'processor_c'
    ],
    mergeStrategy: 'concat'  // concat | merge | first
  }
}
```

#### 3. 循环处理

支持对数组数据进行批量处理：

```javascript
{
  id: 'loop_processor',
  type: 'LoopProcessor',
  config: {
    itemProcessor: 'single_item_processor',
    batchSize: 10,
    concurrency: 3
  }
}
```

#### 4. 子流水线

支持流水线嵌套，实现复杂的业务逻辑：

```javascript
{
  id: 'sub_pipeline',
  type: 'SubPipelineProcessor',
  config: {
    pipelineId: 'user_enrichment_pipeline',
    inputMapping: {
      userId: 'id'
    },
    outputMapping: {
      enrichedUser: 'result'
    }
  }
}
```

## 技术实现

### 前端实现

#### 文件结构

```
src/
├── pages/
│   └── streaming-engine/
│       ├── PipelineEditor.vue          # 流水线编辑器（主页面）
│       ├── PipelineDashboard.vue       # 监控仪表盘
│       └── ProcessorLibrary.vue        # 处理器库管理
├── components/
│   └── streaming-engine/
│       ├── FlowCanvas.vue              # 流程图画布
│       ├── ProcessorNode.vue           # 处理器节点
│       ├── ConnectionLine.vue          # 连接线
│       ├── PropertyPanel.vue           # 属性面板
│       ├── ExecutionMonitor.vue        # 执行监控器
│       └── LogViewer.vue               # 日志查看器
└── utils/
    ├── streaming-engine/
    │   ├── executor.js                 # 执行引擎
    │   ├── processor-base.js           # 处理器基类
    │   ├── processors/                 # 内置处理器
    │   │   ├── HttpProcessor.js
    │   │   ├── TransformProcessor.js
    │   │   ├── ValidationProcessor.js
    │   │   └── ...
    │   ├── graph-builder.js            # 图构建器
    │   └── context.js                  # 执行上下文
    └── streaming-engine-api.js         # API 客户端
```

#### 核心组件实现

**PipelineEditor.vue（流水线编辑器）**

```vue
<template>
  <div class="pipeline-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button @click="savePipeline" class="btn-primary">
          💾 保存
        </button>
        <button @click="executePipeline" class="btn-success">
          ▶️ 执行
        </button>
        <button @click="validatePipeline" class="btn-secondary">
          ✓ 验证
        </button>
      </div>

      <div class="toolbar-right">
        <button @click="togglePropertyPanel" class="btn-icon">
          ⚙️
        </button>
        <button @click="toggleProcessorLibrary" class="btn-icon">
          📚
        </button>
      </div>
    </div>

    <!-- 主工作区 -->
    <div class="workspace">
      <!-- 处理器库（左侧） -->
      <ProcessorLibrary
        v-show="showProcessorLibrary"
        :processors="availableProcessors"
        @add-processor="handleAddProcessor"
      />

      <!-- 流程图画布（中央） -->
      <FlowCanvas
        ref="canvas"
        :pipeline="currentPipeline"
        :execution-state="executionState"
        @node-selected="handleNodeSelected"
        @edge-created="handleEdgeCreated"
        @edge-deleted="handleEdgeDeleted"
      />

      <!-- 属性面板（右侧） -->
      <PropertyPanel
        v-show="showPropertyPanel"
        :selected-node="selectedNode"
        @update-config="handleUpdateConfig"
      />
    </div>

    <!-- 执行监控器（底部） -->
    <ExecutionMonitor
      v-if="isExecuting"
      :execution-state="executionState"
      :logs="executionLogs"
    />
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue'
import FlowCanvas from '@/components/streaming-engine/FlowCanvas.vue'
import ProcessorLibrary from '@/components/streaming-engine/ProcessorLibrary.vue'
import PropertyPanel from '@/components/streaming-engine/PropertyPanel.vue'
import ExecutionMonitor from '@/components/streaming-engine/ExecutionMonitor.vue'
import { PipelineExecutor } from '@/utils/streaming-engine/executor.js'
import { streamingEngineAPI } from '@/utils/streaming-engine-api.js'

export default {
  name: 'PipelineEditor',
  components: {
    FlowCanvas,
    ProcessorLibrary,
    PropertyPanel,
    ExecutionMonitor
  },

  setup() {
    // 状态管理
    const currentPipeline = reactive({
      id: null,
      name: '新建流水线',
      version: '1.0.0',
      processors: [],
      edges: [],
      execution: {
        mode: 'sequential',
        retryPolicy: {
          maxRetries: 3,
          retryDelay: 1000,
          exponentialBackoff: true
        },
        timeout: 60000,
        errorHandling: 'stop'
      }
    })

    const executionState = reactive({
      isRunning: false,
      currentProcessor: null,
      progress: 0,
      results: new Map()
    })

    const executionLogs = ref([])
    const selectedNode = ref(null)
    const showProcessorLibrary = ref(true)
    const showPropertyPanel = ref(true)

    // 可用处理器列表
    const availableProcessors = ref([
      {
        type: 'HttpProcessor',
        name: 'HTTP 请求',
        icon: '🌐',
        category: '数据获取',
        description: '发送 HTTP 请求获取数据'
      },
      {
        type: 'TransformProcessor',
        name: '数据转换',
        icon: '🔄',
        category: '数据处理',
        description: '转换数据格式和结构'
      },
      {
        type: 'ValidationProcessor',
        name: '数据验证',
        icon: '✓',
        category: '数据处理',
        description: '验证数据是否符合规范'
      },
      {
        type: 'DatabaseProcessor',
        name: '数据库操作',
        icon: '💾',
        category: '数据存储',
        description: '读写数据库'
      },
      {
        type: 'FileProcessor',
        name: '文件操作',
        icon: '📁',
        category: '数据存储',
        description: '读写文件'
      },
      {
        type: 'ConditionalProcessor',
        name: '条件分支',
        icon: '🔀',
        category: '流程控制',
        description: '根据条件选择执行路径'
      },
      {
        type: 'ParallelProcessor',
        name: '并行执行',
        icon: '⚡',
        category: '流程控制',
        description: '并行执行多个处理器'
      }
    ])

    // 执行引擎实例
    const executor = new PipelineExecutor()

    // 计算属性
    const isExecuting = computed(() => executionState.isRunning)

    // 方法
    const savePipeline = async () => {
      try {
        const response = await streamingEngineAPI.savePipeline(currentPipeline)
        currentPipeline.id = response.id
        alert('流水线保存成功')
      } catch (error) {
        alert(`保存失败: ${error.message}`)
      }
    }

    const executePipeline = async () => {
      if (!validatePipeline()) {
        alert('流水线配置无效，请检查后重试')
        return
      }

      executionState.isRunning = true
      executionState.progress = 0
      executionLogs.value = []

      try {
        const result = await executor.execute(currentPipeline, null)

        if (result.success) {
          alert('流水线执行成功')
        } else {
          alert(`流水线执行失败: ${result.error}`)
        }

        console.log('执行摘要:', result.summary)

      } catch (error) {
        alert(`执行错误: ${error.message}`)
      } finally {
        executionState.isRunning = false
      }
    }

    const validatePipeline = () => {
      // 验证处理器配置
      if (currentPipeline.processors.length === 0) {
        return false
      }

      // 验证连接关系（无环、无孤立节点）
      // TODO: 实现完整的验证逻辑

      return true
    }

    const handleAddProcessor = (processorType) => {
      const newProcessor = {
        id: `processor_${Date.now()}`,
        type: processorType.type,
        config: {}
      }

      currentPipeline.processors.push(newProcessor)
    }

    const handleNodeSelected = (node) => {
      selectedNode.value = node
    }

    const handleEdgeCreated = (edge) => {
      currentPipeline.edges.push(edge)
    }

    const handleEdgeDeleted = (edge) => {
      const index = currentPipeline.edges.findIndex(
        e => e.from === edge.from && e.to === edge.to
      )
      if (index !== -1) {
        currentPipeline.edges.splice(index, 1)
      }
    }

    const handleUpdateConfig = (config) => {
      if (selectedNode.value) {
        const processor = currentPipeline.processors.find(
          p => p.id === selectedNode.value.id
        )
        if (processor) {
          processor.config = config
        }
      }
    }

    const toggleProcessorLibrary = () => {
      showProcessorLibrary.value = !showProcessorLibrary.value
    }

    const togglePropertyPanel = () => {
      showPropertyPanel.value = !showPropertyPanel.value
    }

    return {
      currentPipeline,
      executionState,
      executionLogs,
      selectedNode,
      showProcessorLibrary,
      showPropertyPanel,
      availableProcessors,
      isExecuting,
      savePipeline,
      executePipeline,
      validatePipeline,
      handleAddProcessor,
      handleNodeSelected,
      handleEdgeCreated,
      handleEdgeDeleted,
      handleUpdateConfig,
      toggleProcessorLibrary,
      togglePropertyPanel
    }
  }
}
</script>

<style scoped>
.pipeline-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-secondary, #f5f7fa);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 0.5rem;
}

.workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: var(--primary-color, #007aff);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--primary-hover, #0056b3);
}

.btn-success {
  padding: 0.5rem 1rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-icon {
  padding: 0.5rem;
  background: transparent;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.2rem;
}

.btn-icon:hover {
  background: var(--bg-hover, #f0f0f0);
}
</style>
```

### 后端实现

#### 文件结构

```
server/
├── routes/
│   └── streaming-engine.js             # API 路由
├── services/
│   └── streaming-engine/
│       ├── executor.js                 # 服务端执行引擎
│       ├── processor-registry.js       # 处理器注册表
│       ├── pipeline-manager.js         # 流水线管理器
│       └── scheduler.js                # 定时调度器
├── processors/                         # 服务端处理器
│   ├── HttpProcessor.js
│   ├── DatabaseProcessor.js
│   ├── FileProcessor.js
│   └── ...
└── data/
    └── streaming-engine/
        ├── pipelines/                  # 流水线配置
        ├── executions/                 # 执行历史
        └── logs/                       # 执行日志
```

#### API 路由实现

**server/routes/streaming-engine.js**

```javascript
const express = require('express')
const router = express.Router()
const fs = require('fs').promises
const path = require('path')
const { PipelineExecutor } = require('../services/streaming-engine/executor')
const { PipelineManager } = require('../services/streaming-engine/pipeline-manager')

const PIPELINES_DIR = path.join(__dirname, '../data/streaming-engine/pipelines')
const EXECUTIONS_DIR = path.join(__dirname, '../data/streaming-engine/executions')

// 确保目录存在
fs.mkdir(PIPELINES_DIR, { recursive: true }).catch(console.error)
fs.mkdir(EXECUTIONS_DIR, { recursive: true }).catch(console.error)

const executor = new PipelineExecutor()
const pipelineManager = new PipelineManager(PIPELINES_DIR)

/**
 * 获取所有流水线
 * GET /api/streaming-engine/pipelines
 */
router.get('/pipelines', async (req, res) => {
  try {
    const pipelines = await pipelineManager.listPipelines()
    res.json({ pipelines })
  } catch (error) {
    console.error('获取流水线列表失败:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取单个流水线
 * GET /api/streaming-engine/pipelines/:id
 */
router.get('/pipelines/:id', async (req, res) => {
  try {
    const pipeline = await pipelineManager.getPipeline(req.params.id)

    if (!pipeline) {
      return res.status(404).json({ error: '流水线不存在' })
    }

    res.json(pipeline)
  } catch (error) {
    console.error('获取流水线失败:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 创建流水线
 * POST /api/streaming-engine/pipelines
 */
router.post('/pipelines', async (req, res) => {
  try {
    const pipelineConfig = req.body

    // 验证配置
    if (!pipelineConfig.name) {
      return res.status(400).json({ error: '流水线名称不能为空' })
    }

    // 生成 ID（如果没有）
    if (!pipelineConfig.id) {
      pipelineConfig.id = `pipeline_${Date.now()}`
    }

    // 保存流水线
    await pipelineManager.savePipeline(pipelineConfig)

    res.status(201).json(pipelineConfig)
  } catch (error) {
    console.error('创建流水线失败:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 更新流水线
 * PUT /api/streaming-engine/pipelines/:id
 */
router.put('/pipelines/:id', async (req, res) => {
  try {
    const pipelineConfig = req.body
    pipelineConfig.id = req.params.id

    await pipelineManager.savePipeline(pipelineConfig)

    res.json(pipelineConfig)
  } catch (error) {
    console.error('更新流水线失败:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 删除流水线
 * DELETE /api/streaming-engine/pipelines/:id
 */
router.delete('/pipelines/:id', async (req, res) => {
  try {
    await pipelineManager.deletePipeline(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error('删除流水线失败:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 执行流水线
 * POST /api/streaming-engine/pipelines/:id/execute
 */
router.post('/pipelines/:id/execute', async (req, res) => {
  try {
    const pipelineConfig = await pipelineManager.getPipeline(req.params.id)

    if (!pipelineConfig) {
      return res.status(404).json({ error: '流水线不存在' })
    }

    const initialInput = req.body.input || null

    // 异步执行（不阻塞响应）
    const runId = executor.generateRunId()

    res.json({
      runId,
      message: '流水线开始执行',
      statusUrl: `/api/streaming-engine/executions/${runId}`
    })

    // 后台执行
    executor.execute(pipelineConfig, initialInput).then(result => {
      // 保存执行结果
      saveExecutionResult(runId, pipelineConfig.id, result).catch(console.error)
    }).catch(error => {
      console.error('流水线执行失败:', error)
      saveExecutionResult(runId, pipelineConfig.id, {
        success: false,
        error: error.message
      }).catch(console.error)
    })

  } catch (error) {
    console.error('启动流水线执行失败:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取执行状态
 * GET /api/streaming-engine/executions/:runId
 */
router.get('/executions/:runId', async (req, res) => {
  try {
    const resultPath = path.join(EXECUTIONS_DIR, `${req.params.runId}.json`)

    try {
      const content = await fs.readFile(resultPath, 'utf-8')
      const result = JSON.parse(content)
      res.json(result)
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({
          status: 'running',
          message: '流水线正在执行中'
        })
      } else {
        throw error
      }
    }

  } catch (error) {
    console.error('获取执行状态失败:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取执行历史
 * GET /api/streaming-engine/pipelines/:id/executions
 */
router.get('/pipelines/:id/executions', async (req, res) => {
  try {
    const files = await fs.readdir(EXECUTIONS_DIR)
    const executions = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(EXECUTIONS_DIR, file), 'utf-8')
        const execution = JSON.parse(content)

        if (execution.pipelineId === req.params.id) {
          executions.push(execution)
        }
      }
    }

    // 按时间倒序排列
    executions.sort((a, b) => b.summary.startTime - a.summary.startTime)

    res.json({ executions })

  } catch (error) {
    console.error('获取执行历史失败:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取可用处理器列表
 * GET /api/streaming-engine/processors
 */
router.get('/processors', async (req, res) => {
  try {
    const processors = executor.listAvailableProcessors()
    res.json({ processors })
  } catch (error) {
    console.error('获取处理器列表失败:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 保存执行结果
 */
async function saveExecutionResult(runId, pipelineId, result) {
  const resultPath = path.join(EXECUTIONS_DIR, `${runId}.json`)

  const executionRecord = {
    runId,
    pipelineId,
    ...result,
    completedAt: new Date().toISOString()
  }

  await fs.writeFile(resultPath, JSON.stringify(executionRecord, null, 2))
}

module.exports = router
```

## 数据库设计

### 流水线表（pipelines）

```sql
CREATE TABLE pipelines (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  description TEXT,
  config JSON NOT NULL,              -- 完整的流水线配置（JSON）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  status ENUM('active', 'disabled') DEFAULT 'active',

  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### 执行记录表（pipeline_executions）

```sql
CREATE TABLE pipeline_executions (
  run_id VARCHAR(100) PRIMARY KEY,
  pipeline_id VARCHAR(100) NOT NULL,
  status ENUM('running', 'success', 'failed', 'timeout') NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_ms INT,
  input_data JSON,                   -- 初始输入数据
  output_data JSON,                  -- 最终输出数据
  error_message TEXT,
  summary JSON,                      -- 执行摘要

  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
  INDEX idx_pipeline_id (pipeline_id),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time)
);
```

### 处理器执行记录表（processor_executions）

```sql
CREATE TABLE processor_executions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  run_id VARCHAR(100) NOT NULL,
  processor_id VARCHAR(100) NOT NULL,
  processor_type VARCHAR(100) NOT NULL,
  status ENUM('success', 'failed') NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration_ms INT NOT NULL,
  input_data JSON,
  output_data JSON,
  error_message TEXT,

  FOREIGN KEY (run_id) REFERENCES pipeline_executions(run_id) ON DELETE CASCADE,
  INDEX idx_run_id (run_id),
  INDEX idx_processor_id (processor_id)
);
```

### 处理器注册表（processor_registry）

```sql
CREATE TABLE processor_registry (
  type VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  icon VARCHAR(50),
  config_schema JSON,                -- 配置项的 JSON Schema
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_category (category)
);
```

## 使用指南

### 快速开始

#### 1. 创建第一个流水线

```javascript
// 1. 定义流水线配置
const myFirstPipeline = {
  name: '我的第一个流水线',
  description: '从 API 获取数据并保存到文件',
  processors: [
    {
      id: 'fetch_data',
      type: 'HttpProcessor',
      config: {
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: 'GET'
      }
    },
    {
      id: 'save_to_file',
      type: 'FileProcessor',
      config: {
        operation: 'write',
        path: './output/posts.json'
      }
    }
  ],
  edges: [
    { from: 'fetch_data', to: 'save_to_file' }
  ]
}

// 2. 保存流水线
await streamingEngineAPI.savePipeline(myFirstPipeline)

// 3. 执行流水线
const result = await streamingEngineAPI.executePipeline(myFirstPipeline.id)

console.log('执行结果:', result)
```

#### 2. 创建自定义处理器

```javascript
// 自定义处理器：将文本转换为大写
class UpperCaseProcessor extends Processor {
  constructor(config) {
    super(config)
  }

  async process(input, context) {
    context.logger.info('转换文本为大写')

    if (typeof input === 'string') {
      return input.toUpperCase()
    } else if (Array.isArray(input)) {
      return input.map(item =>
        typeof item === 'string' ? item.toUpperCase() : item
      )
    } else {
      throw new Error('输入必须是字符串或字符串数组')
    }
  }

  validate(input) {
    return typeof input === 'string' || Array.isArray(input)
  }
}

// 注册处理器
executor.registerProcessor('UpperCaseProcessor', UpperCaseProcessor)
```

#### 3. 使用可视化编辑器

1. 导航到"流水线编辑器"页面
2. 从左侧处理器库拖拽处理器到画布
3. 连接处理器节点形成数据流
4. 点击节点配置处理器属性
5. 点击"执行"按钮运行流水线
6. 在底部监控器查看实时执行状态

### 高级用法

#### 条件分支示例

```javascript
const conditionalPipeline = {
  name: '条件分支示例',
  processors: [
    {
      id: 'check_amount',
      type: 'ConditionalProcessor',
      config: {
        condition: 'input.amount > 1000',
        trueBranch: 'high_value_handler',
        falseBranch: 'normal_handler'
      }
    },
    {
      id: 'high_value_handler',
      type: 'CustomProcessor',
      config: { /* ... */ }
    },
    {
      id: 'normal_handler',
      type: 'CustomProcessor',
      config: { /* ... */ }
    }
  ],
  edges: [
    { from: 'check_amount', to: 'high_value_handler', condition: true },
    { from: 'check_amount', to: 'normal_handler', condition: false }
  ]
}
```

#### 并行执行示例

```javascript
const parallelPipeline = {
  name: '并行执行示例',
  processors: [
    {
      id: 'parallel_group',
      type: 'ParallelProcessor',
      config: {
        processors: [
          'process_user_data',
          'process_order_data',
          'process_log_data'
        ],
        mergeStrategy: 'merge'
      }
    }
  ]
}
```

## 故障排除

### 常见问题

#### 问题 1: 流水线执行卡住

**症状**：
- 执行状态一直显示"运行中"
- 没有错误日志输出
- 超过预期执行时间

**原因**：
- 处理器内部死锁或无限循环
- 网络请求超时未设置
- 数据库连接未释放

**解决方案**：
1. 检查处理器是否正确实现 `process()` 方法
2. 为网络请求设置超时时间
3. 在 `cleanup()` 方法中释放资源
4. 设置流水线整体超时时间

```javascript
execution: {
  timeout: 60000,  // 60 秒超时
  // ...
}
```

#### 问题 2: 处理器之间数据传递失败

**症状**：
- 后续处理器收到 `undefined` 或 `null`
- 执行中断并报错"输入数据验证失败"

**原因**：
- 前置处理器未正确返回数据
- 数据格式不匹配

**解决方案**：
1. 确保每个处理器都返回数据
2. 使用 `validate()` 方法验证输入格式
3. 在执行上下文中记录中间结果

```javascript
async process(input, context) {
  const result = await this.doSomething(input)

  // 确保返回数据
  return result || {}
}
```

#### 问题 3: 循环依赖错误

**症状**：
- 执行时报错"流水线配置存在循环依赖"

**原因**：
- 流水线配置中存在环形连接

**解决方案**：
1. 检查 `edges` 配置，确保无环
2. 使用拓扑排序验证

```javascript
// 错误示例（存在环）
edges: [
  { from: 'A', to: 'B' },
  { from: 'B', to: 'C' },
  { from: 'C', to: 'A' }  // ❌ 形成环
]

// 正确示例（无环）
edges: [
  { from: 'A', to: 'B' },
  { from: 'B', to: 'C' },
  { from: 'C', to: 'D' }  // ✓ 线性流
]
```

### 调试技巧

#### 1. 启用详细日志

```javascript
const context = new ExecutionContext(pipelineId, runId)
context.logger.setLevel('debug')  // trace | debug | info | warn | error
```

#### 2. 查看执行历史

```javascript
// 获取特定流水线的执行历史
const history = await streamingEngineAPI.getExecutionHistory(pipelineId)

history.executions.forEach(exec => {
  console.log(`${exec.runId}: ${exec.status} (${exec.duration_ms}ms)`)
})
```

#### 3. 单步调试处理器

```javascript
// 直接测试单个处理器
const processor = new HttpProcessor({
  url: 'https://api.example.com/data'
})

const testContext = new ExecutionContext('test', 'test_run')
const result = await processor.process({ id: 123 }, testContext)

console.log('处理器输出:', result)
```

## 性能考虑

### 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 流水线启动时间 | < 500ms | 从触发到首个处理器执行 |
| 处理器平均执行时间 | < 1s | 单个处理器处理时间 |
| 端到端延迟 | < 5s | 简单流水线（3-5 个处理器） |
| 并发执行能力 | 100+ | 同时运行的流水线数量 |
| 吞吐量 | 1000+ ops/s | 每秒处理的数据项数量 |

### 优化建议

#### 1. 使用并行执行

对于独立的处理器，使用 `ParallelProcessor` 并行执行：

```javascript
{
  id: 'parallel_fetch',
  type: 'ParallelProcessor',
  config: {
    processors: ['fetch_user', 'fetch_order', 'fetch_log'],
    concurrency: 3  // 最大并发数
  }
}
```

#### 2. 启用结果缓存

对于重复计算，启用缓存：

```javascript
class CachedProcessor extends Processor {
  async process(input, context) {
    const cacheKey = this.getCacheKey(input)

    if (context.cache.has(cacheKey)) {
      return context.cache.get(cacheKey)
    }

    const result = await this.expensiveOperation(input)
    context.cache.set(cacheKey, result)

    return result
  }
}
```

#### 3. 批处理

对数组数据使用批处理：

```javascript
{
  id: 'batch_insert',
  type: 'DatabaseProcessor',
  config: {
    operation: 'bulkInsert',
    batchSize: 100  // 每批插入 100 条
  }
}
```

#### 4. 资源池化

复用数据库连接、HTTP 客户端：

```javascript
class DatabaseProcessor extends Processor {
  async initialize(context) {
    this.pool = createPool({
      host: 'localhost',
      user: 'root',
      database: 'mydb',
      connectionLimit: 10
    })
  }

  async cleanup(context) {
    await this.pool.end()
  }
}
```

## 测试清单

### 功能测试

- [ ] ✅ 创建流水线
- [ ] ✅ 编辑流水线配置
- [ ] ✅ 删除流水线
- [ ] ✅ 执行简单流水线（2-3 个处理器）
- [ ] ✅ 执行复杂流水线（10+ 个处理器）
- [ ] ✅ 条件分支正确执行
- [ ] ✅ 并行执行正确合并结果
- [ ] ✅ 循环处理数组数据
- [ ] ✅ 错误重试机制生效
- [ ] ✅ 执行超时自动终止
- [ ] ✅ 执行历史正确记录
- [ ] ✅ 实时监控显示正确

### 性能测试

- [ ] ✅ 100 个并发流水线执行
- [ ] ✅ 处理 10000 条数据无内存泄漏
- [ ] ✅ 长时间运行稳定性（24 小时）

### 异常测试

- [ ] ✅ 网络断开时正确重试
- [ ] ✅ 数据库连接失败时降级
- [ ] ✅ 无效配置被正确拒绝
- [ ] ✅ 循环依赖被检测并报错

### 兼容性测试

- [ ] ✅ Chrome 浏览器正常运行
- [ ] ✅ Firefox 浏览器正常运行
- [ ] ✅ Safari 浏览器正常运行
- [ ] ✅ 移动端显示和操作正常

## 开发扩展

### 如何添加新处理器

1. **创建处理器类**

```javascript
// src/utils/streaming-engine/processors/MyCustomProcessor.js
import { Processor } from '../processor-base.js'

export class MyCustomProcessor extends Processor {
  constructor(config) {
    super(config)
    // 初始化配置
  }

  async process(input, context) {
    // 实现处理逻辑
    return processedData
  }

  validate(input) {
    // 验证输入
    return true
  }
}
```

2. **注册处理器**

```javascript
// src/utils/streaming-engine/executor.js
import { MyCustomProcessor } from './processors/MyCustomProcessor.js'

executor.registerProcessor('MyCustomProcessor', MyCustomProcessor)
```

3. **添加到处理器库**

```javascript
// src/pages/streaming-engine/PipelineEditor.vue
const availableProcessors = ref([
  // ...
  {
    type: 'MyCustomProcessor',
    name: '我的自定义处理器',
    icon: '🔧',
    category: '自定义',
    description: '描述处理器功能'
  }
])
```

### 如何扩展执行模式

当前支持的执行模式：
- `sequential` - 串行执行
- `parallel` - 并行执行
- `mixed` - 混合模式

添加新的执行模式：

```javascript
// src/utils/streaming-engine/executor.js
class PipelineExecutor {
  async execute(pipelineConfig, initialInput) {
    // ...

    if (pipelineConfig.execution.mode === 'streaming') {
      return this.executeStreaming(graph, processors, initialInput, context)
    }

    // ...
  }

  async executeStreaming(graph, processors, initialInput, context) {
    // 实现流式执行逻辑
  }
}
```

### 相关文件速查

#### 核心文件

- `src/pages/streaming-engine/PipelineEditor.vue` - 主编辑器页面（200+ 行）
- `src/utils/streaming-engine/executor.js` - 执行引擎（500+ 行）
- `src/utils/streaming-engine/processor-base.js` - 处理器基类（100+ 行）
- `server/routes/streaming-engine.js` - API 路由（300+ 行）

#### 组件文件

- `src/components/streaming-engine/FlowCanvas.vue` - 流程图画布
- `src/components/streaming-engine/ProcessorNode.vue` - 处理器节点
- `src/components/streaming-engine/PropertyPanel.vue` - 属性面板
- `src/components/streaming-engine/ExecutionMonitor.vue` - 执行监控器

#### 处理器实现

- `src/utils/streaming-engine/processors/HttpProcessor.js`
- `src/utils/streaming-engine/processors/TransformProcessor.js`
- `src/utils/streaming-engine/processors/ValidationProcessor.js`
- `src/utils/streaming-engine/processors/DatabaseProcessor.js`

## 相关文档

- 📄 [LEARNING_GUIDE.md](../LEARNING_GUIDE.md) - 项目总体学习指南
- 📄 [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) - 快速参考
- 📄 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API 完整文档
- 📄 [PROCESSOR_DEVELOPMENT_GUIDE.md](./PROCESSOR_DEVELOPMENT_GUIDE.md) - 处理器开发指南

## 未来规划

### 短期目标（1-2 个月）

- [ ] 完成核心执行引擎开发
- [ ] 实现基础处理器库（10+ 个）
- [ ] 开发可视化编辑器
- [ ] 编写完整的单元测试

### 中期目标（3-6 个月）

- [ ] 支持分布式执行
- [ ] 实现流水线版本管理
- [ ] 添加更多高级特性（条件分支、循环、子流水线）
- [ ] 性能优化和压力测试

### 长期目标（6-12 个月）

- [ ] 支持热更新
- [ ] 实现智能调度和资源管理
- [ ] 提供云服务版本
- [ ] 建立开发者社区和插件市场

## 贡献指南

欢迎贡献代码、文档或反馈！

### 贡献方式

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交变更 (`git commit -m '添加某个很棒的特性'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 遵循 ESLint 配置
- 编写单元测试
- 更新相关文档
- 保持代码简洁清晰

---

**文档版本**: 1.0.0
**创建日期**: 2026-03-05
**最后更新**: 2026-03-05
**维护人**: Claude Code
**联系方式**: issue tracker

---

**许可证**: MIT
**项目主页**: https://github.com/your-org/vue-learning-app
