<template>
  <div class="spring-reference">
    <!-- Tab 切换 -->
    <div class="view-tabs">
      <button
        v-for="view in views"
        :key="view.id"
        class="view-tab"
        :class="{ active: activeView === view.id }"
        @click="activeView = view.id"
      >
        {{ view.label }}
      </button>
    </div>

    <!-- 注解参考视图 -->
    <div v-if="activeView === 'concepts'" class="concepts-view">
      <div class="search-section">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="🔍 搜索注解或概念..."
        >
        <div class="filter-group">
          <button
            v-for="filter in filters"
            :key="filter"
            class="filter-btn"
            :class="{ active: activeFilter === filter }"
            @click="activeFilter = filter"
          >
            {{ filterLabels[filter] }}
          </button>
        </div>
      </div>

      <div class="concepts-grid">
        <ConceptCard
          v-for="concept in filteredConcepts"
          :key="concept.id"
          :concept="concept"
          @toggle-expand="toggleExpandConcept"
          :expanded="expandedConcepts.includes(concept.id)"
        />
      </div>

      <div v-if="filteredConcepts.length === 0" class="no-results">
        😕 没有找到匹配的注解
      </div>
    </div>

    <!-- 流程图视图 -->
    <div v-if="activeView === 'flows'" class="flows-view">
      <div class="flow-buttons">
        <button
          v-for="flow in flows"
          :key="flow.id"
          class="flow-btn"
          :class="{ active: activeFlow === flow.id }"
          @click="activeFlow = flow.id"
        >
          {{ flow.label }}
        </button>
      </div>

      <FlowChart :flow="currentFlow" />
    </div>
  </div>
</template>

<script>
import ConceptCard from '../components/ConceptCard.vue'
import FlowChart from '../components/FlowChart.vue'

export default {
  name: 'SpringReference',
  components: {
    ConceptCard,
    FlowChart
  },
  data() {
    return {
      activeView: 'concepts',
      activeFilter: 'all',
      activeFlow: 'startup',
      searchQuery: '',
      expandedConcepts: [],
      views: [
        { id: 'concepts', label: '📚 注解参考' },
        { id: 'flows', label: '🔄 核心流程' }
      ],
      filters: ['all', 'common', 'beginner', 'intermediate', 'advanced'],
      filterLabels: {
        'all': '全部',
        'common': '⭐ 常用',
        'beginner': '初级',
        'intermediate': '中级',
        'advanced': '高级'
      },
      flows: [
        { id: 'startup', label: '启动流程' },
        { id: 'request', label: '请求处理' },
        { id: 'bean', label: 'Bean 生命周期' }
      ],
      concepts: [
        {
          id: 1,
          name: '@SpringBootApplication',
          description: 'Spring Boot 启动类注解，合并了 @Configuration、@EnableAutoConfiguration、@ComponentScan',
          common: true,
          difficulty: 'beginner',
          usage: '@SpringBootApplication\npublic class Application {\n    public static void main(String[] args) {\n        SpringApplication.run(Application.class, args);\n    }\n}',
          when: '标记 Spring Boot 应用的主启动类，每个项目必须有一个'
        },
        {
          id: 2,
          name: '@Bean',
          description: '定义一个 Bean 对象，通常在 @Configuration 类中使用',
          common: true,
          difficulty: 'beginner',
          usage: '@Configuration\npublic class Config {\n    @Bean\n    public User user() {\n        return new User("张三", 25);\n    }\n}',
          when: '需要手动创建和配置复杂的 Bean 对象'
        },
        {
          id: 3,
          name: '@Component',
          description: '通用组件注解，标记一个类为 Spring 管理的组件',
          common: true,
          difficulty: 'beginner',
          usage: '@Component\npublic class UserComponent {\n    public void process() {\n        // 业务逻辑\n    }\n}',
          when: '定义通用的 Spring 管理的类'
        },
        {
          id: 4,
          name: '@Service',
          description: '业务逻辑层注解，标记业务服务类',
          common: true,
          difficulty: 'beginner',
          usage: '@Service\npublic class UserService {\n    public User getUserById(Long id) {\n        // 业务处理\n    }\n}',
          when: '定义业务处理逻辑类'
        },
        {
          id: 5,
          name: '@Autowired',
          description: '自动装配注解，Spring 会自动注入依赖对象',
          common: true,
          difficulty: 'beginner',
          usage: '@Service\npublic class UserService {\n    @Autowired\n    private UserRepository userRepository;\n}',
          when: '进行依赖注入'
        },
        {
          id: 6,
          name: '@RestController',
          description: 'REST 控制器，返回 JSON 数据',
          common: true,
          difficulty: 'beginner',
          usage: '@RestController\n@RequestMapping("/api/users")\npublic class UserController { }',
          when: '创建 REST API 接口'
        },
        {
          id: 7,
          name: '@RequestMapping',
          description: '请求映射注解，定义 HTTP 请求的 URL 路径',
          common: true,
          difficulty: 'intermediate',
          usage: '@RequestMapping(value="/users", method=RequestMethod.GET)',
          when: '映射 HTTP 请求到处理方法'
        },
        {
          id: 8,
          name: '@Configuration',
          description: '配置类注解，用于定义 Bean',
          common: false,
          difficulty: 'intermediate',
          usage: '@Configuration\npublic class DatabaseConfig { }',
          when: '编写 Java 配置类'
        },
        {
          id: 9,
          name: '@Aspect',
          description: 'AOP 切面注解',
          common: false,
          difficulty: 'advanced',
          usage: '@Aspect\n@Component\npublic class LoggingAspect { }',
          when: '实现横切功能'
        }
      ]
    }
  },
  computed: {
    filteredConcepts() {
      return this.concepts.filter(concept => {
        const matchesSearch = !this.searchQuery ||
          concept.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          concept.description.toLowerCase().includes(this.searchQuery.toLowerCase());

        const matchesFilter = this.activeFilter === 'all' ||
          (this.activeFilter === 'common' && concept.common) ||
          (this.activeFilter !== 'common' && concept.difficulty === this.activeFilter);

        return matchesSearch && matchesFilter;
      });
    },
    currentFlow() {
      return this.flows.find(f => f.id === this.activeFlow);
    }
  },
  methods: {
    toggleExpandConcept(id) {
      const index = this.expandedConcepts.indexOf(id);
      if (index > -1) {
        this.expandedConcepts.splice(index, 1);
      } else {
        this.expandedConcepts = [id];
      }
    }
  }
}
</script>

<style scoped>
.spring-reference {
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

.view-tabs {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  border-bottom: 2px solid #e5e7eb;
  flex-wrap: wrap;
}

.view-tab {
  padding: 15px 25px;
  background: white;
  border: 2px solid #e5e7eb;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  font-size: 1em;
  font-weight: 700;
  cursor: pointer;
  color: #666;
  transition: all 0.3s;
}

.view-tab:hover {
  color: #10b981;
}

.view-tab.active {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-color: transparent;
  box-shadow: 0 5px 15px rgba(16, 185, 129, 0.3);
}

.search-section {
  background: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.search-input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1em;
  margin-bottom: 15px;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
}

.filter-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 8px 16px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 600;
  color: #666;
}

.filter-btn:hover {
  border-color: #10b981;
  color: #10b981;
}

.filter-btn.active {
  background: #10b981;
  color: white;
  border-color: #10b981;
  box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
}

.concepts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.concepts-view,
.flows-view {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 1.2em;
}

.flow-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.flow-btn {
  padding: 10px 20px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  color: #666;
  transition: all 0.3s;
}

.flow-btn:hover {
  border-color: #10b981;
  color: #10b981;
}

.flow-btn.active {
  background: #10b981;
  color: white;
  border-color: #10b981;
  box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
}

@media (max-width: 768px) {
  .concepts-grid {
    grid-template-columns: 1fr;
  }

  .view-tabs,
  .filter-group {
    flex-wrap: wrap;
  }
}
</style>
