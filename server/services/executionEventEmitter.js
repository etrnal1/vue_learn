import { broadcastToRoom } from '../websocket.js'

/**
 * 执行事件类型
 */
export const ExecutionEvents = {
  STARTED: 'execution:started',
  STEP_STARTED: 'execution:step:started',
  STEP_COMPLETED: 'execution:step:completed',
  STEP_FAILED: 'execution:step:failed',
  COMPLETED: 'execution:completed',
  FAILED: 'execution:failed',
  CANCELLED: 'execution:cancelled',
  PROGRESS_UPDATED: 'execution:progress'
}

/**
 * 触发执行事件
 * @param {string} event - 事件类型
 * @param {object} data - 事件数据
 */
export function emitExecutionEvent(event, data) {
  const { executionId, ...payload } = data

  if (!executionId) {
    console.warn('[event] 缺少 executionId，跳过广播')
    return
  }

  const roomId = `execution:${executionId}`
  const message = {
    type: event,
    executionId,
    payload,
    timestamp: Date.now()
  }

  broadcastToRoom(roomId, message)
  console.log(`[event] 触发事件: ${event}, 执行ID: ${executionId}`)
}

/**
 * 辅助函数：执行启动
 */
export function notifyExecutionStarted(executionId, data) {
  emitExecutionEvent(ExecutionEvents.STARTED, {
    executionId,
    status: 'running',
    startedAt: data.startedAt || Date.now()
  })
}

/**
 * 辅助函数：步骤启动
 */
export function notifyStepStarted(executionId, stepId, data) {
  emitExecutionEvent(ExecutionEvents.STEP_STARTED, {
    executionId,
    stepId,
    stepName: data.stepName,
    startedAt: data.startedAt || Date.now()
  })
}

/**
 * 辅助函数：步骤完成
 */
export function notifyStepCompleted(executionId, stepId, data) {
  emitExecutionEvent(ExecutionEvents.STEP_COMPLETED, {
    executionId,
    stepId,
    stepName: data.stepName,
    status: data.status || 'completed',
    duration: data.duration,
    completedAt: data.completedAt || Date.now()
  })
}

/**
 * 辅助函数：执行完成
 */
export function notifyExecutionCompleted(executionId, data) {
  emitExecutionEvent(ExecutionEvents.COMPLETED, {
    executionId,
    status: 'completed',
    completedAt: data.completedAt || Date.now(),
    totalDuration: data.totalDuration
  })
}

/**
 * 辅助函数：执行失败
 */
export function notifyExecutionFailed(executionId, data) {
  emitExecutionEvent(ExecutionEvents.FAILED, {
    executionId,
    status: 'failed',
    error: data.error,
    failedAt: Date.now()
  })
}

/**
 * 辅助函数：进度更新
 */
export function notifyProgressUpdated(executionId, data) {
  emitExecutionEvent(ExecutionEvents.PROGRESS_UPDATED, {
    executionId,
    progress: data.progress, // 0-100
    currentStep: data.currentStep,
    totalSteps: data.totalSteps
  })
}
