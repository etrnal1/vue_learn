/**
 * 本机网卡信息：IP → 接口名 + 类型
 * 局域网设备：反查主机名 + ARP 获取 MAC
 */
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import dns from 'dns'

const execAsync = promisify(exec)
const dnsReverse = promisify(dns.reverse)

// 接口名 → 友好类型
function ifaceType(name) {
  if (name === 'lo0' || name === 'lo') return '回环'
  if (name.startsWith('en')) return name === 'en0' ? 'Wi-Fi/以太网' : '以太网'
  if (name.startsWith('utun') || name.startsWith('tun')) return 'VPN隧道'
  if (name.startsWith('ipsec')) return 'IPSec'
  if (name.startsWith('ppp')) return '拨号'
  if (name.startsWith('bridge')) return '桥接'
  if (name.startsWith('vmnet') || name.startsWith('vnic')) return '虚拟机'
  if (name.startsWith('awdl') || name.startsWith('llw')) return 'AirDrop'
  if (name.startsWith('gif') || name.startsWith('stf')) return '隧道'
  return '网络接口'
}

// 构建 localIP → { iface, type } 映射
export function buildIfaceMap() {
  const map = new Map() // ip → { iface, type }
  const ifaces = os.networkInterfaces()
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs) {
      map.set(addr.address, {
        iface: name,
        type: ifaceType(name),
        family: addr.family,
        mac: addr.mac
      })
    }
  }
  return map
}

// 读取 ARP 表（macOS/Linux）
let arpCache = new Map() // ip → { mac, iface }
let arpLastUpdate = 0

export async function refreshArp() {
  if (Date.now() - arpLastUpdate < 15_000) return arpCache
  try {
    const { stdout } = await execAsync('arp -an 2>/dev/null')
    const m = new Map()
    for (const line of stdout.split('\n')) {
      // macOS: ? (192.168.1.1) at 18:31:bf:xx:xx:xx on en0 ifscope [ethernet]
      const match = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+(\S+)\s+on\s+(\S+)/)
      if (match) {
        m.set(match[1], { mac: match[2], iface: match[3], type: ifaceType(match[3]) })
      }
    }
    arpCache = m
    arpLastUpdate = Date.now()
  } catch { /* ignore */ }
  return arpCache
}

// 局域网设备主机名缓存（mDNS + 反向DNS）
const hostCache = new Map() // ip → hostname
const hostPending = new Set()

export function getCachedHost(ip) {
  return hostCache.get(ip) || null
}

export function resolveHostAsync(ip) {
  if (hostCache.has(ip) || hostPending.has(ip)) return
  hostPending.add(ip)

  // 优先尝试 mDNS（macOS dns-sd）
  const timer = setTimeout(() => {
    // 超时回退到普通反向DNS
    dnsReverse(ip)
      .then(names => { hostCache.set(ip, names[0]) })
      .catch(() => { hostCache.set(ip, ip) })
      .finally(() => hostPending.delete(ip))
  }, 800)

  execAsync(`dns-sd -G v4 ${ip} 2>/dev/null`, { timeout: 700 })
    .then(({ stdout }) => {
      clearTimeout(timer)
      const m = stdout.match(/\s+(\S+\.local\.?)\s/)
      hostCache.set(ip, m ? m[1].replace(/\.$/, '') : ip)
      hostPending.delete(ip)
    })
    .catch(() => { /* 让 setTimeout 回退处理 */ })
}

// 获取本机主机名
export function getMyHostname() {
  return os.hostname()
}
