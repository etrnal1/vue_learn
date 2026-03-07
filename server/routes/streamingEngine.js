import express from 'express'
import fsp from 'fs/promises'
import path from 'path'

const router = express.Router()

const STREAMING_DATA_DIR = path.resolve('server/data/streaming-engine')
const PIPELINES_DIR = path.join(STREAMING_DATA_DIR, 'pipelines')
const EXECUTIONS_DIR = path.join(STREAMING_DATA_DIR, 'executions')

const runningExecutions = new Map()

const DEFAULT_PIPELINE = {
  id: 'sample_user_etl',
  name: '用户数据清洗流水线',
  version: '0.1.0',
  processors: [
    { id: 'source_users', type: 'SourceProcessor', name: '加载样例数据', config: { source: 'inline-users' } },
    { id: 'validate_users', type: 'ValidationProcessor', name: '校验字段', config: { required: ['id', 'name', 'email'] } },
    { id: 'transform_users', type: 'TransformProcessor', name: '转换字段', config: { mapTo: ['user_id', 'full_name', 'email_address', 'active'] } },
    { id: 'filter_active', type: 'FilterProcessor', name: '过滤启用用户', config: { field: 'active', equals: true } },
    { id: 'summary', type: 'SummaryProcessor', name: '统计汇总', config: { metrics: ['count', 'activeRate'] } },
    { id: 'sink_memory', type: 'SinkProcessor', name: '落库模拟', config: { sink: 'memory' } }
  ],
  execution: {
    mode: 'sequential',
    timeout: 60000,
    retryPolicy: {
      maxRetries: 1
    }
  }
}

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function toSafeName(name) {
  return String(name || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function pipelineFilePath(id) {
  return path.join(PIPELINES_DIR, `${toSafeName(id)}.json`)
}

function executionFilePath(runId) {
  return path.join(EXECUTIONS_DIR, `${toSafeName(runId)}.json`)
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function normalizePipeline(raw = {}) {
  const input = isObject(raw) ? raw : {}
  const id = String(input.id || makeId('pipeline')).trim()
  const name = String(input.name || '').trim() || `流水线-${id.slice(-6)}`
  const version = String(input.version || '0.1.0').trim() || '0.1.0'
  const processors = Array.isArray(input.processors)
    ? input.processors
      .filter((item) => isObject(item))
      .map((item, index) => ({
        id: String(item.id || `step_${index + 1}`),
        type: String(item.type || 'TransformProcessor'),
        name: String(item.name || item.type || `步骤${index + 1}`),
        config: isObject(item.config) ? item.config : {}
      }))
    : []

  const execution = isObject(input.execution) ? input.execution : {}
  const retryPolicy = isObject(execution.retryPolicy) ? execution.retryPolicy : {}

  return {
    id,
    name,
    version,
    processors,
    execution: {
      mode: String(execution.mode || 'sequential'),
      timeout: Number(execution.timeout) > 0 ? Number(execution.timeout) : 60000,
      retryPolicy: {
        maxRetries: Number(retryPolicy.maxRetries) >= 0 ? Number(retryPolicy.maxRetries) : 0
      }
    },
    updatedAt: nowIso()
  }
}

async function ensureDataDirs() {
  await fsp.mkdir(PIPELINES_DIR, { recursive: true })
  await fsp.mkdir(EXECUTIONS_DIR, { recursive: true })
}

async function readJsonFile(filePath, fallback = null) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch (_error) {
    return fallback
  }
}

async function writeJsonFile(filePath, payload) {
  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8')
}

async function seedDefaultPipelineIfMissing() {
  const filePath = pipelineFilePath(DEFAULT_PIPELINE.id)
  const exists = await readJsonFile(filePath, null)
  if (!exists) {
    await writeJsonFile(filePath, {
      ...normalizePipeline(DEFAULT_PIPELINE),
      createdAt: nowIso()
    })
  }
}

async function loadPipeline(id) {
  const filePath = pipelineFilePath(id)
  const payload = await readJsonFile(filePath, null)
  if (!payload) return null
  return normalizePipeline(payload)
}

async function listPipelines() {
  await ensureDataDirs()
  await seedDefaultPipelineIfMissing()
  const files = await fsp.readdir(PIPELINES_DIR)
  const pipelines = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const payload = await readJsonFile(path.join(PIPELINES_DIR, file), null)
    if (!payload) continue
    pipelines.push(normalizePipeline(payload))
  }
  return pipelines.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
}

async function savePipeline(input) {
  await ensureDataDirs()
  const normalized = normalizePipeline(input)
  const existing = await readJsonFile(pipelineFilePath(normalized.id), null)
  const payload = {
    ...normalized,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso()
  }
  await writeJsonFile(pipelineFilePath(normalized.id), payload)
  return payload
}

async function deletePipeline(id) {
  await ensureDataDirs()
  await fsp.unlink(pipelineFilePath(id))
}

async function runStep(step, input, context) {
  switch (step.type) {
    case 'SourceProcessor':
      return [
        { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
        { id: 2, name: 'Bob', email: 'bob@example.com', active: false },
        { id: 3, name: 'Carol', email: 'carol@example.com', active: true }
      ]
    case 'ValidationProcessor': {
      if (!Array.isArray(input) || input.length === 0) {
        throw new Error('输入数据为空或格式错误')
      }
      const required = Array.isArray(step.config?.required) ? step.config.required : []
      for (const item of input) {
        for (const field of required) {
          if (item[field] == null || item[field] === '') {
            throw new Error(`字段缺失: ${field}`)
          }
        }
      }
      return input
    }
    case 'TransformProcessor':
      return Array.isArray(input)
        ? input.map((item) => ({
          user_id: item.id,
          full_name: item.name,
          email_address: item.email,
          active: Boolean(item.active)
        }))
        : []
    case 'FilterProcessor': {
      if (!Array.isArray(input)) return []
      const field = step.config?.field
      const equals = step.config?.equals
      return input.filter((item) => item?.[field] === equals)
    }
    case 'SummaryProcessor': {
      const rows = Array.isArray(input) ? input : []
      const count = rows.length
      const activeCount = rows.filter((item) => Boolean(item?.active)).length
      return {
        records: rows,
        metrics: {
          count,
          activeCount,
          activeRate: count > 0 ? Number((activeCount / count).toFixed(2)) : 0
        }
      }
    }
    case 'SinkProcessor':
      context.memoryStore.latestResult = input
      return {
        saved: true,
        sink: step.config?.sink || 'memory',
        writtenAt: nowIso(),
        payload: input
      }
    default:
      return input
  }
}

async function executePipeline(runState, pipeline, initialInput = null) {
  const context = { memoryStore: {} }
  let payload = initialInput
  runState.status = 'running'
  runState.logs.push(`[${nowIso()}] 开始执行: ${pipeline.name}`)

  for (const step of pipeline.processors) {
    runState.currentStepId = step.id
    runState.logs.push(`[${nowIso()}] 执行步骤: ${step.name}`)

    const startAt = Date.now()
    try {
      payload = await runStep(step, payload, context)
      const durationMs = Date.now() - startAt
      runState.stepResults.push({
        stepId: step.id,
        stepName: step.name,
        status: 'success',
        durationMs
      })
      runState.logs.push(`[${nowIso()}] 步骤成功: ${step.name} (${durationMs}ms)`)
    } catch (error) {
      const durationMs = Date.now() - startAt
      runState.stepResults.push({
        stepId: step.id,
        stepName: step.name,
        status: 'failed',
        durationMs,
        error: String(error?.message || '未知错误')
      })
      runState.status = 'failed'
      runState.error = String(error?.message || '执行失败')
      runState.logs.push(`[${nowIso()}] 步骤失败: ${step.name} - ${runState.error}`)
      throw error
    }
  }

  runState.output = payload
  runState.status = 'success'
  runState.logs.push(`[${nowIso()}] 执行完成`)
}

async function persistExecution(runState) {
  const record = {
    runId: runState.runId,
    pipelineId: runState.pipelineId,
    pipelineName: runState.pipelineName,
    status: runState.status,
    error: runState.error || '',
    output: runState.output,
    stepResults: runState.stepResults,
    logs: runState.logs.slice(-200),
    startedAt: runState.startedAt,
    finishedAt: nowIso()
  }
  await writeJsonFile(executionFilePath(runState.runId), record)
  return record
}

async function listExecutionsByPipelineId(pipelineId) {
  await ensureDataDirs()
  const files = await fsp.readdir(EXECUTIONS_DIR)
  const records = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const payload = await readJsonFile(path.join(EXECUTIONS_DIR, file), null)
    if (!payload || payload.pipelineId !== pipelineId) continue
    records.push(payload)
  }
  return records.sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')))
}

router.get('/processors', async (_req, res) => {
  res.json({
    processors: [
      { type: 'SourceProcessor', name: '数据源', category: '数据获取' },
      { type: 'ValidationProcessor', name: '数据验证', category: '数据处理' },
      { type: 'TransformProcessor', name: '数据转换', category: '数据处理' },
      { type: 'FilterProcessor', name: '数据过滤', category: '数据处理' },
      { type: 'SummaryProcessor', name: '统计汇总', category: '分析计算' },
      { type: 'SinkProcessor', name: '结果写入', category: '数据存储' }
    ]
  })
})

router.get('/pipelines', async (_req, res) => {
  try {
    const pipelines = await listPipelines()
    res.json({ pipelines })
  } catch (error) {
    res.status(500).json({ error: String(error?.message || '获取流水线失败') })
  }
})

router.get('/pipelines/:id', async (req, res) => {
  try {
    const pipeline = await loadPipeline(req.params.id)
    if (!pipeline) {
      return res.status(404).json({ error: '流水线不存在' })
    }
    res.json(pipeline)
  } catch (error) {
    res.status(500).json({ error: String(error?.message || '获取流水线失败') })
  }
})

router.post('/pipelines', async (req, res) => {
  try {
    const payload = isObject(req.body) ? req.body : {}
    if (!String(payload.name || '').trim()) {
      return res.status(400).json({ error: '流水线名称不能为空' })
    }
    const pipeline = await savePipeline(payload)
    res.status(201).json(pipeline)
  } catch (error) {
    res.status(500).json({ error: String(error?.message || '创建流水线失败') })
  }
})

router.put('/pipelines/:id', async (req, res) => {
  try {
    const payload = isObject(req.body) ? req.body : {}
    payload.id = req.params.id
    if (!String(payload.name || '').trim()) {
      return res.status(400).json({ error: '流水线名称不能为空' })
    }
    const pipeline = await savePipeline(payload)
    res.json(pipeline)
  } catch (error) {
    res.status(500).json({ error: String(error?.message || '更新流水线失败') })
  }
})

router.delete('/pipelines/:id', async (req, res) => {
  try {
    await deletePipeline(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: String(error?.message || '删除流水线失败') })
  }
})

router.post('/pipelines/:id/execute', async (req, res) => {
  try {
    const pipeline = await loadPipeline(req.params.id)
    if (!pipeline) {
      return res.status(404).json({ error: '流水线不存在' })
    }

    const runId = makeId('run')
    const runState = {
      runId,
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      status: 'queued',
      currentStepId: '',
      startedAt: nowIso(),
      stepResults: [],
      logs: [],
      output: null,
      error: ''
    }
    runningExecutions.set(runId, runState)

    res.json({
      runId,
      status: runState.status,
      statusUrl: `/api/streaming-engine/executions/${runId}`
    })

    const initialInput = req.body?.input ?? null
    Promise.resolve()
      .then(() => executePipeline(runState, pipeline, initialInput))
      .catch((error) => {
        runState.status = 'failed'
        runState.error = String(error?.message || '执行失败')
      })
      .finally(async () => {
        try {
          await persistExecution(runState)
        } catch (error) {
          console.error('[streaming-engine] 持久化执行记录失败:', error)
        } finally {
          runningExecutions.delete(runId)
        }
      })
  } catch (error) {
    res.status(500).json({ error: String(error?.message || '启动执行失败') })
  }
})

router.get('/executions/:runId', async (req, res) => {
  try {
    const running = runningExecutions.get(req.params.runId)
    if (running) {
      return res.json({
        runId: running.runId,
        pipelineId: running.pipelineId,
        pipelineName: running.pipelineName,
        status: running.status,
        currentStepId: running.currentStepId,
        startedAt: running.startedAt,
        stepResults: running.stepResults,
        logs: running.logs.slice(-120)
      })
    }

    const record = await readJsonFile(executionFilePath(req.params.runId), null)
    if (!record) {
      return res.status(404).json({ error: '执行记录不存在' })
    }
    res.json(record)
  } catch (error) {
    res.status(500).json({ error: String(error?.message || '获取执行状态失败') })
  }
})

router.get('/pipelines/:id/executions', async (req, res) => {
  try {
    const executions = await listExecutionsByPipelineId(req.params.id)
    res.json({ executions })
  } catch (error) {
    res.status(500).json({ error: String(error?.message || '获取执行历史失败') })
  }
})

ensureDataDirs()
  .then(() => seedDefaultPipelineIfMissing())
  .catch((error) => {
    console.error('[streaming-engine] 初始化数据目录失败:', error)
  })

export default router
