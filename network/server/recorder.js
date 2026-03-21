/**
 * 连接快照录制器
 * 每次 push 时记录精简快照，最多保留 450 帧（约 15 分钟 @ 2s/帧）
 */
const snapshots = []
const MAX = 450

export function recordSnapshot({ connections, chains, stats, timestamp }) {
  const slim = connections.map(c => ({
    id: c.id, process: c.process, pid: c.pid, proto: c.proto,
    localAddr: c.localAddr, localPort: c.localPort,
    remoteAddr: c.remoteAddr, remotePort: c.remotePort,
    state: c.state, duration: c.duration, remoteSvc: c.remoteSvc,
    domain: c.domain, cpu: c.cpu, mem: c.mem,
    geo: c.geo ? { ll: c.geo.ll, countryZh: c.geo.countryZh, flag: c.geo.flag, country: c.geo.country, city: c.geo.city } : null
  }))
  snapshots.push({ t: timestamp || Date.now(), connections: slim, chains, stats })
  if (snapshots.length > MAX) snapshots.shift()
}

export function getSnapshotMeta() {
  return snapshots.map((s, i) => ({ i, t: s.t, n: s.connections.length }))
}

export function getSnapshot(idx) {
  const i = Number(idx)
  if (i < 0 || i >= snapshots.length) return null
  return snapshots[i]
}

export function getCount() { return snapshots.length }
