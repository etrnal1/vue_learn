import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import { getConnections } from './netstat.js'
import { detectChains } from './chains.js'
import { resolveAsync, refreshFromSysCache, getCachedName } from './resolver.js'
import { fetchHomeGeo, getHomeGeo } from './geo.js'
import { recordSnapshot, getSnapshotMeta, getSnapshot, getCount } from './recorder.js'
import { refreshProcessStats, getProcessStats } from './process-stats.js'
import { updateHistory, enrichWithTime, getHistory, getTrend } from './history.js'
import { recordSample, getBandwidthHistory } from './bandwidth.js'
import { tickBigdata, getBigdataSnapshot } from './bigdata.js'

const app = express()
app.use(cors())
app.use(express.json())

const server = createServer(app)
const wss = new WebSocketServer({ server })

let prevSnapshot = new Map()

setInterval(refreshFromSysCache, 10_000)
refreshFromSysCache()
fetchHomeGeo()
setInterval(refreshProcessStats, 5000)
refreshProcessStats()
// bandwidth sampler is driven by push loop
// bigdata ticker (每秒与主循环同步)
setInterval(tickBigdata, 1000)

wss.on('connection', (ws) => {
  console.log('[ws] 客户端已连接')
  let active = true

  const push = async () => {
    if (!active || ws.readyState !== ws.OPEN) return
    try {
      const data = await getConnections()

      for (const c of data.connections) {
        if (c.remoteAddr) resolveAsync(c.remoteAddr)
      }

      // 附加域名
      const withDomain = data.connections.map(c => ({
        ...c,
        domain: getCachedName(c.remoteAddr) || null
      }))

      // 增量检测
      const currIds = new Set(withDomain.map(c => c.id))
      const newConns = withDomain.filter(c => !prevSnapshot.has(c.id))
      const closedConns = [...prevSnapshot.values()].filter(c => !currIds.has(c.id))
      prevSnapshot = new Map(withDomain.map(c => [c.id, c]))

      // 历史 + 时长
      updateHistory(withDomain, closedConns)
      const enrichedBase = enrichWithTime(withDomain)

      // 附加进程 CPU/内存
      const procStats = getProcessStats()
      const enriched = enrichedBase.map(c => {
        const ps = procStats.get(String(c.pid))
        return ps ? { ...c, cpu: ps.cpu, mem: ps.mem } : c
      })

      // 链路检测
      const chains = detectChains(enriched, data.listeners || [])

      recordSnapshot({ connections: enriched, chains, stats: data.stats, timestamp: data.timestamp })
      recordSample(enriched)

      ws.send(JSON.stringify({
        connections: enriched,
        listeners: data.listeners || [],
        chains,
        stats: data.stats,
        newConns,
        closedConns,
        history: getHistory(),
        trend: getTrend(),
        homeGeo: getHomeGeo(),
        snapshotCount: getCount(),
        bwHistory: getBandwidthHistory(),
        timestamp: data.timestamp,
        bigdata: getBigdataSnapshot(),
      }))
    } catch (err) {
      console.error('[ws] 推送错误:', err.message)
    }
  }

  push()
  const timer = setInterval(push, 2000)

  ws.on('close', () => { active = false; clearInterval(timer); console.log('[ws] 断开') })
  ws.on('error', (err) => { console.error('[ws]', err.message); active = false; clearInterval(timer) })
})

app.get('/api/connections', async (req, res) => {
  const data = await getConnections()
  res.json(data)
})

app.get('/api/replay/meta', (req, res) => res.json(getSnapshotMeta()))
app.get('/api/replay/:idx', (req, res) => {
  const snap = getSnapshot(req.params.idx)
  if (!snap) return res.status(404).json({ error: 'not found' })
  res.json(snap)
})

const PORT = 3100
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] 网络监控服务运行在 http://localhost:${PORT}`)
  console.log(`[server] WebSocket 端点: ws://localhost:${PORT}`)
})
