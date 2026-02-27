<template>
  <div class="trade-flow-explorer">
    <header class="trade-header">
      <div>
        <p class="eyebrow">交易流程 · 理解辅助</p>
        <h2>交易流程讲解面板</h2>
        <p class="subtitle">选择不同交易场景，查看路径分支、关键节点与风险提示。</p>
      </div>
      <div class="scenario-switch">
        <label>场景</label>
        <select v-model="activeScenarioId">
          <option v-for="scenario in scenarios" :key="scenario.id" :value="scenario.id">
            {{ scenario.name }}
          </option>
        </select>
      </div>
    </header>

    <div class="trade-layout">
      <aside class="trade-sidebar">
        <h3>交易类型</h3>
        <div class="flow-list">
          <button
            v-for="flow in flows"
            :key="flow.id"
            class="flow-item"
            :class="{ active: flow.id === activeFlowId }"
            @click="activeFlowId = flow.id"
          >
            <span>{{ flow.name }}</span>
            <small>{{ flow.steps.length }} 步</small>
          </button>
        </div>
        <div class="legend">
          <h4>图例</h4>
          <div><span class="dot normal"></span> 主路径</div>
          <div><span class="dot conditional"></span> 条件分支</div>
          <div><span class="dot risk"></span> 风险点</div>
        </div>
      </aside>

      <main class="trade-canvas">
        <div class="canvas-header">
          <div>
            <h3>{{ activeFlow.name }}</h3>
            <p class="subtitle">{{ activeFlow.description }}</p>
          </div>
          <div class="canvas-actions">
            <span class="status-badge">{{ activeScenario.name }}</span>
            <button class="btn btn-small" @click="selectFirstStep">定位起点</button>
          </div>
        </div>

        <div class="trace-panel">
          <div class="trace-panel__top">
            <div class="trace-meta">
              <p class="eyebrow">链路时间线</p>
              <p class="trace-subtitle">
                当前步骤：<strong>{{ activeStep ? activeStep.title : '—' }}</strong>
                <span v-if="pathIndex >= 0" class="trace-progress">（{{ pathIndex + 1 }}/{{ activeScenario.path.length }}）</span>
                <span v-else class="trace-progress">（不在当前路径）</span>
              </p>
            </div>
            <div class="trace-actions">
              <button class="btn btn-small" :disabled="!hasPrevInPath || isPlaying" @click="prevInPath">上一步</button>
              <button class="btn btn-small btn-primary" :disabled="!canPlay" @click="togglePlay">
                {{ isPlaying ? '暂停' : '播放' }}
              </button>
              <button class="btn btn-small" :disabled="!hasNextInPath || isPlaying" @click="nextInPath">下一步</button>
              <label class="trace-toggle">
                <input type="checkbox" v-model="showOnlyPath" />
                <span>仅显示当前路径</span>
              </label>
            </div>
          </div>

          <div class="trace-timeline">
            <button
              v-for="stepId in activeScenario.path"
              :key="stepId"
              class="trace-node"
              :class="{ active: stepId === activeStepId }"
              @click="selectStep(stepId)"
              :title="stepTitle(stepId)"
            >
              <span class="trace-node__dot"></span>
              <span class="trace-node__text">{{ stepTitle(stepId) }}</span>
            </button>
          </div>
        </div>

        <div class="lane">
          <div
            v-for="step in visibleSteps"
            :key="step.id"
            class="step-card"
            :class="stepCardClass(step)"
            @click="selectStep(step.id)"
          >
            <div class="step-index">{{ step.index }}</div>
            <div class="step-content">
              <div class="step-title">
                {{ step.title }}
                <span v-if="step.conditional" class="tag">条件</span>
                <span v-if="step.risk" class="tag risk">风险</span>
              </div>
              <p class="step-desc">{{ step.summary }}</p>
              <div class="step-meta">
                <span v-if="step.role">角色: {{ step.role }}</span>
                <span v-if="step.duration">耗时: {{ step.duration }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside class="trade-detail">
        <div class="detail-card">
          <div class="inspector-header">
            <div>
              <p class="eyebrow">Inspector</p>
              <h3>{{ activeStep ? activeStep.title : '步骤解读' }}</h3>
              <p class="subtitle">讲解 / 数据 / 代码走向 / 可观测</p>
            </div>
          </div>

          <div class="inspector-tabs">
            <button class="inspector-tab" :class="{ active: inspectorTab === 'explain' }" @click="inspectorTab = 'explain'">
              讲解
            </button>
            <button class="inspector-tab" :class="{ active: inspectorTab === 'data' }" @click="inspectorTab = 'data'">
              数据
            </button>
            <button class="inspector-tab" :class="{ active: inspectorTab === 'code' }" @click="inspectorTab = 'code'">
              代码走向
            </button>
            <button class="inspector-tab" :class="{ active: inspectorTab === 'obs' }" @click="inspectorTab = 'obs'">
              可观测
            </button>
          </div>

          <div class="inspector-body">
            <div v-if="!activeStep" class="empty-state">点击流程步骤查看解释</div>

            <template v-else>
              <section v-if="inspectorTab === 'explain'">
                <p class="detail-text">{{ activeStep.description }}</p>
                <div class="detail-section">
                  <p class="section-title">为什么需要此步骤</p>
                  <p class="detail-text">{{ activeStep.reason }}</p>
                </div>
                <div v-if="activeStep.risk" class="detail-section risk-box">
                  <p class="section-title">风险提示</p>
                  <p class="detail-text">{{ activeStep.risk }}</p>
                </div>
                <div v-if="activeStep.terms?.length" class="detail-section">
                  <p class="section-title">关键术语</p>
                  <ul class="term-list">
                    <li v-for="term in activeStep.terms" :key="term">
                      <strong>{{ term }}</strong>
                      <span>{{ glossary[term] || '暂无说明' }}</span>
                    </li>
                  </ul>
                </div>
              </section>

              <section v-else-if="inspectorTab === 'data'">
                <div class="detail-section">
                  <p class="section-title">示例请求</p>
                  <pre class="code-block">{{ formatJson(stepDoc.request) }}</pre>
                </div>
                <div class="detail-section">
                  <p class="section-title">示例响应</p>
                  <pre class="code-block">{{ formatJson(stepDoc.response) }}</pre>
                </div>
                <div v-if="stepDoc.fields?.length" class="detail-section">
                  <p class="section-title">关键字段</p>
                  <ul class="kv-list">
                    <li v-for="item in stepDoc.fields" :key="item.k">
                      <span class="kv-k">{{ item.k }}</span>
                      <span class="kv-v">{{ item.v }}</span>
                    </li>
                  </ul>
                </div>
              </section>

              <section v-else-if="inspectorTab === 'code'">
                <p class="detail-text">
                  这里展示的是“教学式代码走向”。真实撮合/清结算系统会更复杂；你可以把这些模块当成你系统里的对应层次（入口 → 服务 → 存储/消息）。
                </p>
                <div v-if="stepDoc.code?.length" class="detail-section">
                  <p class="section-title">建议模块</p>
                  <ul class="code-link-list">
                    <li v-for="(link, idx) in stepDoc.code" :key="`${link.label}-${idx}`" class="code-link">
                      <div>
                        <div class="code-link__title">{{ link.label }}</div>
                        <div v-if="link.note" class="code-link__note">{{ link.note }}</div>
                        <div v-if="link.path" class="code-link__path">{{ link.path }}</div>
                      </div>
                      <button v-if="link.path" class="btn btn-small btn-secondary" @click="copyText(link.path)">
                        复制
                      </button>
                    </li>
                  </ul>
                </div>
              </section>

              <section v-else-if="inspectorTab === 'obs'">
                <div class="detail-section">
                  <p class="section-title">推荐 Trace/Span</p>
                  <ul class="chip-list">
                    <li v-for="span in stepDoc.obs?.spans || []" :key="span" class="chip">{{ span }}</li>
                    <li v-if="!(stepDoc.obs?.spans || []).length" class="detail-text">暂无配置（可按步骤自定义）</li>
                  </ul>
                </div>
                <div class="detail-section">
                  <p class="section-title">关键日志</p>
                  <ul class="chip-list">
                    <li v-for="log in stepDoc.obs?.logs || []" :key="log" class="chip chip-muted">{{ log }}</li>
                    <li v-if="!(stepDoc.obs?.logs || []).length" class="detail-text">暂无配置（建议统一 traceId/orderId）</li>
                  </ul>
                </div>
                <div class="detail-section">
                  <p class="section-title">核心指标</p>
                  <ul class="chip-list">
                    <li v-for="m in stepDoc.obs?.metrics || []" :key="m" class="chip chip-outline">{{ m }}</li>
                    <li v-if="!(stepDoc.obs?.metrics || []).length" class="detail-text">暂无配置（建议：成功率、延迟、重试次数）</li>
                  </ul>
                </div>
              </section>
            </template>
          </div>
        </div>

        <div class="detail-card">
          <h3>路径说明</h3>
          <p class="detail-text">{{ activeScenario.note }}</p>
          <ul class="path-list">
            <li v-for="stepId in activeScenario.path" :key="stepId">
              {{ stepTitle(stepId) }}
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradeFlowExplorer',
  data() {
    return {
      activeFlowId: 'settlement',
      activeScenarioId: 'normal',
      activeStepId: 'S1',
      inspectorTab: 'explain',
      showOnlyPath: false,
      isPlaying: false,
      playIntervalMs: 1400,
      playTimer: null,
      flows: [
        {
          id: 'settlement',
          name: '撮合-清结算',
          description: '订单撮合后进入清算与资金交割的全流程。',
          steps: [
            {
              id: 'S1',
              index: '01',
              title: '订单接收',
              summary: '接收交易订单并校验字段完整性',
              description: '系统接收外部订单并做结构校验，避免非法字段影响后续撮合。',
              reason: '确保订单数据在进入撮合前是可用且合规的。',
              role: '交易网关',
              duration: '秒级',
              terms: ['订单号', '校验规则']
            },
            {
              id: 'S2',
              index: '02',
              title: '风险预检',
              summary: '检查额度、风控名单与限制策略',
              description: '对账户额度、黑名单、限频策略进行检查。',
              reason: '避免高风险订单进入撮合，减少异常交易。',
              role: '风控引擎',
              duration: '秒级',
              risk: '命中黑名单会直接终止交易流程。',
              terms: ['黑名单', '限额']
            },
            {
              id: 'S3',
              index: '03',
              title: '撮合引擎',
              summary: '匹配买卖盘并生成成交记录',
              description: '撮合引擎根据价格优先和时间优先规则撮合订单。',
              reason: '形成成交记录供清算与结算使用。',
              role: '撮合系统',
              duration: '毫秒级',
              terms: ['撮合', '成交']
            },
            {
              id: 'S4',
              index: '04',
              title: '清算计算',
              summary: '计算应收应付金额与费用',
              description: '根据成交记录计算手续费、税费与对账金额。',
              reason: '为后续资金交割提供金额依据。',
              role: '清算引擎',
              duration: '秒级',
              terms: ['清算', '手续费']
            },
            {
              id: 'S5',
              index: '05',
              title: '资金交割',
              summary: '完成资金划拨与结算落账',
              description: '将资金从买方账户划拨至卖方并完成落账。',
              reason: '确保交易结果最终交割。',
              role: '清算银行',
              duration: '分钟级',
              risk: '资金不足或银行接口异常会导致结算失败。',
              terms: ['交割', '结算']
            },
            {
              id: 'S6',
              index: '06',
              title: '对账归档',
              summary: '生成对账文件并归档',
              description: '输出对账文件、更新账务状态并归档。',
              reason: '满足监管和内部审计要求。',
              role: '账务系统',
              duration: '分钟级',
              conditional: true,
              terms: ['对账', '审计']
            }
          ]
        }
      ],
      scenarios: [
        {
          id: 'normal',
          name: '正常成交',
          note: '订单校验通过并完成撮合、清算与资金交割。',
          path: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
        },
        {
          id: 'risk-block',
          name: '风控拦截',
          note: '风险预检命中黑名单，流程在风险节点终止。',
          path: ['S1', 'S2']
        },
        {
          id: 'settlement-fail',
          name: '结算失败',
          note: '撮合完成但交割失败，需进入异常处理。',
          path: ['S1', 'S2', 'S3', 'S4', 'S5']
        }
      ],
      glossary: {
        订单号: '交易订单的唯一编号，用于追踪生命周期。',
        校验规则: '对订单字段、格式、合法性进行的规则检查。',
        黑名单: '存在风险或违规的账户/主体名单。',
        限额: '单笔或周期性的交易额度限制。',
        撮合: '撮合引擎匹配买卖盘并生成成交的过程。',
        成交: '买卖双方达成的交易结果。',
        清算: '根据成交结果计算应收应付资金。',
        手续费: '平台或机构收取的交易费用。',
        交割: '交易资金/资产最终交付。',
        结算: '交易最终确认并记账。',
        对账: '交易记录与资金记录的核对。',
        审计: '对交易过程进行回溯检查。'
      },
      stepDocs: {
        S1: {
          request: {
            orderId: 'O202501010001',
            symbol: '600000.SH',
            side: 'BUY',
            price: 10.23,
            qty: 1000,
            clientTs: '2025-01-01T09:30:00.123Z'
          },
          response: { accepted: true, orderId: 'O202501010001', normalized: true, idempotencyKey: 'idemp_xxx' },
          fields: [
            { k: 'orderId', v: '订单唯一标识，用于全链路追踪' },
            { k: 'idempotencyKey', v: '幂等键，避免重试导致重复下单' }
          ],
          code: [
            { label: '入口层（网关/接入）', note: '参数校验、签名验签、限流', path: 'server/index.js' },
            { label: '接口层（示例：流程 API）', note: '本项目可类比为 REST 路由入口', path: 'server/routes/flows.js' },
            { label: '前端请求封装（示例）', note: '本项目可类比为调用后端 API', path: 'src/utils/api.js' }
          ],
          obs: {
            spans: ['trade.order.ingest'],
            logs: ['order.accepted', 'order.rejected'],
            metrics: ['order_ingest_qps', 'order_ingest_error_rate']
          }
        },
        S2: {
          request: { orderId: 'O202501010001', accountId: 'A10001', checks: ['blacklist', 'limit', 'frequency'] },
          response: { pass: true, reasons: [] },
          fields: [
            { k: 'accountId', v: '风控主体（账户/客户/机构）' },
            { k: 'reasons', v: '拦截原因列表，便于前端提示与审计' }
          ],
          code: [
            { label: '风控服务', note: '黑名单、限额、限频、额度冻结', path: '' },
            { label: '审计记录', note: '记录“拒单/放行”的决策证据', path: 'src/utils/auditLog.js' }
          ],
          obs: {
            spans: ['trade.risk.precheck'],
            logs: ['risk.hit_blacklist', 'risk.limit_exceeded'],
            metrics: ['risk_block_rate', 'risk_check_latency_ms']
          }
        },
        S3: {
          request: { orderId: 'O202501010001', book: 'SH_A', matchPolicy: 'price_time_priority' },
          response: { trades: [{ tradeId: 'T90001', price: 10.23, qty: 500 }], status: 'PARTIAL_FILLED' },
          fields: [
            { k: 'matchPolicy', v: '撮合规则（价优/时优）' },
            { k: 'status', v: '订单状态：部分成交/全部成交/未成交' }
          ],
          code: [
            { label: '撮合引擎', note: '订单簿、成交生成、状态机', path: '' },
            { label: '事件发布（MQ）', note: '成交事件推送给清算/风控/行情', path: '' }
          ],
          obs: {
            spans: ['trade.match'],
            logs: ['match.trade_created', 'order.status_changed'],
            metrics: ['match_latency_ms', 'trade_created_count']
          }
        },
        S4: {
          request: { tradeId: 'T90001', feeModel: 'standard', taxModel: 'cn_stock' },
          response: { gross: 5115.0, fee: 5.12, tax: 0.0, net: 5109.88 },
          fields: [
            { k: 'feeModel', v: '手续费模型（按品种/客户等级/渠道）' },
            { k: 'net', v: '净额：用于后续资金交割/账务落地' }
          ],
          code: [
            { label: '清算服务', note: '费用/税费计算、应收应付', path: '' },
            { label: '账务落库', note: '生成清算分录/对账数据', path: '' }
          ],
          obs: {
            spans: ['trade.clearing'],
            logs: ['clearing.calculated'],
            metrics: ['clearing_latency_ms', 'clearing_error_rate']
          }
        },
        S5: {
          request: {
            settlementId: 'SETTLE_90001',
            payer: 'A10001',
            payee: 'A20002',
            amount: 5109.88,
            currency: 'CNY'
          },
          response: { success: true, bankRef: 'BANK_REF_123', postedAt: '2025-01-01T09:31:30.000Z' },
          fields: [
            { k: 'bankRef', v: '外部系统返回的流水号（对账关键）' },
            { k: 'postedAt', v: '入账时间（回溯与争议处理关键）' }
          ],
          code: [
            { label: '结算/支付通道', note: '银行接口、重试、超时、补偿', path: '' },
            { label: '异常处理', note: '失败重试/人工介入/资金回滚', path: '' }
          ],
          obs: {
            spans: ['trade.settlement'],
            logs: ['settlement.bank_request', 'settlement.bank_response'],
            metrics: ['settlement_success_rate', 'settlement_retry_count']
          }
        },
        S6: {
          request: { date: '2025-01-01', files: ['trades.csv', 'cash_ledger.csv'] },
          response: { archived: true, reportId: 'RPT_20250101', mismatches: 0 },
          fields: [
            { k: 'reportId', v: '对账/审计报告编号' },
            { k: 'mismatches', v: '差异条数（需进入核对流程）' }
          ],
          code: [
            { label: '对账作业', note: '文件生成、差异核对、归档', path: '' },
            { label: '审计归档', note: '保留关键证据链', path: 'src/utils/auditLog.js' }
          ],
          obs: {
            spans: ['trade.reconcile'],
            logs: ['reconcile.report_generated', 'reconcile.mismatch_found'],
            metrics: ['reconcile_mismatch_count', 'reconcile_duration_ms']
          }
        }
      }
    }
  },
  computed: {
    activeFlow() {
      return this.flows.find(flow => flow.id === this.activeFlowId) || this.flows[0]
    },
    activeScenario() {
      return this.scenarios.find(scenario => scenario.id === this.activeScenarioId) || this.scenarios[0]
    },
    activeStep() {
      return this.activeFlow.steps.find(step => step.id === this.activeStepId)
    },
    visibleSteps() {
      if (!this.showOnlyPath) return this.activeFlow.steps
      const allowed = new Set(this.activeScenario.path)
      return this.activeFlow.steps.filter((step) => allowed.has(step.id))
    },
    pathIndex() {
      return this.activeScenario.path.indexOf(this.activeStepId)
    },
    hasPrevInPath() {
      return this.pathIndex > 0
    },
    hasNextInPath() {
      return this.pathIndex >= 0 && this.pathIndex < this.activeScenario.path.length - 1
    },
    canPlay() {
      return this.activeScenario.path.length > 0
    },
    stepDoc() {
      return this.stepDocs[this.activeStepId] || { request: {}, response: {}, fields: [], code: [], obs: {} }
    }
  },
  methods: {
    stepTitle(stepId) {
      const step = this.activeFlow.steps.find(item => item.id === stepId)
      return step ? step.title : stepId
    },
    stepCardClass(step) {
      return {
        active: step.id === this.activeStepId,
        highlighted: this.activeScenario.path.includes(step.id),
        conditional: step.conditional,
        risk: !!step.risk
      }
    },
    selectFirstStep() {
      this.stopPlay()
      this.activeStepId = this.activeScenario.path[0] || this.activeFlow.steps[0]?.id || null
    },
    selectStep(stepId) {
      this.stopPlay()
      this.activeStepId = stepId
    },
    prevInPath() {
      const idx = this.pathIndex
      if (idx <= 0) return
      this.selectStep(this.activeScenario.path[idx - 1])
    },
    nextInPath() {
      const idx = this.pathIndex
      if (idx < 0) {
        this.selectStep(this.activeScenario.path[0])
        return
      }
      if (idx >= this.activeScenario.path.length - 1) return
      this.selectStep(this.activeScenario.path[idx + 1])
    },
    togglePlay() {
      if (this.isPlaying) {
        this.stopPlay()
        return
      }
      this.isPlaying = true
      if (this.pathIndex < 0) {
        this.activeStepId = this.activeScenario.path[0]
      }
      this.playTimer = window.setInterval(() => {
        if (!this.hasNextInPath) {
          this.stopPlay()
          return
        }
        this.activeStepId = this.activeScenario.path[this.pathIndex + 1]
      }, this.playIntervalMs)
    },
    stopPlay() {
      this.isPlaying = false
      if (this.playTimer) {
        clearInterval(this.playTimer)
        this.playTimer = null
      }
    },
    formatJson(value) {
      try {
        return JSON.stringify(value ?? {}, null, 2)
      } catch (error) {
        return String(value || '')
      }
    },
    async copyText(text) {
      const raw = String(text || '').trim()
      if (!raw) return
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(raw)
          return
        }
      } catch (error) {
        // fallback below
      }
      const textarea = document.createElement('textarea')
      textarea.value = raw
      textarea.setAttribute('readonly', 'true')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  },
  watch: {
    activeFlowId() {
      this.selectFirstStep()
    },
    activeScenarioId() {
      const first = this.activeScenario.path[0]
      this.stopPlay()
      this.activeStepId = first || this.activeFlow.steps[0]?.id || null
    }
  },
  beforeUnmount() {
    this.stopPlay()
  }
}
</script>

<style scoped>
.trade-flow-explorer {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trade-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.trade-header h2 {
  margin: 4px 0;
}

.subtitle {
  margin: 0;
  color: var(--app-text-muted);
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  font-size: 0.8em;
  letter-spacing: 0.08em;
  color: var(--app-text-muted);
}

.scenario-switch {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.scenario-switch label {
  font-size: 0.85em;
  color: var(--app-text-muted);
}

.scenario-switch select {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
}

.trade-layout {
  display: grid;
  grid-template-columns: 220px 1fr 300px;
  gap: 16px;
}

.trade-sidebar,
.trade-detail {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 14px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
}

.trade-sidebar h3 {
  margin-top: 0;
}

.flow-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flow-item {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  padding: 10px;
  cursor: pointer;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.flow-item.active {
  border-color: var(--app-primary);
  box-shadow: 0 6px 16px var(--app-shadow-light);
}

.legend {
  margin-top: 16px;
  font-size: 0.85em;
  color: var(--app-text-muted);
}

.legend h4 {
  margin-bottom: 6px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}

.dot.normal {
  background: var(--app-primary);
}

.dot.conditional {
  background: #f59e0b;
}

.dot.risk {
  background: #ef4444;
}

.trade-canvas {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 16px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
}

.canvas-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
  font-size: 0.85em;
  font-weight: 600;
}

.lane {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.trace-panel {
  margin-top: 14px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card-elevated);
  padding: 12px;
}

.trace-panel__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.trace-subtitle {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 0.9em;
}

.trace-progress {
  color: var(--app-text-muted);
  font-weight: 600;
}

.trace-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.trace-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
  color: var(--app-text);
  font-size: 0.85em;
  user-select: none;
}

.trace-timeline {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-top: 10px;
}

.trace-node {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
  border-radius: 999px;
  padding: 8px 10px;
  cursor: pointer;
  white-space: nowrap;
}

.trace-node.active {
  border-color: var(--app-primary);
  box-shadow: 0 10px 24px rgba(2, 132, 199, 0.15);
}

.trace-node__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--app-text-muted);
}

.trace-node.active .trace-node__dot {
  background: var(--app-primary);
}

.trace-node__text {
  font-size: 0.9em;
  font-weight: 700;
  color: var(--app-text);
}

.step-card {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
  background: var(--app-card-elevated);
  transition: transform 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
}

.step-card.highlighted {
  border-color: var(--app-primary);
  box-shadow: 0 10px 24px rgba(16, 185, 129, 0.2);
}

.step-card.active {
  transform: translateY(-2px);
  border-color: var(--app-primary);
}

.step-card.conditional {
  border-left: 4px solid #f59e0b;
}

.step-card.risk {
  border-left: 4px solid #ef4444;
}

.step-index {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--app-primary);
  color: var(--app-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.step-content {
  flex: 1;
}

.step-title {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tag {
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
  font-size: 0.7em;
}

.tag.risk {
  background: rgba(239, 68, 68, 0.15);
  color: #b91c1c;
}

.step-desc {
  margin: 4px 0 0;
  color: var(--app-text-muted);
}

.step-meta {
  margin-top: 6px;
  font-size: 0.8em;
  color: var(--app-text-muted);
  display: flex;
  gap: 10px;
}

.detail-card {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 12px;
  background: var(--app-card-elevated);
  margin-bottom: 12px;
}

.inspector-header h3 {
  margin: 6px 0 0;
}

.inspector-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 12px;
}

.inspector-tab {
  border: 1px solid var(--app-border);
  background: var(--app-card);
  border-radius: 10px;
  padding: 8px 8px;
  cursor: pointer;
  font-weight: 800;
  color: var(--app-text-muted);
}

.inspector-tab.active {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
}

.inspector-body {
  margin-top: 12px;
}

.code-block {
  margin: 8px 0 0;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: rgba(15, 23, 42, 0.06);
  overflow: auto;
  font-size: 0.85em;
}

.kv-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kv-list li {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
  border-radius: 12px;
  padding: 10px;
}

.kv-k {
  font-weight: 900;
  color: var(--app-text);
}

.kv-v {
  color: var(--app-text-muted);
  font-size: 0.9em;
}

.code-link-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.code-link {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
  border-radius: 12px;
  padding: 10px;
  align-items: flex-start;
}

.code-link__title {
  font-weight: 900;
}

.code-link__note {
  color: var(--app-text-muted);
  font-size: 0.88em;
  margin-top: 4px;
}

.code-link__path {
  margin-top: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 0.84em;
  color: var(--app-text);
  word-break: break-all;
}

.chip-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
  font-size: 0.85em;
  font-weight: 700;
}

.chip-muted {
  background: rgba(2, 132, 199, 0.08);
  border-color: rgba(2, 132, 199, 0.18);
}

.chip-outline {
  background: transparent;
}

.detail-card h3 {
  margin-top: 0;
}

.detail-text {
  color: var(--app-text-muted);
}

.detail-section {
  margin-top: 10px;
}

.risk-box {
  border: 1px dashed rgba(239, 68, 68, 0.4);
  border-radius: 10px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.08);
}

.section-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.term-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.term-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.85em;
  color: var(--app-text-muted);
}

.path-list {
  padding-left: 16px;
  margin: 0;
  color: var(--app-text-muted);
}

.empty-state {
  padding: 12px;
  text-align: center;
  color: var(--app-text-muted);
}

@media (max-width: 1100px) {
  .trade-layout {
    grid-template-columns: 1fr;
  }
}
</style>
