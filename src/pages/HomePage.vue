<template>
  <div class="home-page">
    <section class="dashboard-hero">
      <div class="hero-copy">
        <p class="hero-kicker">Admin Workspace</p>
        <h1>Vue 3 学习与运维控制台</h1>
        <p class="hero-text">
          把参考资料、流程编排、文档中心和系统管理统一放进一个后台工作区，右侧区域尽量拉满，适合持续设计和操作。
        </p>
      </div>
      <div class="hero-meta">
        <span class="meta-chip">v1.0.0</span>
        <span class="meta-chip">前端 + 后端联动</span>
        <span class="meta-chip accent">设计中</span>
      </div>
    </section>

    <section class="stats-grid">
      <article class="stat-card">
        <div class="stat-head">
          <span>功能模块</span>
          <span class="stat-badge">Live</span>
        </div>
        <strong>24</strong>
        <p>当前后台可访问的核心页面与管理能力。</p>
      </article>

      <article class="stat-card">
        <div class="stat-head">
          <span>流程编排</span>
          <span class="stat-badge blue">New</span>
        </div>
        <strong>06</strong>
        <p>已接入的样例处理器，可直接拼装顺序流水线。</p>
      </article>

      <article class="stat-card">
        <div class="stat-head">
          <span>文档系统</span>
          <span class="stat-badge">Ready</span>
        </div>
        <strong>100+</strong>
        <p>可检索文档、Wiki 和说明内容的聚合入口。</p>
      </article>

      <article class="stat-card">
        <div class="stat-head">
          <span>环境状态</span>
          <span class="stat-badge green">Stable</span>
        </div>
        <strong>98%</strong>
        <p>当前构建稳定，适合继续推进后台界面设计。</p>
      </article>
    </section>

    <section class="dashboard-main">
      <article class="dashboard-panel trend-panel">
        <div class="panel-head">
          <div>
            <h2>控制台概览</h2>
            <p>按照后台首页的典型布局组织：摘要、趋势、列表。</p>
          </div>
          <button type="button" class="panel-action">最近 30 天</button>
        </div>

        <div class="trend-graph">
          <div class="trend-grid">
            <span v-for="n in 5" :key="`grid-${n}`" class="grid-line" />
          </div>
          <svg viewBox="0 0 760 240" class="trend-svg" aria-hidden="true">
            <path
              d="M 20 160 C 80 120, 110 180, 170 150 S 270 70, 330 104 S 430 210, 500 150 S 620 70, 740 118"
              class="trend-path trend-path-primary"
            />
            <path
              d="M 20 190 C 80 210, 130 140, 190 160 S 300 230, 360 174 S 470 86, 540 120 S 650 210, 740 140"
              class="trend-path trend-path-secondary"
            />
          </svg>
          <div class="trend-legend">
            <span><i class="legend-dot primary" /> 模块使用</span>
            <span><i class="legend-dot secondary" /> 流程设计</span>
          </div>
        </div>
      </article>

      <aside class="dashboard-panel side-summary">
        <div class="panel-head">
          <div>
            <h2>快捷入口</h2>
            <p>把你现在最常操作的页面放在首屏右侧。</p>
          </div>
        </div>
        <div class="shortcut-list">
          <button type="button" class="shortcut-item">流程编排工作台</button>
          <button type="button" class="shortcut-item">文档中心</button>
          <button type="button" class="shortcut-item">Wiki 知识库</button>
          <button type="button" class="shortcut-item">Launch 工作台</button>
          <button type="button" class="shortcut-item">流程预览/导出</button>
        </div>
      </aside>
    </section>

    <section class="tables-grid">
      <article class="dashboard-panel table-panel">
        <div class="panel-head">
          <div>
            <h2>推荐设计入口</h2>
            <p>优先处理更适合做后台壳层优化的模块。</p>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>模块</th>
              <th>用途</th>
              <th>阶段</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>流式引擎</td>
              <td>编排与执行工作台</td>
              <td><span class="status-dot active" /> 设计中</td>
            </tr>
            <tr>
              <td>文档中心</td>
              <td>聚合文档检索与阅读</td>
              <td><span class="status-dot ready" /> 已完成</td>
            </tr>
            <tr>
              <td>流程图编辑</td>
              <td>流程资产设计与维护</td>
              <td><span class="status-dot active" /> 继续增强</td>
            </tr>
            <tr>
              <td>Launch 工作台</td>
              <td>本机任务执行控制</td>
              <td><span class="status-dot ready" /> 稳定</td>
            </tr>
          </tbody>
        </table>
      </article>

      <article class="dashboard-panel table-panel">
        <div class="panel-head">
          <div>
            <h2>布局改造目标</h2>
            <p>参考常见后台首页样式，把内容区用满。</p>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>目标</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>左侧导航固定靠左</td>
              <td><span class="status-dot ready" /> 已调整</td>
            </tr>
            <tr>
              <td>内容区取消居中窄列</td>
              <td><span class="status-dot ready" /> 已调整</td>
            </tr>
            <tr>
              <td>首页改成标准 Dashboard</td>
              <td><span class="status-dot active" /> 本次完成</td>
            </tr>
            <tr>
              <td>流式引擎全屏设计模式</td>
              <td><span class="status-dot active" /> 已支持</td>
            </tr>
          </tbody>
        </table>
      </article>
    </section>
  </div>
</template>

<script>
export default {
  name: 'HomePage'
}
</script>

<style scoped>
.home-page {
  display: grid;
  gap: 18px;
  color: var(--app-text);
}

.dashboard-hero,
.stat-card,
.dashboard-panel {
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-card) 92%, #ffffff) 0%, var(--app-card-elevated) 100%);
  box-shadow: var(--app-soft-shadow);
}

.dashboard-hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 26px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--app-primary) 12%, transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--app-card) 90%, #ffffff) 0%, var(--app-card-elevated) 100%);
}

.hero-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-primary);
}

.dashboard-hero h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1.12;
}

.hero-text {
  margin: 12px 0 0;
  max-width: 760px;
  color: var(--app-text-secondary);
  line-height: 1.7;
  font-size: 15px;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  justify-content: flex-end;
  gap: 10px;
  min-width: 260px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.meta-chip.accent {
  background: color-mix(in srgb, var(--app-primary) 14%, var(--app-card));
  color: var(--app-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 18px;
}

.stat-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  color: var(--app-text-secondary);
  font-size: 14px;
  font-weight: 600;
}

.stat-card strong {
  display: block;
  margin: 14px 0 8px;
  font-size: 46px;
  line-height: 1;
  color: var(--app-text);
}

.stat-card p {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.6;
  font-size: 13px;
}

.stat-badge {
  border-radius: 999px;
  padding: 4px 9px;
  background: #eefbf2;
  color: #166534;
  font-size: 11px;
  font-weight: 700;
}

.stat-badge.blue {
  background: #e8f1ff;
  color: #1d4ed8;
}

.stat-badge.green {
  background: #eefbf2;
  color: #166534;
}

.dashboard-main,
.tables-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.9fr);
  gap: 18px;
}

.dashboard-panel {
  padding: 18px 20px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-head h2 {
  margin: 0;
  font-size: 20px;
  color: var(--app-text);
}

.panel-head p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

.panel-action {
  border: 1px solid var(--app-border);
  background: var(--app-card);
  color: var(--app-text-secondary);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
}

.trend-panel {
  min-height: 360px;
}

.trend-graph {
  position: relative;
  min-height: 270px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: linear-gradient(180deg, #ffffff 0%, color-mix(in srgb, var(--app-card-elevated) 94%, #ffffff) 100%);
  overflow: hidden;
  padding: 18px 16px 12px;
}

.trend-grid {
  position: absolute;
  inset: 18px 16px 34px;
  display: grid;
  align-content: space-between;
}

.grid-line {
  display: block;
  border-top: 1px dashed color-mix(in srgb, var(--app-border) 86%, transparent);
}

.trend-svg {
  position: relative;
  width: 100%;
  height: 230px;
  z-index: 1;
}

.trend-path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 5;
}

.trend-path-primary {
  stroke: #6d5efc;
}

.trend-path-secondary {
  stroke: #38bdf8;
}

.trend-legend {
  display: flex;
  gap: 18px;
  margin-top: 8px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin-right: 6px;
}

.legend-dot.primary {
  background: #6d5efc;
}

.legend-dot.secondary {
  background: #38bdf8;
}

.shortcut-list {
  display: grid;
  gap: 10px;
}

.shortcut-item {
  border: 1px solid var(--app-border);
  background: var(--app-card);
  color: var(--app-text-secondary);
  border-radius: 14px;
  padding: 12px 14px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.shortcut-item:hover {
  border-color: color-mix(in srgb, var(--app-primary) 40%, var(--app-border));
  color: var(--app-primary);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 12px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--app-border) 80%, transparent);
  text-align: left;
}

.data-table th {
  color: var(--app-text-muted);
  font-weight: 700;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.status-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  margin-right: 8px;
  vertical-align: middle;
}

.status-dot.active {
  background: #6d5efc;
}

.status-dot.ready {
  background: #22c55e;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-main,
  .tables-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-hero {
    flex-direction: column;
    padding: 18px;
  }

  .dashboard-hero h1 {
    font-size: 28px;
  }

  .hero-meta {
    justify-content: flex-start;
    min-width: 0;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-panel {
    padding: 16px;
  }

  .panel-head {
    flex-direction: column;
  }
}
</style>
