<template>
  <div class="home-page">
    <div class="cards-container">
      <div class="card spring">
        <div class="card-icon">🚀</div>
        <h2>Spring 框架参考</h2>
        <p>10+ 核心注解讲解，包含流程可视化和科幻风格设计</p>
        <p class="feature-list">
          ✨ 响应式搜索 <br>
          📚 难度分级 <br>
          🔄 流程动画
        </p>
      </div>

      <div class="card excel">
        <div class="card-icon">📊</div>
        <h2>Excel 函数参考</h2>
        <p>30+ 个常见 Excel 函数，支持搜索、难度分级、使用场景</p>
        <p class="feature-list">
          🔍 快速搜索 <br>
          📈 难度分级 <br>
          💡 实际案例
        </p>
      </div>

      <div class="card project">
        <div class="card-icon">🏗️</div>
        <h2>项目架构</h2>
        <p>Vue 3 + Vite 完整项目架构，模块化设计</p>
        <p class="feature-list">
          📦 组件化开发 <br>
          ⚡ 快速热更新 <br>
          🔧 现代化工具链
        </p>
      </div>
    </div>

    <div class="info-section">
      <h2>项目特点</h2>
      <div class="features-grid">
        <div class="feature-item">
          <div class="feature-number">1</div>
          <h3>模块化架构</h3>
          <p>每个功能独立成组件，易于维护和扩展</p>
        </div>
        <div class="feature-item">
          <div class="feature-number">2</div>
          <h3>响应式设计</h3>
          <p>数据绑定自动更新，无需手动操作 DOM</p>
        </div>
        <div class="feature-item">
          <div class="feature-number">3</div>
          <h3>高性能</h3>
          <p>虚拟 DOM、Vite 热更新、代码优化</p>
        </div>
        <div class="feature-item">
          <div class="feature-number">4</div>
          <h3>易扩展</h3>
          <p>完整的项目结构，易于添加新功能</p>
        </div>
      </div>
    </div>

    <div class="tech-stack">
      <h2>技术栈</h2>
      <div class="tech-items">
        <span class="tech-tag">Vue 3</span>
        <span class="tech-tag">Vite</span>
        <span class="tech-tag">JavaScript ES6+</span>
        <span class="tech-tag">CSS 3</span>
        <span class="tech-tag">响应式设计</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomePage'
}
</script>

<style scoped>
.home-page {
  color: var(--app-text);
}

.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.card {
  background: var(--app-card);
  border-radius: 18px;
  padding: 24px 20px;
  text-align: left;
  box-shadow: var(--app-soft-shadow);
  border: 1px solid var(--app-border);
  cursor: default;
}

.card:hover {
  transform: translateY(-2px);
}

.card.spring {
  border-left: 4px solid #34c759;
}

.card.excel {
  border-left: 4px solid #007aff;
}

.card.project {
  border-left: 4px solid #ff9500;
}

.card-icon {
  font-size: 2.1em;
  margin-bottom: 10px;
}

.card h2 {
  font-size: 1.2em;
  margin-bottom: 8px;
  color: var(--app-text);
}

.card p {
  color: var(--app-text-secondary);
  font-size: 0.93em;
  line-height: 1.6;
  margin-bottom: 10px;
}

.feature-list {
  font-size: 0.84em;
  color: var(--app-text-muted);
  margin-top: 8px;
  line-height: 1.8;
}

.info-section {
  background: var(--app-card);
  border-radius: 18px;
  border: 1px solid var(--app-border);
  padding: 26px 20px;
  margin-bottom: 16px;
  box-shadow: var(--app-soft-shadow);
}

.info-section h2 {
  font-size: 1.2em;
  margin-bottom: 14px;
  color: var(--app-text);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.feature-item {
  text-align: left;
  padding: 12px;
  border-radius: 14px;
  background: var(--app-card-elevated);
  border: 1px solid var(--app-border);
}

.feature-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--app-primary);
  color: white;
  border-radius: 50%;
  line-height: 1;
  font-size: 0.82em;
  font-weight: 700;
  margin-bottom: 8px;
}

.feature-item h3 {
  font-size: 0.98em;
  margin-bottom: 6px;
  color: var(--app-text);
}

.feature-item p {
  color: var(--app-text-secondary);
  font-size: 0.86em;
}

.tech-stack {
  background: var(--app-card);
  color: var(--app-text);
  border-radius: 18px;
  border: 1px solid var(--app-border);
  padding: 26px 20px;
  box-shadow: var(--app-soft-shadow);
}

.tech-stack h2 {
  font-size: 1.2em;
  margin-bottom: 12px;
}

.tech-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-tag {
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  font-weight: 600;
  font-size: 0.84em;
}

@media (max-width: 768px) {
  .cards-container {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .info-section {
    padding: 18px 14px;
  }

  .info-section h2 {
    font-size: 1.05em;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .tech-stack {
    padding: 18px 14px;
  }
}
</style>
