<template>
  <section class="trace-demo">
    <header class="trace-demo__header">
      <div>
        <p class="eyebrow">链路展示 · 教学示例</p>
        <h3 class="title">{{ activeTrace?.name || '链路模拟器' }}</h3>
        <p class="subtitle">可新建多条“交易/查询”模拟链路：粘贴 JSON、编辑 spans、套用模板，并在手机端友好浏览。</p>
      </div>

      <div class="trace-demo__actions">
        <div class="mode-toggle">
          <button class="mode-btn" :class="{ active: panel === 'view' }" @click="panel = 'view'">展示</button>
          <button class="mode-btn" :class="{ active: panel === 'edit' }" @click="panel = 'edit'">编辑</button>
        </div>
        <div class="mode-toggle">
          <button class="mode-btn" :class="{ active: mode === 'user' }" @click="mode = 'user'">用户模式</button>
          <button class="mode-btn" :class="{ active: mode === 'training' }" @click="mode = 'training'">培训模式</button>
        </div>
        <button class="app-btn app-btn--ghost" @click="expanded = !expanded">{{ expanded ? '收起' : '展开' }}</button>
      </div>
    </header>

    <div v-if="expanded" class="trace-demo__body">
      <div class="library">
        <div class="trade-bar">
          <div class="trade-bar__left">
            <div class="trade-bar__title">
              <strong>交易</strong>
              <span class="muted">（一笔交易可包含多条链路）</span>
            </div>
            <div class="trade-bar__list" role="list">
              <button
                v-for="trade in trades"
                :key="trade.id"
                class="trade-item"
                :class="{ active: trade.id === activeTradeId }"
                role="listitem"
                @click="selectTrade(trade.id)"
                :title="trade.name"
              >
                {{ trade.name }}
              </button>
              <p v-if="trades.length === 0" class="library-empty">暂无交易，点击右侧创建。</p>
            </div>
          </div>
          <div class="trade-bar__right">
            <button
              v-if="flowContext"
              class="app-btn app-btn--ghost"
              :disabled="!(flowContext?.steps && flowContext.steps.length)"
              @click="createTradeFromFlow(flowContext)"
            >
              从流程生成交易
            </button>
            <button class="app-btn app-btn--primary" @click="openTradeCreate">+ 新建交易</button>
            <button class="app-btn app-btn--ghost" :disabled="!activeTrade" @click="renameTrade">重命名</button>
            <button class="app-btn app-btn--danger" :disabled="!activeTrade" @click="deleteTrade">删除</button>
          </div>
        </div>

        <div v-if="tradeCreateOpen" class="create-panel create-panel--single">
          <div class="create-panel__row">
            <label class="create-label">交易名称</label>
            <input
              v-model="tradeCreateName"
              class="app-input create-input"
              type="text"
              placeholder="例如：交易 A / 买入 BTC / 查询余额"
            />
          </div>
          <div class="create-panel__actions">
            <button class="app-btn app-btn--primary" @click="confirmTradeCreate">创建</button>
            <button class="app-btn app-btn--ghost" @click="cancelTradeCreate">取消</button>
          </div>
        </div>

        <div class="library__top">
          <div class="library__left">
            <input
              v-model="traceQuery"
              class="app-input library-search"
              type="search"
              placeholder="搜索链路名称"
              :disabled="!activeTrade"
            />
          </div>
          <div class="library__right">
            <button class="app-btn app-btn--primary" :disabled="!activeTrade" @click="openTraceCreate">+ 新建链路</button>
            <button class="app-btn app-btn--ghost" :disabled="!activeTrace" @click="renameTrace">重命名</button>
            <button class="app-btn app-btn--ghost" :disabled="!activeTrace" @click="duplicateTrace">复制</button>
            <button class="app-btn app-btn--danger" :disabled="!activeTrace" @click="deleteTrace">删除</button>
          </div>
        </div>

        <div v-if="traceCreateOpen" class="create-panel">
          <div class="create-panel__row">
            <label class="create-label">链路名称</label>
            <input
              v-model="traceCreateDraft.name"
              class="app-input create-input"
              type="text"
              placeholder="例如：下单受理 / 风控检查 / 清算入账"
            />
          </div>
          <div class="create-panel__row">
            <label class="create-label">模板</label>
            <select v-model="traceCreateDraft.templateId" class="app-select template-select">
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
            </select>
          </div>
          <div v-if="flowContext?.steps?.length" class="create-panel__row">
            <label class="create-label">绑定步骤</label>
            <select v-model="traceCreateDraft.stepId" class="app-select template-select">
              <option value="">不绑定</option>
              <option v-for="step in flowContext.steps" :key="step.id" :value="step.id">
                {{ step.name || step.id }}
              </option>
            </select>
          </div>
          <div class="create-panel__actions">
            <button class="app-btn app-btn--primary" :disabled="!activeTrade" @click="confirmTraceCreate">创建并编辑</button>
            <button class="app-btn app-btn--ghost" @click="cancelTraceCreate">取消</button>
          </div>
        </div>

        <div class="library__list" role="list" aria-label="链路列表">
          <button
            v-for="item in filteredTraces"
            :key="item.id"
            class="library-item"
            :class="{ active: item.id === activeTraceId }"
            role="listitem"
            @click="selectTrace(item.id)"
            :title="item.name"
          >
            <span class="library-item__name">{{ item.name }}</span>
            <span class="library-item__meta">
              <span class="badge" :class="item.trace?.result?.status === 'ERROR' ? 'bad' : 'ok'">
                {{ item.trace?.result?.status || 'OK' }}
              </span>
              <span class="library-item__ms">{{ traceDuration(item.trace) }}ms</span>
            </span>
          </button>
          <p v-if="activeTrade && filteredTraces.length === 0" class="library-empty">没有匹配的链路，点击“+ 新建链路”创建。</p>
          <p v-else-if="!activeTrade" class="library-empty">请先创建或选择一个交易。</p>
        </div>
      </div>

      <div v-if="panel === 'edit'" class="editor">
        <div class="editor__tabs">
          <button class="editor-tab" :class="{ active: editorTab === 'templates' }" @click="editorTab = 'templates'">
            模板
          </button>
          <button class="editor-tab" :class="{ active: editorTab === 'builder' }" @click="editorTab = 'builder'">
            Builder
          </button>
          <button class="editor-tab" :class="{ active: editorTab === 'json' }" @click="editorTab = 'json'">JSON</button>
        </div>

        <div v-if="editorTab === 'templates'" class="editor__panel">
          <div class="template-row">
            <label class="template-label">场景模板</label>
            <select v-model="activeTemplateId" class="app-select template-select">
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
            </select>
            <button class="app-btn app-btn--primary" @click="applyTemplate(activeTemplateId)">载入</button>
          </div>
          <p class="editor-hint">
            模板只是“模拟链路”，字段已脱敏。你可以载入后用 Builder/JSON 继续改服务名、耗时、tags。
          </p>
        </div>

        <div v-else-if="editorTab === 'builder'" class="editor__panel">
          <div class="builder-head">
            <div class="builder-title">
              <strong>Spans</strong>
              <span class="builder-sub">按 SkyWalking 的 Service/Span 心智模型编辑（不需要真实接入）。</span>
            </div>
            <div class="builder-actions">
              <button class="app-btn app-btn--ghost" @click="addSpan">新增 Span</button>
              <button class="app-btn app-btn--ghost" @click="normalizeSpanTimes">自动排序/规范化</button>
            </div>
          </div>

          <div class="builder-table">
            <div class="brow brow--head">
              <span>Service</span>
              <span>Operation</span>
              <span>Parent</span>
              <span>Start</span>
              <span>Duration</span>
              <span>Status</span>
              <span>Tags</span>
              <span></span>
            </div>
            <div v-for="(span, idx) in editableSpans" :key="span.id" class="brow">
              <input v-model="span.service" class="in" placeholder="account-service" @input="commitBuilder" />
              <input v-model="span.operation" class="in" placeholder="GET /balance" @input="commitBuilder" />
              <input v-model="span.parentId" class="in" placeholder="父 span id（可空）" @input="commitBuilder" />
              <input v-model.number="span.start" class="in in-num" type="number" min="0" @input="commitBuilder" />
              <input v-model.number="span.duration" class="in in-num" type="number" min="0" @input="commitBuilder" />
              <select v-model="span.status" class="sel" @change="commitBuilder">
                <option value="OK">OK</option>
                <option value="ERROR">ERROR</option>
              </select>
              <input v-model="span.tagsText" class="in" placeholder="biz=balance_query, cache_hit=false" @input="commitBuilder" />
              <button class="icon-btn" title="删除" @click="removeSpan(idx)">🗑️</button>
            </div>
          </div>

          <p class="editor-hint">
            Tags 输入格式：<code>k=v, k2=v2</code>。会自动解析成对象并展示在培训模式表格里。
          </p>
        </div>

        <div v-else class="editor__panel">
            <div class="json-actions">
            <button class="app-btn app-btn--ghost" @click="syncJsonFromTrace">从当前链路生成 JSON</button>
            <button class="app-btn app-btn--primary" @click="applyJson">应用 JSON</button>
            <button class="app-btn app-btn--ghost" @click="addAsNewFromJson">导入到当前交易</button>
            <button class="app-btn app-btn--ghost" @click="copyJson">复制</button>
          </div>
          <textarea v-model="jsonText" class="app-textarea json-area" spellcheck="false"></textarea>
          <p v-if="jsonError" class="json-error">{{ jsonError }}</p>
          <p class="editor-hint">
            只要包含 <code>traceId</code> 与 <code>spans</code> 就能渲染；<code>result</code> 可选。
          </p>
        </div>
      </div>

      <div class="trace-meta">
        <span class="meta-item"><strong>Trace</strong> {{ trace?.traceId }}</span>
        <span class="meta-item"><strong>总耗时</strong> {{ totalDuration }}ms</span>
        <span class="meta-item"
          ><strong>结果</strong>
          <span class="badge" :class="trace?.result?.status === 'ERROR' ? 'bad' : 'ok'">{{ trace?.result?.status || 'OK' }}</span></span
        >
        <span class="meta-item"><strong>截至</strong> {{ trace?.result?.asOf || '—' }}</span>
        <span class="meta-item"><strong>缓存</strong> <span class="badge" :class="cacheBadgeClass">{{ cacheLabel }}</span></span>
      </div>

      <div class="stepper">
        <button
          v-for="(step, index) in steps"
          :key="step.id"
          class="stepper__item"
          :class="{ active: index === activeStepIndex }"
          @click="activeStepIndex = index"
          :title="step.hint"
        >
          <span class="dot"></span>
          <span class="label">{{ step.title }}</span>
          <span class="ms">{{ step.duration }}ms</span>
        </button>
      </div>

      <div class="panel">
        <header class="panel__header">
          <div>
            <h4 class="panel__title">{{ activeStep.title }}</h4>
            <p class="panel__subtitle">{{ activeStep.subtitle }}</p>
          </div>
          <span class="panel__tag">{{ mode === 'user' ? '给普通用户' : '给新人培训' }}</span>
        </header>

        <div v-if="mode === 'user'" class="user-view">
          <div class="result-card">
            <div class="result-card__left">
              <p class="k">可用余额</p>
              <p class="v">¥ {{ formatMoney(trace?.result?.availableCny) }}</p>
              <p class="hint">示例数据（已脱敏）</p>
            </div>
            <div class="result-card__right">
              <div class="kv">
                <span class="kv-k">截至时间</span>
                <span class="kv-v">{{ trace?.result?.asOf || '—' }}</span>
              </div>
              <div class="kv">
                <span class="kv-k">数据来源</span>
                <span class="kv-v">{{ trace?.result?.source || '—' }}</span>
              </div>
              <div v-if="trace?.result?.note" class="kv">
                <span class="kv-k">提示</span>
                <span class="kv-v">{{ trace?.result?.note }}</span>
              </div>
            </div>
          </div>

          <ul class="plain-list">
            <li v-for="line in activeStep.userBullets" :key="line">{{ line }}</li>
          </ul>
        </div>

        <div v-else class="training-view">
          <div class="training-top">
            <div class="mini-card">
              <p class="mini-title">输入（脱敏）</p>
              <pre class="code">{{ formatJson(activeStep.training.input) }}</pre>
            </div>
            <div class="mini-card">
              <p class="mini-title">输出（脱敏）</p>
              <pre class="code">{{ formatJson(activeStep.training.output) }}</pre>
            </div>
          </div>

          <div class="waterfall">
            <div class="waterfall__head">
              <div>
                <h5>瀑布图（Waterfall）</h5>
                <p class="waterfall__sub">按时间轴展示每个 span 的起止与耗时（学习版）。</p>
              </div>
              <div class="waterfall__actions">
                <label class="waterfall__scope">
                  <span>范围</span>
                  <select v-model="waterfallScope" class="sel">
                    <option value="trace">整条链路</option>
                    <option value="step">当前步骤</option>
                  </select>
                </label>
                <label class="waterfall__scope">
                  <span>排序</span>
                  <select v-model="waterfallOrder" class="sel">
                    <option value="start">按时间</option>
                    <option value="tree">按层级</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="waterfall__axis">
              <span>0ms</span>
              <span>{{ Math.round(waterfallTotal / 2) }}ms</span>
              <span>{{ Math.round(waterfallTotal) }}ms</span>
            </div>

            <div class="waterfall__table">
              <div class="wrow wrow--head">
                <span>Service</span>
                <span>Operation</span>
                <span>耗时</span>
                <span>状态</span>
                <span class="wbar-head">Timeline</span>
              </div>
              <div v-for="row in waterfallRows" :key="row.id" class="wrow">
                <span class="svc">{{ row.service }}</span>
                <span class="op" :title="row.operation" :style="{ paddingLeft: `${row.depth * 12}px` }">
                  <span v-if="row.depth" class="tree-indent">↳</span>
                  {{ row.operation }}
                </span>
                <span class="dur">{{ row.duration }}ms</span>
                <span class="st">
                  <span class="badge" :class="row.status === 'OK' ? 'ok' : 'bad'">{{ row.status }}</span>
                </span>
                <span class="wbar">
                  <span class="wgrid"></span>
                  <span
                    class="wbar__fill"
                    :class="row.status === 'OK' ? 'ok' : 'bad'"
                    :style="{ left: row.leftPct + '%', width: row.widthPct + '%' }"
                    :title="`${row.start}ms → ${row.start + row.duration}ms`"
                  ></span>
                </span>
              </div>
            </div>
          </div>

          <div class="spans">
            <div class="spans__head">
              <h5>Spans（按时间）</h5>
              <p class="spans__sub">这里用 SkyWalking 的 Service/Span 概念来组织展示。</p>
            </div>
            <div class="spans__table">
              <div class="row row--head">
                <span>Service</span>
                <span>Operation</span>
                <span>Parent</span>
                <span>耗时</span>
                <span>状态</span>
                <span>Tags</span>
              </div>
              <div v-for="span in activeStep.spans" :key="span.id" class="row">
                <span class="svc">{{ span.service }}</span>
                <span class="op" :style="{ paddingLeft: `${(spanDepthMap[span.id] || 0) * 12}px` }">
                  <span v-if="spanDepthMap[span.id]" class="tree-indent">↳</span>
                  {{ span.operation }}
                </span>
                <span class="pid">{{ span.parentId || '—' }}</span>
                <span class="dur">{{ span.duration }}ms</span>
                <span class="st">
                  <span class="badge" :class="span.status === 'OK' ? 'ok' : 'bad'">{{ span.status }}</span>
                </span>
                <span class="tags">{{ formatTags(span.tags) }}</span>
              </div>
            </div>
          </div>

          <ul class="plain-list">
            <li v-for="line in activeStep.training.bullets" :key="line">{{ line }}</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
const buildDemoTrace = () => {
  const traceId = 'a13f2b9c6e0d4c1a'
  const spans = [
    {
      id: 's1',
      service: 'mobile-app',
      operation: 'GET /balance/available',
      parentId: null,
      start: 0,
      duration: 25,
      status: 'OK',
      tags: { biz: 'balance_query' }
    },
    {
      id: 's2',
      service: 'api-gateway',
      operation: 'route balance.query',
      parentId: 's1',
      start: 6,
      duration: 42,
      status: 'OK',
      tags: { route: '/api/balance/available' }
    },
    {
      id: 's3',
      service: 'auth-service',
      operation: 'verify token + permission',
      parentId: 's2',
      start: 12,
      duration: 28,
      status: 'OK',
      tags: { auth: 'bearer', scope: 'balance:read' }
    },
    {
      id: 's4',
      service: 'account-service',
      operation: 'get account + profile',
      parentId: 's2',
      start: 44,
      duration: 34,
      status: 'OK',
      tags: { account_type: 'debit' }
    },
    {
      id: 's5',
      service: 'cache-service',
      operation: 'get balance snapshot',
      parentId: 's4',
      start: 52,
      duration: 9,
      status: 'OK',
      tags: { cache_hit: false, key: 'bal:***' }
    },
    {
      id: 's6',
      service: 'ledger-service',
      operation: 'compute available balance',
      parentId: 's4',
      start: 61,
      duration: 118,
      status: 'OK',
      tags: { as_of_time: '2026-02-26 10:12:32', strategy: 'ledger+holds' }
    },
    {
      id: 's7',
      service: 'account-service',
      operation: 'assemble response',
      parentId: 's2',
      start: 181,
      duration: 19,
      status: 'OK',
      tags: { response: '200' }
    }
  ]

  return {
    traceId,
    spans,
    result: {
      status: 'OK',
      availableCny: 8532.14,
      asOf: '2026-02-26 10:12:32',
      source: '账务汇总（缓存未命中回源）',
      note: '若系统繁忙，可能返回缓存结果并标注“截至时间”。'
    }
  }
}

const buildOrderTemplate = () => ({
  traceId: '7c2d88b10a9f4e2d',
  spans: [
    {
      id: 'o1',
      service: 'web-app',
      operation: 'POST /orders',
      parentId: null,
      start: 0,
      duration: 22,
      status: 'OK',
      tags: { biz: 'order_place', side: 'BUY' }
    },
    {
      id: 'o2',
      service: 'api-gateway',
      operation: 'route order.place',
      parentId: 'o1',
      start: 4,
      duration: 36,
      status: 'OK',
      tags: { route: '/api/orders' }
    },
    {
      id: 'o3',
      service: 'risk-service',
      operation: 'pre-trade check',
      parentId: 'o2',
      start: 18,
      duration: 48,
      status: 'OK',
      tags: { rule: 'limit+kyc', score: 12 }
    },
    {
      id: 'o4',
      service: 'order-service',
      operation: 'create order',
      parentId: 'o2',
      start: 38,
      duration: 61,
      status: 'OK',
      tags: { order_type: 'LIMIT', price: '12.34', qty: '100' }
    },
    {
      id: 'o5',
      service: 'matching-service',
      operation: 'enqueue order',
      parentId: 'o4',
      start: 74,
      duration: 43,
      status: 'OK',
      tags: { queue: 'price-time' }
    },
    {
      id: 'o6',
      service: 'order-service',
      operation: 'return ack',
      parentId: 'o2',
      start: 103,
      duration: 18,
      status: 'OK',
      tags: { response: '202', state: 'SUBMITTED' }
    }
  ],
  result: {
    status: 'OK',
    availableCny: null,
    asOf: '2026-02-26 10:20:05',
    source: '下单受理（未成交）',
    note: '这是“下单受理”链路，不代表成交；成交通常在后续异步链路。'
  }
})

const buildOrderFailTemplate = () => ({
  traceId: 'fd91c0c13cda41a1',
  spans: [
    {
      id: 'f1',
      service: 'web-app',
      operation: 'POST /orders',
      parentId: null,
      start: 0,
      duration: 18,
      status: 'OK',
      tags: { biz: 'order_place', side: 'SELL' }
    },
    {
      id: 'f2',
      service: 'api-gateway',
      operation: 'route order.place',
      parentId: 'f1',
      start: 3,
      duration: 30,
      status: 'OK',
      tags: { route: '/api/orders' }
    },
    {
      id: 'f3',
      service: 'risk-service',
      operation: 'pre-trade check',
      parentId: 'f2',
      start: 12,
      duration: 41,
      status: 'ERROR',
      tags: { rule: 'position-check', reason: 'INSUFFICIENT_POSITION' }
    }
  ],
  result: {
    status: 'ERROR',
    availableCny: null,
    asOf: '2026-02-26 10:22:11',
    source: '风控拦截',
    note: '模拟：持仓不足导致下单失败。'
  }
})

const pick = (obj, keys) => keys.reduce((acc, key) => {
  if (obj && Object.prototype.hasOwnProperty.call(obj, key)) acc[key] = obj[key]
  return acc
}, {})

const safeParseJson = (text) => {
  const trimmed = String(text || '').trim()
  if (!trimmed) return { ok: false, error: 'JSON 为空。' }
  try {
    return { ok: true, value: JSON.parse(trimmed) }
  } catch (error) {
    return { ok: false, error: error?.message || 'JSON 解析失败。' }
  }
}

const sanitizeTrace = (raw) => {
  const traceId = String(raw?.traceId || raw?.traceID || raw?.trace_id || '').trim() || 'trace_***'
  const spans = Array.isArray(raw?.spans) ? raw.spans : []
  const normalizedSpans = spans.map((span, idx) => {
    const id = String(span?.id || `span_${idx + 1}`)
    const service = String(span?.service || span?.serviceName || '').trim() || 'service_***'
    const operation = String(span?.operation || span?.endpoint || '').trim() || 'operation_***'
    const parentIdRaw = span?.parentId ?? span?.parentID ?? span?.parent_id ?? null
    const parentId = parentIdRaw == null || String(parentIdRaw).trim() === '' ? null : String(parentIdRaw)
    const start = Number(span?.start ?? 0)
    const duration = Number(span?.duration ?? 0)
    const status = String(span?.status || 'OK').toUpperCase() === 'ERROR' ? 'ERROR' : 'OK'
    const tags = span?.tags && typeof span.tags === 'object' ? span.tags : {}
    return {
      id,
      service,
      operation,
      parentId,
      start: Number.isFinite(start) && start >= 0 ? start : 0,
      duration: Number.isFinite(duration) && duration >= 0 ? duration : 0,
      status,
      tags
    }
  })

  const rawResult = raw?.result && typeof raw.result === 'object' ? raw.result : {}
  const resultStatus = String(rawResult?.status || 'OK').toUpperCase() === 'ERROR' ? 'ERROR' : 'OK'
  const availableCny = rawResult?.availableCny == null ? null : Number(rawResult.availableCny)

  return {
    traceId,
    spans: normalizedSpans,
    result: {
      status: resultStatus,
      availableCny: availableCny != null && Number.isFinite(availableCny) ? availableCny : null,
      asOf: String(rawResult?.asOf || '—'),
      source: String(rawResult?.source || '—'),
      note: String(rawResult?.note || '')
    }
  }
}

const parseTagsText = (text) => {
  const input = String(text || '').trim()
  if (!input) return {}
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean)
  const tags = {}
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) {
      tags[part] = true
      continue
    }
    const k = part.slice(0, eq).trim()
    const v = part.slice(eq + 1).trim()
    if (!k) continue
    if (v === 'true') tags[k] = true
    else if (v === 'false') tags[k] = false
    else if (v !== '' && Number.isFinite(Number(v))) tags[k] = Number(v)
    else tags[k] = v
  }
  return tags
}

const tagsToText = (tags) => {
  if (!tags || typeof tags !== 'object') return ''
  return Object.entries(tags)
    .slice(0, 12)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(', ')
}

const sortSpansByStart = (spans) => [...(spans || [])].sort((a, b) => (a.start || 0) - (b.start || 0))

const computeSpanDepthMap = (spans) => {
  const idToParent = new Map()
  for (const s of spans || []) idToParent.set(String(s.id), s.parentId == null ? null : String(s.parentId))

  const cache = new Map()
  const visiting = new Set()

  const depthOf = (id) => {
    if (cache.has(id)) return cache.get(id)
    if (visiting.has(id)) return 0
    visiting.add(id)
    const parent = idToParent.get(id)
    const depth = parent && idToParent.has(parent) ? depthOf(parent) + 1 : 0
    visiting.delete(id)
    cache.set(id, depth)
    return depth
  }

  const out = {}
  for (const s of spans || []) out[String(s.id)] = depthOf(String(s.id))
  return out
}

const deepClone = (value) => JSON.parse(JSON.stringify(value ?? null))

const TRADES_STORAGE_KEY = 'trace_flow_demo_trades_v1'
const LEGACY_LIBRARY_STORAGE_KEY = 'trace_flow_demo_library_v1'

const buildDefaultTrades = () => {
  const now = Date.now()
  return [
    {
      id: `trade_${now}_1`,
      name: '交易 A（示例）',
      activeTraceId: `trace_${now}_1_1`,
      traces: [
        { id: `trace_${now}_1_1`, name: '查可用余额（示例）', trace: sanitizeTrace(buildDemoTrace()) },
        { id: `trace_${now}_1_2`, name: '下单受理（示例）', trace: sanitizeTrace(buildOrderTemplate()) }
      ]
    },
    {
      id: `trade_${now}_2`,
      name: '交易 B（示例）',
      activeTraceId: `trace_${now}_2_1`,
      traces: [{ id: `trace_${now}_2_1`, name: '下单失败（示例）', trace: sanitizeTrace(buildOrderFailTemplate()) }]
    }
  ]
}

export default {
  name: 'TraceFlowDemo',
  props: {
    flowContext: { type: Object, default: null },
    selectedStepId: { type: [String, null], default: null }
  },
  emits: ['select-step'],
  data() {
    return {
      panel: 'view',
      editorTab: 'templates',
      mode: 'user',
      expanded: true,
      trace: sanitizeTrace(buildDemoTrace()),
      activeStepIndex: 0,
      jsonText: '',
      jsonError: '',
      editableSpans: [],
      activeTemplateId: 'balance',
      trades: [],
      activeTradeId: '',
      activeTraceId: '',
      traceQuery: '',
      tradeCreateOpen: false,
      tradeCreateName: '',
      traceCreateOpen: false,
      traceCreateDraft: { name: '', templateId: 'balance', stepId: '' },
      waterfallScope: 'trace',
      waterfallOrder: 'start'
    }
  },
  computed: {
    templates() {
      return [
        { id: 'balance', name: '查可用余额（缓存未命中回源）', build: buildDemoTrace },
        { id: 'order_ok', name: '下单受理（成功 ACK）', build: buildOrderTemplate },
        { id: 'order_fail', name: '下单失败（风控拦截）', build: buildOrderFailTemplate }
      ]
    },
    activeTrade() {
      return this.trades.find((t) => t.id === this.activeTradeId) || null
    },
    activeTrace() {
      const trade = this.activeTrade
      if (!trade) return null
      return (trade.traces || []).find((t) => t.id === this.activeTraceId) || null
    },
    filteredTraces() {
      const trade = this.activeTrade
      if (!trade) return []
      const q = String(this.traceQuery || '').trim().toLowerCase()
      const list = Array.isArray(trade.traces) ? trade.traces : []
      if (!q) return list
      return list.filter((it) => String(it.name || '').toLowerCase().includes(q))
    },
    totalDuration() {
      const spans = this.trace.spans || []
      if (spans.length === 0) return 0
      const start = Math.min(...spans.map((s) => s.start || 0))
      const end = Math.max(...spans.map((s) => (s.start || 0) + (s.duration || 0)))
      return Math.max(0, end - start)
    },
    cacheHit() {
      const cacheSpan = (this.trace.spans || []).find((s) => s.service === 'cache-service')
      return Boolean(cacheSpan?.tags?.cache_hit)
    },
    cacheLabel() {
      return this.cacheHit ? '命中' : '未命中'
    },
    cacheBadgeClass() {
      return this.cacheHit ? 'ok' : 'warn'
    },
    steps() {
      const spans = sortSpansByStart(this.trace.spans || [])
      const byService = (name) => spans.filter((s) => s.service === name)

      if (spans.length > 0) {
        const entrySpan = spans[0]
        const lastSpan = spans[spans.length - 1]
        const entryService = entrySpan?.service

        const gateway = byService('api-gateway')
        const authOrRisk = [...byService('auth-service'), ...byService('risk-service')]
        const returnSpans = spans.filter((s) => {
          const op = String(s.operation || '').toLowerCase()
          return op.includes('assemble') || op.includes('return') || s === lastSpan
        })
        const coreSpans = spans.filter((s) => {
          if (s === entrySpan) return false
          if (gateway.includes(s)) return false
          if (authOrRisk.includes(s)) return false
          if (returnSpans.includes(s)) return false
          return true
        })

        const stepDefs = [
          {
            id: 'init',
            title: '发起请求',
            hint: '用户侧发起一次查询/下单/操作请求',
            subtitle: '把“我要做一件事”变成一次可观测的请求。',
            spans: entryService ? byService(entryService) : [entrySpan],
            userBullets: ['你在页面/APP 发起操作。', '系统会携带登录态与设备信息发起请求。'],
            training: {
              input: { action: 'biz_action', userId: 'u_***' },
              output: { traceId: this.trace.traceId },
              bullets: ['入口建议打 `biz` tag（如 `biz=balance_query` / `biz=order_place`）。']
            }
          },
          {
            id: 'gateway',
            title: '入口/网关',
            hint: '路由、限流、基础校验',
            subtitle: '统一入口：路由转发 + 限流/熔断/基础校验。',
            spans: gateway,
            userBullets: ['系统会把请求转到对应服务。', '若访问过于频繁，会提示稍后再试。'],
            training: {
              input: { route: '/api/...' },
              output: { upstream: 'service_***', status: 200 },
              bullets: ['网关常负责限流、熔断、黑白名单、基础参数校验。']
            }
          },
          {
            id: 'auth',
            title: '鉴权/风控',
            hint: '校验身份与交易前检查',
            subtitle: '确保“你有权做”且“符合规则”。',
            spans: authOrRisk,
            userBullets: ['系统会验证登录状态与权限。', '触发风控会提示失败或需进一步验证。'],
            training: {
              input: { scope: '***', rule: '***' },
              output: { allowed: true },
              bullets: ['失败原因建议结构化（reason/scene），便于解释与排障。']
            }
          },
          {
            id: 'core',
            title: '核心处理',
            hint: '读取数据/执行业务/计算汇总',
            subtitle: '这里承载主要业务：查余额、下单、撮合排队等。',
            spans: coreSpans.length ? coreSpans : spans.filter((s) => !returnSpans.includes(s) && s !== entrySpan),
            userBullets: ['系统在后台完成核心处理。', '这一步通常最耗时。'],
            training: {
              input: { need: ['fields...'] },
              output: { asOf: this.trace.result.asOf || '—' },
              bullets: ['建议返回 `asOf` 与 `source`，解释一致性与延迟。']
            }
          },
          {
            id: 'return',
            title: '返回结果',
            hint: '组装响应并返回客户端',
            subtitle: '把结果与解释信息一起返回。',
            spans: returnSpans.length ? returnSpans : [lastSpan],
            userBullets: ['你会看到结果。', '若系统降级，会提示数据可能延迟。'],
            training: {
              input: { result: '...' },
              output: { status: this.trace.result.status },
              bullets: ['对齐前后端错误码与提示文案，便于排障与客服解释。']
            }
          }
        ]

        return stepDefs.map((step) => {
          const duration = step.spans.length
            ? Math.max(...step.spans.map((s) => (s.start || 0) + (s.duration || 0))) -
              Math.min(...step.spans.map((s) => s.start || 0))
            : 0
          return { ...step, duration }
        })
      }

      return []
    },
    activeStep() {
      return this.steps[this.activeStepIndex] || this.steps[0]
    },
    spanDepthMap() {
      return computeSpanDepthMap(this.trace?.spans || [])
    },
    waterfallSpans() {
      const scope = this.waterfallScope || 'trace'
      const spans = scope === 'step' ? (this.activeStep?.spans || []) : (this.trace?.spans || [])
      const list = Array.isArray(spans) ? spans : []
      if (this.waterfallOrder === 'tree') {
        const depthMap = computeSpanDepthMap(list)
        return [...list].sort((a, b) => {
          const da = depthMap[String(a.id)] ?? 0
          const db = depthMap[String(b.id)] ?? 0
          if (da !== db) return da - db
          return (a.start || 0) - (b.start || 0)
        })
      }
      return sortSpansByStart(list)
    },
    waterfallTotal() {
      const spans = this.waterfallSpans
      if (!spans.length) return 0
      const start = Math.min(...spans.map((s) => s.start || 0))
      const end = Math.max(...spans.map((s) => (s.start || 0) + (s.duration || 0)))
      return Math.max(0, end - start)
    },
    waterfallRows() {
      const spans = this.waterfallSpans
      if (!spans.length) return []
      const depthMap = computeSpanDepthMap(spans)
      const start = Math.min(...spans.map((s) => s.start || 0))
      const end = Math.max(...spans.map((s) => (s.start || 0) + (s.duration || 0)))
      const total = Math.max(1, end - start)
      return spans.map((span) => {
        const s = span.start || 0
        const d = span.duration || 0
        const leftPct = ((s - start) / total) * 100
        const widthPctRaw = (d / total) * 100
        const widthPct = Math.max(0.8, widthPctRaw)
        return {
          id: span.id,
          service: span.service,
          operation: span.operation,
          depth: depthMap[String(span.id)] ?? 0,
          start: s,
          duration: d,
          status: span.status,
          leftPct: Number.isFinite(leftPct) ? leftPct : 0,
          widthPct: Number.isFinite(widthPct) ? widthPct : 0.8
        }
      })
    }
  },
  watch: {
    selectedStepId(newValue) {
      if (!newValue) return
      this.jumpToTraceByStepId(String(newValue))
    },
    panel(newValue) {
      if (newValue !== 'edit') return
      this.syncJsonFromTrace()
      this.syncBuilderFromTrace()
    },
    editorTab(newValue) {
      if (newValue === 'json') this.syncJsonFromTrace()
      if (newValue === 'builder') this.syncBuilderFromTrace()
    },
    trace: {
      deep: true,
      handler() {
        this.persistActiveTrace()
      }
    }
  },
  methods: {
    jumpToTraceByStepId(stepId) {
      const flowId = String(this.flowContext?.id || '')
      const current = this.activeTrace
      if (current?.meta?.stepId && String(current.meta.stepId) === String(stepId) && (!flowId || String(current.meta.flowId || '') === flowId)) {
        return
      }

      const matchesInTrade = (trade) =>
        (trade?.traces || []).find((t) => String(t?.meta?.stepId || '') === String(stepId) && (!flowId || String(t?.meta?.flowId || '') === flowId))

      const activeTrade = this.activeTrade
      const hitInActive = matchesInTrade(activeTrade)
      if (hitInActive) {
        this.selectTrace(hitInActive.id, { silentEmit: true })
        return
      }

      for (const trade of this.trades || []) {
        const hit = matchesInTrade(trade)
        if (!hit) continue
        this.selectTrade(trade.id)
        this.selectTrace(hit.id, { silentEmit: true })
        return
      }
    },
    createTradeFromFlow(flow) {
      const flowId = String(flow?.id || '').trim()
      const flowName = String(flow?.name || '').trim() || '未命名流程'
      const steps = Array.isArray(flow?.steps) ? flow.steps : []
      if (steps.length === 0) {
        window.alert('当前流程没有步骤，无法生成交易。')
        return
      }

      const now = Date.now()
      const tradeId = `trade_flow_${flowId || now}_${Math.random().toString(16).slice(2)}`
      const tradeName = `交易 · ${flowName}`
      const asOf = new Date().toLocaleString('zh-CN', { hour12: false })

      const traces = steps.map((step, index) => {
        const stepName = String(step?.name || `步骤 ${index + 1}`)
        const stepId = String(step?.id || `step_${index + 1}`)
        const traceId = `flow_${flowId || 'x'}_${now}_${index + 1}`

        const rootId = `root_${index + 1}`
        const childId = `child_${index + 1}`
        const rootDuration = 20 + index * 3
        const childDuration = 40 + index * 5

        const trace = sanitizeTrace({
          traceId,
          spans: [
            {
              id: rootId,
              service: 'ui',
              operation: `step:${stepName}`,
              parentId: null,
              start: 0,
              duration: rootDuration,
              status: 'OK',
              tags: { biz: 'flow_step', flow_id: flowId || '—', step_id: stepId, step_index: index + 1 }
            },
            {
              id: childId,
              service: 'service',
              operation: `handle:${stepName}`,
              parentId: rootId,
              start: Math.max(1, Math.floor(rootDuration * 0.35)),
              duration: childDuration,
              status: 'OK',
              tags: { flow_id: flowId || '—', step_id: stepId }
            }
          ],
          result: {
            status: 'OK',
            availableCny: null,
            asOf,
            source: '由流程步骤生成（模拟）',
            note: '每个步骤生成一条链路，你可以继续在 Builder 里补全 spans。'
          }
        })

        return {
          id: `trace_${now}_${index + 1}_${Math.random().toString(16).slice(2)}`,
          name: `步骤 ${index + 1} · ${stepName}`,
          trace,
          meta: { flowId, stepId, stepIndex: index }
        }
      })

      const trade = { id: tradeId, name: tradeName, activeTraceId: traces[0].id, traces }
      this.trades.unshift(trade)
      this.activeTradeId = trade.id
      this.activeTraceId = traces[0].id
      this.trace = deepClone(traces[0].trace)
      this.activeStepIndex = 0
      this.panel = 'edit'
      this.editorTab = 'builder'
      this.saveTrades()
    },
    migrateLegacyLibraryIfNeeded() {
      try {
        const raw = localStorage.getItem(LEGACY_LIBRARY_STORAGE_KEY)
        if (!raw) return false
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed?.library) || parsed.library.length === 0) return false

        const now = Date.now()
        const traces = parsed.library
          .filter((it) => it && typeof it === 'object')
          .map((it, idx) => ({
            id: String(it.id || `legacy_trace_${now}_${idx + 1}`),
            name: String(it.name || `链路 ${idx + 1}`),
            trace: sanitizeTrace(it.trace || {})
          }))

        const tradeId = `trade_legacy_${now}`
        const legacyActive = String(parsed.activeItemId || traces[0].id)
        const activeTraceId = traces.some((t) => t.id === legacyActive) ? legacyActive : traces[0].id

        this.trades = [
          {
            id: tradeId,
            name: '历史导入（旧版链路）',
            activeTraceId,
            traces
          }
        ]
        this.activeTradeId = tradeId
        this.activeTraceId = activeTraceId
        this.trace = deepClone(this.activeTrace?.trace || sanitizeTrace(buildDemoTrace()))
        this.saveTrades()
        return true
      } catch (error) {
        return false
      }
    },
    loadTrades() {
      try {
        const raw = localStorage.getItem(TRADES_STORAGE_KEY)
        if (!raw) return false
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed?.trades)) return false

        const trades = parsed.trades
          .filter((t) => t && typeof t === 'object')
          .map((t, idx) => ({
            id: String(t.id || `trade_${idx}_${Date.now()}`),
            name: String(t.name || `交易 ${idx + 1}`),
            activeTraceId: String(t.activeTraceId || ''),
            traces: Array.isArray(t.traces)
              ? t.traces
                  .filter((it) => it && typeof it === 'object')
                  .map((it, j) => ({
                    id: String(it.id || `trace_${idx}_${j}_${Date.now()}`),
                    name: String(it.name || `链路 ${j + 1}`),
                    trace: sanitizeTrace(it.trace || {}),
                    meta: it.meta && typeof it.meta === 'object'
                      ? {
                          flowId: it.meta.flowId != null ? String(it.meta.flowId) : '',
                          stepId: it.meta.stepId != null ? String(it.meta.stepId) : '',
                          stepIndex: Number.isFinite(Number(it.meta.stepIndex)) ? Number(it.meta.stepIndex) : null
                        }
                      : null
                  }))
              : []
          }))

        if (trades.length === 0) return false

        this.trades = trades
        this.activeTradeId = String(parsed.activeTradeId || trades[0].id)
        if (!this.trades.some((t) => t.id === this.activeTradeId)) this.activeTradeId = trades[0].id

        const trade = this.activeTrade
        const fallbackTraceId = trade?.activeTraceId || trade?.traces?.[0]?.id || ''
        const traceId = String(parsed.activeTraceId || fallbackTraceId)
        this.activeTraceId = (trade?.traces || []).some((it) => it.id === traceId) ? traceId : (trade?.traces?.[0]?.id || '')
        if (trade) trade.activeTraceId = this.activeTraceId

        this.trace = deepClone(this.activeTrace?.trace || sanitizeTrace(buildDemoTrace()))
        return true
      } catch (error) {
        return false
      }
    },
    saveTrades() {
      try {
        const payload = {
          activeTradeId: this.activeTradeId,
          activeTraceId: this.activeTraceId,
          trades: this.trades.map((t) => ({
            id: t.id,
            name: t.name,
            activeTraceId: t.activeTraceId,
            traces: (t.traces || []).map((it) => ({ id: it.id, name: it.name, trace: it.trace, meta: it.meta || null }))
          }))
        }
        localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(payload))
      } catch (error) {
        // ignore
      }
    },
    persistActiveTrace() {
      const trade = this.activeTrade
      const item = this.activeTrace
      if (!trade || !item) return
      item.trace = sanitizeTrace(this.trace)
      trade.activeTraceId = item.id
      this.saveTrades()
    },
    selectTrade(id) {
      const trade = this.trades.find((t) => t.id === id)
      if (!trade) return
      this.activeTradeId = trade.id
      const nextTraceId = String(trade.activeTraceId || trade.traces?.[0]?.id || '')
      this.activeTraceId = (trade.traces || []).some((it) => it.id === nextTraceId) ? nextTraceId : (trade.traces?.[0]?.id || '')
      trade.activeTraceId = this.activeTraceId
      this.trace = deepClone(this.activeTrace?.trace || sanitizeTrace(buildDemoTrace()))
      this.activeStepIndex = 0
      this.jsonError = ''
      if (this.panel === 'edit') {
        this.syncJsonFromTrace()
        this.syncBuilderFromTrace()
      }
      this.saveTrades()
    },
    selectTrace(id, options = {}) {
      const trade = this.activeTrade
      if (!trade) return
      const item = (trade.traces || []).find((it) => it.id === id)
      if (!item) return
      this.activeTraceId = item.id
      trade.activeTraceId = item.id
      this.trace = deepClone(item.trace)
      this.activeStepIndex = 0
      this.jsonError = ''
      if (this.panel === 'edit') {
        this.syncJsonFromTrace()
        this.syncBuilderFromTrace()
      }
      this.saveTrades()

      const silent = Boolean(options?.silentEmit)
      if (!silent && item?.meta?.stepId) {
        this.$emit('select-step', { stepId: String(item.meta.stepId), stepIndex: item.meta.stepIndex ?? null })
      }
    },
    openTradeCreate() {
      this.tradeCreateOpen = true
      this.tradeCreateName = ''
    },
    cancelTradeCreate() {
      this.tradeCreateOpen = false
    },
    confirmTradeCreate() {
      const name = String(this.tradeCreateName || '').trim() || `交易 ${this.trades.length + 1}`
      const now = Date.now()
      const trade = {
        id: `trade_${now}_${Math.random().toString(16).slice(2)}`,
        name,
        activeTraceId: '',
        traces: []
      }
      this.trades.unshift(trade)
      this.tradeCreateOpen = false
      this.activeTradeId = trade.id
      this.activeTraceId = ''
      this.openTraceCreate()
      this.saveTrades()
    },
    renameTrade() {
      const trade = this.activeTrade
      if (!trade) return
      const next = window.prompt('新的交易名称', trade.name)
      if (next === null) return
      trade.name = String(next).trim() || trade.name
      this.saveTrades()
    },
    deleteTrade() {
      const trade = this.activeTrade
      if (!trade) return
      if (!window.confirm(`确定删除交易「${trade.name}」及其所有链路？`)) return
      const idx = this.trades.findIndex((t) => t.id === trade.id)
      if (idx === -1) return
      this.trades.splice(idx, 1)
      const nextTrade = this.trades[0] || null
      this.activeTradeId = nextTrade?.id || ''
      this.activeTraceId = nextTrade?.traces?.[0]?.id || ''
      if (nextTrade) nextTrade.activeTraceId = this.activeTraceId
      this.trace = deepClone(nextTrade?.traces?.[0]?.trace || sanitizeTrace(buildDemoTrace()))
      this.activeStepIndex = 0
      this.saveTrades()
    },
    openTraceCreate() {
      this.traceCreateOpen = true
      this.traceCreateDraft = { name: '', templateId: 'balance', stepId: this.selectedStepId ? String(this.selectedStepId) : '' }
      this.panel = 'edit'
      this.editorTab = 'templates'
    },
    cancelTraceCreate() {
      this.traceCreateOpen = false
    },
    confirmTraceCreate() {
      const trade = this.activeTrade
      if (!trade) return
      const tpl = this.templates.find((t) => t.id === this.traceCreateDraft.templateId) || this.templates[0]
      const defaultName = tpl?.name || '新链路'
      const name = String(this.traceCreateDraft.name || '').trim() || defaultName
      const flowId = this.flowContext?.id != null ? String(this.flowContext.id) : ''
      const stepId = String(this.traceCreateDraft.stepId || '').trim()
      const stepIndex = stepId && Array.isArray(this.flowContext?.steps)
        ? this.flowContext.steps.findIndex((s) => String(s.id) === String(stepId))
        : -1
      const item = {
        id: `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name,
        trace: sanitizeTrace(tpl.build()),
        meta: stepId
          ? { flowId, stepId, stepIndex: stepIndex >= 0 ? stepIndex : null }
          : null
      }
      trade.traces = Array.isArray(trade.traces) ? trade.traces : []
      trade.traces.unshift(item)
      trade.activeTraceId = item.id
      this.activeTraceId = item.id
      this.trace = deepClone(item.trace)
      this.traceCreateOpen = false
      this.panel = 'edit'
      this.editorTab = 'builder'
      this.saveTrades()
    },
    renameTrace() {
      const item = this.activeTrace
      if (!item) return
      const next = window.prompt('新的链路名称', item.name)
      if (next === null) return
      item.name = String(next).trim() || item.name
      this.saveTrades()
    },
    duplicateTrace() {
      const trade = this.activeTrade
      const item = this.activeTrace
      if (!trade || !item) return
      const copy = {
        id: `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: `${item.name} · 副本`,
        trace: deepClone(item.trace)
      }
      trade.traces.unshift(copy)
      trade.activeTraceId = copy.id
      this.activeTraceId = copy.id
      this.trace = deepClone(copy.trace)
      this.panel = 'edit'
      this.editorTab = 'builder'
      this.saveTrades()
    },
    deleteTrace() {
      const trade = this.activeTrade
      const item = this.activeTrace
      if (!trade || !item) return
      if (!window.confirm(`确定删除链路「${item.name}」？`)) return
      const idx = (trade.traces || []).findIndex((it) => it.id === item.id)
      if (idx === -1) return
      trade.traces.splice(idx, 1)
      const next = trade.traces[0] || null
      this.activeTraceId = next?.id || ''
      trade.activeTraceId = this.activeTraceId
      this.trace = deepClone(next?.trace || sanitizeTrace(buildDemoTrace()))
      this.activeStepIndex = 0
      this.saveTrades()
    },
    addAsNewFromJson() {
      const parsed = safeParseJson(this.jsonText)
      if (!parsed.ok) {
        this.jsonError = parsed.error
        return
      }
      const nextTrace = sanitizeTrace(parsed.value)
      if (!Array.isArray(nextTrace.spans) || nextTrace.spans.length === 0) {
        this.jsonError = 'spans 为空：请至少提供一个 span。'
        return
      }
      const trade = this.activeTrade
      if (!trade) {
        this.jsonError = '请先创建或选择一个交易。'
        return
      }
      const defaultName = `导入链路 ${new Date().toLocaleString('zh-CN', { hour12: false })}`
      const name = window.prompt('链路名称', defaultName)
      if (name === null) return
      const item = {
        id: `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: String(name).trim() || defaultName,
        trace: nextTrace
      }
      trade.traces.unshift(item)
      trade.activeTraceId = item.id
      this.activeTraceId = item.id
      this.trace = deepClone(item.trace)
      this.activeStepIndex = 0
      this.panel = 'edit'
      this.editorTab = 'builder'
      this.saveTrades()
      this.jsonError = ''
    },
    traceDuration(trace) {
      const spans = trace?.spans || []
      if (!Array.isArray(spans) || spans.length === 0) return 0
      const start = Math.min(...spans.map((s) => s.start || 0))
      const end = Math.max(...spans.map((s) => (s.start || 0) + (s.duration || 0)))
      return Math.max(0, end - start)
    },
    applyTemplate(templateId) {
      const tpl = this.templates.find((t) => t.id === templateId) || this.templates[0]
      this.trace = sanitizeTrace(tpl.build())
      this.activeStepIndex = 0
      this.jsonError = ''
      this.syncJsonFromTrace()
      this.syncBuilderFromTrace()
    },
    syncJsonFromTrace() {
      this.jsonText = this.formatJson(this.trace)
      this.jsonError = ''
    },
    applyJson() {
      const parsed = safeParseJson(this.jsonText)
      if (!parsed.ok) {
        this.jsonError = parsed.error
        return
      }
      const next = sanitizeTrace(parsed.value)
      if (!Array.isArray(next.spans) || next.spans.length === 0) {
        this.jsonError = 'spans 为空：请至少提供一个 span。'
        return
      }
      this.trace = next
      this.activeStepIndex = 0
      this.jsonError = ''
      this.syncBuilderFromTrace()
    },
    async copyJson() {
      const text = String(this.jsonText || '')
      try {
        await navigator.clipboard.writeText(text)
      } catch (error) {
        try {
          const ta = document.createElement('textarea')
          ta.value = text
          ta.style.position = 'fixed'
          ta.style.left = '-9999px'
          document.body.appendChild(ta)
          ta.focus()
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        } catch (_) {
          this.jsonError = '复制失败：请手动全选复制。'
        }
      }
    },
    syncBuilderFromTrace() {
      this.editableSpans = sortSpansByStart(this.trace.spans || []).map((span) => ({
        id: String(span.id || ''),
        service: String(span.service || ''),
        operation: String(span.operation || ''),
        parentId: span.parentId == null ? '' : String(span.parentId),
        start: Number(span.start ?? 0),
        duration: Number(span.duration ?? 0),
        status: span.status === 'ERROR' ? 'ERROR' : 'OK',
        tagsText: tagsToText(span.tags)
      }))
    },
    commitBuilder() {
      const spans = (this.editableSpans || []).map((row, idx) => ({
        id: String(row.id || `span_${idx + 1}`),
        service: String(row.service || '').trim() || 'service_***',
        operation: String(row.operation || '').trim() || 'operation_***',
        parentId: String(row.parentId || '').trim() ? String(row.parentId || '').trim() : null,
        start: Number.isFinite(Number(row.start)) && Number(row.start) >= 0 ? Number(row.start) : 0,
        duration: Number.isFinite(Number(row.duration)) && Number(row.duration) >= 0 ? Number(row.duration) : 0,
        status: String(row.status || 'OK').toUpperCase() === 'ERROR' ? 'ERROR' : 'OK',
        tags: parseTagsText(row.tagsText)
      }))

      this.trace = sanitizeTrace({ ...this.trace, spans })
      if (this.activeStepIndex >= this.steps.length) this.activeStepIndex = Math.max(0, this.steps.length - 1)
      if (this.editorTab === 'json') this.syncJsonFromTrace()
    },
    addSpan() {
      const nextIndex = (this.editableSpans?.length || 0) + 1
      ;(this.editableSpans ??= []).push({
        id: `n${Date.now()}_${nextIndex}`,
        service: 'service_***',
        operation: 'operation_***',
        parentId: '',
        start: this.totalDuration,
        duration: 20,
        status: 'OK',
        tagsText: ''
      })
      this.commitBuilder()
    },
    removeSpan(index) {
      this.editableSpans.splice(index, 1)
      this.commitBuilder()
    },
    normalizeSpanTimes() {
      const sorted = [...(this.editableSpans || [])].sort((a, b) => Number(a.start ?? 0) - Number(b.start ?? 0))
      let cursor = 0
      this.editableSpans = sorted.map((row) => {
        const duration = Number.isFinite(Number(row.duration)) && Number(row.duration) >= 0 ? Number(row.duration) : 0
        const start = Number.isFinite(Number(row.start)) && Number(row.start) >= 0 ? Number(row.start) : cursor
        cursor = Math.max(cursor, start + duration)
        return { ...row, start }
      })
      this.commitBuilder()
    },
    formatMoney(value) {
      if (value == null) return '—'
      const num = Number(value)
      if (Number.isNaN(num)) return '—'
      return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatJson(value) {
      try {
        return JSON.stringify(value, null, 2)
      } catch (error) {
        return String(value ?? '')
      }
    },
    formatTags(tags) {
      if (!tags || typeof tags !== 'object') return '—'
      const sanitized = pick(tags, Object.keys(tags).slice(0, 6))
      const entries = Object.entries(sanitized).map(([k, v]) => `${k}=${String(v)}`)
      return entries.length ? entries.join(' · ') : '—'
    }
  },
  mounted() {
    const loaded = this.loadTrades()
    if (!loaded) {
      const migrated = this.migrateLegacyLibraryIfNeeded()
      if (!migrated) {
        this.trades = buildDefaultTrades()
        this.activeTradeId = this.trades[0]?.id || ''
        this.activeTraceId = this.trades[0]?.traces?.[0]?.id || ''
        if (this.trades[0]) this.trades[0].activeTraceId = this.activeTraceId
        this.trace = deepClone(this.trades[0]?.traces?.[0]?.trace || sanitizeTrace(buildDemoTrace()))
        this.saveTrades()
      }
    }

    if (this.activeTradeId && !this.activeTrade) {
      this.activeTradeId = this.trades[0]?.id || ''
    }
    if (this.activeTrade && (!this.activeTraceId || !this.activeTrace)) {
      this.activeTraceId = this.activeTrade.traces?.[0]?.id || ''
      this.activeTrade.activeTraceId = this.activeTraceId
      this.trace = deepClone(this.activeTrace?.trace || sanitizeTrace(buildDemoTrace()))
    }
  }
}
</script>

<style scoped>
.trace-demo {
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
  padding: 16px;
}

.trace-demo__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.eyebrow {
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-text-muted);
  margin: 0 0 4px;
}

.title {
  margin: 0;
}

.subtitle {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 0.9rem;
}

.trace-demo__actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.mode-toggle {
  display: inline-flex;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-bg);
  gap: 4px;
}

.mode-btn {
  border: none;
  background: transparent;
  color: var(--app-text);
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
}

.mode-btn.active {
  background: var(--app-primary-light);
  color: var(--app-primary);
}

.ghost-btn {
  border: 1px solid var(--app-border);
  background: transparent;
  color: var(--app-text);
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
}

.trace-demo__body {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.library {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-bg);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trade-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.trade-bar__title {
  display: flex;
  gap: 8px;
  align-items: baseline;
  flex-wrap: wrap;
}

.muted {
  color: var(--app-text-muted);
  font-size: 0.88rem;
  font-weight: 700;
}

.trade-bar__left {
  flex: 1;
  min-width: 220px;
}

.trade-bar__right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.trade-bar__list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.trade-item {
  border: 1px solid var(--app-border);
  background: var(--app-card);
  color: var(--app-text);
  padding: 8px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
  font-size: 0.9rem;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-item.active {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.library__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.library__left {
  flex: 1;
  min-width: 220px;
}

.library-search {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  color: var(--app-text);
  padding: 10px 12px;
  font-size: 0.9rem;
}

.library__right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.ghost-btn.danger {
  border-color: rgba(220, 38, 38, 0.35);
  color: #b91c1c;
  background: rgba(220, 38, 38, 0.06);
}

.create-panel {
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
  padding-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
  align-items: end;
}

.create-panel--single {
  grid-template-columns: 1fr;
}

.create-panel__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.create-label {
  font-weight: 900;
  color: var(--app-text-muted);
  font-size: 0.86rem;
}

.create-input {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  color: var(--app-text);
  padding: 10px 12px;
  font-size: 0.9rem;
}

.create-panel__actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.library__list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: stretch;
}

.library-item {
  border: 1px solid var(--app-border);
  background: var(--app-card);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 220px;
  max-width: 100%;
  flex: 1 1 260px;
  text-align: left;
}

.library-item.active {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.library-item__name {
  font-weight: 900;
  color: var(--app-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.library-item__meta {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  flex: 0 0 auto;
}

.library-item__ms {
  font-weight: 900;
  color: var(--app-text-muted);
  font-size: 0.85rem;
}

.library-empty {
  margin: 4px 0 0;
  color: var(--app-text-muted);
  font-size: 0.9rem;
}

.editor {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-bg);
  overflow: hidden;
}

.editor__tabs {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: var(--app-card);
}

.editor-tab {
  border: 1px solid var(--app-border);
  background: transparent;
  color: var(--app-text);
  padding: 8px 10px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 900;
  font-size: 0.9rem;
}

.editor-tab.active {
  background: var(--app-primary-light);
  color: var(--app-primary);
  border-color: rgba(59, 130, 246, 0.35);
}

.editor__panel {
  padding: 12px;
}

.editor-hint {
  margin: 10px 0 0;
  color: var(--app-text-muted);
  font-size: 0.88rem;
}

.template-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.template-label {
  font-weight: 900;
  color: var(--app-text-muted);
}

.template-select {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  color: var(--app-text);
  padding: 10px 12px;
  min-width: 260px;
}

.primary-btn {
  border: none;
  background: var(--app-primary);
  color: white;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 900;
}

.json-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.json-area {
  width: 100%;
  min-height: 240px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  color: var(--app-text);
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85rem;
  line-height: 1.35rem;
  resize: vertical;
}

.json-error {
  margin: 8px 0 0;
  color: #dc2626;
  font-weight: 900;
  font-size: 0.9rem;
}

.builder-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 10px;
}

.builder-title {
  display: flex;
  gap: 10px;
  align-items: baseline;
  flex-wrap: wrap;
}

.builder-sub {
  color: var(--app-text-muted);
  font-size: 0.88rem;
  font-weight: 700;
}

.builder-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.builder-table {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--app-card);
}

.brow {
  display: grid;
  grid-template-columns: 160px 1fr 140px 80px 92px 92px 1.1fr 44px;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  align-items: center;
}

.brow--head {
  background: var(--app-bg);
  font-weight: 900;
  color: var(--app-text-muted);
  font-size: 0.85rem;
}

.brow:last-child {
  border-bottom: none;
}

.in,
.sel {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-bg);
  color: var(--app-text);
  padding: 8px 10px;
  font-size: 0.88rem;
}

.in-num {
  text-align: right;
  padding-right: 8px;
}

.icon-btn {
  border: 1px solid var(--app-border);
  background: transparent;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
}

.trace-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-bg);
}

.meta-item {
  font-size: 0.86rem;
  color: var(--app-text-muted);
}

.meta-item strong {
  color: var(--app-text);
  font-weight: 800;
  margin-right: 6px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.78rem;
  border: 1px solid var(--app-border);
  color: var(--app-text);
  background: var(--app-card);
}

.badge.ok {
  border-color: rgba(22, 163, 74, 0.6);
  color: #16a34a;
  background: rgba(22, 163, 74, 0.08);
}

.badge.warn {
  border-color: rgba(245, 158, 11, 0.65);
  color: #b45309;
  background: rgba(245, 158, 11, 0.12);
}

.badge.bad {
  border-color: rgba(220, 38, 38, 0.6);
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
}

.stepper {
  display: grid;
  grid-template-columns: repeat(5, minmax(140px, 1fr));
  gap: 10px;
}

.stepper__item {
  border: 1px solid var(--app-border);
  background: var(--app-card);
  border-radius: 14px;
  padding: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.stepper__item:hover {
  transform: translateY(-1px);
  border-color: rgba(0, 0, 0, 0.15);
}

.stepper__item.active {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--app-primary);
  flex: 0 0 auto;
}

.label {
  font-weight: 800;
  color: var(--app-text);
  flex: 1;
  font-size: 0.92rem;
}

.ms {
  font-weight: 900;
  color: var(--app-text-muted);
  font-size: 0.85rem;
}

.panel {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-card);
  padding: 14px;
}

.panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.panel__title {
  margin: 0;
  font-size: 1rem;
}

.panel__subtitle {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 0.9rem;
}

.panel__tag {
  font-size: 0.8rem;
  color: var(--app-text-muted);
  background: var(--app-bg);
  border: 1px solid var(--app-border);
  padding: 6px 10px;
  border-radius: 999px;
  font-weight: 800;
}

.result-card {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 12px;
  background: var(--app-bg);
}

.result-card__left .k {
  margin: 0;
  font-size: 0.82rem;
  color: var(--app-text-muted);
  font-weight: 800;
}

.result-card__left .v {
  margin: 6px 0 0;
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--app-text);
}

.result-card__left .hint {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 0.82rem;
}

.kv {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
}

.kv:last-child {
  border-bottom: none;
}

.kv-k {
  color: var(--app-text-muted);
  font-weight: 800;
  font-size: 0.85rem;
}

.kv-v {
  color: var(--app-text);
  font-weight: 800;
  font-size: 0.85rem;
  text-align: right;
}

.plain-list {
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--app-text);
}

.training-top {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mini-card {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-bg);
  padding: 10px 12px;
}

.mini-title {
  margin: 0 0 6px;
  font-size: 0.85rem;
  font-weight: 900;
  color: var(--app-text-muted);
}

.code {
  margin: 0;
  overflow: auto;
  max-height: 220px;
  font-size: 0.82rem;
  color: var(--app-text);
}

.spans {
  margin-top: 12px;
}

.spans__head h5 {
  margin: 0;
  font-size: 0.95rem;
}

.spans__sub {
  margin: 6px 0 8px;
  color: var(--app-text-muted);
  font-size: 0.88rem;
}

.spans__table {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--app-bg);
}

.waterfall {
  margin-top: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-bg);
  padding: 10px 12px;
}

.waterfall__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.waterfall__head h5 {
  margin: 0;
  font-size: 0.95rem;
}

.waterfall__sub {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 0.88rem;
}

.waterfall__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.waterfall__scope {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--app-text-muted);
  font-weight: 900;
  font-size: 0.86rem;
}

.waterfall__axis {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  color: var(--app-text-muted);
  font-weight: 900;
  font-size: 0.8rem;
}

.waterfall__table {
  margin-top: 8px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  overflow-x: auto;
  background: var(--app-card);
}

.tree-indent {
  display: inline-block;
  margin-right: 6px;
  color: var(--app-text-muted);
  font-weight: 900;
}

.wrow {
  display: grid;
  grid-template-columns: 160px 1fr 86px 84px 520px;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  align-items: center;
  font-size: 0.86rem;
  min-width: 980px;
}

.wrow--head {
  background: var(--app-bg);
  font-weight: 900;
  color: var(--app-text-muted);
}

.wrow:last-child {
  border-bottom: none;
}

.wbar-head {
  color: var(--app-text-muted);
}

.wbar {
  position: relative;
  height: 20px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.wgrid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(to right, rgba(0, 0, 0, 0.06) 1px, transparent 1px);
  background-size: 25% 100%;
  opacity: 0.7;
  pointer-events: none;
}

.wbar__fill {
  position: absolute;
  top: 3px;
  height: 14px;
  border-radius: 8px;
}

.wbar__fill.ok {
  background: rgba(22, 163, 74, 0.55);
}

.wbar__fill.bad {
  background: rgba(220, 38, 38, 0.55);
}

.row {
  display: grid;
  grid-template-columns: 160px 1fr 140px 86px 84px 1.2fr;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  align-items: center;
  font-size: 0.86rem;
}

.row--head {
  background: var(--app-card);
  font-weight: 900;
  color: var(--app-text-muted);
}

.row:last-child {
  border-bottom: none;
}

.svc {
  font-weight: 900;
  color: var(--app-text);
}

.op {
  color: var(--app-text);
}

.dur {
  font-weight: 900;
  color: var(--app-text);
}

.tags {
  color: var(--app-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .stepper {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .result-card {
    grid-template-columns: 1fr;
  }

  .training-top {
    grid-template-columns: 1fr;
  }

  .row {
    grid-template-columns: 1fr;
  }

  .tags {
    white-space: normal;
  }

  .brow {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .trade-bar__left {
    min-width: 100%;
  }

  .trade-bar__right {
    width: 100%;
  }

  .trade-bar__list {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 6px;
    -webkit-overflow-scrolling: touch;
  }

  .trade-item {
    flex: 0 0 auto;
    max-width: 78%;
  }

  .library__left {
    min-width: 100%;
  }

  .library__right {
    width: 100%;
  }

  .library__list {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 6px;
    -webkit-overflow-scrolling: touch;
  }

  .library-item {
    flex: 0 0 78%;
    min-width: 240px;
  }

  .create-panel {
    grid-template-columns: 1fr;
  }

  .create-panel__actions {
    justify-content: stretch;
  }
}

@media (max-width: 520px) {
  .stepper {
    grid-template-columns: 1fr;
  }

  .waterfall__table {
    border-radius: 10px;
  }

  .wrow {
    min-width: 820px;
  }
}
</style>
