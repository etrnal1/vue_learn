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
  color: var(--app-text);
}

.view-tabs {
  display: inline-flex;
  gap: 6px;
  margin-bottom: 12px;
  padding: 6px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-group-bg);
  flex-wrap: wrap;
}

.view-tab {
  padding: 8px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  font-size: 0.86em;
  font-weight: 600;
  cursor: pointer;
  color: var(--app-text-secondary);
  transition: all 0.2s;
}

.view-tab:hover {
  color: var(--app-primary);
  background: var(--app-card-elevated);
}

.view-tab.active {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
  box-shadow: 0 8px 18px var(--app-shadow);
}

.search-section {
  background: var(--app-card);
  border-radius: 16px;
  border: 1px solid var(--app-border);
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: var(--app-soft-shadow);
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  font-size: 0.92em;
  margin-bottom: 10px;
  transition: all 0.2s;
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.search-input:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-shadow-light);
}

.filter-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 7px 12px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  color: var(--app-text-secondary);
  font-size: 0.82em;
}

.filter-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.filter-btn.active {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
  box-shadow: 0 8px 18px var(--app-shadow);
}

.concepts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.concepts-view,
.flows-view {
  background: var(--app-card);
  border-radius: 16px;
  border: 1px solid var(--app-border);
  padding: 14px;
  box-shadow: var(--app-soft-shadow);
}

.no-results {
  text-align: center;
  padding: 36px 20px;
  color: var(--app-text-muted);
  font-size: 0.96em;
}

.flow-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.flow-btn {
  padding: 7px 12px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  color: var(--app-text-secondary);
  transition: all 0.2s;
  font-size: 0.84em;
}

.flow-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.flow-btn.active {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
  box-shadow: 0 8px 18px var(--app-shadow);
}

@media (max-width: 768px) {
  .concepts-grid {
    grid-template-columns: 1fr;
  }

  .view-tabs,
  .filter-group {
    flex-wrap: wrap;
  }

  .concepts-view,
  .flows-view,
  .search-section {
    padding: 10px;
  }
}
</style>
