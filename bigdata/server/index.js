import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'

const app = express()
app.use(cors())
const server = createServer(app)
const wss = new WebSocketServer({ server })

// ─── 状态维护 ────────────────────────────────────────────────
const SERIES_LEN = 60 // 保留60秒数据

// 滚动时序数据
const series = {
  timestamps: [],
  requests: [],
  errors:   [],
  users:    [],
}

// KPI 基准值
let kpi = {
  totalUsers:    18_432_561,
  onlineUsers:   32_874,
  dau:           1_024_512,
  revenue:       5_892_330,
  orders:        24_781,
  avgResponse:   148,
}

// 渠道流量
const channels = [
  { name: '搜索引擎', value: 4521 },
  { name: '直接访问', value: 3210 },
  { name: '社交媒体', value: 2134 },
  { name: '付费广告', value: 1876 },
  { name: '外链引用', value:  987 },
]

// 设备分布
const devices = [
  { name: '移动端', value: 58.2 },
  { name: '桌面端', value: 32.5 },
  { name: '平   板', value:  9.3 },
]

// 地区分布
const regions = [
  { name: '华东', value: 6420 },
  { name: '华南', value: 4830 },
  { name: '华北', value: 3920 },
  { name: '华中', value: 2180 },
  { name: '西南', value: 1560 },
  { name: '其他', value:  980 },
]

// 系统指标
let system = { cpu: 45, memory: 62, disk: 38, network: 71 }

// 事件队列
const events = []
let eventId = 1

const EVENT_TYPES = [
  { type: 'order',  color: '#00e676', icon: '🛒', templates: ['用户 #%id% 下单 ¥%price%', '新订单 #%id% 来自%city%', '%city%用户成交 ¥%price%'] },
  { type: 'user',   color: '#00d4ff', icon: '👤', templates: ['新用户 #%id% 注册', '用户 #%id% 完成实名认证', '高价值用户 #%id% 登录'] },
  { type: 'alert',  color: '#ff4444', icon: '⚠',  templates: ['接口 /api/%path% 响应超时', '服务器 node-%n% CPU 告警', '错误率上升至 %rate%%'] },
  { type: 'pay',    color: '#ff9800', icon: '💳', templates: ['支付成功 ¥%price%', '退款申请 ¥%price%', '对账完成，差异 ¥%diff%'] },
  { type: 'system', color: '#bd7dff', icon: '⚙',  templates: ['服务 %svc% 自动重启', '缓存命中率 %rate%%', '任务调度 Job#%id% 完成'] },
]
const CITIES = ['北京','上海','广州','深圳','杭州','成都','武汉','南京','西安','重庆']
const PATHS  = ['users','orders','payment','search','recommend','cart']
const SVCS   = ['auth-service','payment-gw','recommend-engine','search-svc']

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min, max, dec = 1) { return +(Math.random() * (max - min) + min).toFixed(dec) }
function fluctuate(v, pct = 0.05) { return Math.max(0, Math.round(v * (1 + (Math.random() - 0.5) * 2 * pct))) }

function randomEvent() {
  const et = EVENT_TYPES[randInt(0, EVENT_TYPES.length - 1)]
  const tpl = et.templates[randInt(0, et.templates.length - 1)]
  const msg = tpl
    .replace('%id%',    randInt(10000, 99999))
    .replace('%price%', randInt(29, 9999))
    .replace('%city%',  CITIES[randInt(0, CITIES.length - 1)])
    .replace('%path%',  PATHS[randInt(0, PATHS.length - 1)])
    .replace('%n%',     randInt(1, 8))
    .replace('%rate%',  randFloat(0.1, 5.0))
    .replace('%diff%',  randInt(1, 200))
    .replace('%svc%',   SVCS[randInt(0, SVCS.length - 1)])
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
  return { id: eventId++, type: et.type, color: et.color, icon: et.icon, msg, time }
}

// ─── 周期更新（每秒）────────────────────────────────────────
function tick() {
  const now = Date.now()

  // 时序
  series.timestamps.push(now)
  series.requests.push(randInt(800, 2400))
  series.errors.push(randInt(0, 80))
  series.users.push(randInt(28000, 38000))
  if (series.timestamps.length > SERIES_LEN) {
    series.timestamps.shift()
    series.requests.shift()
    series.errors.shift()
    series.users.shift()
  }

  // KPI 微小波动
  kpi = {
    totalUsers:   kpi.totalUsers + randInt(0, 3),
    onlineUsers:  fluctuate(kpi.onlineUsers, 0.03),
    dau:          fluctuate(kpi.dau, 0.01),
    revenue:      kpi.revenue + randInt(100, 2000),
    orders:       kpi.orders + randInt(0, 2),
    avgResponse:  Math.max(50, fluctuate(kpi.avgResponse, 0.1)),
  }

  // 渠道波动
  channels.forEach(c => { c.value = fluctuate(c.value, 0.08) })

  // 设备分布微调（保持总和100）
  const delta = randFloat(-0.5, 0.5)
  devices[0].value = Math.min(70, Math.max(45, +(devices[0].value + delta).toFixed(1)))
  devices[1].value = Math.min(45, Math.max(20, +(devices[1].value - delta * 0.6).toFixed(1)))
  devices[2].value = +(100 - devices[0].value - devices[1].value).toFixed(1)

  // 地区波动
  regions.forEach(r => { r.value = fluctuate(r.value, 0.06) })

  // 系统指标
  system = {
    cpu:     Math.min(99, Math.max(5,  fluctuate(system.cpu,     0.08))),
    memory:  Math.min(99, Math.max(20, fluctuate(system.memory,  0.04))),
    disk:    Math.min(99, Math.max(10, fluctuate(system.disk,    0.02))),
    network: Math.min(99, Math.max(5,  fluctuate(system.network, 0.1))),
  }

  // 随机事件（约40%概率每秒触发1-2个）
  if (Math.random() < 0.4) {
    events.unshift(randomEvent())
    if (Math.random() < 0.3) events.unshift(randomEvent())
  }
  if (events.length > 100) events.length = 100

  // 推送给所有客户端
  const payload = JSON.stringify({
    kpi,
    series: { ...series },
    channels: [...channels],
    devices:  [...devices],
    regions:  [...regions],
    system:   { ...system },
    events:   events.slice(0, 30),
    timestamp: now,
  })

  wss.clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(payload)
  })
}

// 预填60秒历史数据
for (let i = 0; i < SERIES_LEN; i++) {
  const t = Date.now() - (SERIES_LEN - i) * 1000
  series.timestamps.push(t)
  series.requests.push(randInt(800, 2400))
  series.errors.push(randInt(0, 80))
  series.users.push(randInt(28000, 38000))
}
// 预生成10条事件
for (let i = 0; i < 10; i++) events.push(randomEvent())

setInterval(tick, 1000)

// ─── WebSocket ───────────────────────────────────────────────
wss.on('connection', ws => {
  console.log('[ws] 客户端连接')
  // 立即推送当前快照
  ws.send(JSON.stringify({
    kpi, series: { ...series },
    channels: [...channels], devices: [...devices],
    regions: [...regions], system: { ...system },
    events: events.slice(0, 30), timestamp: Date.now(),
  }))
  ws.on('close', () => console.log('[ws] 客户端断开'))
})

// ─── HTTP API ────────────────────────────────────────────────
app.get('/api/snapshot', (_, res) => res.json({
  kpi, channels, devices, regions, system, events: events.slice(0, 20)
}))

const PORT = 3200
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[bigdata] 服务运行在 http://localhost:${PORT}`)
  console.log(`[bigdata] WebSocket: ws://localhost:${PORT}`)
})
