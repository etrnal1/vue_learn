/**
 * bandwidth.js — 进程级连接活跃度趋势
 * 由于 netstat/sysctl 在沙箱中不可用，改为统计每个进程的实时连接数历史。
 * 每次 server 推送时调用 recordSample(connections)，即可积累每进程的连接数时序。
 */

const HISTORY_POINTS = 60    // 保留 60 个采样点（约 2 分钟）
const procHistory = new Map() // procName → [{t, conns}]

/**
 * 从当前 connections 列表中计算每个进程的连接数，记录一个时间点。
 * server/index.js 每次推送前调用此函数。
 */
export function recordSample(connections) {
  const now = Date.now()
  // 统计每进程的 ESTABLISHED 连接数
  const counts = new Map()
  for (const c of connections) {
    if (!c.process) continue
    const key = c.process
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  for (const [proc, conns] of counts.entries()) {
    if (!procHistory.has(proc)) procHistory.set(proc, [])
    const arr = procHistory.get(proc)
    arr.push({ t: now, conns })
    if (arr.length > HISTORY_POINTS) arr.shift()
  }
}

/**
 * 返回最近有连接活动的进程历史（用于前端折线图）
 */
export function getBandwidthHistory() {
  const now = Date.now()
  const result = {}
  for (const [proc, pts] of procHistory.entries()) {
    const recent = pts.filter(p => now - p.t < 60_000)
    if (!recent.length) continue
    if (!recent.some(p => p.conns > 0)) continue
    result[proc] = pts.slice(-HISTORY_POINTS)
  }
  return result
}
