import { exec } from 'child_process'
import { promisify } from 'util'
import { lookupGeo } from './geo.js'

const execAsync = promisify(exec)

// 已知端口服务名映射
const PORT_NAMES = {
  80: 'HTTP', 443: 'HTTPS', 22: 'SSH', 21: 'FTP',
  25: 'SMTP', 53: 'DNS', 3306: 'MySQL', 5432: 'PG',
  6379: 'Redis', 8080: 'HTTP-ALT', 3000: 'Dev', 3001: 'Dev',
  27017: 'Mongo', 5672: 'AMQP', 9200: 'ES', 2181: 'ZK'
}

export async function getConnections() {
  try {
    // lsof -i: 网络连接, -n: 不解析主机名, -P: 不解析端口名
    const { stdout } = await execAsync('lsof -i -n -P 2>/dev/null')
    const { connections, listeners } = parseLsof(stdout)
    return {
      connections,
      listeners,
      stats: calcStats(connections),
      timestamp: Date.now()
    }
  } catch (err) {
    return { connections: [], listeners: [], stats: {}, timestamp: Date.now(), error: err.message }
  }
}

function parseLsof(output) {
  const lines = output.split('\n').slice(1) // 跳过表头
  const connections = []
  const listeners = []
  const seen = new Set()

  for (const line of lines) {
    if (!line.trim()) continue

    const parts = line.trim().split(/\s+/)
    if (parts.length < 9) continue

    const command = parts[0]
    const pid = parseInt(parts[1])
    const proto = parts[7] // TCP 或 UDP

    if (proto !== 'TCP' && proto !== 'UDP') continue

    // NAME 字段是第9列及之后
    const namePart = parts.slice(8).join(' ')

    // 解析状态: (ESTABLISHED), (LISTEN) 等
    const stateMatch = namePart.match(/\((\w+)\)$/)
    const state = stateMatch ? stateMatch[1] : (proto === 'UDP' ? 'UDP' : 'UNKNOWN')

    // 去掉状态括号
    const connStr = namePart.replace(/\s*\(\w+\)$/, '').trim()

    // 捕获 LISTEN 套接字（供链路检测使用）
    if (state === 'LISTEN' || !connStr.includes('->')) {
      const portMatch = connStr.match(/:(\d+)$/)
      if (portMatch) {
        const port = parseInt(portMatch[1])
        const lKey = `${command}-${port}`
        if (!seen.has(lKey)) {
          seen.add(lKey)
          listeners.push({ process: command, pid, proto, localPort: port })
        }
      }
      continue
    }

    const arrowIdx = connStr.indexOf('->')
    const localStr = connStr.substring(0, arrowIdx)
    const remoteStr = connStr.substring(arrowIdx + 2)

    // 支持 IPv6 地址: [::1]:port 或 普通 IP:port
    const parseAddr = (s) => {
      const m = s.match(/^(\[.+\]|[^:]+):(\d+)$/)
      return m ? { addr: m[1].replace(/[\[\]]/g, ''), port: parseInt(m[2]) } : null
    }

    const local = parseAddr(localStr)
    const remote = parseAddr(remoteStr)
    if (!local || !remote) continue

    // 跳过回环和 IPv6 链路本地地址
    if (remote.addr === '127.0.0.1' || remote.addr === '::1') continue
    if (remote.addr.startsWith('fe80') || local.addr.startsWith('fe80')) continue

    const dedupeKey = `${command}-${local.addr}:${local.port}-${remote.addr}:${remote.port}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const geo = lookupGeo(remote.addr)
    connections.push({
      id: dedupeKey,
      process: command,
      pid,
      proto,
      localAddr: local.addr,
      localPort: local.port,
      remoteAddr: remote.addr,
      remotePort: remote.port,
      remoteSvc: PORT_NAMES[remote.port] || '',
      state,
      geo  // { flag, countryZh, city, label, full, country, region }
    })
  }

  return { connections, listeners }
}

// calcStats 只统计出站连接
function calcStats(conns) {
  const byProto = {}
  const byProcess = {}
  const byState = {}

  for (const c of conns) {
    byProto[c.proto] = (byProto[c.proto] || 0) + 1
    byProcess[c.process] = (byProcess[c.process] || 0) + 1
    byState[c.state] = (byState[c.state] || 0) + 1
  }

  return {
    total: conns.length,
    established: conns.filter(c => c.state === 'ESTABLISHED').length,
    byProto,
    byProcess,
    byState
  }
}
