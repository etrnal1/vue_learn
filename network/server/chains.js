/**
 * 链路检测
 * 从 lsof 数据中检测：
 *   1. 代理链：  ProcessA → LocalProxy → RemoteServer
 *   2. 过境链：  RemoteDevice → ThisMachine → RemoteServer
 *   3. 直连：    Process → RemoteServer（无中间跳）
 */
import { getCachedName } from './resolver.js'
import { lookupGeo } from './geo.js'
import { buildIfaceMap, getCachedHost, resolveHostAsync, getMyHostname } from './iface.js'

const LOCAL_PREFIXES = ['192.168.', '10.', '172.16.', '172.17.', '172.18.',
  '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
  '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.']

function isLocalIP(ip) {
  return LOCAL_PREFIXES.some(p => ip.startsWith(p)) || ip === '127.0.0.1' || ip === '::1'
}
function isLoopback(ip) {
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost'
}
function domainFor(ip) {
  const name = getCachedName(ip)
  return (!name || name === ip) ? null : name.replace(/\.$/, '')
}

export function detectChains(connections, listeners) {
  const chains = []
  const seen = new Set()

  // 本机网卡映射（localIP → { iface, type }）
  const ifaceMap = buildIfaceMap()
  const myHostname = getMyHostname()

  // 监听端口 → 进程名
  const listenerMap = new Map()
  for (const l of listeners) listenerMap.set(l.localPort, l.process)

  // 进程 → 出站连接（外网）
  const procOutbound = new Map()
  for (const c of connections) {
    if (isLoopback(c.remoteAddr) || isLocalIP(c.remoteAddr)) continue
    if (!procOutbound.has(c.process)) procOutbound.set(c.process, [])
    procOutbound.get(c.process).push(c)
  }

  // ── 类型 1：代理链（Process → localhost → ProxyProcess → Remote）──
  for (const c of connections) {
    if (!isLoopback(c.remoteAddr)) continue
    const proxyProc = listenerMap.get(c.remotePort)
    if (!proxyProc) continue

    const outbounds = procOutbound.get(proxyProc) || []
    if (!outbounds.length) continue

    for (const out of outbounds) {
      const key = `${c.process}->${proxyProc}->${out.remoteAddr}:${out.remotePort}`
      if (seen.has(key)) continue
      seen.add(key)

      chains.push({
        type: 'proxy',
        id: key,
        source: buildLocalSource(c, ifaceMap, myHostname),
        via: { label: proxyProc, port: c.remotePort, kind: 'proxy' },
        dest: buildDest(out)
      })
    }
  }

  // ── 类型 2：过境流量（LAN Device → ThisMachine → Remote）──
  for (const c of connections) {
    if (!isLocalIP(c.remoteAddr) || isLoopback(c.remoteAddr)) continue
    // 触发局域网设备主机名异步解析
    resolveHostAsync(c.remoteAddr)
    const handlerProc = listenerMap.get(c.localPort) || c.process

    const outbounds = procOutbound.get(handlerProc) || []
    for (const out of outbounds) {
      const key = `TRANSIT-${c.remoteAddr}->${handlerProc}->${out.remoteAddr}:${out.remotePort}`
      if (seen.has(key)) continue
      seen.add(key)

      // 入口网卡信息（局域网设备连进来的端口）
      const inIface = ifaceMap.get(c.localAddr)

      chains.push({
        type: 'transit',
        id: key,
        source: {
          label: c.remoteAddr,
          kind: 'device',
          hostname: getCachedHost(c.remoteAddr),
          domain: domainFor(c.remoteAddr),
          // 流量从哪块网卡进来
          iface: inIface?.iface || null,
          ifaceType: inIface?.type || null
        },
        via: {
          label: handlerProc,
          port: c.localPort,
          kind: 'proxy',
          iface: inIface?.iface || null
        },
        dest: buildDest(out)
      })
    }
  }

  // ── 类型 3：直连（Process → Remote）──
  const proxySources = new Set(chains.map(ch => ch.source.label))

  for (const c of connections) {
    if (isLoopback(c.remoteAddr) || isLocalIP(c.remoteAddr)) continue
    if (proxySources.has(c.process)) continue

    const key = `DIRECT-${c.process}-${c.remoteAddr}:${c.remotePort}`
    if (seen.has(key)) continue
    seen.add(key)

    chains.push({
      type: 'direct',
      id: key,
      source: buildLocalSource(c, ifaceMap, myHostname),
      via: null,
      dest: buildDest(c)
    })
  }

  return chains
}

// 构建本机进程来源（含主机名 + 网卡）
function buildLocalSource(c, ifaceMap, myHostname) {
  const ifaceInfo = ifaceMap.get(c.localAddr)
  return {
    label: c.process,
    pid: c.pid,
    kind: 'process',
    hostname: myHostname,
    localAddr: c.localAddr,
    localPort: c.localPort,
    iface: ifaceInfo?.iface || null,
    ifaceType: ifaceInfo?.type || null
  }
}

function buildDest(c) {
  return {
    ip: c.remoteAddr,
    port: c.remotePort,
    domain: domainFor(c.remoteAddr),
    proto: c.proto,
    state: c.state,
    svc: c.remoteSvc,
    geo: c.geo || lookupGeo(c.remoteAddr)
  }
}

function getLocalAddresses(connections) {
  const addrs = new Set()
  for (const c of connections) {
    if (c.localAddr && !isLoopback(c.localAddr)) addrs.add(c.localAddr)
  }
  return addrs
}
