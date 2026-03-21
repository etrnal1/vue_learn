import { execFile } from 'child_process'

const cache = new Map() // pid(string) → { cpu, mem }

export function getProcessStats() { return cache }

export function refreshProcessStats() {
  execFile('ps', ['-eo', 'pid,%cpu,%mem', '-r'], { timeout: 3000 }, (err, stdout) => {
    if (err) return
    cache.clear()
    for (const line of stdout.trim().split('\n').slice(1)) {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 3) continue
      const [pid, cpu, mem] = parts
      if (pid && pid !== 'PID') cache.set(pid, { cpu: parseFloat(cpu) || 0, mem: parseFloat(mem) || 0 })
    }
  })
}
