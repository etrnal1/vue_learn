/**
 * 连接历史追踪
 * - 记录每条连接的首次出现时间
 * - 保留已关闭的连接（最近 300 条）
 * - 统计每 2 秒的连接数快照（用于趋势图）
 */

const firstSeen = new Map()   // id → timestamp
const closedHistory = []       // 最近关闭的连接
const MAX_HISTORY = 300

// 趋势数据：每 2 秒一个点，保留 60 个（约 2 分钟）
const trend = []
const MAX_TREND = 60

export function updateHistory(currentConns, closedConns) {
  const now = Date.now()

  // 记录新连接的首次出现时间
  for (const c of currentConns) {
    if (!firstSeen.has(c.id)) firstSeen.set(c.id, now)
  }

  // 把关闭的连接加入历史
  for (const c of closedConns) {
    const seenAt = firstSeen.get(c.id) || now
    firstSeen.delete(c.id)
    closedHistory.unshift({
      ...c,
      firstSeen: seenAt,
      closedAt: now,
      duration: now - seenAt
    })
  }
  // 只保留最近 MAX_HISTORY 条
  if (closedHistory.length > MAX_HISTORY) closedHistory.length = MAX_HISTORY

  // 记录趋势点
  trend.push({ t: now, count: currentConns.length })
  if (trend.length > MAX_TREND) trend.shift()
}

export function enrichWithTime(conns) {
  const now = Date.now()
  return conns.map(c => ({
    ...c,
    firstSeen: firstSeen.get(c.id) || now,
    duration: now - (firstSeen.get(c.id) || now)
  }))
}

export function getHistory() { return closedHistory.slice(0, 100) }
export function getTrend() { return trend.slice() }
