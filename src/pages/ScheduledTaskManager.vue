<template>
  <div class="scheduler-page">
    <section class="hero">
      <div>
        <h2>定时任务中心</h2>
        <p>默认可视化配置，不懂 cron 也能快速创建定时任务</p>
      </div>
      <div class="hero-right">
        <span class="now-chip">{{ formatDate(nowTime) }}</span>
        <button class="btn ghost" @click="importLegacyDocScheduler">导入旧版目录扫描定时</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h3>新建任务</h3>
        <div class="mode-switch">
          <button class="btn" :class="{ active: uiMode === 'simple' }" @click="uiMode = 'simple'">简单模式</button>
          <button class="btn" :class="{ active: uiMode === 'advanced' }" @click="uiMode = 'advanced'">高级模式（cron）</button>
        </div>
      </div>

      <div class="form-grid">
        <label>
          任务名称
          <input v-model.trim="form.name" type="text" maxlength="60" placeholder="例如：工作日文档扫描" />
        </label>

        <label>
          执行动作
          <select v-model="form.actionType">
            <option value="log">记录日志</option>
            <option value="notify">浏览器通知</option>
            <option value="doc_scan">扫描目录（文档）</option>
            <option value="script">执行脚本（Shell/Python）</option>
          </select>
        </label>

        <label class="col-2">
          任务描述
          <textarea v-model.trim="form.description" rows="2" maxlength="200" placeholder="可选"></textarea>
        </label>

        <label>
          触发方式
          <select v-model="form.mode">
            <option value="once">单次触发</option>
            <option value="cron">循环触发</option>
          </select>
        </label>
      </div>

      <div v-if="uiMode === 'simple'" class="rule-card">
        <h4>可视化时间配置</h4>

        <div v-if="form.mode === 'once'" class="simple-grid">
          <label>
            日期时间
            <input v-model="simple.onceDateTime" type="datetime-local" />
          </label>
          <label>
            秒
            <input v-model.number="simple.second" type="number" min="0" max="59" />
          </label>
        </div>

        <div v-else>
          <div class="preset-row">
            <span class="preset-label">常用预设：</span>
            <button class="chip" @click="applyPreset('10s')">每10秒</button>
            <button class="chip" @click="applyPreset('15s')">每15秒</button>
            <button class="chip" @click="applyPreset('1m')">每1分钟</button>
            <button class="chip" @click="applyPreset('5m')">每5分钟</button>
            <button class="chip" @click="applyPreset('15m')">每15分钟</button>
            <button class="chip" @click="applyPreset('30m')">每30分钟</button>
            <button class="chip" @click="applyPreset('1h')">每1小时</button>
            <button class="chip" @click="applyPreset('daily9')">每天09:00</button>
            <button class="chip" @click="applyPreset('daily18')">每天18:00</button>
            <button class="chip" @click="applyPreset('weekday10')">工作日10:00</button>
            <button class="chip" @click="applyPreset('weekday930')">工作日09:30</button>
            <button class="chip" @click="applyPreset('weekend11')">周末11:00</button>
            <button class="chip" @click="applyPreset('month1_9')">每月1日09:00</button>
            <button class="chip" @click="applyPreset('monthLastFri17')">每月最后周五17:00</button>
          </div>
          <div class="quick-interval">
            <span class="preset-label">快捷自定义：</span>
            <span>每</span>
            <input v-model.number="simple.quickEvery" type="number" min="1" class="quick-input" />
            <select v-model="simple.quickUnit" class="quick-select">
              <option value="seconds">秒</option>
              <option value="minutes">分钟</option>
              <option value="hours">小时</option>
            </select>
            <button class="chip" @click="applyQuickInterval">应用</button>
          </div>

          <div class="simple-grid">
            <label>
              周期类型
              <select v-model="simple.recurringType">
                <option value="seconds">每N秒</option>
                <option value="minutes">每N分钟</option>
                <option value="hours">每N小时</option>
                <option value="daily">每天固定时间</option>
                <option value="weekday">工作日固定时间（周一至周五）</option>
                <option value="weekend">周末固定时间（周六、周日）</option>
                <option value="weekly_multi">每周多选星期</option>
                <option value="monthly_day">每月第几天</option>
                <option value="monthly_nth_weekday">每月第N个星期X</option>
              </select>
            </label>

            <label v-if="['seconds','minutes','hours'].includes(simple.recurringType)">
              间隔
              <input v-model.number="simple.interval" type="number" min="1" />
            </label>

            <label v-if="needsClock(simple.recurringType)">
              时间
              <input v-model="simple.time" type="time" step="60" />
            </label>

            <label v-if="needsClock(simple.recurringType)">
              秒
              <input v-model.number="simple.second" type="number" min="0" max="59" />
            </label>

            <label v-if="simple.recurringType === 'monthly_day'">
              每月第几天
              <input v-model.number="simple.monthDay" type="number" min="1" max="31" />
            </label>

            <label v-if="simple.recurringType === 'monthly_nth_weekday'">
              第几个星期
              <select v-model="simple.monthNth">
                <option value="1">第1个</option>
                <option value="2">第2个</option>
                <option value="3">第3个</option>
                <option value="4">第4个</option>
                <option value="last">最后1个</option>
              </select>
            </label>

            <label v-if="simple.recurringType === 'monthly_nth_weekday'">
              星期
              <select v-model.number="simple.monthWeekday">
                <option :value="0">周日</option>
                <option :value="1">周一</option>
                <option :value="2">周二</option>
                <option :value="3">周三</option>
                <option :value="4">周四</option>
                <option :value="5">周五</option>
                <option :value="6">周六</option>
              </select>
            </label>
          </div>

          <div v-if="simple.recurringType === 'weekly_multi'" class="weekday-box">
            <span class="preset-label">选择星期：</span>
            <button
              v-for="day in weekdayOptions"
              :key="day.value"
              class="chip"
              :class="{ active: simple.weekdayList.includes(day.value) }"
              @click="toggleWeekday(day.value)"
            >
              {{ day.label }}
            </button>
          </div>

          <div class="toggle-row">
            <label class="switch-line">
              <input v-model="simple.enableDateRange" type="checkbox" />
              <span>限定日期范围</span>
            </label>
            <label class="switch-line">
              <input v-model="simple.enableTimeWindow" type="checkbox" />
              <span>限定每日时段</span>
            </label>
          </div>

          <div v-if="simple.enableDateRange" class="simple-grid">
            <label>
              开始日期
              <input v-model="simple.rangeStart" type="date" />
            </label>
            <label>
              结束日期
              <input v-model="simple.rangeEnd" type="date" />
            </label>
          </div>

          <div v-if="simple.enableTimeWindow" class="simple-grid">
            <label>
              时段开始
              <input v-model="simple.windowStart" type="time" step="60" />
            </label>
            <label>
              时段结束
              <input v-model="simple.windowEnd" type="time" step="60" />
            </label>
          </div>
        </div>

        <div class="friendly-preview">规则预览：<code>{{ friendlyRulePreview }}</code></div>
      </div>

      <div v-else class="rule-card">
        <h4>cron 表达式配置（年 月 日 时 分 秒）</h4>
        <div class="advanced-grid">
          <label>年<input v-model.trim="form.year" type="text" placeholder="* 或 2026-2030" /></label>
          <label>月<input v-model.trim="form.month" type="text" placeholder="* 或 */2" /></label>
          <label>日<input v-model.trim="form.day" type="text" placeholder="* 或 1,15" /></label>
          <label>时<input v-model.trim="form.hour" type="text" placeholder="0-23" /></label>
          <label>分<input v-model.trim="form.minute" type="text" placeholder="0-59" /></label>
          <label>秒<input v-model.trim="form.second" type="text" placeholder="0-59" /></label>
        </div>
        <p class="hint">支持：<code>*</code> <code>*/n</code> <code>a-b</code> <code>a,b,c</code> <code>a-b/n</code></p>
      </div>

      <div v-if="form.actionType === 'doc_scan'" class="rule-card">
        <h4>目录扫描配置</h4>
        <div class="form-grid">
          <label class="col-2">
            扫描目录（每行一个绝对路径）
            <textarea v-model.trim="form.docRootPaths" rows="3" placeholder="/Users/mac/Documents"></textarea>
          </label>
          <label>
            最大文件数
            <input v-model.number="form.docMaxFiles" type="number" min="1" max="10000" />
          </label>
          <label class="check-line"><span>递归子目录</span><input v-model="form.docRecursive" type="checkbox" /></label>
        </div>
        <div class="exts">
          <label><input v-model="form.docIncludeExts" type="checkbox" value="md" /> md</label>
          <label><input v-model="form.docIncludeExts" type="checkbox" value="doc" /> doc/docx</label>
          <label><input v-model="form.docIncludeExts" type="checkbox" value="excel" /> xls/xlsx</label>
          <label><input v-model="form.docIncludeExts" type="checkbox" value="txt" /> txt</label>
        </div>
      </div>

      <div v-if="form.actionType === 'script'" class="rule-card">
        <h4>脚本执行配置</h4>
        <div class="form-grid">
          <label>
            脚本类型
            <select v-model="form.scriptType">
              <option value="shell">Shell</option>
              <option value="python">Python</option>
            </select>
          </label>
          <label>
            超时时间（秒）
            <input v-model.number="form.scriptTimeoutSeconds" type="number" min="1" max="300" />
          </label>
          <label class="col-2">
            工作目录（可选，绝对路径）
            <input v-model.trim="form.scriptCwd" type="text" placeholder="/Users/mac/vue-learning-app" />
          </label>
          <label class="col-2">
            脚本内容
            <textarea
              v-model.trim="form.scriptContent"
              rows="6"
              :placeholder="scriptPlaceholder"
            ></textarea>
          </label>
        </div>
        <p class="hint">执行方式：Shell 使用 <code>/bin/sh -lc</code>，Python 使用 <code>python3 -c</code>。</p>
      </div>

      <div class="actions">
        <button class="btn btn-primary" @click="createTask">创建任务</button>
        <button class="btn" @click="resetForm">重置</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h3>任务趋势统计</h3>
        <div class="mode-switch">
          <select v-model="statsRange" class="input-lite">
            <option value="24h">最近24小时</option>
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
          </select>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">总任务</div>
          <div class="stat-value">{{ tasks.length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">运行中</div>
          <div class="stat-value">{{ activeTaskCount }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">区间触发</div>
          <div class="stat-value">{{ rangeTriggeredCount }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">区间失败</div>
          <div class="stat-value">{{ rangeFailedCount }}</div>
        </div>
      </div>
      <div class="chart-wrap">
        <div ref="trendChartRef" class="trend-chart" role="img" aria-label="定时任务触发折线图"></div>
        <div class="chart-legend">
          <span><i class="legend-dot success"></i>触发次数</span>
          <span><i class="legend-dot failure"></i>失败次数</span>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-box">
          <div class="chart-title">任务动作分布</div>
          <div ref="actionChartRef" class="sub-chart" role="img" aria-label="任务动作分布饼图"></div>
        </div>
        <div class="chart-box">
          <div class="chart-title">任务状态分布</div>
          <div ref="statusChartRef" class="sub-chart" role="img" aria-label="任务状态分布柱状图"></div>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h3>任务列表（{{ tasks.length }}）</h3>
        <div class="mode-switch">
          <button class="btn" @click="toggleAll(true)" :disabled="!tasks.length">全部启用</button>
          <button class="btn" @click="toggleAll(false)" :disabled="!tasks.length">全部停用</button>
        </div>
      </div>

      <div v-if="!tasks.length" class="empty">暂无任务</div>
      <div v-else class="task-grid">
        <article v-for="task in tasks" :key="task.id" class="task-card">
          <div class="task-top">
            <div>
              <div class="task-name">{{ task.name }}</div>
              <div class="task-desc">{{ task.description || '无描述' }}</div>
            </div>
            <span class="status" :class="statusClass(task)">{{ statusText(task) }}</span>
          </div>
          <div class="task-meta">动作：{{ task.actionType === 'doc_scan' ? '目录扫描' : (task.actionType === 'notify' ? '通知' : (task.actionType === 'script' ? '脚本执行' : '日志')) }}</div>
          <div class="task-meta">规则：<code>{{ getRuleText(task) }}</code></div>
          <div class="task-meta">上次执行：{{ task.lastRunAt ? formatDate(task.lastRunAt) : '-' }} | 次数：{{ task.runCount || 0 }}</div>
          <div class="task-actions">
            <button class="btn" @click="runTask(task, 'manual')">立即执行</button>
            <button class="btn" @click="toggleTask(task)">{{ task.enabled ? '停用' : '启用' }}</button>
            <button class="btn btn-danger" @click="removeTask(task.id)">删除</button>
          </div>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h3>触发日志（{{ pagedTotal }}）</h3>
        <button class="btn" @click="clearLogs" :disabled="!logs.length">清空日志</button>
      </div>
      <ul v-if="pagedLogs.length" class="log-list">
        <li v-for="item in pagedLogs" :key="item.id" class="log-item">
          <span class="log-time">{{ formatDate(item.time) }}</span>
          <span class="log-text">{{ item.message }}</span>
        </li>
      </ul>
      <div v-else class="empty">暂无触发记录</div>
      <div v-if="pagedLogs.length" class="pagination">
        <label class="page-size">
          每页
          <select v-model.number="logPageSize" class="input-lite">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </label>
        <button class="btn" @click="prevLogPage" :disabled="logPage <= 1">上一页</button>
        <span class="page-info">第 {{ logPage }} / {{ logTotalPages }} 页</span>
        <button class="btn" @click="nextLogPage" :disabled="logPage >= logTotalPages">下一页</button>
      </div>
    </section>
  </div>
</template>

<script>
import { api } from '../utils/api.js'

const FIELD_LIMITS = {
  year: { min: 1970, max: 9999 },
  month: { min: 1, max: 12 },
  day: { min: 1, max: 31 },
  hour: { min: 0, max: 23 },
  minute: { min: 0, max: 59 },
  second: { min: 0, max: 59 }
}

export default {
  name: 'ScheduledTaskManager',
  data() {
    const now = new Date()
    return {
      nowTime: Date.now(),
      timer: null,
      ticking: false,
      chartInstance: null,
      actionChartInstance: null,
      statusChartInstance: null,
      echartsModule: null,
      resizeHandler: null,
      pollCounter: 0,
      statsRange: '7d',
      logPage: 1,
      logPageSize: 20,
      uiMode: 'simple',
      tasks: [],
      logs: [],
      weekdayOptions: [
        { value: 0, label: '周日' },
        { value: 1, label: '周一' },
        { value: 2, label: '周二' },
        { value: 3, label: '周三' },
        { value: 4, label: '周四' },
        { value: 5, label: '周五' },
        { value: 6, label: '周六' }
      ],
      form: {
        name: '',
        description: '',
        actionType: 'log',
        mode: 'once',
        year: '*',
        month: '*',
        day: '*',
        hour: '*',
        minute: '*',
        second: '*',
        docRootPaths: '',
        docRecursive: true,
        docMaxFiles: 1000,
        docIncludeExts: ['md', 'doc', 'excel', 'txt'],
        scriptType: 'shell',
        scriptTimeoutSeconds: 30,
        scriptCwd: '',
        scriptContent: ''
      },
      simple: {
        onceDateTime: this.toDateTimeLocal(new Date(now.getTime() + 60000)),
        recurringType: 'minutes',
        interval: 5,
        quickEvery: 10,
        quickUnit: 'seconds',
        time: '09:00',
        second: 0,
        weekdayList: [1, 2, 3, 4, 5],
        monthDay: 1,
        monthNth: '1',
        monthWeekday: 1,
        enableDateRange: false,
        rangeStart: '',
        rangeEnd: '',
        enableTimeWindow: false,
        windowStart: '08:00',
        windowEnd: '20:00'
      }
    }
  },
  computed: {
    scriptPlaceholder() {
      return this.form.scriptType === 'python' ? "print('hello')" : 'echo hello'
    },
    friendlyRulePreview() {
      const prepared = this.buildSimpleRule()
      if (!prepared.ok) return prepared.error
      const text = prepared.text
      const cron = prepared.rule
      return `${text} | ${cron.year} ${cron.month} ${cron.day} ${cron.hour} ${cron.minute} ${cron.second}`
    },
    pagedTotal() {
      return this.logs.length
    },
    logTotalPages() {
      return Math.max(1, Math.ceil(this.logs.length / this.logPageSize))
    },
    pagedLogs() {
      const start = (this.logPage - 1) * this.logPageSize
      return this.logs.slice(start, start + this.logPageSize)
    },
    activeTaskCount() {
      return this.tasks.filter((item) => item.enabled).length
    },
    rangeTriggeredCount() {
      return this.logs.filter((item) => this.isSuccessTriggerLog(item) && this.isInSelectedRange(item.time)).length
    },
    rangeFailedCount() {
      return this.logs.filter((item) => this.isFailedTriggerLog(item) && this.isInSelectedRange(item.time)).length
    },
    trendBuckets() {
      const now = new Date(this.nowTime || Date.now())
      const range = this.statsRange
      const isHourly = range === '24h'
      const count = isHourly ? 24 : (range === '7d' ? 7 : 30)
      const stepMs = isHourly ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
      const end = isHourly
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1).getTime()
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
      const start = end - count * stepMs

      const buckets = Array.from({ length: count }, (_, i) => {
        const bucketStart = start + i * stepMs
        const date = new Date(bucketStart)
        const label = isHourly
          ? `${String(date.getHours()).padStart(2, '0')}:00`
          : `${date.getMonth() + 1}/${date.getDate()}`
        return { label, success: 0, failed: 0, start: bucketStart }
      })

      for (const log of this.logs) {
        if (!log?.time || !this.isInSelectedRange(log.time)) continue
        const idx = Math.floor((Number(log.time) - start) / stepMs)
        if (idx < 0 || idx >= buckets.length) continue
        if (this.isFailedTriggerLog(log)) buckets[idx].failed += 1
        else if (this.isSuccessTriggerLog(log)) buckets[idx].success += 1
      }

      return buckets
    }
  },
  watch: {
    statsRange() {
      this.$nextTick(() => this.updateAllCharts())
    },
    logs: {
      deep: true,
      handler() {
        if (this.logPage > this.logTotalPages) {
          this.logPage = this.logTotalPages
        }
        this.$nextTick(() => this.updateAllCharts())
      }
    },
    tasks: {
      deep: true,
      handler() {
        this.$nextTick(() => this.updateAllCharts())
      }
    }
  },
  mounted() {
    this.refreshAll()
    this.importLegacyDocScheduler(true)
    this.timer = setInterval(() => {
      this.nowTime = Date.now()
      this.pollCounter = (this.pollCounter + 1) % 5
      if (this.pollCounter === 0) {
        this.refreshAll(false)
      }
    }, 1000)
    this.$nextTick(() => this.initChart())
  },
  beforeUnmount() {
    if (this.timer) clearInterval(this.timer)
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
      this.resizeHandler = null
    }
    if (this.chartInstance) {
      this.chartInstance.dispose()
      this.chartInstance = null
    }
    if (this.actionChartInstance) {
      this.actionChartInstance.dispose()
      this.actionChartInstance = null
    }
    if (this.statusChartInstance) {
      this.statusChartInstance.dispose()
      this.statusChartInstance = null
    }
  },
  methods: {
    toDateTimeLocal(date) {
      const d = new Date(date)
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    formatDate(value) {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
    },
    async initChart() {
      if (!this.$refs.trendChartRef || !this.$refs.actionChartRef || !this.$refs.statusChartRef) return
      if (!this.echartsModule) {
        const mod = await import('echarts')
        this.echartsModule = mod
      }
      if (!this.chartInstance) {
        this.chartInstance = this.echartsModule.init(this.$refs.trendChartRef)
      }
      if (!this.actionChartInstance) {
        this.actionChartInstance = this.echartsModule.init(this.$refs.actionChartRef)
      }
      if (!this.statusChartInstance) {
        this.statusChartInstance = this.echartsModule.init(this.$refs.statusChartRef)
      }
      this.updateAllCharts()
      if (!this.resizeHandler) {
        this.resizeHandler = () => {
          if (this.chartInstance) this.chartInstance.resize()
          if (this.actionChartInstance) this.actionChartInstance.resize()
          if (this.statusChartInstance) this.statusChartInstance.resize()
        }
        window.addEventListener('resize', this.resizeHandler)
      }
    },
    updateAllCharts() {
      this.updateTrendChart()
      this.updateActionChart()
      this.updateStatusChart()
    },
    updateTrendChart() {
      if (!this.chartInstance) return
      const labels = this.trendBuckets.map((item) => item.label)
      const successData = this.trendBuckets.map((item) => item.success)
      const failedData = this.trendBuckets.map((item) => item.failed)
      const maxLabelCount = 6
      const interval = labels.length > maxLabelCount ? Math.ceil(labels.length / maxLabelCount) - 1 : 0
      this.chartInstance.setOption({
        animationDuration: 300,
        grid: { left: 36, right: 16, top: 20, bottom: 30 },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: labels,
          axisLabel: { interval }
        },
        yAxis: {
          type: 'value',
          minInterval: 1
        },
        series: [
          {
            name: '触发次数',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            label: {
              show: true,
              position: 'top',
              color: '#16a34a',
              fontSize: 11,
              formatter: (params) => (Number(params.value) > 0 ? String(params.value) : '')
            },
            itemStyle: { color: '#22c55e' },
            lineStyle: { color: '#22c55e', width: 2.5 },
            data: successData
          },
          {
            name: '失败次数',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            label: {
              show: true,
              position: 'bottom',
              color: '#dc2626',
              fontSize: 11,
              formatter: (params) => (Number(params.value) > 0 ? String(params.value) : '')
            },
            itemStyle: { color: '#ef4444' },
            lineStyle: { color: '#ef4444', width: 2.3 },
            data: failedData
          }
        ]
      })
    },
    updateActionChart() {
      if (!this.actionChartInstance) return
      const mapping = {
        log: '日志',
        notify: '通知',
        doc_scan: '目录扫描',
        script: '脚本执行'
      }
      const counts = { 日志: 0, 通知: 0, 目录扫描: 0, 脚本执行: 0 }
      for (const task of this.tasks) {
        const key = mapping[task.actionType] || '日志'
        counts[key] = (counts[key] || 0) + 1
      }
      const data = Object.entries(counts).map(([name, value]) => ({ name, value }))
      this.actionChartInstance.setOption({
        animationDuration: 300,
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'pie',
            radius: ['35%', '68%'],
            center: ['50%', '52%'],
            label: {
              formatter: '{b}: {c}'
            },
            data,
            itemStyle: {
              borderRadius: 6,
              borderColor: '#fff',
              borderWidth: 1
            }
          }
        ]
      })
    },
    updateStatusChart() {
      if (!this.statusChartInstance) return
      const statusData = {
        运行中: 0,
        已停用: 0,
        已完成: 0
      }
      for (const task of this.tasks) {
        if (!task.enabled) statusData.已停用 += 1
        else if (task.mode === 'once' && task.runCount > 0) statusData.已完成 += 1
        else statusData.运行中 += 1
      }
      this.statusChartInstance.setOption({
        animationDuration: 300,
        grid: { left: 36, right: 10, top: 20, bottom: 30 },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: Object.keys(statusData)
        },
        yAxis: {
          type: 'value',
          minInterval: 1
        },
        series: [
          {
            type: 'bar',
            data: Object.values(statusData),
            barWidth: '46%',
            itemStyle: {
              color: (params) => ['#22c55e', '#ef4444', '#3b82f6'][params.dataIndex] || '#94a3b8',
              borderRadius: [6, 6, 0, 0]
            },
            label: {
              show: true,
              position: 'top'
            }
          }
        ]
      })
    },
    async refreshAll(showError = true) {
      this.nowTime = Date.now()
      try {
        const [taskResult, logResult] = await Promise.all([
          api.schedulerTasks.getAll(),
          api.schedulerTasks.logsAll()
        ])
        this.tasks = taskResult?.tasks || []
        this.logs = logResult?.logs || []
      } catch (error) {
        this.tasks = []
        this.logs = []
        if (showError) {
          alert(error.message || '加载任务数据失败')
        }
      }
    },
    resetForm() {
      const now = new Date()
      this.form.name = ''
      this.form.description = ''
      this.form.actionType = 'log'
      this.form.mode = 'once'
      this.form.year = '*'
      this.form.month = '*'
      this.form.day = '*'
      this.form.hour = '*'
      this.form.minute = '*'
      this.form.second = '*'
      this.form.docRootPaths = ''
      this.form.docRecursive = true
      this.form.docMaxFiles = 1000
      this.form.docIncludeExts = ['md', 'doc', 'excel', 'txt']
      this.form.scriptType = 'shell'
      this.form.scriptTimeoutSeconds = 30
      this.form.scriptCwd = ''
      this.form.scriptContent = ''

      this.simple.onceDateTime = this.toDateTimeLocal(new Date(now.getTime() + 60000))
      this.simple.recurringType = 'minutes'
      this.simple.interval = 5
      this.simple.quickEvery = 10
      this.simple.quickUnit = 'seconds'
      this.simple.time = '09:00'
      this.simple.second = 0
      this.simple.weekdayList = [1, 2, 3, 4, 5]
      this.simple.monthDay = 1
      this.simple.monthNth = '1'
      this.simple.monthWeekday = 1
      this.simple.enableDateRange = false
      this.simple.rangeStart = ''
      this.simple.rangeEnd = ''
      this.simple.enableTimeWindow = false
      this.simple.windowStart = '08:00'
      this.simple.windowEnd = '20:00'
    },
    needsClock(type) {
      return ['daily', 'weekday', 'weekend', 'weekly_multi', 'monthly_day', 'monthly_nth_weekday'].includes(type)
    },
    toggleWeekday(day) {
      if (this.simple.weekdayList.includes(day)) {
        this.simple.weekdayList = this.simple.weekdayList.filter((d) => d !== day)
      } else {
        this.simple.weekdayList = [...this.simple.weekdayList, day].sort((a, b) => a - b)
      }
    },
    applyQuickInterval() {
      this.form.mode = 'cron'
      this.uiMode = 'simple'
      const every = Math.max(1, Number(this.simple.quickEvery || 1))
      this.simple.recurringType = this.simple.quickUnit
      this.simple.interval = every
    },
    applyPreset(key) {
      this.form.mode = 'cron'
      this.uiMode = 'simple'

      if (key === '10s') {
        this.simple.recurringType = 'seconds'
        this.simple.interval = 10
      } else if (key === '15s') {
        this.simple.recurringType = 'seconds'
        this.simple.interval = 15
      } else if (key === '1m') {
        this.simple.recurringType = 'minutes'
        this.simple.interval = 1
      } else if (key === '5m') {
        this.simple.recurringType = 'minutes'
        this.simple.interval = 5
      } else if (key === '15m') {
        this.simple.recurringType = 'minutes'
        this.simple.interval = 15
      } else if (key === '30m') {
        this.simple.recurringType = 'minutes'
        this.simple.interval = 30
      } else if (key === '1h') {
        this.simple.recurringType = 'hours'
        this.simple.interval = 1
      } else if (key === 'daily9') {
        this.simple.recurringType = 'daily'
        this.simple.time = '09:00'
        this.simple.second = 0
      } else if (key === 'daily18') {
        this.simple.recurringType = 'daily'
        this.simple.time = '18:00'
        this.simple.second = 0
      } else if (key === 'weekday10') {
        this.simple.recurringType = 'weekday'
        this.simple.time = '10:00'
        this.simple.second = 0
      } else if (key === 'weekday930') {
        this.simple.recurringType = 'weekday'
        this.simple.time = '09:30'
        this.simple.second = 0
      } else if (key === 'weekend11') {
        this.simple.recurringType = 'weekend'
        this.simple.time = '11:00'
        this.simple.second = 0
      } else if (key === 'month1_9') {
        this.simple.recurringType = 'monthly_day'
        this.simple.monthDay = 1
        this.simple.time = '09:00'
        this.simple.second = 0
      } else if (key === 'monthLastFri17') {
        this.simple.recurringType = 'monthly_nth_weekday'
        this.simple.monthNth = 'last'
        this.simple.monthWeekday = 5
        this.simple.time = '17:00'
        this.simple.second = 0
      }
    },
    isSuccessTriggerLog(item) {
      const message = String(item?.message || '')
      return message.includes('已触发')
    },
    isFailedTriggerLog(item) {
      const message = String(item?.message || '')
      return message.includes('执行失败')
    },
    isInSelectedRange(ts) {
      const now = this.nowTime || Date.now()
      const rangeMs = this.statsRange === '24h'
        ? 24 * 60 * 60 * 1000
        : (this.statsRange === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)
      return Number(ts) >= now - rangeMs && Number(ts) <= now
    },
    parseTimeParts(timeText) {
      const text = String(timeText || '')
      const parts = text.split(':')
      if (parts.length !== 2) return { hour: 0, minute: 0 }
      const hour = Number(parts[0])
      const minute = Number(parts[1])
      return {
        hour: Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 0,
        minute: Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : 0
      }
    },
    parseRootPaths(text) {
      return String(text || '').split('\n').map((item) => item.trim()).filter(Boolean)
    },
    validateDocScanConfig() {
      if (this.form.actionType !== 'doc_scan') return { ok: true, config: null }
      const rootPaths = this.parseRootPaths(this.form.docRootPaths)
      if (!rootPaths.length) return { ok: false, error: '目录扫描任务至少需要一个目录路径' }
      if (!Number.isInteger(Number(this.form.docMaxFiles)) || Number(this.form.docMaxFiles) <= 0) return { ok: false, error: '最大文件数必须是正整数' }
      if (!this.form.docIncludeExts.length) return { ok: false, error: '请至少选择一个扫描类型' }
      return {
        ok: true,
        config: {
          rootPaths,
          recursive: !!this.form.docRecursive,
          maxFiles: Number(this.form.docMaxFiles),
          includeExts: this.form.docIncludeExts
        }
      }
    },
    validateScriptConfig() {
      if (this.form.actionType !== 'script') return { ok: true, config: null }
      const scriptType = String(this.form.scriptType || '').trim().toLowerCase()
      if (!['shell', 'python'].includes(scriptType)) {
        return { ok: false, error: '脚本类型仅支持 shell 或 python' }
      }
      const content = String(this.form.scriptContent || '').trim()
      if (!content) return { ok: false, error: '脚本内容不能为空' }
      const timeoutSeconds = Number(this.form.scriptTimeoutSeconds || 30)
      if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 300) {
        return { ok: false, error: '超时时间需在 1-300 秒' }
      }
      const cwd = String(this.form.scriptCwd || '').trim()
      if (cwd && !cwd.startsWith('/')) {
        return { ok: false, error: '工作目录必须是绝对路径' }
      }
      return {
        ok: true,
        config: {
          scriptType,
          content,
          timeoutSeconds,
          cwd
        }
      }
    },
    buildSimpleRule() {
      if (this.form.mode === 'once') {
        const dt = new Date(this.simple.onceDateTime)
        if (Number.isNaN(dt.getTime())) return { ok: false, error: '请选择有效的单次触发时间' }
        return {
          ok: true,
          rule: {
            year: String(dt.getFullYear()),
            month: String(dt.getMonth() + 1),
            day: String(dt.getDate()),
            hour: String(dt.getHours()),
            minute: String(dt.getMinutes()),
            second: String(Math.max(0, Math.min(59, Number(this.simple.second || 0))))
          },
          options: {},
          text: `单次：${this.formatDate(dt)}`
        }
      }

      const type = this.simple.recurringType
      const sec = String(Math.max(0, Math.min(59, Number(this.simple.second || 0))))
      const { hour, minute } = this.parseTimeParts(this.simple.time)
      const interval = Math.max(1, Number(this.simple.interval || 1))

      let rule = { year: '*', month: '*', day: '*', hour: '*', minute: '*', second: '*' }
      let options = {
        weekdayList: null,
        monthNthWeekday: null,
        dateRange: null,
        timeWindow: null
      }
      let text = ''

      if (type === 'seconds') {
        rule = { year: '*', month: '*', day: '*', hour: '*', minute: '*', second: `*/${interval}` }
        text = `每 ${interval} 秒`
      } else if (type === 'minutes') {
        rule = { year: '*', month: '*', day: '*', hour: '*', minute: `*/${interval}`, second: '0' }
        text = `每 ${interval} 分钟`
      } else if (type === 'hours') {
        rule = { year: '*', month: '*', day: '*', hour: `*/${interval}`, minute: '0', second: '0' }
        text = `每 ${interval} 小时`
      } else if (type === 'daily') {
        rule = { year: '*', month: '*', day: '*', hour: String(hour), minute: String(minute), second: sec }
        text = `每天 ${this.simple.time}:${sec.padStart(2, '0')}`
      } else if (type === 'weekday') {
        rule = { year: '*', month: '*', day: '*', hour: String(hour), minute: String(minute), second: sec }
        options.weekdayList = [1, 2, 3, 4, 5]
        text = `工作日 ${this.simple.time}:${sec.padStart(2, '0')}`
      } else if (type === 'weekend') {
        rule = { year: '*', month: '*', day: '*', hour: String(hour), minute: String(minute), second: sec }
        options.weekdayList = [0, 6]
        text = `周末 ${this.simple.time}:${sec.padStart(2, '0')}`
      } else if (type === 'weekly_multi') {
        const selected = Array.from(new Set(this.simple.weekdayList)).sort((a, b) => a - b)
        if (!selected.length) return { ok: false, error: '请至少选择一个星期' }
        rule = { year: '*', month: '*', day: '*', hour: String(hour), minute: String(minute), second: sec }
        options.weekdayList = selected
        const labels = this.weekdayOptions.filter((d) => selected.includes(d.value)).map((d) => d.label).join('、')
        text = `每周 ${labels} ${this.simple.time}:${sec.padStart(2, '0')}`
      } else if (type === 'monthly_day') {
        const day = Math.max(1, Math.min(31, Number(this.simple.monthDay || 1)))
        rule = { year: '*', month: '*', day: String(day), hour: String(hour), minute: String(minute), second: sec }
        text = `每月 ${day} 日 ${this.simple.time}:${sec.padStart(2, '0')}`
      } else {
        rule = { year: '*', month: '*', day: '*', hour: String(hour), minute: String(minute), second: sec }
        options.monthNthWeekday = {
          nth: this.simple.monthNth,
          weekday: Number(this.simple.monthWeekday)
        }
        const nthText = this.simple.monthNth === 'last' ? '最后1个' : `第${this.simple.monthNth}个`
        const weekdayText = this.weekdayOptions.find((d) => d.value === Number(this.simple.monthWeekday))?.label || '周一'
        text = `每月 ${nthText}${weekdayText} ${this.simple.time}:${sec.padStart(2, '0')}`
      }

      if (this.simple.enableDateRange) {
        if (!this.simple.rangeStart || !this.simple.rangeEnd) return { ok: false, error: '请完整填写开始/结束日期' }
        if (this.simple.rangeStart > this.simple.rangeEnd) return { ok: false, error: '开始日期不能大于结束日期' }
        options.dateRange = { start: this.simple.rangeStart, end: this.simple.rangeEnd }
        text += `（仅 ${this.simple.rangeStart} 至 ${this.simple.rangeEnd}）`
      }

      if (this.simple.enableTimeWindow) {
        if (!this.simple.windowStart || !this.simple.windowEnd) return { ok: false, error: '请完整填写每日时段' }
        options.timeWindow = { start: this.simple.windowStart, end: this.simple.windowEnd }
        text += `（每日时段 ${this.simple.windowStart}-${this.simple.windowEnd}）`
      }

      return { ok: true, rule, options, text }
    },
    isValidCronSegment(segment, min, max) {
      if (segment === '*') return true
      if (/^\*\/\d+$/.test(segment)) return Number(segment.slice(2)) > 0
      if (/^\d+$/.test(segment)) {
        const n = Number(segment)
        return n >= min && n <= max
      }
      if (/^\d+-\d+$/.test(segment)) {
        const [a, b] = segment.split('-').map(Number)
        return a >= min && b <= max && a <= b
      }
      if (/^\d+-\d+\/\d+$/.test(segment)) {
        const [range, stepRaw] = segment.split('/')
        const [a, b] = range.split('-').map(Number)
        const step = Number(stepRaw)
        return a >= min && b <= max && a <= b && step > 0
      }
      return false
    },
    isValidCronField(expr, key) {
      const limits = FIELD_LIMITS[key]
      const parts = String(expr || '').split(',').map((s) => s.trim()).filter(Boolean)
      return parts.length > 0 && parts.every((p) => this.isValidCronSegment(p, limits.min, limits.max))
    },
    segmentMatches(segment, value) {
      if (segment === '*') return true
      if (/^\*\/\d+$/.test(segment)) return value % Number(segment.slice(2)) === 0
      if (/^\d+$/.test(segment)) return value === Number(segment)
      if (/^\d+-\d+$/.test(segment)) {
        const [a, b] = segment.split('-').map(Number)
        return value >= a && value <= b
      }
      if (/^\d+-\d+\/\d+$/.test(segment)) {
        const [range, stepRaw] = segment.split('/')
        const [a, b] = range.split('-').map(Number)
        const step = Number(stepRaw)
        return value >= a && value <= b && (value - a) % step === 0
      }
      return false
    },
    cronFieldMatches(expr, value) {
      return String(expr || '').split(',').map((s) => s.trim()).filter(Boolean).some((p) => this.segmentMatches(p, value))
    },
    isInDateRange(now, range) {
      if (!range || !range.start || !range.end) return true
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const start = new Date(range.start + 'T00:00:00').getTime()
      const end = new Date(range.end + 'T23:59:59').getTime()
      return today >= start && today <= end
    },
    isInTimeWindow(now, window) {
      if (!window || !window.start || !window.end) return true
      const startParts = this.parseTimeParts(window.start)
      const endParts = this.parseTimeParts(window.end)
      const current = now.getHours() * 60 + now.getMinutes()
      const start = startParts.hour * 60 + startParts.minute
      const end = endParts.hour * 60 + endParts.minute
      if (start <= end) return current >= start && current <= end
      return current >= start || current <= end
    },
    isNthWeekdayMatch(now, condition) {
      if (!condition) return true
      const weekday = Number(condition.weekday)
      if (now.getDay() !== weekday) return false
      const nth = condition.nth
      if (nth === 'last') {
        const nextSameWeekday = new Date(now)
        nextSameWeekday.setDate(now.getDate() + 7)
        return nextSameWeekday.getMonth() !== now.getMonth()
      }
      const target = Number(nth)
      const occur = Math.floor((now.getDate() - 1) / 7) + 1
      return occur === target
    },
    async createTask() {
      const name = this.form.name.trim()
      if (!name) return alert('请输入任务名称')

      const docCfg = this.validateDocScanConfig()
      if (!docCfg.ok) return alert(docCfg.error)
      const scriptCfg = this.validateScriptConfig()
      if (!scriptCfg.ok) return alert(scriptCfg.error)

      let rule
      let options = { weekdayList: null, monthNthWeekday: null, dateRange: null, timeWindow: null }

      if (this.uiMode === 'simple') {
        const prepared = this.buildSimpleRule()
        if (!prepared.ok) return alert(prepared.error)
        rule = prepared.rule
        options = prepared.options
      } else {
        rule = {
          year: this.form.year.trim(),
          month: this.form.month.trim(),
          day: this.form.day.trim(),
          hour: this.form.hour.trim(),
          minute: this.form.minute.trim(),
          second: this.form.second.trim()
        }
      }

      const task = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        description: this.form.description.trim(),
        actionType: this.form.actionType,
        mode: this.form.mode,
        rule,
        weekdayList: options.weekdayList,
        monthNthWeekday: options.monthNthWeekday,
        dateRange: options.dateRange,
        timeWindow: options.timeWindow,
        docScanConfig: docCfg.config,
        scriptConfig: scriptCfg.config,
        enabled: true,
        runCount: 0,
        lastRunAt: null,
        lastMatchedSecond: null,
        createdAt: Date.now()
      }

      if (task.mode === 'once') {
        for (const key of Object.keys(FIELD_LIMITS)) {
          const limits = FIELD_LIMITS[key]
          const v = task.rule[key]
          if (!/^\d+$/.test(String(v)) || Number(v) < limits.min || Number(v) > limits.max) {
            return alert(`${key} 字段无效`)
          }
        }
        const runAt = new Date(Number(task.rule.year), Number(task.rule.month) - 1, Number(task.rule.day), Number(task.rule.hour), Number(task.rule.minute), Number(task.rule.second)).getTime()
        if (Number.isNaN(runAt) || runAt <= Date.now()) return alert('单次触发时间必须晚于当前时间')
        task.runAt = runAt
      } else {
        for (const key of Object.keys(FIELD_LIMITS)) {
          if (!this.isValidCronField(task.rule[key], key)) return alert(`${key} 字段不是有效 cron 表达式`)
        }
      }

      try {
        await api.schedulerTasks.create(task)
        this.resetForm()
        await this.refreshAll(false)
      } catch (error) {
        alert(error.message || '创建任务失败')
      }
    },
    async importLegacyDocScheduler(silent = false) {
      try {
        const status = await api.docScanner.getScheduler()
        if (!status?.config) {
          if (!silent) alert('旧版目录扫描定时无可导入配置')
          return
        }
        await api.schedulerTasks.importLegacyDocScheduler(status)
        await this.refreshAll(false)
        if (!silent) alert('已导入旧版目录扫描定时配置')
      } catch (error) {
        if (!silent) alert(error.message || '导入失败')
      }
    },
    getRuleText(task) {
      if (task.mode === 'interval') return `每 ${task.intervalMinutes || 30} 分钟`
      const r = task.rule || {}
      const base = `${r.year || '*'} ${r.month || '*'} ${r.day || '*'} ${r.hour || '*'} ${r.minute || '*'} ${r.second || '*'}`
      const extras = []
      if (Array.isArray(task.weekdayList) && task.weekdayList.length) {
        const label = this.weekdayOptions.filter((d) => task.weekdayList.includes(d.value)).map((d) => d.label).join('、')
        extras.push(`星期:${label}`)
      }
      if (task.monthNthWeekday) {
        const n = task.monthNthWeekday.nth === 'last' ? '最后1个' : `第${task.monthNthWeekday.nth}个`
        const wd = this.weekdayOptions.find((d) => d.value === Number(task.monthNthWeekday.weekday))?.label || ''
        extras.push(`${n}${wd}`)
      }
      if (task.dateRange) extras.push(`${task.dateRange.start}~${task.dateRange.end}`)
      if (task.timeWindow) extras.push(`${task.timeWindow.start}-${task.timeWindow.end}`)
      return extras.length ? `${base} | ${extras.join(' | ')}` : base
    },
    statusClass(task) {
      if (!task.enabled) return 'status-off'
      if (task.mode === 'once' && task.runCount > 0) return 'status-done'
      return 'status-on'
    },
    statusText(task) {
      if (!task.enabled) return '已停用'
      if (task.mode === 'once' && task.runCount > 0) return '已完成'
      return '运行中'
    },
    async runTask(task, source = 'auto') {
      try {
        await api.schedulerTasks.run(task.id)
        await this.refreshAll(false)
      } catch (error) {
        alert(error.message || '执行任务失败')
      }
    },
    async toggleTask(task) {
      try {
        await api.schedulerTasks.toggle(task.id)
        await this.refreshAll(false)
      } catch (error) {
        alert(error.message || '切换任务失败')
      }
    },
    async toggleAll(enabled) {
      try {
        await api.schedulerTasks.toggleAll(enabled)
        await this.refreshAll(false)
      } catch (error) {
        alert(error.message || '批量切换失败')
      }
    },
    async removeTask(id) {
      try {
        await api.schedulerTasks.remove(id)
        await this.refreshAll(false)
      } catch (error) {
        alert(error.message || '删除任务失败')
      }
    },
    async clearLogs() {
      try {
        await api.schedulerTasks.clearLogs()
        this.logPage = 1
        await this.refreshAll(false)
      } catch (error) {
        alert(error.message || '清空日志失败')
      }
    },
    prevLogPage() {
      if (this.logPage > 1) this.logPage -= 1
    },
    nextLogPage() {
      if (this.logPage < this.logTotalPages) this.logPage += 1
    }
  }
}
</script>

<style scoped>
.scheduler-page { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
.hero { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; border-radius: 16px; padding: 18px; background: linear-gradient(120deg, color-mix(in srgb, var(--app-primary) 86%, #fff), color-mix(in srgb, var(--app-primary-dark) 88%, #fff)); color: var(--app-on-primary); }
.hero h2 { margin: 0; }
.hero p { margin-top: 4px; opacity: 0.95; }
.hero-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.now-chip { padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.45); background: rgba(255,255,255,0.12); font-size: 13px; }

.panel { background: var(--app-card); border: 1px solid var(--app-border); border-radius: 14px; padding: 16px; box-shadow: 0 4px 16px var(--app-shadow-light); }
.panel-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.panel-head h3 { margin: 0; }
.mode-switch { display: flex; gap: 8px; flex-wrap: wrap; }
.input-lite { border: 1px solid var(--app-border); border-radius: 8px; padding: 7px 10px; background: var(--app-card); color: var(--app-text); }

.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.col-2 { grid-column: span 2; }
label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--app-text-secondary); font-weight: 700; }
input, select, textarea { border: 1px solid var(--app-border); border-radius: 10px; padding: 10px; background: var(--app-card); color: var(--app-text); font-size: 14px; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--app-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-primary) 18%, transparent); }

.rule-card { margin-top: 12px; border: 1px dashed var(--app-border); border-radius: 12px; padding: 12px; background: color-mix(in srgb, var(--app-card) 88%, var(--app-primary) 12%); }
.rule-card h4 { margin: 0 0 10px; }
.simple-grid, .advanced-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.advanced-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }

.preset-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.preset-label { font-size: 13px; color: var(--app-text-muted); }
.quick-interval { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.quick-input { width: 90px; }
.quick-select { min-width: 100px; }
.chip { border: 1px solid var(--app-border); background: var(--app-card); border-radius: 999px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
.chip:hover { border-color: var(--app-primary); color: var(--app-primary); }
.chip.active { border-color: var(--app-primary); color: var(--app-primary); background: color-mix(in srgb, var(--app-primary) 12%, var(--app-card)); }
.weekday-box { margin-top: 10px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.toggle-row { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 10px; }
.switch-line { flex-direction: row; align-items: center; gap: 8px; }

.friendly-preview { margin-top: 10px; font-size: 13px; color: var(--app-text-secondary); }
.hint { margin-top: 8px; font-size: 12px; color: var(--app-text-muted); }
.exts { margin-top: 8px; display: flex; gap: 12px; flex-wrap: wrap; }
.check-line { flex-direction: row; align-items: center; justify-content: space-between; border: 1px solid var(--app-border); border-radius: 10px; padding: 10px; }

.actions { margin-top: 12px; display: flex; gap: 8px; }
.btn { border: 1px solid var(--app-border); border-radius: 10px; padding: 8px 12px; background: var(--app-card); color: var(--app-text-secondary); font-weight: 700; cursor: pointer; }
.btn:hover { border-color: var(--app-primary); color: var(--app-primary); }
.btn.active { background: color-mix(in srgb, var(--app-primary) 15%, var(--app-card)); border-color: var(--app-primary); color: var(--app-primary); }
.btn-primary { border: none; color: var(--app-on-primary); background: var(--app-primary); box-shadow: 0 8px 18px var(--app-shadow); }
.btn-danger { color: #dc2626; border-color: #fecaca; }
.ghost { color: #fff; border-color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.1); }
.ghost:hover { color: #fff; border-color: #fff; }

.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
.stat-card { border: 1px solid var(--app-border); border-radius: 10px; padding: 10px; background: color-mix(in srgb, var(--app-card) 90%, var(--app-primary) 10%); }
.stat-label { font-size: 12px; color: var(--app-text-muted); }
.stat-value { font-size: 22px; font-weight: 800; margin-top: 2px; color: var(--app-text); }
.chart-wrap { border: 1px solid var(--app-border); border-radius: 10px; padding: 8px; background: var(--app-card); }
.trend-chart { width: 100%; height: 220px; display: block; }
.chart-legend { margin-top: 8px; display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--app-text-secondary); }
.legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 999px; margin-right: 5px; }
.legend-dot.success { background: #22c55e; }
.legend-dot.failure { background: #ef4444; }
.chart-grid { margin-top: 10px; display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.chart-box { border: 1px solid var(--app-border); border-radius: 10px; padding: 8px; background: var(--app-card); }
.chart-title { font-size: 13px; font-weight: 700; color: var(--app-text-secondary); margin-bottom: 6px; }
.sub-chart { width: 100%; height: 240px; }

.empty { border: 1px dashed var(--app-border); border-radius: 10px; padding: 14px; color: var(--app-text-muted); }
.task-grid { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.task-card { border: 1px solid var(--app-border); border-radius: 12px; padding: 12px; background: var(--app-card); }
.task-top { display: flex; justify-content: space-between; gap: 10px; }
.task-name { font-weight: 800; }
.task-desc { margin-top: 4px; color: var(--app-text-muted); font-size: 13px; }
.task-meta { margin-top: 6px; font-size: 13px; color: var(--app-text-secondary); }
.task-actions { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
.status { display: inline-flex; padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 800; }
.status-on { background: #dcfce7; color: #166534; }
.status-off { background: #fee2e2; color: #991b1b; }
.status-done { background: #dbeafe; color: #1d4ed8; }

.log-list { list-style: none; display: grid; gap: 8px; }
.log-item { border: 1px solid var(--app-border); border-radius: 10px; padding: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
.log-time { color: var(--app-text-muted); font-size: 13px; }
.pagination { margin-top: 10px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.page-size { display: inline-flex; align-items: center; gap: 6px; color: var(--app-text-secondary); font-size: 13px; font-weight: 700; }
.page-info { color: var(--app-text-muted); font-size: 13px; }

@media (max-width: 980px) {
  .advanced-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .chart-grid { grid-template-columns: 1fr; }
  .task-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .form-grid, .simple-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: 1fr; }
  .col-2 { grid-column: auto; }
}
@media (max-width: 480px) {
  .advanced-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
