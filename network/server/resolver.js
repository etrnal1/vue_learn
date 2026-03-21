/**
 * DNS 反向解析缓存
 * 优先读取 macOS 系统 DNS 缓存（dscacheutil），再做 PTR 反查
 */
import { exec } from 'child_process'
import { promisify } from 'util'
import dns from 'dns'

const execAsync = promisify(exec)
const dnsReverse = promisify(dns.reverse)

// ip → hostname 缓存，5分钟过期
const cache = new Map() // ip → { name, ts }
const EXPIRE_MS = 5 * 60 * 1000
const PENDING = new Map() // ip → Promise，防止重复查询

export function getCachedName(ip) {
  const entry = cache.get(ip)
  if (entry && Date.now() - entry.ts < EXPIRE_MS) return entry.name
  return null
}

export function resolveAsync(ip) {
  if (cache.has(ip)) {
    const entry = cache.get(ip)
    if (Date.now() - entry.ts < EXPIRE_MS) return
  }
  if (PENDING.has(ip)) return

  const p = dnsReverse(ip)
    .then(names => {
      const name = names[0] || ip
      cache.set(ip, { name, ts: Date.now() })
    })
    .catch(() => {
      // 反查失败就缓存 ip 本身，避免反复查
      cache.set(ip, { name: ip, ts: Date.now() })
    })
    .finally(() => PENDING.delete(ip))

  PENDING.set(ip, p)
}

// 读取 macOS DNS 缓存，批量填充 cache（精度更高）
export async function refreshFromSysCache() {
  try {
    const { stdout } = await execAsync('dscacheutil -cachedump -entries Host 2>/dev/null')
    let currentName = null
    for (const line of stdout.split('\n')) {
      const nameMatch = line.match(/^\s*name:\s+(.+)$/)
      const ipMatch = line.match(/^\s+ip_address:\s+([\d.a-f:]+)$/)
      if (nameMatch) currentName = nameMatch[1].replace(/\.$/, '')
      if (ipMatch && currentName) {
        const ip = ipMatch[1]
        // 只填未缓存或已过期的
        const entry = cache.get(ip)
        if (!entry || Date.now() - entry.ts > EXPIRE_MS) {
          cache.set(ip, { name: currentName, ts: Date.now() })
        }
      }
    }
  } catch { /* ignore */ }
}

export function getCache() {
  return cache
}
