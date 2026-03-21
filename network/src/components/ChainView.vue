<template>
  <div class="chain-wrap">
    <!-- 工具栏 -->
    <div class="chain-toolbar">
      <input v-model="search" class="search-input" placeholder="搜索进程 / 域名 / IP…" />
      <div class="filter-btns">
        <button
          v-for="f in filters"
          :key="f.id"
          :class="['filter-btn', { active: activeFilter === f.id }]"
          @click="activeFilter = f.id"
        >
          <span class="filter-dot" :class="f.id" />{{ f.label }}
          <span class="filter-count">{{ countByType[f.id] || 0 }}</span>
        </button>
      </div>
      <label class="toolbar-item">
        <input type="checkbox" v-model="groupBySource" />
        按来源分组
      </label>
      <span class="total-badge">{{ displayed.length }} 条链路</span>
    </div>

    <!-- 链路列表 -->
    <div class="chain-list">
      <!-- 分组模式 -->
      <template v-if="groupBySource">
        <div v-for="(group, src) in grouped" :key="src" class="chain-group">
          <div class="group-header" @click="toggleGroup(src)">
            <span class="group-arrow">{{ collapsedGroups.has(src) ? '▶' : '▼' }}</span>
            <span class="group-src-icon">{{ group[0]?.source.kind === 'device' ? '🖥' : '⚙' }}</span>
            <span class="group-src">{{ src }}</span>
            <span class="group-count">{{ group.length }} 条</span>
          </div>
          <template v-if="!collapsedGroups.has(src)">
            <div
              v-for="chain in group"
              :key="chain.id"
              :class="['chain-row', chain.type, { 'is-new': newChainIds.has(chain.id), expanded: expandedIds.has(chain.id) }]"
              @click="toggleExpand(chain.id)"
            >
              <div class="chain-main">
                <span :class="['type-badge', chain.type]">{{ typeLabel(chain.type) }}</span>
                <div class="chain-node source">
                  <span>{{ chain.source.kind === 'device' ? '🖥' : '⚙' }}</span>
                  <div class="source-labels">
                    <span class="node-label">{{ chain.source.label }}</span>
                    <span v-if="chain.source.hostname" class="source-host">{{ chain.source.hostname }}</span>
                  </div>
                  <span v-if="chain.source.iface" class="iface-badge" :title="chain.source.ifaceType">{{ chain.source.iface }}</span>
                </div>
                <div class="chain-arrow"><div class="arrow-line" /><span class="arrow-head">▶</span></div>
                <template v-if="chain.via">
                  <div class="chain-node via">
                    <span>🔀</span>
                    <span class="node-label">{{ chain.via.label }}</span>
                  </div>
                  <div class="chain-arrow"><div class="arrow-line" /><span class="arrow-head">▶</span></div>
                </template>
                <div class="chain-node dest">
                  <span>🌐</span>
                  <div class="dest-labels">
                    <span class="dest-domain">{{ destLabel(chain.dest) }}</span>
                    <span v-if="chain.dest.domain && chain.dest.domain !== chain.dest.ip" class="dest-ip">{{ chain.dest.ip }}</span>
                  </div>
                  <span class="dest-port">:{{ chain.dest.port }}</span>
                </div>
                <div class="chain-meta">
                  <span v-if="chain.dest.geo?.flag" class="geo-flag" :title="chain.dest.geo.full">
                    {{ chain.dest.geo.flag }}
                  </span>
                  <span v-if="chain.dest.geo?.countryZh" class="geo-label">{{ chain.dest.geo.countryZh }}</span>
                  <span v-if="svcLabel(chain.dest)" class="svc-badge">{{ svcLabel(chain.dest) }}</span>
                  <span :class="['state-dot', chain.dest.state === 'ESTABLISHED' ? 'ok' : 'other']" />
                </div>
              </div>
              <div v-if="expandedIds.has(chain.id)" class="chain-detail">
                <div class="detail-row"><span class="dk">来源类型</span><span class="dv">{{ chain.source.kind === 'device' ? '局域网设备' : '本机进程' }}</span></div>
                <div v-if="chain.source.hostname" class="detail-row"><span class="dk">主机名</span><span class="dv highlight">{{ chain.source.hostname }}</span></div>
                <div v-if="chain.source.localAddr" class="detail-row"><span class="dk">本机地址</span><span class="dv">{{ chain.source.localAddr }}:{{ chain.source.localPort }}</span></div>
                <div v-if="chain.source.iface" class="detail-row"><span class="dk">网卡</span><span class="dv">{{ chain.source.iface }} <span class="iface-type">{{ chain.source.ifaceType }}</span></span></div>
                <div v-if="chain.via" class="detail-row"><span class="dk">代理进程</span><span class="dv">{{ chain.via.label }} 监听端口 :{{ chain.via.port }}</span></div>
                <div class="detail-row"><span class="dk">目标 IP</span><span class="dv">{{ chain.dest.ip }}</span></div>
                <div v-if="chain.dest.domain && chain.dest.domain !== chain.dest.ip" class="detail-row"><span class="dk">域名</span><span class="dv highlight">{{ chain.dest.domain }}</span></div>
                <div v-if="chain.dest.geo?.full" class="detail-row"><span class="dk">属地</span><span class="dv">{{ chain.dest.geo.full }}<span v-if="chain.dest.geo.city"> · {{ chain.dest.geo.city }}</span></span></div>
                <div class="detail-row"><span class="dk">协议 / 端口</span><span class="dv">{{ chain.dest.proto }} :{{ chain.dest.port }}</span></div>
                <div class="detail-row"><span class="dk">状态</span><span :class="['dv', chain.dest.state === 'ESTABLISHED' ? 'ok' : '']">{{ chain.dest.state }}</span></div>
              </div>
            </div>
          </template>
        </div>
      </template>

      <!-- 平铺模式 -->
      <template v-else>
        <div
          v-for="chain in displayed"
          :key="chain.id"
          :class="['chain-row', chain.type, { 'is-new': newChainIds.has(chain.id), expanded: expandedIds.has(chain.id) }]"
          @click="toggleExpand(chain.id)"
        >
          <div class="chain-main">
            <span :class="['type-badge', chain.type]">{{ typeLabel(chain.type) }}</span>
            <div class="chain-node source">
              <span>{{ chain.source.kind === 'device' ? '🖥' : '⚙' }}</span>
              <div class="source-labels">
                <span class="node-label">{{ chain.source.label }}</span>
                <span v-if="chain.source.hostname" class="source-host">{{ chain.source.hostname }}</span>
              </div>
              <span v-if="chain.source.iface" class="iface-badge" :title="chain.source.ifaceType">{{ chain.source.iface }}</span>
            </div>
            <div class="chain-arrow"><div class="arrow-line" /><span class="arrow-head">▶</span></div>
            <template v-if="chain.via">
              <div class="chain-node via">
                <span>🔀</span>
                <span class="node-label">{{ chain.via.label }}</span>
              </div>
              <div class="chain-arrow"><div class="arrow-line" /><span class="arrow-head">▶</span></div>
            </template>
            <div class="chain-node dest">
              <span>🌐</span>
              <div class="dest-labels">
                <span class="dest-domain">{{ destLabel(chain.dest) }}</span>
                <span v-if="chain.dest.domain && chain.dest.domain !== chain.dest.ip" class="dest-ip">{{ chain.dest.ip }}</span>
              </div>
              <span class="dest-port">:{{ chain.dest.port }}</span>
            </div>
            <div class="chain-meta">
              <span v-if="chain.dest.geo?.flag" class="geo-flag" :title="chain.dest.geo.full">
                {{ chain.dest.geo.flag }}
              </span>
              <span v-if="chain.dest.geo?.countryZh" class="geo-label">{{ chain.dest.geo.countryZh }}</span>
              <span v-if="svcLabel(chain.dest)" class="svc-badge">{{ svcLabel(chain.dest) }}</span>
              <span :class="['state-dot', chain.dest.state === 'ESTABLISHED' ? 'ok' : 'other']" />
            </div>
          </div>
          <div v-if="expandedIds.has(chain.id)" class="chain-detail">
            <div class="detail-row"><span class="dk">来源类型</span><span class="dv">{{ chain.source.kind === 'device' ? '局域网设备' : '本机进程' }}</span></div>
            <div v-if="chain.source.hostname" class="detail-row"><span class="dk">主机名</span><span class="dv highlight">{{ chain.source.hostname }}</span></div>
            <div v-if="chain.source.localAddr" class="detail-row"><span class="dk">本机地址</span><span class="dv">{{ chain.source.localAddr }}:{{ chain.source.localPort }}</span></div>
            <div v-if="chain.source.iface" class="detail-row"><span class="dk">网卡</span><span class="dv">{{ chain.source.iface }} <span class="iface-type">{{ chain.source.ifaceType }}</span></span></div>
            <div v-if="chain.via" class="detail-row"><span class="dk">代理进程</span><span class="dv">{{ chain.via.label }} 监听端口 :{{ chain.via.port }}</span></div>
            <div class="detail-row"><span class="dk">目标 IP</span><span class="dv">{{ chain.dest.ip }}</span></div>
            <div v-if="chain.dest.domain && chain.dest.domain !== chain.dest.ip" class="detail-row"><span class="dk">域名</span><span class="dv highlight">{{ chain.dest.domain }}</span></div>
            <div v-if="chain.dest.geo?.full" class="detail-row"><span class="dk">属地</span><span class="dv">{{ chain.dest.geo.full }}<span v-if="chain.dest.geo.city"> · {{ chain.dest.geo.city }}</span></span></div>
            <div class="detail-row"><span class="dk">协议 / 端口</span><span class="dv">{{ chain.dest.proto }} :{{ chain.dest.port }}</span></div>
            <div class="detail-row"><span class="dk">状态</span><span :class="['dv', chain.dest.state === 'ESTABLISHED' ? 'ok' : '']">{{ chain.dest.state }}</span></div>
          </div>
        </div>
      </template>

      <div v-if="displayed.length === 0" class="empty-tip">暂无链路数据，等待连接建立…</div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch } from 'vue'

export default defineComponent({
  name: 'ChainView',
  props: {
    chains: { type: Array, default: () => [] }
  },

  setup(props) {
    const search = ref('')
    const activeFilter = ref('all')
    const groupBySource = ref(false)
    const collapsedGroups = ref(new Set())
    const expandedIds = ref(new Set())
    const newChainIds = ref(new Set())

    const filters = [
      { id: 'all', label: '全部' },
      { id: 'proxy', label: '代理链' },
      { id: 'transit', label: '过境' },
      { id: 'direct', label: '直连' }
    ]

    const countByType = computed(() => {
      const m = { all: props.chains.length }
      for (const c of props.chains) m[c.type] = (m[c.type] || 0) + 1
      return m
    })

    const displayed = computed(() => {
      let list = props.chains
      if (activeFilter.value !== 'all') list = list.filter(c => c.type === activeFilter.value)
      if (search.value) {
        const q = search.value.toLowerCase()
        list = list.filter(c =>
          c.source.label.toLowerCase().includes(q) ||
          (c.via?.label || '').toLowerCase().includes(q) ||
          c.dest.ip.includes(q) ||
          (c.dest.domain || '').toLowerCase().includes(q) ||
          String(c.dest.port).includes(q)
        )
      }
      return list
    })

    const grouped = computed(() => {
      const g = {}
      for (const c of displayed.value) {
        const k = c.source.label
        if (!g[k]) g[k] = []
        g[k].push(c)
      }
      return g
    })

    function toggleGroup(src) {
      const s = new Set(collapsedGroups.value)
      s.has(src) ? s.delete(src) : s.add(src)
      collapsedGroups.value = s
    }

    function toggleExpand(id) {
      const s = new Set(expandedIds.value)
      s.has(id) ? s.delete(id) : s.add(id)
      expandedIds.value = s
    }

    function typeLabel(t) {
      return { proxy: '代理', transit: '过境', direct: '直连' }[t] || t
    }

    function destLabel(dest) {
      return dest.domain && dest.domain !== dest.ip ? dest.domain : dest.ip
    }

    function svcLabel(dest) {
      if (dest.svc) return dest.svc
      if (dest.port === 443) return 'HTTPS'
      if (dest.port === 80) return 'HTTP'
      if (dest.port === 53) return 'DNS'
      return null
    }

    // 新链路高亮
    watch(() => props.chains, (next, prev) => {
      if (!prev?.length) return
      const oldIds = new Set(prev.map(c => c.id))
      const fresh = new Set(next.filter(c => !oldIds.has(c.id)).map(c => c.id))
      if (fresh.size) {
        newChainIds.value = fresh
        setTimeout(() => { newChainIds.value = new Set() }, 2500)
      }
    })

    return {
      search, activeFilter, filters, groupBySource,
      collapsedGroups, toggleGroup,
      expandedIds, toggleExpand,
      displayed, grouped, countByType, newChainIds,
      typeLabel, destLabel, svcLabel
    }
  }
})
</script>

<style scoped>
.chain-wrap { display: flex; flex-direction: column; position: absolute; inset: 0; overflow: hidden; }

.chain-toolbar {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px;
  background: var(--card); border-bottom: 1px solid var(--border);
  flex-shrink: 0; flex-wrap: wrap;
}
.search-input {
  background: var(--bg); border: 1px solid var(--border);
  color: var(--text); border-radius: 6px; padding: 5px 10px;
  font-size: 12px; font-family: inherit; width: 200px;
}
.search-input:focus { outline: none; border-color: var(--cyan); }

.filter-btns { display: flex; gap: 4px; }
.filter-btn {
  background: #1e2530; border: 1px solid var(--border);
  color: var(--text2); border-radius: 6px; padding: 3px 10px;
  font-size: 11px; font-family: inherit; cursor: pointer;
  display: flex; align-items: center; gap: 5px; transition: all 0.15s;
}
.filter-btn:hover { color: var(--text); }
.filter-btn.active { color: var(--cyan); border-color: var(--cyan); background: #0d2a3a; }
.filter-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.filter-dot.proxy { background: var(--purple); }
.filter-dot.transit { background: var(--orange); }
.filter-dot.direct { background: var(--green); }
.filter-dot.all { background: var(--cyan); }
.filter-count { background: #2a3040; border-radius: 8px; padding: 0 5px; font-size: 10px; }

.toolbar-item { display: flex; align-items: center; gap: 6px; color: var(--text2); font-size: 12px; cursor: pointer; }
.toolbar-item input { accent-color: var(--cyan); }
.total-badge { color: var(--text2); font-size: 11px; margin-left: auto; }

.chain-list { flex: 1; overflow-y: auto; }

/* 分组 */
.chain-group { margin-bottom: 2px; }
.group-header {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 14px; cursor: pointer;
  color: var(--text2); font-size: 12px;
  background: #1a1f2a; border-bottom: 1px solid var(--border);
  user-select: none;
}
.group-header:hover { background: #1e2530; color: var(--text); }
.group-arrow { font-size: 9px; }
.group-src { font-weight: 600; color: var(--text); }
.group-count { background: #2a3040; border-radius: 8px; padding: 0 6px; font-size: 10px; margin-left: auto; }

/* 行 */
.chain-row {
  border-bottom: 1px solid #1a2030; cursor: pointer;
  transition: background 0.1s;
}
.chain-row:hover { background: #1a2030; }
.chain-row.proxy { border-left: 2px solid var(--purple); }
.chain-row.transit { border-left: 2px solid var(--orange); }
.chain-row.direct { border-left: 2px solid var(--green); }
.chain-row.is-new { animation: fadeIn 0.8s ease; }
@keyframes fadeIn { from { background: #1a3020; } to { } }

.chain-main {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; min-height: 44px; flex-wrap: wrap;
}

.type-badge {
  padding: 2px 8px; border-radius: 10px; font-size: 10px;
  font-weight: 700; flex-shrink: 0;
}
.type-badge.proxy { background: #2a1e3a; color: var(--purple); }
.type-badge.transit { background: #3a2a1a; color: var(--orange); }
.type-badge.direct { background: #1a3a1e; color: var(--green); }

.chain-node {
  display: flex; align-items: center; gap: 5px;
  background: #1e2530; border-radius: 8px;
  padding: 4px 10px; font-size: 12px; flex-shrink: 0;
  max-width: 180px;
}
.chain-node.via { background: #2a1e3a; }
.chain-node.dest { background: #1a2a3a; max-width: 260px; }
.node-label { font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node-pid { color: var(--text2); font-size: 10px; flex-shrink: 0; }

.chain-arrow { display: flex; align-items: center; flex-shrink: 0; }
.arrow-line { width: 16px; height: 1px; background: #30363d; }
.arrow-head { color: #30363d; font-size: 9px; }

.dest-labels { display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.dest-domain { font-weight: 600; color: var(--cyan); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.dest-ip { color: var(--text2); font-size: 10px; }
.dest-port { color: var(--text2); font-size: 11px; flex-shrink: 0; }

.chain-meta { display: flex; align-items: center; gap: 6px; margin-left: auto; flex-shrink: 0; }
.svc-badge { background: #1e3050; color: var(--cyan); border-radius: 4px; padding: 1px 6px; font-size: 10px; }
.state-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.state-dot.ok { background: var(--green); box-shadow: 0 0 4px var(--green); }
.state-dot.other { background: var(--orange); }

/* 展开详情 */
.chain-detail {
  padding: 8px 14px 10px 46px;
  background: #0f1520; border-top: 1px solid #1e2530;
  display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
}
.detail-row { display: flex; gap: 8px; font-size: 11px; align-items: baseline; }
.dk { color: var(--text2); flex-shrink: 0; min-width: 70px; }
.dv { color: var(--text); font-family: monospace; }
.dv.ok { color: var(--green); }
.dv.highlight { color: var(--cyan); font-weight: 600; }

.empty-tip { text-align: center; color: var(--text2); padding: 60px; font-size: 13px; }

.geo-flag { font-size: 14px; line-height: 1; flex-shrink: 0; }
.geo-label { color: var(--text2); font-size: 10px; white-space: nowrap; flex-shrink: 0; }

/* 源头主机名 + 网卡 */
.source-labels { display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.source-host { color: var(--text2); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.iface-badge {
  background: #1e3050; color: #7dd3fc;
  border-radius: 4px; padding: 1px 5px;
  font-size: 10px; font-weight: 600; flex-shrink: 0;
  cursor: help;
}
.iface-type { color: var(--text2); font-size: 10px; }
</style>
