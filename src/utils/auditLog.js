const STORAGE_KEY = 'vue_learning_flow_audit_log'

function readStoredLog() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (error) {
    console.error('读取审计日志失败', error)
    return []
  }
}

function persistLog(entries) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-200)))
  } catch (error) {
    console.error('存储审计日志失败', error)
  }
}

export function recordAudit(entry) {
  const current = readStoredLog()
  const normalized = {
    timestamp: new Date().toISOString(),
    action: entry.action || 'unknown',
    detail: entry.detail || '',
    status: entry.status || 'success',
    flowId: entry.flowId || null
  }
  const updated = [...current, normalized]
  persistLog(updated)
}

export function readAuditLog() {
  return readStoredLog()
}
