<template>
  <teleport to="body">
    <transition name="pd-slide">
      <div v-if="proc" class="pd-overlay" @click.self="$emit('close')">
        <div class="pd-panel">
          <!-- 标题栏 -->
          <div class="pd-header">
            <div class="pd-title">
              <span class="pd-icon">⚙</span>
              <span class="pd-name">{{ proc }}</span>
              <span class="pd-pid" v-if="pids.length">PID {{ pids.join(', ') }}</span>
            </div>
            <button class="pd-close" @click="$emit('close')">✕</button>
          </div>

          <!-- 概览数字 -->
          <div class="pd-stats">
            <div class="pd-stat">
              <span class="pd-stat-val" style="color:var(--cyan)">{{ activeConns.length }}</span>
              <span class="pd-stat-lbl">活跃连接</span>
            </div>
            <div class="pd-stat">
              <span class="pd-stat-val" style="color:var(--green)">{{ establishedCount }}</span>
              <span class="pd-stat-lbl">已建立</span>
            </div>
            <div class="pd-stat">
              <span class="pd-stat-val" style="color:var(--purple)">{{ uniqueRemotes }}</span>
              <span class="pd-stat-lbl">目标 IP</span>
            </div>
            <div class="pd-stat">
              <span class="pd-stat-val" style="color:var(--orange)">{{ countryCount }}</span>
              <span class="pd-stat-lbl">国家</span>
            </div>
          </div>

          <!-- 协议分布 -->
          <div class="pd-section">
            <div class="pd-sec-title">协议分布</div>
            <div class="pd-proto-bars">
              <div v-for="(p, k) in protoMap" :key="k" class="pd-proto-row">
                <span class="pd-proto-name">{{ k }}</span>
                <div class="pd-bar-bg">
                  <div class="pd-bar-fill" :style="{ width: (p / activeConns.length * 100) + '%' }"></div>
                </div>
                <span class="pd-proto-count">{{ p }}</span>
              </div>
            </div>
          </div>

          <!-- 目标国家分布 -->
          <div class="pd-section" v-if="countryList.length">
            <div class="pd-sec-title">目标属地 Top 5</div>
            <div class="pd-country-list">
              <div v-for="c in countryList.slice(0,5)" :key="c.code" class="pd-country-row">
                <span class="pd-flag">{{ c.flag }}</span>
                <span class="pd-country-name">{{ c.name }}</span>
                <div class="pd-bar-bg">
                  <div class="pd-bar-fill country" :style="{ width: (c.count / countryList[0].count * 100) + '%' }"></div>
                </div>
                <span class="pd-country-count">{{ c.count }}</span>
              </div>
            </div>
          </div>

          <!-- 活跃连接列表 -->
          <div class="pd-section pd-conns">
            <div class="pd-sec-title">活跃连接（{{ activeConns.length }}）</div>
            <div class="pd-conn-list">
              <div v-for="c in activeConns.slice(0, 50)" :key="c.id" class="pd-conn-row">
                <span class="pd-conn-state" :class="c.state?.toLowerCase()">{{ c.state }}</span>
                <span class="pd-conn-proto">{{ c.proto }}</span>
                <span class="pd-conn-remote">
                  <span v-if="c.geo?.flag">{{ c.geo.flag }}</span>
                  {{ c.domain || c.remoteAddr }}
                  <span class="pd-conn-port">:{{ c.remotePort }}</span>
                </span>
                <span class="pd-conn-dur" v-if="c.duration">{{ fmtDur(c.duration) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { defineComponent, computed } from 'vue'

function fmtDur(ms) {
  if (!ms) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s/60)}m${s%60}s`
  return `${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m`
}

export default defineComponent({
  name: 'ProcessDetail',
  emits: ['close'],
  props: {
    proc:        { type: String, default: null },
    connections: { type: Array,  default: () => [] },
    history:     { type: Array,  default: () => [] },
  },
  setup(props) {
    const activeConns = computed(() =>
      props.connections.filter(c => c.process === props.proc)
    )

    const pids = computed(() =>
      [...new Set(activeConns.value.map(c => c.pid).filter(Boolean))]
    )

    const establishedCount = computed(() =>
      activeConns.value.filter(c => c.state === 'ESTABLISHED').length
    )

    const uniqueRemotes = computed(() =>
      new Set(activeConns.value.map(c => c.remoteAddr).filter(Boolean)).size
    )

    // 协议分布
    const protoMap = computed(() => {
      const m = {}
      for (const c of activeConns.value) {
        const k = c.proto || 'TCP'
        m[k] = (m[k] || 0) + 1
      }
      return m
    })

    // 国家分布
    const countryList = computed(() => {
      const m = new Map()
      for (const c of activeConns.value) {
        if (!c.geo?.country) continue
        const key = c.geo.country
        if (!m.has(key)) m.set(key, { code: key, flag: c.geo.flag || '', name: c.geo.countryZh || key, count: 0 })
        m.get(key).count++
      }
      return [...m.values()].sort((a, b) => b.count - a.count)
    })

    const countryCount = computed(() => countryList.value.length)

    return { activeConns, pids, establishedCount, uniqueRemotes, protoMap, countryList, countryCount, fmtDur }
  }
})
</script>

<style scoped>
.pd-overlay {
  position: fixed; inset: 0; z-index: 5000;
  background: #00000066;
  display: flex; justify-content: flex-end;
}
.pd-panel {
  width: 420px; max-width: 100vw;
  background: #0d1117; border-left: 1px solid var(--border);
  display: flex; flex-direction: column;
  overflow: hidden; height: 100%;
}

/* 标题 */
.pd-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--border);
  background: var(--card); flex-shrink: 0;
}
.pd-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.pd-icon  { font-size: 16px; flex-shrink: 0; }
.pd-name  { font-size: 14px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pd-pid   { font-size: 10px; color: var(--text2); background: #1c2333; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; }
.pd-close {
  background: none; border: none; color: var(--text2);
  font-size: 16px; cursor: pointer; padding: 4px; flex-shrink: 0;
  line-height: 1; border-radius: 4px;
}
.pd-close:hover { background: #ff000033; color: #f85149; }

/* 概览数字 */
.pd-stats {
  display: flex; justify-content: space-around;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.pd-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.pd-stat-val { font-size: 20px; font-weight: 700; line-height: 1; }
.pd-stat-lbl { font-size: 10px; color: var(--text2); }

/* 区块 */
.pd-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.pd-conns { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.pd-sec-title { font-size: 11px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }

/* 协议条形 */
.pd-proto-bars { display: flex; flex-direction: column; gap: 4px; }
.pd-proto-row  { display: flex; align-items: center; gap: 8px; }
.pd-proto-name { width: 40px; font-size: 11px; color: var(--text); text-align: right; flex-shrink: 0; }
.pd-proto-count{ width: 28px; font-size: 11px; color: var(--cyan); text-align: right; flex-shrink: 0; }

/* 国家 */
.pd-country-list { display: flex; flex-direction: column; gap: 4px; }
.pd-country-row  { display: flex; align-items: center; gap: 8px; }
.pd-flag         { width: 20px; text-align: center; flex-shrink: 0; }
.pd-country-name { width: 70px; font-size: 11px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
.pd-country-count{ width: 28px; font-size: 11px; color: var(--cyan); text-align: right; flex-shrink: 0; }

/* 进度条 */
.pd-bar-bg   { flex: 1; height: 6px; background: #1c2333; border-radius: 3px; overflow: hidden; }
.pd-bar-fill { height: 100%; background: var(--cyan); border-radius: 3px; transition: width 0.3s; }
.pd-bar-fill.country { background: #3fb950; }

/* 连接列表 */
.pd-conn-list {
  flex: 1; overflow-y: auto;
  font-size: 11px; font-family: monospace;
}
.pd-conn-row {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 0; border-bottom: 1px solid #1c2333;
}
.pd-conn-state {
  width: 80px; flex-shrink: 0;
  font-size: 9px; font-weight: 700; padding: 1px 4px;
  border-radius: 3px; text-align: center;
  background: #1c2333; color: #8b949e;
}
.pd-conn-state.established { background: #1a3a1a; color: var(--green); }
.pd-conn-state.listen      { background: #1e3050; color: var(--cyan); }
.pd-conn-state.time_wait   { background: #3a1e1a; color: var(--orange); }
.pd-conn-proto { width: 30px; flex-shrink: 0; color: var(--purple); font-size: 9px; font-weight: 700; }
.pd-conn-remote { flex: 1; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pd-conn-port   { color: var(--text2); }
.pd-conn-dur    { color: var(--text2); flex-shrink: 0; }

/* 动画 */
.pd-slide-enter-active { transition: transform 0.25s ease, opacity 0.25s; }
.pd-slide-leave-active { transition: transform 0.2s ease, opacity 0.2s; }
.pd-slide-enter-from   { transform: translateX(100%); opacity: 0; }
.pd-slide-leave-to     { transform: translateX(100%); opacity: 0; }
</style>
