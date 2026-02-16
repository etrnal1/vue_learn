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
      <h2>🎯 项目特点</h2>
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
      <h2>🛠️ 技术栈</h2>
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
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 50px;
}

.card {
  background: white;
  border-radius: 15px;
  padding: 40px 30px;
  text-align: center;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  border-top: 5px solid;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.card:hover::before {
  left: 100%;
}

.card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
}

.card.spring {
  border-top-color: #10b981;
}

.card.excel {
  border-top-color: #667eea;
}

.card.project {
  border-top-color: #f59e0b;
}

.card-icon {
  font-size: 4em;
  margin-bottom: 20px;
}

.card h2 {
  font-size: 1.8em;
  margin-bottom: 15px;
  color: #333;
}

.card p {
  color: #666;
  font-size: 1em;
  line-height: 1.6;
  margin-bottom: 15px;
}

.feature-list {
  font-size: 0.9em;
  color: #999;
  margin-top: 20px;
}

/* 信息部分 */
.info-section {
  background: white;
  border-radius: 15px;
  padding: 50px 40px;
  margin-bottom: 40px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.info-section h2 {
  font-size: 2em;
  margin-bottom: 40px;
  color: #333;
  text-align: center;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 30px;
}

.feature-item {
  text-align: center;
  padding: 20px;
}

.feature-number {
  display: inline-block;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  line-height: 50px;
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 15px;
}

.feature-item h3 {
  font-size: 1.2em;
  margin-bottom: 10px;
  color: #333;
}

.feature-item p {
  color: #666;
  font-size: 0.95em;
}

/* 技术栈 */
.tech-stack {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 15px;
  padding: 50px 40px;
  text-align: center;
}

.tech-stack h2 {
  font-size: 2em;
  margin-bottom: 30px;
}

.tech-items {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  justify-content: center;
}

.tech-tag {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  font-weight: 600;
}

@media (max-width: 768px) {
  .cards-container {
    grid-template-columns: 1fr;
  }

  .info-section {
    padding: 30px 20px;
  }

  .info-section h2 {
    font-size: 1.5em;
  }

  .features-grid {
    grid-template-columns: 1fr 1fr;
  }

  .tech-stack {
    padding: 30px 20px;
  }
}
</style>
