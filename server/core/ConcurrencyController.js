/**
 * 并发控制器
 * 管理流水线中的并发执行
 */
export class ConcurrencyController {
  constructor(maxConcurrency = 5) {
    this.maxConcurrency = maxConcurrency
    this.runningTasks = new Set()
    this.pendingTasks = []
    this.slotAvailablePromise = null
    this.slotAvailableResolve = null
  }

  /**
   * 调度任务执行
   * @param {Object} task - 任务对象
   * @param {Array} dependencies - 依赖任务 Promise 数组
   * @returns {Promise<*>} 任务执行结果
   */
  async schedule(task, dependencies = []) {
    const taskId = task.id || `task_${Date.now()}_${Math.random()}`

    try {
      // 1. 等待所有依赖任务完成
      if (dependencies.length > 0) {
        await Promise.all(dependencies)
      }

      // 2. 等待空闲槽位
      while (this.runningTasks.size >= this.maxConcurrency) {
        await this.waitForSlot()
      }

      // 3. 标记任务为运行中
      this.runningTasks.add(taskId)

      console.log(`[ConcurrencyController] Task ${taskId} started (${this.runningTasks.size}/${this.maxConcurrency})`)

      // 4. 执行任务
      const result = await task.execute()

      return result
    } finally {
      // 5. 清理任务
      this.runningTasks.delete(taskId)

      console.log(`[ConcurrencyController] Task ${taskId} completed (${this.runningTasks.size}/${this.maxConcurrency})`)

      // 6. 通知有槽位可用
      this.notifySlotAvailable()
    }
  }

  /**
   * 等待空闲槽位
   */
  async waitForSlot() {
    if (!this.slotAvailablePromise) {
      this.slotAvailablePromise = new Promise(resolve => {
        this.slotAvailableResolve = resolve
      })
    }

    await this.slotAvailablePromise
  }

  /**
   * 通知有槽位可用
   */
  notifySlotAvailable() {
    if (this.slotAvailableResolve) {
      this.slotAvailableResolve()
      this.slotAvailablePromise = null
      this.slotAvailableResolve = null
    }
  }

  /**
   * 批量调度任务
   * @param {Array} tasks - 任务数组
   * @param {Map} dependencyGraph - 依赖图 Map<taskId, dependencyIds[]>
   * @returns {Promise<Map>} 执行结果 Map
   */
  async scheduleBatch(tasks, dependencyGraph = new Map()) {
    const results = new Map()
    const taskPromises = new Map()

    // 为每个任务创建 Promise
    tasks.forEach(task => {
      const taskId = task.id || `task_${Date.now()}_${Math.random()}`

      // 获取依赖任务的 Promise
      const dependencyIds = dependencyGraph.get(taskId) || []
      const dependencies = dependencyIds
        .map(depId => taskPromises.get(depId))
        .filter(Boolean)

      // 调度任务
      const taskPromise = this.schedule(task, dependencies)
        .then(result => {
          results.set(taskId, { status: 'success', result })
          return result
        })
        .catch(error => {
          results.set(taskId, { status: 'error', error })
          throw error
        })

      taskPromises.set(taskId, taskPromise)
    })

    // 等待所有任务完成
    await Promise.allSettled(Array.from(taskPromises.values()))

    return results
  }

  /**
   * 获取当前运行状态
   */
  getStatus() {
    return {
      maxConcurrency: this.maxConcurrency,
      runningTasks: this.runningTasks.size,
      pendingTasks: this.pendingTasks.length,
      availableSlots: this.maxConcurrency - this.runningTasks.size
    }
  }

  /**
   * 调整最大并发数
   */
  setMaxConcurrency(max) {
    this.maxConcurrency = max
    console.log(`[ConcurrencyController] Max concurrency set to ${max}`)

    // 如果增加了并发数，通知等待的任务
    if (this.runningTasks.size < this.maxConcurrency) {
      this.notifySlotAvailable()
    }
  }

  /**
   * 清空所有任务
   */
  clear() {
    this.runningTasks.clear()
    this.pendingTasks = []
    this.notifySlotAvailable()
  }
}

export default ConcurrencyController
