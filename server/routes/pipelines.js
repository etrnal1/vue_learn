import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 数据存储路径
const PIPELINES_DIR = path.join(__dirname, '../server/data/pipelines')
const EXECUTIONS_DIR = path.join(__dirname, '../server/data/pipelines/executions')

// 确保目录存在
await fs.mkdir(PIPELINES_DIR, { recursive: true })
await fs.mkdir(EXECUTIONS_DIR, { recursive: true })

// 内存存储（简化版，生产环境应使用数据库）
let pipelines = []
let executions = []

// 加载已保存的流水线
try {
  const pipelinesFile = path.join(PIPELINES_DIR, 'pipelines.json')
  const data = await fs.readFile(pipelinesFile, 'utf-8')
  pipelines = JSON.parse(data)
} catch (error) {
  console.log('[Pipelines] No existing pipelines found, starting fresh')
}

/**
 * 创建流水线
 * POST /api/pipelines
 */
router.post('/api/pipelines', async (req, res) => {
  try {
    const { name, description, nodes, edges, config } = req.body

    // 验证必需字段
    if (!name || !nodes || !edges) {
      return res.status(400).json({
        error: 'Missing required fields: name, nodes, edges'
      })
    }

    // 创建流水线
    const pipeline = {
      id: `pipeline_${uuidv4()}`,
      name,
      description: description || '',
      version: '1.0.0',
      status: 'active',
      nodes,
      edges,
      config: config || {
        maxConcurrency: 5,
        timeout: 300000,
        errorHandling: 'stop'
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      createdBy: 'system'
    }

    // 验证流水线结构
    const validation = validatePipeline(pipeline)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Pipeline validation failed',
        errors: validation.errors
      })
    }

    // 保存流水线
    pipelines.push(pipeline)
    await savePipelines()

    res.status(201).json({
      id: pipeline.id,
      status: pipeline.status,
      created: pipeline.created
    })
  } catch (error) {
    console.error('[Pipelines] Create error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取流水线列表
 * GET /api/pipelines
 */
router.get('/api/pipelines', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query

    // 过滤
    let filtered = pipelines
    if (status) {
      filtered = filtered.filter(p => p.status === status)
    }

    // 分页
    const start = (page - 1) * limit
    const end = start + parseInt(limit)
    const paginated = filtered.slice(start, end)

    res.json({
      data: paginated.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        nodeCount: p.nodes.length,
        created: p.created,
        updated: p.updated
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit)
      }
    })
  } catch (error) {
    console.error('[Pipelines] List error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取流水线详情
 * GET /api/pipelines/:id
 */
router.get('/api/pipelines/:id', async (req, res) => {
  try {
    const pipeline = pipelines.find(p => p.id === req.params.id)

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' })
    }

    res.json(pipeline)
  } catch (error) {
    console.error('[Pipelines] Get error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 更新流水线
 * PUT /api/pipelines/:id
 */
router.put('/api/pipelines/:id', async (req, res) => {
  try {
    const index = pipelines.findIndex(p => p.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Pipeline not found' })
    }

    const { name, description, nodes, edges, config, status } = req.body

    // 更新字段
    if (name) pipelines[index].name = name
    if (description !== undefined) pipelines[index].description = description
    if (nodes) pipelines[index].nodes = nodes
    if (edges) pipelines[index].edges = edges
    if (config) pipelines[index].config = { ...pipelines[index].config, ...config }
    if (status) pipelines[index].status = status

    pipelines[index].updated = new Date().toISOString()

    await savePipelines()

    res.json({
      id: pipelines[index].id,
      updated: pipelines[index].updated
    })
  } catch (error) {
    console.error('[Pipelines] Update error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 删除流水线
 * DELETE /api/pipelines/:id
 */
router.delete('/api/pipelines/:id', async (req, res) => {
  try {
    const index = pipelines.findIndex(p => p.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Pipeline not found' })
    }

    pipelines.splice(index, 1)
    await savePipelines()

    res.status(204).send()
  } catch (error) {
    console.error('[Pipelines] Delete error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 触发流水线执行
 * POST /api/pipelines/:id/execute
 */
router.post('/api/pipelines/:id/execute', async (req, res) => {
  try {
    const pipeline = pipelines.find(p => p.id === req.params.id)

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' })
    }

    const { variables = {}, config = {} } = req.body

    // 创建执行实例
    const execution = {
      id: `exec_${uuidv4()}`,
      pipelineId: pipeline.id,
      status: 'pending',
      progress: 0,
      variables,
      config: { ...pipeline.config, ...config },
      nodes: pipeline.nodes.map(n => ({
        nodeId: n.id,
        name: n.name,
        type: n.type,
        status: 'pending',
        progress: 0
      })),
      statistics: {
        totalNodes: pipeline.nodes.length,
        completedNodes: 0,
        runningNodes: 0,
        failedNodes: 0
      },
      created: new Date().toISOString(),
      startTime: null,
      completedTime: null
    }

    executions.push(execution)
    await saveExecutions()

    // 异步执行流水线（简化版，实际应使用任务队列）
    setImmediate(() => {
      executePipeline(execution, pipeline).catch(error => {
        console.error('[Pipelines] Execution error:', error)
        execution.status = 'failed'
        execution.error = error.message
        saveExecutions()
      })
    })

    res.status(202).json({
      executionId: execution.id,
      status: execution.status,
      pipelineId: pipeline.id
    })
  } catch (error) {
    console.error('[Pipelines] Execute error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取执行详情
 * GET /api/executions/:id
 */
router.get('/api/executions/:id', async (req, res) => {
  try {
    const execution = executions.find(e => e.id === req.params.id)

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' })
    }

    res.json(execution)
  } catch (error) {
    console.error('[Executions] Get error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 暂停执行
 * POST /api/executions/:id/pause
 */
router.post('/api/executions/:id/pause', async (req, res) => {
  try {
    const execution = executions.find(e => e.id === req.params.id)

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' })
    }

    if (execution.status !== 'running') {
      return res.status(400).json({ error: 'Can only pause running executions' })
    }

    execution.status = 'paused'
    await saveExecutions()

    res.json({
      executionId: execution.id,
      status: execution.status
    })
  } catch (error) {
    console.error('[Executions] Pause error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 恢复执行
 * POST /api/executions/:id/resume
 */
router.post('/api/executions/:id/resume', async (req, res) => {
  try {
    const execution = executions.find(e => e.id === req.params.id)

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' })
    }

    if (execution.status !== 'paused') {
      return res.status(400).json({ error: 'Can only resume paused executions' })
    }

    execution.status = 'running'
    await saveExecutions()

    res.json({
      executionId: execution.id,
      status: execution.status
    })
  } catch (error) {
    console.error('[Executions] Resume error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 取消执行
 * POST /api/executions/:id/cancel
 */
router.post('/api/executions/:id/cancel', async (req, res) => {
  try {
    const execution = executions.find(e => e.id === req.params.id)

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' })
    }

    execution.status = 'cancelled'
    await saveExecutions()

    res.json({
      executionId: execution.id,
      status: execution.status
    })
  } catch (error) {
    console.error('[Executions] Cancel error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ========== 辅助函数 ==========

/**
 * 验证流水线结构
 */
function validatePipeline(pipeline) {
  const errors = []

  // 检查节点
  if (!pipeline.nodes || pipeline.nodes.length === 0) {
    errors.push('Pipeline must have at least one node')
  }

  // 检查节点 ID 唯一性
  const nodeIds = new Set()
  pipeline.nodes.forEach(node => {
    if (!node.id) {
      errors.push('All nodes must have an id')
    } else if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`)
    }
    nodeIds.add(node.id)

    if (!node.type) {
      errors.push(`Node ${node.id} must have a type`)
    }
  })

  // 检查边
  pipeline.edges.forEach(edge => {
    if (!edge.source || !edge.target) {
      errors.push('All edges must have source and target')
    }

    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge source '${edge.source}' does not exist`)
    }

    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge target '${edge.target}' does not exist`)
    }
  })

  // 检查循环依赖
  if (hasCycle(pipeline.nodes, pipeline.edges)) {
    errors.push('Pipeline contains circular dependencies')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 检测循环依赖
 */
function hasCycle(nodes, edges) {
  const graph = new Map()
  nodes.forEach(node => graph.set(node.id, []))
  edges.forEach(edge => {
    if (!graph.has(edge.source)) graph.set(edge.source, [])
    graph.get(edge.source).push(edge.target)
  })

  const visited = new Set()
  const recStack = new Set()

  function dfs(nodeId) {
    visited.add(nodeId)
    recStack.add(nodeId)

    const neighbors = graph.get(nodeId) || []
    for (const neighbor of neighbors) {
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

/**
 * 执行流水线（简化版）
 */
async function executePipeline(execution, pipeline) {
  execution.status = 'running'
  execution.startTime = new Date().toISOString()
  await saveExecutions()

  try {
    // 模拟执行
    for (let i = 0; i < pipeline.nodes.length; i++) {
      const node = execution.nodes[i]

      node.status = 'running'
      await saveExecutions()

      // 模拟处理时间
      await new Promise(resolve => setTimeout(resolve, 1000))

      node.status = 'completed'
      node.progress = 1

      execution.statistics.completedNodes++
      execution.progress = (i + 1) / pipeline.nodes.length

      await saveExecutions()
    }

    execution.status = 'completed'
    execution.completedTime = new Date().toISOString()
  } catch (error) {
    execution.status = 'failed'
    execution.error = error.message
  }

  await saveExecutions()
}

/**
 * 保存流水线到文件
 */
async function savePipelines() {
  const filePath = path.join(PIPELINES_DIR, 'pipelines.json')
  await fs.writeFile(filePath, JSON.stringify(pipelines, null, 2))
}

/**
 * 保存执行记录到文件
 */
async function saveExecutions() {
  const filePath = path.join(EXECUTIONS_DIR, 'executions.json')
  await fs.writeFile(filePath, JSON.stringify(executions, null, 2))
}

export default router
