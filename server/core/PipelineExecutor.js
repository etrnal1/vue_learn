import { EventEmitter } from 'events'

/**
 * 流水线执行器
 * 负责执行流水线的核心逻辑
 */
export class PipelineExecutor extends EventEmitter {
  constructor(pipeline, context, moduleRegistry) {
    super()
    this.pipeline = pipeline
    this.context = context
    this.moduleRegistry = moduleRegistry

    // 节点状态 Map<nodeId, status>
    this.nodeStates = new Map()

    // 节点输出缓存 Map<nodeId, output>
    this.nodeOutputs = new Map()

    // 已加载的模块实例 Map<nodeId, moduleInstance>
    this.moduleInstances = new Map()

    // 执行控制
    this.isPaused = false
    this.isCancelled = false
  }

  /**
   * 执行流水线
   */
  async execute() {
    try {
      this.emit('pipeline:start', {
        pipelineId: this.pipeline.id,
        executionId: this.context.executionId
      })

      // 1. 拓扑排序，确定执行顺序
      const executionOrder = this.topologicalSort()
      console.log('[PipelineExecutor] Execution order:', executionOrder)

      // 2. 初始化所有模块
      await this.initModules()

      // 3. 按顺序执行节点
      for (const nodeId of executionOrder) {
        // 检查是否暂停或取消
        if (this.isCancelled) {
          throw new Error('Execution cancelled by user')
        }

        // 等待暂停恢复
        while (this.isPaused) {
          await this.sleep(100)
        }

        await this.executeNode(nodeId)
      }

      // 4. 清理资源
      await this.cleanup()

      this.emit('pipeline:complete', {
        pipelineId: this.pipeline.id,
        executionId: this.context.executionId,
        duration: Date.now() - this.context.startTime
      })

      return {
        status: 'completed',
        outputs: this.nodeOutputs
      }
    } catch (error) {
      this.emit('pipeline:error', {
        pipelineId: this.pipeline.id,
        executionId: this.context.executionId,
        error: error.message
      })

      await this.cleanup()

      throw error
    }
  }

  /**
   * 执行单个节点
   * @param {string} nodeId - 节点 ID
   */
  async executeNode(nodeId) {
    const node = this.pipeline.nodes.find(n => n.id === nodeId)
    if (!node) {
      throw new Error(`Node ${nodeId} not found in pipeline`)
    }

    try {
      // 更新节点状态
      this.nodeStates.set(nodeId, 'running')
      this.emit('node:start', { nodeId, node })

      // 加载模块
      const module = await this.loadModule(node)

      // 获取输入数据
      const input = await this.gatherInput(nodeId)

      // 验证输入
      const validation = module.validate(input)
      if (!validation.valid) {
        throw new Error(`Input validation failed: ${validation.errors.join(', ')}`)
      }

      // 执行模块
      const startTime = Date.now()
      const result = await module.execute(input, this.context)
      const duration = Date.now() - startTime

      // 存储输出
      this.nodeOutputs.set(nodeId, result.output)

      // 更新状态
      this.nodeStates.set(nodeId, 'completed')

      this.emit('node:complete', {
        nodeId,
        node,
        result,
        duration
      })

      // 传递输出到下游节点
      await this.propagateOutput(nodeId, result.output)
    } catch (error) {
      this.nodeStates.set(nodeId, 'failed')

      this.emit('node:error', {
        nodeId,
        node,
        error: error.message,
        stack: error.stack
      })

      // 根据错误处理策略决定是否继续
      await this.handleError(nodeId, error)
    }
  }

  /**
   * 加载节点对应的模块
   * @param {Object} node - 节点配置
   */
  async loadModule(node) {
    // 检查是否已加载
    if (this.moduleInstances.has(node.id)) {
      return this.moduleInstances.get(node.id)
    }

    // 从注册表加载模块
    const moduleConfig = {
      id: node.id,
      type: node.type,
      name: node.name,
      config: node.config
    }

    const module = await this.moduleRegistry.load(node.type, moduleConfig)

    // 初始化模块
    await module.init()

    // 缓存实例
    this.moduleInstances.set(node.id, module)

    return module
  }

  /**
   * 收集节点的输入数据
   * @param {string} nodeId - 节点 ID
   */
  async gatherInput(nodeId) {
    // 获取所有指向该节点的边
    const incomingEdges = this.pipeline.edges.filter(e => e.target === nodeId)

    if (incomingEdges.length === 0) {
      // 源节点，无输入
      return null
    }

    if (incomingEdges.length === 1) {
      // 单输入
      const sourceNodeId = incomingEdges[0].source
      return this.nodeOutputs.get(sourceNodeId)
    }

    // 多输入，合并为数组
    const inputs = []
    for (const edge of incomingEdges) {
      const sourceOutput = this.nodeOutputs.get(edge.source)
      inputs.push(sourceOutput)
    }

    return inputs
  }

  /**
   * 传播输出到下游节点
   * @param {string} nodeId - 节点 ID
   * @param {*} output - 输出数据
   */
  async propagateOutput(nodeId, output) {
    const downstreamNodes = this.getDownstreamNodes(nodeId)

    this.emit('output:propagate', {
      nodeId,
      downstreamNodes,
      outputSize: JSON.stringify(output).length
    })
  }

  /**
   * 获取下游节点
   * @param {string} nodeId - 节点 ID
   */
  getDownstreamNodes(nodeId) {
    return this.pipeline.edges
      .filter(e => e.source === nodeId)
      .map(e => e.target)
  }

  /**
   * 拓扑排序
   * 使用 DFS 算法对 DAG 进行拓扑排序
   */
  topologicalSort() {
    const graph = new Map()
    const inDegree = new Map()

    // 构建图和入度表
    this.pipeline.nodes.forEach(node => {
      graph.set(node.id, [])
      inDegree.set(node.id, 0)
    })

    this.pipeline.edges.forEach(edge => {
      graph.get(edge.source).push(edge.target)
      inDegree.set(edge.target, inDegree.get(edge.target) + 1)
    })

    // Kahn 算法
    const queue = []
    const result = []

    // 找到所有入度为 0 的节点
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId)
      }
    })

    while (queue.length > 0) {
      const nodeId = queue.shift()
      result.push(nodeId)

      // 减少下游节点的入度
      const neighbors = graph.get(nodeId) || []
      neighbors.forEach(neighborId => {
        inDegree.set(neighborId, inDegree.get(neighborId) - 1)
        if (inDegree.get(neighborId) === 0) {
          queue.push(neighborId)
        }
      })
    }

    // 检测循环
    if (result.length !== this.pipeline.nodes.length) {
      throw new Error('Pipeline contains circular dependencies')
    }

    return result
  }

  /**
   * 初始化所有模块
   */
  async initModules() {
    console.log('[PipelineExecutor] Initializing modules...')
    // 模块将在首次使用时动态加载
  }

  /**
   * 错误处理
   * @param {string} nodeId - 节点 ID
   * @param {Error} error - 错误对象
   */
  async handleError(nodeId, error) {
    const errorHandling = this.pipeline.config?.errorHandling || 'stop'

    console.error(`[PipelineExecutor] Node ${nodeId} error:`, error.message)

    switch (errorHandling) {
      case 'continue':
        // 继续执行下一个节点
        console.log('[PipelineExecutor] Continuing execution despite error')
        break

      case 'stop':
        // 停止执行
        throw error

      case 'rollback':
        // 回滚（暂未实现）
        throw new Error('Rollback not implemented yet')

      default:
        throw error
    }
  }

  /**
   * 暂停执行
   */
  pause() {
    this.isPaused = true
    this.emit('pipeline:paused', {
      executionId: this.context.executionId
    })
  }

  /**
   * 恢复执行
   */
  resume() {
    this.isPaused = false
    this.emit('pipeline:resumed', {
      executionId: this.context.executionId
    })
  }

  /**
   * 取消执行
   */
  cancel() {
    this.isCancelled = true
    this.emit('pipeline:cancelled', {
      executionId: this.context.executionId
    })
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('[PipelineExecutor] Cleaning up...')

    // 清理所有模块实例
    for (const [nodeId, module] of this.moduleInstances.entries()) {
      try {
        await module.cleanup()
      } catch (error) {
        console.error(`Failed to cleanup module ${nodeId}:`, error)
      }
    }

    this.moduleInstances.clear()
    this.nodeOutputs.clear()
  }

  /**
   * 工具函数：等待
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default PipelineExecutor
