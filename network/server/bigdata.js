// 大数据看板 — 业务指标模拟数据生成器
// 供 index.js 引入，随主 WS 推送一并下发

const SERIES_LEN = 60

const series = { requests: [], errors: [], users: [] }

let kpi = {
  totalUsers:  18_432_561,
  onlineUsers: 32_874,
  dau:         1_024_512,
  revenue:     5_892_330,
  orders:      24_781,
  avgResponse: 148,
}

const channels = [
  { name: '搜索引擎', value: 4521 },
  { name: '直接访问', value: 3210 },
  { name: '社交媒体', value: 2134 },
  { name: '付费广告', value: 1876 },
  { name: '外链引用', value:  987 },
]

const devices = [
  { name: '移动端', value: 58.2 },
  { name: '桌面端', value: 32.5 },
  { name: '平板',   value:  9.3 },
]

const regions = [
  { name: '华东', value: 6420 },
  { name: '华南', value: 4830 },
  { name: '华北', value: 3920 },
  { name: '华中', value: 2180 },
  { name: '西南', value: 1560 },
  { name: '其他', value:  980 },
]

let system = { cpu: 45, memory: 62, disk: 38, network: 71 }

const bdEvents = []
let eventId = 1

const EVENT_TYPES = [
  { type: 'order',  color: '#3fb950', icon: '🛒', templates: ['用户 #%id% 下单 ¥%price%', '%city%用户成交 ¥%price%'] },
  { type: 'user',   color: '#58a6ff', icon: '👤', templates: ['新用户 #%id% 注册', '用户 #%id% 完成认证'] },
  { type: 'alert',  color: '#f85149', icon: '⚠',  templates: ['接口 /api/%path% 超时', '错误率上升至 %rate%%'] },
  { type: 'pay',    color: '#d29922', icon: '💳', templates: ['支付成功 ¥%price%', '退款申请 ¥%price%'] },
  { type: 'system', color: '#bc8cff', icon: '⚙',  templates: ['服务 %svc% 重启', '任务 Job#%id% 完成'] },
]
const CITIES = ['北京','上海','广州','深圳','杭州','成都','武汉']
const PATHS  = ['users','orders','payment','search','cart']
const SVCS   = ['auth-svc','payment-gw','recommend','search-svc']

function ri(min, max)  { return Math.floor(Math.random() * (max - min + 1)) + min }
function rf(min, max)  { return +(Math.random() * (max - min) + min).toFixed(1) }
function fl(v, p = .05){ return Math.max(0, Math.round(v * (1 + (Math.random() - .5) * 2 * p))) }

function randomEvent() {
  const et  = EVENT_TYPES[ri(0, EVENT_TYPES.length - 1)]
  const tpl = et.templates[ri(0, et.templates.length - 1)]
  const msg = tpl
    .replace('%id%',   ri(10000, 99999))
    .replace('%price%',ri(29, 9999))
    .replace('%city%', CITIES[ri(0, CITIES.length - 1)])
    .replace('%path%', PATHS[ri(0, PATHS.length - 1)])
    .replace('%rate%', rf(0.1, 5.0))
    .replace('%svc%',  SVCS[ri(0, SVCS.length - 1)])
  const d = new Date()
  const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
  return { id: eventId++, type: et.type, color: et.color, icon: et.icon, msg, time }
}

// 预填历史
for (let i = 0; i < SERIES_LEN; i++) {
  series.requests.push(ri(800, 2400))
  series.errors.push(ri(0, 80))
  series.users.push(ri(28000, 38000))
}
for (let i = 0; i < 10; i++) bdEvents.push(randomEvent())

export function tickBigdata() {
  series.requests.push(ri(800, 2400)); if (series.requests.length > SERIES_LEN) series.requests.shift()
  series.errors.push(ri(0, 80));       if (series.errors.length   > SERIES_LEN) series.errors.shift()
  series.users.push(ri(28000, 38000)); if (series.users.length    > SERIES_LEN) series.users.shift()

  kpi = {
    totalUsers:   kpi.totalUsers + ri(0, 3),
    onlineUsers:  fl(kpi.onlineUsers, 0.03),
    dau:          fl(kpi.dau,         0.01),
    revenue:      kpi.revenue + ri(100, 2000),
    orders:       kpi.orders  + ri(0, 2),
    avgResponse:  Math.max(50, fl(kpi.avgResponse, 0.1)),
  }

  channels.forEach(c => { c.value = fl(c.value, 0.08) })

  const d = rf(-0.5, 0.5)
  devices[0].value = Math.min(70, Math.max(45, +(devices[0].value + d).toFixed(1)))
  devices[1].value = Math.min(45, Math.max(20, +(devices[1].value - d * .6).toFixed(1)))
  devices[2].value = +(100 - devices[0].value - devices[1].value).toFixed(1)

  regions.forEach(r => { r.value = fl(r.value, 0.06) })

  system = {
    cpu:     Math.min(99, Math.max(5,  fl(system.cpu,     0.08))),
    memory:  Math.min(99, Math.max(20, fl(system.memory,  0.04))),
    disk:    Math.min(99, Math.max(10, fl(system.disk,    0.02))),
    network: Math.min(99, Math.max(5,  fl(system.network, 0.1))),
  }

  if (Math.random() < 0.4) {
    bdEvents.unshift(randomEvent())
    if (Math.random() < 0.3) bdEvents.unshift(randomEvent())
    if (bdEvents.length > 100) bdEvents.length = 100
  }
}

export function getBigdataSnapshot() {
  return {
    kpi: { ...kpi },
    bdSeries:  { requests: [...series.requests], errors: [...series.errors], users: [...series.users] },
    channels:  channels.map(c => ({ ...c })),
    devices:   devices.map(d => ({ ...d })),
    regions:   regions.map(r => ({ ...r })),
    system:    { ...system },
    bdEvents:  bdEvents.slice(0, 30),
  }
}
