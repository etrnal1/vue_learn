<template>
  <div class="power-page">
    <section class="hero">
      <div>
        <h1>Mac mini 功耗统计</h1>
        <p>按分钟采样、按小时汇总、按天统计，用于估算 Mac mini 的耗电量与负载变化。</p>
      </div>
      <div class="hero-actions">
        <button class="ghost-btn" type="button" @click="loadSampleData">加载示例数据</button>
        <button class="ghost-btn danger" type="button" @click="clearAllRecords">清空数据</button>
      </div>
    </section>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-label">统计天数</span>
        <strong>{{ dailyBuckets.length }}</strong>
        <small>已记录的自然日</small>
      </article>
      <article class="summary-card">
        <span class="summary-label">整机估算耗电量</span>
        <strong>{{ formatEnergy(totalEnergyWh / 1000) }}</strong>
        <small>按分钟估算累计 kWh</small>
      </article>
      <article class="summary-card">
        <span class="summary-label">选中日期</span>
        <strong>{{ selectedDay || '未选择' }}</strong>
        <small>{{ selectedDayEnergyWh ? `${selectedDayEnergyWh.toFixed(2)} Wh` : '暂无数据' }}</small>
      </article>
      <article class="summary-card">
        <span class="summary-label">峰值功率</span>
        <strong>{{ peakWatts.toFixed(1) }} W</strong>
        <small>筛选结果中的分钟峰值</small>
      </article>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>实时功耗接口</h2>
        <div class="hero-actions">
          <span class="live-tip">后端轮询 {{ liveRefreshSeconds }}s</span>
          <button class="ghost-btn" type="button" @click="fetchRealtimePower">立即刷新</button>
          <button class="primary-btn" type="button" @click="saveRealtimeSample">保存当前采样</button>
        </div>
      </div>
      <div v-if="livePower" class="live-grid">
        <article class="live-card accent">
          <span class="summary-label">当前整机估算功率</span>
          <strong>{{ Number(livePower.current?.estimatedWatts || 0).toFixed(2) }} W</strong>
          <small>{{ livePower.current?.source }} / {{ livePower.current?.intensityLabel }}</small>
        </article>
        <article class="live-card">
          <span class="summary-label">按当前速率</span>
          <strong>{{ Number(livePower.current?.projectedDailyKwh || 0).toFixed(3) }} kWh/天</strong>
          <small>{{ Number(livePower.current?.projectedMonthlyKwh || 0).toFixed(2) }} kWh/月</small>
        </article>
        <article class="live-card">
          <span class="summary-label">CPU / 内存</span>
          <strong>{{ Number(livePower.cpu?.usagePercent || 0).toFixed(1) }}% / {{ Number(livePower.memory?.usagePercent || 0).toFixed(1) }}%</strong>
          <small>{{ livePower.cpu?.model || '-' }}</small>
        </article>
        <article class="live-card">
          <span class="summary-label">最近刷新</span>
          <strong>{{ formatDateTime(livePower.timestamp) }}</strong>
          <small>{{ livePower.host?.hostname || '-' }} / {{ livePower.host?.platform || '-' }}</small>
        </article>
      </div>
      <p v-if="livePower?.current?.note" class="live-note">{{ livePower.current.note }}</p>
      <p v-if="livePowerError" class="live-error">{{ livePowerError }}</p>
      <div v-if="livePower" class="live-detail-grid">
        <article class="mini-panel">
          <h3>估算因子</h3>
          <div class="kv-list">
            <div><span>设备模型</span><strong>{{ livePower.current?.profileLabel || '-' }}</strong></div>
            <div><span>CPU 因子</span><strong>{{ Number(livePower.current?.cpuFactor || 0).toFixed(3) }}</strong></div>
            <div><span>负载因子</span><strong>{{ Number(livePower.current?.loadFactor || 0).toFixed(3) }}</strong></div>
            <div><span>内存因子</span><strong>{{ Number(livePower.current?.memoryFactor || 0).toFixed(3) }}</strong></div>
            <div><span>I/O 因子</span><strong>{{ Number(livePower.current?.ioFactor || 0).toFixed(3) }}</strong></div>
          </div>
        </article>
        <article class="mini-panel">
          <h3>热点进程</h3>
          <div v-if="liveTopProcesses.length === 0" class="mini-empty">暂无进程能耗评分</div>
          <div v-else class="process-list">
            <div v-for="item in liveTopProcesses" :key="`${item.pid}-${item.command}`" class="process-item">
              <span>{{ item.command }}</span>
              <strong>{{ Number(item.powerScore || 0).toFixed(1) }}</strong>
            </div>
          </div>
        </article>
        <article class="mini-panel">
          <h3>后端历史采样</h3>
          <div v-if="livePowerHistory.length === 0" class="mini-empty">暂无历史</div>
          <div v-else class="process-list">
            <div v-for="item in livePowerHistory.slice(-8).reverse()" :key="item.timestamp" class="process-item">
              <span>{{ formatDateTime(item.timestamp) }}</span>
              <strong>{{ Number(item.estimatedWatts || 0).toFixed(2) }} W</strong>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>整机估算值与芯片瞬时功耗对比</h2>
        <div class="hero-actions">
          <button class="ghost-btn" type="button" @click="fetchPowerComparison">刷新对比</button>
        </div>
      </div>
      <div class="live-grid compare-grid">
        <article class="live-card accent">
          <span class="summary-label">整机估算功率</span>
          <strong>{{ comparisonEstimateText }}</strong>
          <small>{{ livePower?.current?.profileLabel || '估算模型' }}</small>
        </article>
        <article class="live-card actual-card">
          <span class="summary-label">芯片瞬时功耗</span>
          <strong>{{ comparisonActualText }}</strong>
          <small>{{ powerComparison?.available ? '真实采样' : '暂不可用' }}</small>
        </article>
        <article class="live-card">
          <span class="summary-label">差值</span>
          <strong>{{ comparisonDeltaText }}</strong>
          <small>芯片瞬时功耗 - 整机估算功率</small>
        </article>
        <article class="live-card">
          <span class="summary-label">采样状态</span>
          <strong>{{ powerComparison?.permissionRequired ? '需要 sudo/root' : '已连接' }}</strong>
          <small>{{ formatDateTime(powerComparison?.timestamp) }}</small>
        </article>
      </div>
      <p v-if="powerComparison?.note" class="live-note">{{ powerComparison.note }}</p>
      <p v-if="powerComparisonError" class="live-error">{{ powerComparisonError }}</p>
      <div v-if="powerComparison?.powermetrics?.metrics" class="live-detail-grid compare-detail-grid">
        <article class="mini-panel">
          <h3>芯片分项功耗</h3>
          <div class="kv-list">
            <div><span>总功耗</span><strong>{{ metricText('Combined Power (CPU + GPU + ANE)') }}</strong></div>
            <div><span>CPU 功耗</span><strong>{{ metricText('CPU Power') }}</strong></div>
            <div><span>GPU 功耗</span><strong>{{ metricText('GPU Power') }}</strong></div>
            <div><span>ANE 功耗</span><strong>{{ metricText('ANE Power') }}</strong></div>
          </div>
        </article>
        <article class="mini-panel">
          <h3>差异判断</h3>
          <div class="kv-list">
            <div><span>估算/真实比</span><strong>{{ comparisonRatioText }}</strong></div>
            <div><span>估算强度</span><strong>{{ livePower?.current?.intensityLabel || '-' }}</strong></div>
            <div><span>芯片采样</span><strong>{{ powerComparison?.available ? '已返回' : '未返回' }}</strong></div>
          </div>
        </article>
      </div>
      <div class="comparison-explain">
        <article class="mini-panel">
          <h3>为什么差距会大</h3>
          <div class="compare-reasons">
            <p>整机估算值会把 CPU、内存、磁盘 I/O、系统负载一起折算进去，更适合看每天、每小时、每月的耗电量。</p>
            <p>`powermetrics` 当前用的是 `cpu_power` 采样，主值来自 `Combined Power (CPU + GPU + ANE)`，更适合看芯片计算单元这一刻的瞬时功耗。</p>
            <p>所以账单视角看整机估算值，芯片负载视角看 `powermetrics`，两者不是同一口径，数值差大是正常现象。</p>
          </div>
        </article>
      </div>
    </section>

    <section class="chart-grid comparison-chart-grid">
      <article class="panel chart-panel chart-wide">
        <div class="panel-head">
          <h2>整机估算值 / 芯片瞬时功耗折线图</h2>
          <span>{{ powerComparisonHistory.length }} 个采样点</span>
        </div>
        <div ref="comparisonTrendChartRef" class="chart-box"></div>
      </article>
      <article class="panel chart-panel">
        <div class="panel-head">
          <h2>两者差值直方图</h2>
          <span>芯片瞬时功耗 - 整机估算功率</span>
        </div>
        <div ref="comparisonDeltaChartRef" class="chart-box"></div>
      </article>
      <article class="panel chart-panel">
        <div class="panel-head">
          <h2>芯片功耗构成饼图</h2>
          <span>CPU / GPU / ANE</span>
        </div>
        <div ref="comparisonPieChartRef" class="chart-box"></div>
      </article>
    </section>

    <section class="panel filters-panel">
      <div class="panel-head">
        <h2>筛选与视角</h2>
      </div>
      <div class="filters-grid">
        <label class="field">
          <span>关键词查询</span>
          <input v-model.trim="filters.keyword" type="text" placeholder="备注关键字，例如 办公 / 编译 / 待机" />
        </label>
        <label class="field">
          <span>记录来源</span>
          <select v-model="filters.source">
            <option value="">全部来源</option>
            <option value="manual">手工记录</option>
            <option value="auto">自动采样</option>
          </select>
        </label>
        <label class="field">
          <span>开始日期</span>
          <input v-model="filters.startDate" type="date" />
        </label>
        <label class="field">
          <span>结束日期</span>
          <input v-model="filters.endDate" type="date" />
        </label>
        <label class="field">
          <span>查看日期</span>
          <select v-model="filters.day">
            <option value="">自动选择最新</option>
            <option v-for="day in availableDays" :key="day" :value="day">{{ day }}</option>
          </select>
        </label>
        <label class="field">
          <span>查看小时</span>
          <select v-model="filters.hour">
            <option value="">全部小时</option>
            <option v-for="hour in availableHours" :key="hour.value" :value="hour.value">
              {{ hour.label }}
            </option>
          </select>
        </label>
      </div>
    </section>

    <section class="chart-grid">
      <article class="panel chart-panel">
        <div class="panel-head">
          <h2>每日整机估算耗电量</h2>
          <span>{{ dailyBuckets.length }} 天</span>
        </div>
        <div ref="dailyChartRef" class="chart-box"></div>
      </article>
      <article class="panel chart-panel">
        <div class="panel-head">
          <h2>每小时整机估算统计</h2>
          <span>{{ selectedDay || '请选择日期' }}</span>
        </div>
        <div ref="hourlyChartRef" class="chart-box"></div>
      </article>
      <article class="panel chart-panel chart-wide">
      <div class="panel-head">
        <h2>每分钟整机估算曲线</h2>
          <div class="hero-actions">
            <span>{{ selectedHourLabel }}</span>
            <label class="inline-toggle">
              <input v-model="showMinuteLabels" type="checkbox" />
              <span>显示所有标签</span>
            </label>
          </div>
        </div>
        <div ref="minuteChartRef" class="chart-box"></div>
      </article>
    </section>

    <section class="form-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>新增单条记录</h2>
        </div>
        <div class="form-grid-inner">
          <label class="field">
            <span>时间</span>
            <input v-model="singleForm.dateTime" type="datetime-local" />
          </label>
          <label class="field">
            <span>功率 (W)</span>
            <input v-model.number="singleForm.watts" type="number" min="1" step="0.1" />
          </label>
          <label class="field">
            <span>持续分钟</span>
            <input v-model.number="singleForm.durationMinutes" type="number" min="1" step="1" />
          </label>
          <label class="field field-wide">
            <span>备注</span>
            <input v-model.trim="singleForm.note" type="text" placeholder="例如：编译、待机、视频导出" />
          </label>
        </div>
        <div class="action-row">
          <button class="primary-btn" type="button" @click="addSingleRecord">添加记录</button>
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>批量生成记录</h2>
        </div>
        <div class="form-grid-inner">
          <label class="field">
            <span>日期</span>
            <input v-model="batchForm.date" type="date" />
          </label>
          <label class="field">
            <span>开始时间</span>
            <input v-model="batchForm.startTime" type="time" step="60" />
          </label>
          <label class="field">
            <span>结束时间</span>
            <input v-model="batchForm.endTime" type="time" step="60" />
          </label>
          <label class="field">
            <span>间隔</span>
            <select v-model.number="batchForm.intervalMinutes">
              <option :value="1">每分钟</option>
              <option :value="5">每 5 分钟</option>
              <option :value="10">每 10 分钟</option>
              <option :value="15">每 15 分钟</option>
              <option :value="30">每 30 分钟</option>
              <option :value="60">每小时</option>
            </select>
          </label>
          <label class="field">
            <span>功率 (W)</span>
            <input v-model.number="batchForm.watts" type="number" min="1" step="0.1" />
          </label>
          <label class="field">
            <span>持续分钟</span>
            <input v-model.number="batchForm.durationMinutes" type="number" min="1" step="1" />
          </label>
          <label class="field field-wide">
            <span>备注前缀</span>
            <input v-model.trim="batchForm.note" type="text" placeholder="例如：办公时段" />
          </label>
        </div>
        <div class="action-row">
          <button class="primary-btn" type="button" @click="generateBatchRecords">批量生成</button>
        </div>
      </article>
    </section>

    <section class="table-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>每日汇总</h2>
          <span>可快速切换查看</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>分钟数</th>
                <th>平均功率</th>
                <th>峰值功率</th>
                <th>耗电量</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="dailyBuckets.length === 0">
                <td colspan="5" class="empty-cell">暂无数据</td>
              </tr>
              <tr
                v-for="item in dailyBuckets"
                :key="item.day"
                class="clickable-row"
                @click="selectDay(item.day)"
              >
                <td>{{ item.day }}</td>
                <td>{{ item.minuteCount }}</td>
                <td>{{ item.avgWatts.toFixed(1) }} W</td>
                <td>{{ item.maxWatts.toFixed(1) }} W</td>
                <td>{{ item.energyWh.toFixed(2) }} Wh</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>最近记录</h2>
          <span>{{ records.length }} 条</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>功率</th>
                <th>持续</th>
                <th>备注</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="recentRecords.length === 0">
                <td colspan="5" class="empty-cell">暂无记录</td>
              </tr>
              <tr v-for="item in recentRecords" :key="item.id">
                <td>{{ formatDateTime(item.timestampMs) }}</td>
                <td>{{ item.watts.toFixed(1) }} W</td>
                <td>{{ item.durationMinutes }} 分钟</td>
                <td>{{ item.note || '-' }}</td>
                <td>
                  <button class="text-btn danger" type="button" @click="removeRecord(item.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  </div>
</template>

<script>
import { api } from '../utils/api'

const LOCAL_RECORDS_CACHE_KEY = 'mac_mini_power_records_cache_v1'
const LOCAL_POWER_CACHE_KEY = 'mac_mini_power_live_cache_v1'
const LOCAL_COMPARISON_CACHE_KEY = 'mac_mini_power_comparison_cache_v1'

function startOfMinute(timestampMs) {
  const date = new Date(timestampMs)
  date.setSeconds(0, 0)
  return date.getTime()
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function toDayKey(timestampMs) {
  const date = new Date(timestampMs)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toHourKey(timestampMs) {
  const date = new Date(timestampMs)
  return `${toDayKey(timestampMs)} ${pad(date.getHours())}:00`
}

function toMinuteLabel(timestampMs) {
  const date = new Date(timestampMs)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDateTimeLocalInput(timestampMs) {
  const date = new Date(timestampMs)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseTimeToMinutes(text) {
  const [hourText = '0', minuteText = '0'] = String(text || '').split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0
  return Math.max(0, Math.min(23, hour)) * 60 + Math.max(0, Math.min(59, minute))
}

function buildDateTime(dateText, timeText) {
  return new Date(`${dateText}T${timeText}:00`).getTime()
}

function normalizeRecord(record) {
  const timestampMs = startOfMinute(Number(record?.timestampMs || Date.now()))
  const watts = Number(record?.watts || 0)
  const durationMinutes = Math.max(1, Math.floor(Number(record?.durationMinutes || 1)))
  if (!Number.isFinite(timestampMs) || !Number.isFinite(watts) || watts <= 0) return null
  return {
    id: String(record?.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
    timestampMs,
    watts,
    durationMinutes,
    note: String(record?.note || '').trim()
  }
}

function createMinuteBucket(timestampMs, watts, energyWh = watts / 60) {
  const bucketTimestamp = startOfMinute(timestampMs)
  const date = new Date(bucketTimestamp)
  return {
    timestampMs: bucketTimestamp,
    watts,
    energyWh,
    day: toDayKey(bucketTimestamp),
    hourKey: toHourKey(bucketTimestamp),
    hourValue: date.getHours(),
    minuteLabel: toMinuteLabel(bucketTimestamp)
  }
}

export default {
  name: 'MacMiniPowerDashboard',
  data() {
    const now = Date.now()
    return {
      records: [],
      minuteBucketsAll: [],
      filters: {
        keyword: '',
        source: '',
        startDate: '',
        endDate: '',
        day: '',
        hour: ''
      },
      singleForm: {
        dateTime: toDateTimeLocalInput(now),
        watts: 18,
        durationMinutes: 1,
        note: ''
      },
      batchForm: {
        date: toDayKey(now),
        startTime: '09:00',
        endTime: '18:00',
        intervalMinutes: 60,
        watts: 28,
        durationMinutes: 60,
        note: '办公'
      },
      liveRefreshSeconds: 15,
      livePower: null,
      livePowerError: '',
      powerComparison: null,
      powerComparisonError: '',
      powerComparisonHistory: [],
      liveTimer: null,
      showMinuteLabels: true,
      recordsLoading: false,
      echartsModule: null,
      dailyChart: null,
      hourlyChart: null,
      minuteChart: null,
      comparisonTrendChart: null,
      comparisonDeltaChart: null,
      comparisonPieChart: null,
      resizeHandler: null
    }
  },
  computed: {
    rangeStartMs() {
      if (!this.filters.startDate) return Number.NEGATIVE_INFINITY
      return new Date(`${this.filters.startDate}T00:00:00`).getTime()
    },
    rangeEndMs() {
      if (!this.filters.endDate) return Number.POSITIVE_INFINITY
      return new Date(`${this.filters.endDate}T23:59:59`).getTime()
    },
    effectiveMinuteBuckets() {
      if (this.filters.source !== 'auto' && this.minuteBucketsAll.length > 0) {
        return this.minuteBucketsAll
      }

      const grouped = new Map()
      this.livePowerHistory.forEach((item) => {
        const timestampMs = startOfMinute(Number(item?.timestamp || 0))
        const watts = Number(item?.estimatedWatts || 0)
        const sampleSeconds = Math.max(1, Number(item?.sampleSeconds || this.liveRefreshSeconds))
        if (!Number.isFinite(timestampMs) || !Number.isFinite(watts) || watts <= 0) return
        const prev = grouped.get(timestampMs) || { wattsSum: 0, count: 0, energyWh: 0 }
        prev.wattsSum += watts
        prev.count += 1
        prev.energyWh += (watts * sampleSeconds) / 3600
        grouped.set(timestampMs, prev)
      })

      return Array.from(grouped.entries())
        .map(([timestampMs, item]) => createMinuteBucket(
          timestampMs,
          item.wattsSum / Math.max(1, item.count),
          item.energyWh
        ))
        .sort((a, b) => a.timestampMs - b.timestampMs)
    },
    filteredMinuteBuckets() {
      return this.effectiveMinuteBuckets.filter((item) => item.timestampMs >= this.rangeStartMs && item.timestampMs <= this.rangeEndMs)
    },
    availableDays() {
      return Array.from(new Set(this.filteredMinuteBuckets.map((item) => item.day))).sort((a, b) => a.localeCompare(b))
    },
    selectedDay() {
      if (this.filters.day && this.availableDays.includes(this.filters.day)) return this.filters.day
      return this.availableDays[this.availableDays.length - 1] || ''
    },
    dayMinuteBuckets() {
      if (!this.selectedDay) return []
      return this.filteredMinuteBuckets.filter((item) => item.day === this.selectedDay)
    },
    availableHours() {
      const hours = Array.from(new Set(this.dayMinuteBuckets.map((item) => item.hourValue))).sort((a, b) => a - b)
      return hours.map((hour) => ({ value: String(hour), label: `${pad(hour)}:00` }))
    },
    selectedHourNumber() {
      if (this.filters.hour === '') return null
      const hour = Number(this.filters.hour)
      return Number.isFinite(hour) ? hour : null
    },
    selectedHourLabel() {
      if (!this.selectedDay) return '请选择日期'
      if (this.selectedHourNumber == null) return `${this.selectedDay} 全部分钟`
      return `${this.selectedDay} ${pad(this.selectedHourNumber)}:00`
    },
    minuteBucketsForHour() {
      if (!this.selectedDay) return []
      if (this.selectedHourNumber == null) return this.dayMinuteBuckets
      return this.dayMinuteBuckets.filter((item) => item.hourValue === this.selectedHourNumber)
    },
    dailyBuckets() {
      const map = new Map()
      this.filteredMinuteBuckets.forEach((item) => {
        const prev = map.get(item.day) || {
          day: item.day,
          minuteCount: 0,
          wattsSum: 0,
          maxWatts: 0,
          energyWh: 0
        }
        prev.minuteCount += 1
        prev.wattsSum += item.watts
        prev.maxWatts = Math.max(prev.maxWatts, item.watts)
        prev.energyWh += Number(item.energyWh || 0)
        map.set(item.day, prev)
      })
      return Array.from(map.values())
        .map((item) => ({
          ...item,
          avgWatts: item.minuteCount > 0 ? item.wattsSum / item.minuteCount : 0
        }))
        .sort((a, b) => a.day.localeCompare(b.day))
    },
    hourlyBuckets() {
      const map = new Map()
      this.dayMinuteBuckets.forEach((item) => {
        const key = item.hourValue
        const prev = map.get(key) || {
          hourValue: key,
          label: `${pad(key)}:00`,
          minuteCount: 0,
          wattsSum: 0,
          maxWatts: 0,
          energyWh: 0
        }
        prev.minuteCount += 1
        prev.wattsSum += item.watts
        prev.maxWatts = Math.max(prev.maxWatts, item.watts)
        prev.energyWh += Number(item.energyWh || 0)
        map.set(key, prev)
      })
      return Array.from(map.values())
        .map((item) => ({
          ...item,
          avgWatts: item.minuteCount > 0 ? item.wattsSum / item.minuteCount : 0
        }))
        .sort((a, b) => a.hourValue - b.hourValue)
    },
    totalEnergyWh() {
      return this.filteredMinuteBuckets.reduce((sum, item) => sum + Number(item.energyWh || 0), 0)
    },
    selectedDayEnergyWh() {
      return this.dayMinuteBuckets.reduce((sum, item) => sum + Number(item.energyWh || 0), 0)
    },
    livePowerHistory() {
      return Array.isArray(this.livePower?.history) ? this.livePower.history : []
    },
    liveTopProcesses() {
      return Array.isArray(this.livePower?.topProcesses) ? this.livePower.topProcesses : []
    },
    comparisonEstimateText() {
      const value = Number(this.livePower?.current?.estimatedWatts || 0)
      return value > 0 ? `${value.toFixed(2)} W` : '--'
    },
    comparisonActualText() {
      const value = Number(this.powerComparison?.powermetrics?.totalWatts || 0)
      return value > 0 ? `${value.toFixed(3)} W` : '不可用'
    },
    comparisonDeltaText() {
      const value = Number(this.powerComparison?.deltaWatts)
      return Number.isFinite(value) ? `${value.toFixed(3)} W` : '--'
    },
    comparisonRatioText() {
      const estimate = Number(this.livePower?.current?.estimatedWatts || 0)
      const actual = Number(this.powerComparison?.powermetrics?.totalWatts || 0)
      if (!(estimate > 0) || !(actual > 0)) return '--'
      return `${(estimate / actual).toFixed(2)}x`
    },
    comparisonPieData() {
      const metrics = this.powerComparison?.powermetrics?.metrics || {}
      return [
        { name: 'CPU', value: Number(metrics['CPU Power']?.watts || 0) },
        { name: 'GPU', value: Number(metrics['GPU Power']?.watts || 0) },
        { name: 'ANE', value: Number(metrics['ANE Power']?.watts || 0) }
      ].filter((item) => item.value > 0)
    },
    peakWatts() {
      return this.filteredMinuteBuckets.reduce((max, item) => Math.max(max, item.watts), 0)
    },
    recentRecords() {
      return [...this.records]
        .sort((a, b) => b.timestampMs - a.timestampMs)
        .slice(0, 12)
    }
  },
  watch: {
    records: {
      handler() {
        this.persistCachedRecords()
        this.rebuildMinuteBuckets()
        this.$nextTick(() => this.updateAllCharts())
      }
    },
    filters: {
      deep: true,
      handler() {
        if (this.filters.day && !this.availableDays.includes(this.filters.day)) {
          this.filters.day = ''
        }
        if (this.filters.hour !== '') {
          const exists = this.availableHours.some((item) => item.value === this.filters.hour)
          if (!exists) {
            this.filters.hour = ''
          }
        }
        this.loadRecords()
        this.fetchRealtimePower()
        this.$nextTick(() => this.updateAllCharts())
      }
    },
    livePower: {
      deep: true,
      handler() {
        this.persistCachedPower()
        this.$nextTick(() => this.updateAllCharts())
      }
    }
  },
  mounted() {
    this.loadCachedRecords()
    this.loadRecords()
    this.rebuildMinuteBuckets()
    this.loadCachedPower()
    this.loadCachedComparisonHistory()
    this.fetchRealtimePower()
    this.fetchPowerComparison()
    this.liveTimer = window.setInterval(() => {
      this.fetchRealtimePower()
      this.fetchPowerComparison()
    }, this.liveRefreshSeconds * 1000)
    this.$nextTick(() => this.initCharts())
  },
  beforeUnmount() {
    if (this.liveTimer) {
      window.clearInterval(this.liveTimer)
      this.liveTimer = null
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
      this.resizeHandler = null
    }
    ;[
      this.dailyChart,
      this.hourlyChart,
      this.minuteChart,
      this.comparisonTrendChart,
      this.comparisonDeltaChart,
      this.comparisonPieChart
    ].forEach((chart) => {
      if (chart) chart.dispose()
    })
    this.dailyChart = null
    this.hourlyChart = null
    this.minuteChart = null
    this.comparisonTrendChart = null
    this.comparisonDeltaChart = null
    this.comparisonPieChart = null
  },
  methods: {
    loadCachedRecords() {
      if (typeof window === 'undefined') return
      try {
        const raw = window.localStorage.getItem(LOCAL_RECORDS_CACHE_KEY)
        const parsed = JSON.parse(raw || '[]')
        if (!Array.isArray(parsed)) return
        this.records = parsed
          .map((item) => normalizeRecord(item))
          .filter(Boolean)
          .sort((a, b) => a.timestampMs - b.timestampMs)
      } catch (_error) {
        // ignore local cache errors
      }
    },
    persistCachedRecords() {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.setItem(LOCAL_RECORDS_CACHE_KEY, JSON.stringify(this.records))
      } catch (_error) {
        // ignore local cache errors
      }
    },
    loadCachedPower() {
      if (typeof window === 'undefined') return
      try {
        const raw = window.localStorage.getItem(LOCAL_POWER_CACHE_KEY)
        const parsed = JSON.parse(raw || 'null')
        if (parsed && typeof parsed === 'object') {
          this.livePower = parsed
        }
      } catch (_error) {
        // ignore local cache errors
      }
    },
    persistCachedPower() {
      if (typeof window === 'undefined' || !this.livePower) return
      try {
        window.localStorage.setItem(LOCAL_POWER_CACHE_KEY, JSON.stringify(this.livePower))
      } catch (_error) {
        // ignore local cache errors
      }
    },
    loadCachedComparisonHistory() {
      if (typeof window === 'undefined') return
      try {
        const raw = window.localStorage.getItem(LOCAL_COMPARISON_CACHE_KEY)
        const parsed = JSON.parse(raw || '[]')
        this.powerComparisonHistory = Array.isArray(parsed)
          ? parsed.filter((item) => Number(item?.timestamp) > 0).slice(-180)
          : []
      } catch (_error) {
        // ignore local cache errors
      }
    },
    persistCachedComparisonHistory() {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.setItem(LOCAL_COMPARISON_CACHE_KEY, JSON.stringify(this.powerComparisonHistory.slice(-180)))
      } catch (_error) {
        // ignore local cache errors
      }
    },
    appendComparisonSnapshot(payload) {
      const timestamp = Number(payload?.timestamp || Date.now())
      const estimatedWatts = Number(payload?.estimated?.estimatedWatts || this.livePower?.current?.estimatedWatts || 0)
      const actualWatts = Number(payload?.powermetrics?.totalWatts || 0)
      const deltaWatts = Number(payload?.deltaWatts)
      if (!(timestamp > 0) || !(estimatedWatts > 0) || !(actualWatts > 0)) return
      const roundedTimestamp = startOfMinute(timestamp)
      const snapshot = {
        timestamp: roundedTimestamp,
        estimatedWatts,
        actualWatts,
        deltaWatts: Number.isFinite(deltaWatts) ? deltaWatts : actualWatts - estimatedWatts
      }
      const next = this.powerComparisonHistory.filter((item) => Number(item?.timestamp) !== roundedTimestamp)
      next.push(snapshot)
      next.sort((a, b) => a.timestamp - b.timestamp)
      this.powerComparisonHistory = next.slice(-180)
      this.persistCachedComparisonHistory()
    },
    async loadRecords() {
      this.recordsLoading = true
      try {
        const params = {
          limit: 1000
        }
        if (Number.isFinite(this.rangeStartMs)) params.startMs = this.rangeStartMs
        if (Number.isFinite(this.rangeEndMs)) params.endMs = this.rangeEndMs
        if (this.filters.keyword) params.keyword = this.filters.keyword
        if (this.filters.source) params.source = this.filters.source
        const result = await api.systemMonitor.listPowerRecords(params)
        const items = Array.isArray(result?.records) ? result.records : []
        this.records = items
          .map((item) => normalizeRecord({
            id: item.id,
            timestampMs: item.timestamp,
            watts: item.watts,
            durationMinutes: item.durationMinutes,
            note: item.note
          }))
          .filter(Boolean)
          .sort((a, b) => a.timestampMs - b.timestampMs)
      } catch (_error) {
        this.records = []
      } finally {
        this.recordsLoading = false
      }
    },
    rebuildMinuteBuckets() {
      const map = new Map()
      this.records.forEach((record) => {
        for (let offset = 0; offset < record.durationMinutes; offset += 1) {
          const timestampMs = record.timestampMs + offset * 60000
          const bucketKey = startOfMinute(timestampMs)
          const current = map.get(bucketKey) || 0
          map.set(bucketKey, current + record.watts)
        }
      })
      this.minuteBucketsAll = Array.from(map.entries())
        .map(([timestampMs, watts]) => createMinuteBucket(timestampMs, watts, watts / 60))
        .sort((a, b) => a.timestampMs - b.timestampMs)
    },
    formatEnergy(kwh) {
      return `${Number(kwh || 0).toFixed(3)} kWh`
    },
    formatDateTime(timestampMs) {
      if (!timestampMs) return '-'
      return new Date(timestampMs).toLocaleString('zh-CN', { hour12: false })
    },
    metricText(key) {
      const value = Number(this.powerComparison?.powermetrics?.metrics?.[key]?.watts || 0)
      return value > 0 || key === 'ANE Power' ? `${value.toFixed(3)} W` : '--'
    },
    async fetchRealtimePower() {
      try {
        const params = {}
        if (Number.isFinite(this.rangeStartMs)) params.startMs = this.rangeStartMs
        if (Number.isFinite(this.rangeEndMs)) params.endMs = this.rangeEndMs
        if (this.filters.keyword) params.keyword = this.filters.keyword
        this.livePower = await api.systemMonitor.getPower(2000, params)
        this.livePowerError = ''
      } catch (error) {
        this.livePowerError = error?.message || '实时功耗获取失败'
      }
    },
    async fetchPowerComparison() {
      try {
        this.powerComparison = await api.systemMonitor.getPowermetrics()
        this.powerComparisonError = ''
        this.appendComparisonSnapshot(this.powerComparison)
        this.$nextTick(() => this.updateAllCharts())
      } catch (error) {
        this.powerComparisonError = error?.message || 'powermetrics 对比加载失败'
      }
    },
    async saveRealtimeSample() {
      const watts = Number(this.livePower?.current?.estimatedWatts || 0)
      const timestampMs = Number(this.livePower?.timestamp || Date.now())
      if (!Number.isFinite(watts) || watts <= 0) {
        alert('当前没有可保存的实时采样')
        return
      }
      try {
        const result = await api.systemMonitor.createPowerRecord({
          timestampMs,
          watts,
          durationMinutes: 1,
          note: `实时采样 / ${String(this.livePower?.current?.source || 'estimated')}`
        })
        const record = normalizeRecord({
          id: result?.record?.id,
          timestampMs,
          watts,
          durationMinutes: 1,
          note: `实时采样 / ${String(this.livePower?.current?.source || 'estimated')}`
        })
        this.records = [...this.records, record].filter(Boolean).sort((a, b) => a.timestampMs - b.timestampMs)
        this.filters.day = toDayKey(timestampMs)
      } catch (error) {
        alert(error?.message || '保存实时采样失败')
      }
    },
    selectDay(day) {
      this.filters.day = day
      this.filters.hour = ''
    },
    async addSingleRecord() {
      const timestampMs = new Date(this.singleForm.dateTime).getTime()
      const watts = Number(this.singleForm.watts)
      const durationMinutes = Math.max(1, Math.floor(Number(this.singleForm.durationMinutes || 1)))
      if (!Number.isFinite(timestampMs)) {
        alert('请选择有效时间')
        return
      }
      if (!Number.isFinite(watts) || watts <= 0) {
        alert('功率必须大于 0')
        return
      }
      try {
        const result = await api.systemMonitor.createPowerRecord({
          timestampMs,
          watts,
          durationMinutes,
          note: this.singleForm.note
        })
        this.records = [
          ...this.records,
          normalizeRecord({
            id: result?.record?.id,
            timestampMs,
            watts,
            durationMinutes,
            note: this.singleForm.note
          })
        ].filter(Boolean).sort((a, b) => a.timestampMs - b.timestampMs)
        this.filters.day = toDayKey(timestampMs)
        this.singleForm.note = ''
      } catch (error) {
        alert(error?.message || '添加记录失败')
      }
    },
    async generateBatchRecords() {
      const date = String(this.batchForm.date || '').trim()
      if (!date) {
        alert('请选择日期')
        return
      }
      const intervalMinutes = Math.max(1, Math.floor(Number(this.batchForm.intervalMinutes || 1)))
      const durationMinutes = Math.max(1, Math.floor(Number(this.batchForm.durationMinutes || intervalMinutes)))
      const watts = Number(this.batchForm.watts)
      const startMinute = parseTimeToMinutes(this.batchForm.startTime)
      const endMinute = parseTimeToMinutes(this.batchForm.endTime)
      if (!Number.isFinite(watts) || watts <= 0) {
        alert('功率必须大于 0')
        return
      }
      if (endMinute < startMinute) {
        alert('结束时间不能早于开始时间')
        return
      }

      const nextRecords = []
      for (let minute = startMinute; minute <= endMinute; minute += intervalMinutes) {
        const hour = Math.floor(minute / 60)
        const minuteValue = minute % 60
        const timestampMs = buildDateTime(date, `${pad(hour)}:${pad(minuteValue)}`)
        nextRecords.push(normalizeRecord({
          timestampMs,
          watts,
          durationMinutes,
          note: this.batchForm.note ? `${this.batchForm.note} ${pad(hour)}:${pad(minuteValue)}` : ''
        }))
      }
      try {
        const persisted = []
        for (const item of nextRecords.filter(Boolean)) {
          const result = await api.systemMonitor.createPowerRecord({
            timestampMs: item.timestampMs,
            watts: item.watts,
            durationMinutes: item.durationMinutes,
            note: item.note
          })
          persisted.push({
            ...item,
            id: result?.record?.id || item.id
          })
        }
        this.records = [...this.records, ...persisted].sort((a, b) => a.timestampMs - b.timestampMs)
        this.filters.day = date
      } catch (error) {
        alert(error?.message || '批量生成失败')
      }
    },
    async removeRecord(id) {
      try {
        await api.systemMonitor.deletePowerRecord(id)
        this.records = this.records.filter((item) => item.id !== id)
      } catch (error) {
        alert(error?.message || '删除失败')
      }
    },
    async clearAllRecords() {
      if (!window.confirm('确认清空全部 Mac mini 功耗记录吗？')) return
      try {
        await api.systemMonitor.clearPowerRecords()
        this.records = []
        this.filters.day = ''
        this.filters.hour = ''
      } catch (error) {
        alert(error?.message || '清空失败')
      }
    },
    loadSampleData() {
      const baseDay = toDayKey(Date.now())
      const sample = []
      for (let hour = 0; hour < 24; hour += 1) {
        const baseWatts = hour >= 9 && hour <= 18 ? 24 : 11
        for (let minute = 0; minute < 60; minute += 1) {
          const noise = ((hour * 13 + minute * 7) % 9) - 4
          const extra = hour >= 13 && hour <= 15 ? 7 : 0
          sample.push(normalizeRecord({
            timestampMs: buildDateTime(baseDay, `${pad(hour)}:${pad(minute)}`),
            watts: Math.max(6, baseWatts + extra + noise),
            durationMinutes: 1,
            note: hour >= 9 && hour <= 18 ? '示例办公负载' : '示例待机负载'
          }))
        }
      }
      this.records = sample.filter(Boolean)
      this.filters.startDate = baseDay
      this.filters.endDate = baseDay
      this.filters.day = baseDay
      this.filters.hour = ''
    },
    async initCharts() {
      if (!this.$refs.dailyChartRef || !this.$refs.hourlyChartRef || !this.$refs.minuteChartRef) return
      if (!this.echartsModule) {
        this.echartsModule = await import('echarts')
      }
      if (!this.dailyChart) {
        this.dailyChart = this.echartsModule.init(this.$refs.dailyChartRef)
      }
      if (!this.hourlyChart) {
        this.hourlyChart = this.echartsModule.init(this.$refs.hourlyChartRef)
      }
      if (!this.minuteChart) {
        this.minuteChart = this.echartsModule.init(this.$refs.minuteChartRef)
      }
      if (this.$refs.comparisonTrendChartRef && !this.comparisonTrendChart) {
        this.comparisonTrendChart = this.echartsModule.init(this.$refs.comparisonTrendChartRef)
      }
      if (this.$refs.comparisonDeltaChartRef && !this.comparisonDeltaChart) {
        this.comparisonDeltaChart = this.echartsModule.init(this.$refs.comparisonDeltaChartRef)
      }
      if (this.$refs.comparisonPieChartRef && !this.comparisonPieChart) {
        this.comparisonPieChart = this.echartsModule.init(this.$refs.comparisonPieChartRef)
      }
      this.updateAllCharts()
      if (!this.resizeHandler) {
        this.resizeHandler = () => {
          if (this.dailyChart) this.dailyChart.resize()
          if (this.hourlyChart) this.hourlyChart.resize()
          if (this.minuteChart) this.minuteChart.resize()
          if (this.comparisonTrendChart) this.comparisonTrendChart.resize()
          if (this.comparisonDeltaChart) this.comparisonDeltaChart.resize()
          if (this.comparisonPieChart) this.comparisonPieChart.resize()
        }
        window.addEventListener('resize', this.resizeHandler)
      }
    },
    updateAllCharts() {
      this.updateDailyChart()
      this.updateHourlyChart()
      this.updateMinuteChart()
      this.updateComparisonTrendChart()
      this.updateComparisonDeltaChart()
      this.updateComparisonPieChart()
    },
    baseChartOption() {
      return {
        animationDuration: 260,
        textStyle: {
          color: '#475569',
          fontFamily: 'SF Pro Display, PingFang SC, Hiragino Sans GB, sans-serif'
        },
        grid: {
          left: 46,
          right: 20,
          top: 28,
          bottom: 40
        },
        tooltip: {
          trigger: 'axis'
        }
      }
    },
    updateDailyChart() {
      if (!this.dailyChart) return
      const labels = this.dailyBuckets.map((item) => item.day)
      const values = this.dailyBuckets.map((item) => Number(item.energyWh.toFixed(2)))
      this.dailyChart.setOption({
        ...this.baseChartOption(),
        xAxis: {
          type: 'category',
          data: labels,
          axisLabel: { rotate: labels.length > 6 ? 28 : 0 }
        },
        yAxis: {
          type: 'value',
          name: 'Wh'
        },
        series: [
          {
            name: '每日整机估算耗电量',
            type: 'bar',
            barWidth: '46%',
            data: values,
            itemStyle: {
              color: '#2563eb',
              borderRadius: [8, 8, 0, 0]
            },
            label: {
              show: true,
              position: 'top',
              formatter: (params) => `${Number(params.value || 0).toFixed(2)}`
            }
          }
        ]
      })
    },
    updateHourlyChart() {
      if (!this.hourlyChart) return
      this.hourlyChart.setOption({
        ...this.baseChartOption(),
        legend: {
          top: 0
        },
        xAxis: {
          type: 'category',
          data: this.hourlyBuckets.map((item) => item.label)
        },
        yAxis: [
          {
            type: 'value',
            name: 'W'
          },
          {
            type: 'value',
            name: 'Wh'
          }
        ],
        series: [
          {
            name: '平均功率',
            type: 'line',
            smooth: true,
            symbolSize: 7,
            data: this.hourlyBuckets.map((item) => Number(item.avgWatts.toFixed(1))),
            itemStyle: { color: '#059669' },
            lineStyle: { width: 3, color: '#059669' },
            label: {
              show: true,
              position: 'top',
              formatter: (params) => `${Number(params.value || 0).toFixed(1)}W`
            }
          },
          {
            name: '小时耗电量',
            type: 'bar',
            yAxisIndex: 1,
            data: this.hourlyBuckets.map((item) => Number(item.energyWh.toFixed(2))),
            itemStyle: {
              color: '#f59e0b',
              borderRadius: [6, 6, 0, 0]
            },
            label: {
              show: true,
              position: 'top',
              formatter: (params) => `${Number(params.value || 0).toFixed(2)}Wh`
            }
          }
        ]
      })
    },
    updateMinuteChart() {
      if (!this.minuteChart) return
      const minuteCount = this.minuteBucketsForHour.length
      this.minuteChart.setOption({
        ...this.baseChartOption(),
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            const first = Array.isArray(params) ? params[0] : params
            if (!first) return ''
            const label = String(first.axisValue || '')
            const value = Number(first.data || 0)
            return `${label}<br/>分钟功率: ${value.toFixed(1)} W`
          }
        },
        dataZoom: [
          { type: 'inside' },
          { type: 'slider', height: 18, bottom: 10 }
        ],
        xAxis: {
          type: 'category',
          data: this.minuteBucketsForHour.map((item) => item.minuteLabel),
          axisLabel: {
            interval: minuteCount > 24 ? Math.ceil(minuteCount / 12) - 1 : 0
          }
        },
        yAxis: {
          type: 'value',
          name: 'W'
        },
        series: [
          {
            name: '分钟功率',
            type: 'line',
            smooth: false,
            showSymbol: true,
            symbol: 'circle',
            symbolSize: minuteCount <= 90 ? 7 : 5,
            areaStyle: {
              color: 'rgba(59, 130, 246, 0.16)'
            },
            itemStyle: { color: '#3b82f6' },
            lineStyle: { width: 2.5, color: '#3b82f6' },
            label: {
              show: this.showMinuteLabels,
              position: 'top',
              distance: 8,
              color: '#1d4ed8',
              fontSize: 11,
              formatter: (params) => {
                const value = Number(params.value || 0)
                return Number.isFinite(value) ? `${value.toFixed(1)}W` : ''
              }
            },
            emphasis: {
              focus: 'series',
              label: {
                show: true
              }
            },
            data: this.minuteBucketsForHour.map((item) => Number(item.watts.toFixed(1)))
          }
        ]
      })
    },
    updateComparisonTrendChart() {
      if (!this.comparisonTrendChart) return
      const history = this.powerComparisonHistory
      this.comparisonTrendChart.setOption({
        ...this.baseChartOption(),
        legend: { top: 0 },
        xAxis: {
          type: 'category',
          data: history.map((item) => new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour12: false }))
        },
        yAxis: {
          type: 'value',
          name: 'W'
        },
        series: [
          {
            name: '整机估算值',
            type: 'line',
            smooth: true,
            symbolSize: 6,
            data: history.map((item) => Number(item.estimatedWatts.toFixed(2))),
            itemStyle: { color: '#2563eb' },
            lineStyle: { width: 3, color: '#2563eb' }
          },
          {
            name: '芯片瞬时功耗',
            type: 'line',
            smooth: true,
            symbolSize: 6,
            data: history.map((item) => Number(item.actualWatts.toFixed(3))),
            itemStyle: { color: '#f59e0b' },
            lineStyle: { width: 3, color: '#f59e0b' }
          }
        ]
      })
    },
    updateComparisonDeltaChart() {
      if (!this.comparisonDeltaChart) return
      const history = this.powerComparisonHistory
      this.comparisonDeltaChart.setOption({
        ...this.baseChartOption(),
        xAxis: {
          type: 'category',
          data: history.map((item) => new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour12: false }))
        },
        yAxis: {
          type: 'value',
          name: 'W'
        },
        series: [
          {
            name: '差值',
            type: 'bar',
            data: history.map((item) => Number(item.deltaWatts.toFixed(3))),
            itemStyle: {
              color: (params) => Number(params.value || 0) >= 0 ? '#f97316' : '#0f766e',
              borderRadius: [6, 6, 0, 0]
            },
            label: {
              show: history.length <= 18,
              position: 'top',
              formatter: (params) => `${Number(params.value || 0).toFixed(2)}W`
            }
          }
        ]
      })
    },
    updateComparisonPieChart() {
      if (!this.comparisonPieChart) return
      const data = this.comparisonPieData
      this.comparisonPieChart.setOption({
        animationDuration: 260,
        tooltip: {
          trigger: 'item',
          formatter: (params) => `${params.name}: ${Number(params.value || 0).toFixed(3)} W (${Number(params.percent || 0).toFixed(1)}%)`
        },
        series: [
          {
            name: '芯片功耗构成',
            type: 'pie',
            radius: ['38%', '72%'],
            center: ['50%', '54%'],
            label: {
              formatter: ({ name, value }) => `${name}\n${Number(value || 0).toFixed(3)}W`
            },
            data: data.length > 0 ? data : [{ name: '暂无数据', value: 1, itemStyle: { color: '#cbd5e1' } }],
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2
            },
            color: ['#2563eb', '#f59e0b', '#10b981']
          }
        ]
      })
    }
  }
}
</script>

<style scoped>
.power-page {
  color: var(--app-text);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero,
.panel,
.summary-card {
  border: 1px solid var(--app-border);
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 22px;
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.22), transparent 34%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.03), rgba(37, 99, 235, 0.08)),
    var(--app-card);
}

.hero h1,
.panel h2 {
  margin: 0;
}

.hero p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  max-width: 720px;
}

.hero-actions,
.action-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.summary-grid,
.chart-grid,
.form-grid,
.table-grid {
  display: grid;
  gap: 14px;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.live-grid,
.live-detail-grid {
  display: grid;
  gap: 14px;
}

.live-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 12px;
}

.live-detail-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 12px;
}

.summary-card {
  border-radius: 18px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.live-card,
.mini-panel {
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--app-border) 70%, transparent);
  background: color-mix(in srgb, var(--app-card) 84%, white);
  padding: 16px;
}

.live-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.live-card strong {
  font-size: 1.45rem;
}

.live-card.accent {
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(16, 185, 129, 0.08)),
    color-mix(in srgb, var(--app-card) 86%, white);
}

.actual-card {
  background:
    linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(249, 115, 22, 0.08)),
    color-mix(in srgb, var(--app-card) 86%, white);
}

.compare-grid {
  margin-bottom: 12px;
}

.compare-detail-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.comparison-explain {
  margin-top: 12px;
}

.compare-reasons {
  display: grid;
  gap: 10px;
  color: var(--app-text-secondary);
  line-height: 1.65;
}

.compare-reasons p {
  margin: 0;
}

.live-tip,
.live-note,
.live-error,
.mini-empty {
  color: var(--app-text-muted);
  font-size: 0.92rem;
}

.live-error {
  color: #dc2626;
}

.mini-panel h3 {
  margin: 0 0 12px;
  font-size: 1rem;
}

.kv-list,
.process-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kv-list div,
.process-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.kv-list span,
.process-item span {
  color: var(--app-text-secondary);
  min-width: 0;
  word-break: break-word;
}

.summary-card strong {
  font-size: 1.7rem;
}

.summary-label {
  color: var(--app-text-muted);
  font-size: 0.92rem;
}

.panel {
  border-radius: 18px;
  padding: 18px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head span {
  color: var(--app-text-muted);
  font-size: 0.9rem;
}

.filters-grid,
.form-grid-inner {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inline-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--app-text-secondary);
  font-size: 0.92rem;
}

.inline-toggle input {
  margin: 0;
}

.field-wide {
  grid-column: span 2;
}

.field span {
  color: var(--app-text-muted);
  font-size: 0.9rem;
}

.field input,
.field select {
  border: 1px solid var(--app-border);
  background: color-mix(in srgb, var(--app-card) 76%, white);
  color: var(--app-text);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 0.95rem;
}

.field input:focus,
.field select:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-primary) 18%, transparent);
}

.chart-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.chart-wide {
  grid-column: 1 / -1;
}

.chart-box {
  width: 100%;
  height: 320px;
}

.form-grid,
.table-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.table-wrap {
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--app-border) 74%, transparent);
  text-align: left;
  white-space: nowrap;
}

.data-table th {
  color: var(--app-text-muted);
  font-weight: 600;
  font-size: 0.9rem;
}

.empty-cell {
  text-align: center;
  color: var(--app-text-muted);
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover {
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
}

.primary-btn,
.ghost-btn,
.text-btn {
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.primary-btn:hover,
.ghost-btn:hover,
.text-btn:hover {
  transform: translateY(-1px);
}

.primary-btn {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  padding: 10px 18px;
  font-weight: 700;
}

.ghost-btn {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  padding: 10px 16px;
  font-weight: 600;
}

.text-btn {
  background: transparent;
  color: var(--app-text-secondary);
  padding: 6px 10px;
}

.danger {
  color: #dc2626;
}

@media (max-width: 1100px) {
  .summary-grid,
  .live-grid,
  .live-detail-grid,
  .chart-grid,
  .form-grid,
  .table-grid,
  .filters-grid,
  .form-grid-inner {
    grid-template-columns: 1fr;
  }

  .field-wide,
  .chart-wide {
    grid-column: auto;
  }
}

@media (max-width: 720px) {
  .hero {
    flex-direction: column;
  }

  .hero-actions {
    flex-wrap: wrap;
  }

  .chart-box {
    height: 280px;
  }
}
</style>
