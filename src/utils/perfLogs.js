const PERF_LOG_KEY = 'app_perf_logs_v1'
const MAX_LOG_COUNT = 800

function safeParse(raw) {
  try {
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}

export function getPerfLogs() {
  try {
    const raw = localStorage.getItem(PERF_LOG_KEY)
    if (!raw) return []
    return safeParse(raw)
  } catch (error) {
    return []
  }
}

export function appendPerfLog(payload) {
  try {
    const logs = getPerfLogs()
    const item = {
      id: `log_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      timestamp: Date.now(),
      module: payload.module || 'unknown',
      action: payload.action || 'unknown',
      status: payload.status || 'ok',
      durationMs: Number.isFinite(payload.durationMs) ? Math.max(0, Math.round(payload.durationMs)) : null,
      name: payload.name || '',
      path: payload.path || '',
      detail: payload.detail || ''
    }

    logs.unshift(item)
    if (logs.length > MAX_LOG_COUNT) {
      logs.length = MAX_LOG_COUNT
    }
    localStorage.setItem(PERF_LOG_KEY, JSON.stringify(logs))
    return item
  } catch (error) {
    return null
  }
}

export function clearPerfLogs() {
  try {
    localStorage.removeItem(PERF_LOG_KEY)
  } catch (error) {
    // ignore storage errors
  }
}
