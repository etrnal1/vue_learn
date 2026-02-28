<template>
  <div class="flow-chart">
    <div v-if="flow.id === 'startup'" class="flow-content">
      <div class="flow-row">
        <div class="step">main()</div>
        <div class="arrow">→</div>
        <div class="step">SpringApplication</div>
        <div class="arrow">→</div>
        <div class="step">ApplicationContext</div>
      </div>
      <div class="flow-row">
        <div class="step">自动配置</div>
        <div class="arrow">→</div>
        <div class="step">扫描组件</div>
        <div class="arrow">→</div>
        <div class="step">实例化 Bean</div>
      </div>
      <div class="flow-row">
        <div class="step">依赖注入</div>
        <div class="arrow">→</div>
        <div class="step">初始化</div>
        <div class="arrow">→</div>
        <div class="step">启动完成 ✓</div>
      </div>
      <div class="flow-description">
        <strong>🎯 详细说明：</strong><br/>
        1️⃣ SpringApplication.run() 是启动入口<br/>
        2️⃣ Spring 创建 ApplicationContext 容器<br/>
        3️⃣ 自动配置自动集成第三方库<br/>
        4️⃣ 扫描并创建被 @Component 标记的 Bean<br/>
        5️⃣ 进行依赖注入，连接各个 Bean<br/>
        6️⃣ 调用初始化方法，启动内嵌 Tomcat
      </div>
    </div>

    <div v-if="flow.id === 'request'" class="flow-content">
      <div class="flow-row">
        <div class="step">HTTP 请求</div>
        <div class="arrow">→</div>
        <div class="step">Tomcat</div>
        <div class="arrow">→</div>
        <div class="step">DispatcherServlet</div>
      </div>
      <div class="flow-row">
        <div class="step">HandlerMapping</div>
        <div class="arrow">→</div>
        <div class="step">Controller</div>
        <div class="arrow">→</div>
        <div class="step">Service</div>
      </div>
      <div class="flow-row">
        <div class="step">Repository</div>
        <div class="arrow">→</div>
        <div class="step">数据库</div>
        <div class="arrow">→</div>
        <div class="step">JSON 序列化</div>
      </div>
      <div class="flow-row">
        <div class="step">HTTP 响应 ✓</div>
      </div>
      <div class="flow-description">
        <strong>🎯 详细说明：</strong><br/>
        • DispatcherServlet 是前端控制器<br/>
        • HandlerMapping 根据 URL 找到对应方法<br/>
        • Controller 处理业务逻辑<br/>
        • Service 进行具体的业务处理<br/>
        • Repository 进行数据库操作<br/>
        • 结果 JSON 序列化后返回给客户端
      </div>
    </div>

    <div v-if="flow.id === 'bean'" class="flow-content">
      <div class="flow-row">
        <div class="step">定义</div>
        <div class="arrow">→</div>
        <div class="step">实例化</div>
        <div class="arrow">→</div>
        <div class="step">属性注入</div>
      </div>
      <div class="flow-row">
        <div class="step">Aware 接口</div>
        <div class="arrow">→</div>
        <div class="step">前处理</div>
        <div class="arrow">→</div>
        <div class="step">初始化</div>
      </div>
      <div class="flow-row">
        <div class="step">后处理</div>
        <div class="arrow">→</div>
        <div class="step">就绪</div>
        <div class="arrow">→</div>
        <div class="step">销毁 ✓</div>
      </div>
      <div class="flow-description">
        <strong>🎯 详细说明：</strong><br/>
        • Bean 定义阶段通过注解声明<br/>
        • 实例化：Spring 使用反射创建对象<br/>
        • 属性注入：通过 @Autowired 注入依赖<br/>
        • Aware 接口：让 Bean 获得 Spring 容器信息<br/>
        • 初始化：执行 @PostConstruct 或 init-method<br/>
        • 容器关闭时调用销毁方法清理资源
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FlowChart',
  props: {
    flow: Object
  }
}
</script>

<style scoped>
.flow-chart {
  background: white;
  border-radius: 12px;
  padding: 40px 30px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.flow-content {
  animation: fadeIn 0.4s ease;
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

.flow-row {
  margin-bottom: 30px;
  line-height: 2;
  white-space: nowrap;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.step {
  display: inline-block;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  margin: 10px 5px;
  font-weight: bold;
  text-align: center;
  min-width: 140px;
  box-shadow: 0 3px 15px rgba(16, 185, 129, 0.3);
  transition: all 0.3s;
}

.step:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 20px rgba(16, 185, 129, 0.5);
}

.arrow {
  display: inline-block;
  color: #10b981;
  font-size: 1.5em;
  margin: 0 8px;
  font-weight: bold;
  animation: arrowFloat 1s ease-in-out infinite;
}

@keyframes arrowFloat {
  0%, 100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(5px);
  }
}

.flow-description {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(139, 92, 246, 0.05));
  border: 2px solid rgba(16, 185, 129, 0.2);
  border-left: 4px solid #10b981;
  padding: 20px;
  margin-top: 30px;
  border-radius: 8px;
  color: #555;
  font-size: 0.95em;
  line-height: 1.8;
}

.flow-description strong {
  color: #10b981;
}

@media (max-width: 768px) {
  .flow-chart {
    padding: 20px;
  }

  .step {
    min-width: 100px;
    padding: 12px 15px;
    font-size: 0.9em;
  }

  .arrow {
    margin: 5px 3px;
  }

  .flow-row {
    margin-bottom: 15px;
  }
}
</style>
