<template>
  <div class="evo-psych-page">
    <!-- Hero Section -->
    <div v-if="currentTab === 'overview'" class="hero-section">
      <div class="hero-content">
        <h1>🧬 进化心理学</h1>
        <p class="hero-subtitle">理解人类心理行为的进化起源</p>
        <p class="hero-description">
          进化心理学是一门科学学科，致力于用进化论的观点来理解和解释人类的心理和行为。
          它探讨了我们的思维方式、情绪反应、社会行为和决策过程如何通过自然选择而形成。
        </p>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: currentTab === tab.id }]"
        @click="currentTab = tab.id"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Overview Tab -->
      <div v-if="currentTab === 'overview'" class="tab-pane">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ concepts.length }}</div>
            <div class="stat-label">核心概念</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ theories.length }}</div>
            <div class="stat-label">经典理论</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ experiments.length }}</div>
            <div class="stat-label">经典实验</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ learnedCount }}</div>
            <div class="stat-label">已学习</div>
          </div>
        </div>

        <div class="intro-cards">
          <div class="intro-card">
            <h3>📚 什么是进化心理学？</h3>
            <p>
              进化心理学认为，人类的心智是由自然选择设计的一系列机制，
              这些机制在我们的祖先环境中解决了生存和繁殖的问题。
            </p>
          </div>
          <div class="intro-card">
            <h3>🎯 核心假设</h3>
            <p>
              人类心理由许多信息处理模块组成，每个模块都是为了解决特定的进化问题而进化的。
              这些模块在现代环境中可能不再完全适应。
            </p>
          </div>
          <div class="intro-card">
            <h3>🔬 研究方法</h3>
            <p>
              结合进化理论、人类学、认知科学和实验心理学的方法，
              通过研究人类的普遍特征和个体差异来验证进化假设。
            </p>
          </div>
        </div>

        <div class="quick-nav">
          <h3>快速导航</h3>
          <div class="nav-buttons">
            <button class="nav-btn" @click="currentTab = 'theories'">📖 学习理论</button>
            <button class="nav-btn" @click="currentTab = 'concepts'">💡 探索概念</button>
            <button class="nav-btn" @click="currentTab = 'experiments'">🔬 发现实验</button>
            <button class="nav-btn" @click="currentTab = 'notes'">✍️ 记录笔记</button>
          </div>
        </div>
      </div>

      <!-- Theories Tab -->
      <div v-if="currentTab === 'theories'" class="tab-pane">
        <div class="theories-grid">
          <div v-for="theory in theories" :key="theory.id" class="theory-card">
            <div class="theory-header">
              <h3>{{ theory.title }}</h3>
              <span class="year">{{ theory.year }}</span>
            </div>
            <p class="scientist">👤 {{ theory.scientist }}</p>
            <p class="description">{{ theory.description }}</p>
            <div v-if="theory.formula" class="formula">
              <strong>公式:</strong> {{ theory.formula }}
            </div>
            <div class="impact">
              <span :class="['badge', `impact-${theory.impact}`]">{{ theory.impact }}影响</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Concepts Tab -->
      <div v-if="currentTab === 'concepts'" class="tab-pane">
        <div class="search-section">
          <div class="search-box">
            <input
              v-model="conceptSearch"
              type="text"
              placeholder="🔍 搜索概念..."
              class="search-input"
            />
          </div>
          <div class="filter-section">
            <label>按类别筛选:</label>
            <div class="filter-buttons">
              <button
                :class="['filter-btn', { active: selectedCategory === null }]"
                @click="selectedCategory = null"
              >
                全部
              </button>
              <button
                v-for="cat in conceptCategories"
                :key="cat"
                :class="['filter-btn', { active: selectedCategory === cat }]"
                @click="selectedCategory = cat"
              >
                {{ cat }}
              </button>
            </div>
          </div>
        </div>

        <div class="concepts-grid">
          <div
            v-for="concept in filteredConcepts"
            :key="concept.id"
            :class="['concept-card', { learned: concept.learned }]"
          >
            <div class="concept-header">
              <h4>{{ concept.nameZh }}</h4>
              <button
                :class="['learn-btn', { learned: concept.learned }]"
                @click="toggleLearned(concept.id)"
                :title="concept.learned ? '已掌握' : '标记为已掌握'"
              >
                {{ concept.learned ? '✅' : '☐' }}
              </button>
            </div>
            <p class="english">{{ concept.nameEn }}</p>
            <p class="category-badge">{{ concept.category }}</p>
            <p class="definition"><strong>定义:</strong> {{ concept.definition }}</p>
            <p class="example"><strong>例子:</strong> {{ concept.example }}</p>
          </div>
        </div>

        <div v-if="filteredConcepts.length === 0" class="empty-state">
          <p>没有找到符合条件的概念</p>
        </div>
      </div>

      <!-- Experiments Tab -->
      <div v-if="currentTab === 'experiments'" class="tab-pane">
        <div class="experiments-grid">
          <div v-for="exp in experiments" :key="exp.id" class="experiment-card">
            <div class="exp-header">
              <h3>{{ exp.title }}</h3>
              <span class="exp-type">{{ exp.type }}</span>
            </div>
            <p class="description">{{ exp.description }}</p>
            <div class="finding">
              <strong>🔍 发现:</strong> {{ exp.finding }}
            </div>
            <div class="implication">
              <strong>💡 启示:</strong> {{ exp.implication }}
            </div>
          </div>
        </div>
      </div>

      <!-- Notes Tab -->
      <div v-if="currentTab === 'notes'" class="tab-pane">
        <div class="notes-section">
          <h3>学习笔记</h3>
          <textarea
            v-model="userNotes"
            class="notes-textarea"
            placeholder="记录你的学习笔记、思考和感悟..."
            @input="saveNotes"
          ></textarea>
          <div class="notes-info">
            <span>{{ userNotes.length }} 字 | 自动保存中</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const STORAGE_LEARNED_KEY = 'evo_psych_learned_concepts'
const STORAGE_NOTES_KEY = 'evo_psych_notes'

export default {
  name: 'EvoPsychPage',

  data() {
    return {
      currentTab: 'overview',
      conceptSearch: '',
      selectedCategory: null,
      userNotes: '',

      tabs: [
        { id: 'overview', label: '概览', icon: '🏠' },
        { id: 'theories', label: '核心理论', icon: '📖' },
        { id: 'concepts', label: '核心概念', icon: '💡' },
        { id: 'experiments', label: '经典实验', icon: '🔬' },
        { id: 'notes', label: '学习笔记', icon: '✍️' }
      ],

      theories: [
        {
          id: 'natural_selection',
          title: '自然选择论',
          scientist: 'Charles Darwin',
          year: 1859,
          description: '有利于生存和繁殖的性状会在种群中逐代增加，不利的性状则逐代减少。',
          formula: ' 条件概率 > 0',
          impact: '高'
        },
        {
          id: 'sexual_selection',
          title: '性选择理论',
          scientist: 'Charles Darwin',
          year: 1871,
          description: '个体之间为了获得交配机会而竞争，导致某些性状在一个性别中过度发展。',
          formula: '配偶选择 + 竞争',
          impact: '高'
        },
        {
          id: 'kin_selection',
          title: '亲属选择论',
          scientist: 'W.D. Hamilton',
          year: 1964,
          description: '帮助携带相同基因的亲属繁殖，可以增加自己基因的传播。',
          formula: 'rb > c（r为亲缘系数，b为受益者收益，c为施予者成本）',
          impact: '高'
        },
        {
          id: 'reciprocal_altruism',
          title: '互惠利他主义',
          scientist: 'Robert Trivers',
          year: 1971,
          description: '帮助他人并期望将来获得回报的行为在重复互动中可以进化。',
          formula: '现在的成本 < 未来的收益',
          impact: '高'
        },
        {
          id: 'parental_investment',
          title: '亲本投资理论',
          scientist: 'Robert Trivers',
          year: 1972,
          description: '一个亲本在单个后代身上的投资会影响该亲本与其他伴侣繁殖的能力。',
          formula: 'P投资 ∝ 性别差异',
          impact: '高'
        },
        {
          id: 'ep_founding',
          title: '进化心理学',
          scientist: 'Tooby & Cosmides',
          year: 1992,
          description: '人类心智由许多专业化的认知模块组成，每个模块都是为了解决特定的进化问题。',
          formula: '心智 = 进化产物',
          impact: '高'
        },
        {
          id: 'life_history',
          title: '生命史理论',
          scientist: '多位学者',
          year: 1987,
          description: '个体的发展、生长、繁殖和死亡模式是由自然选择塑造的权衡。',
          formula: '能量分配权衡',
          impact: '中'
        },
        {
          id: 'evolutionary_dev',
          title: '进化发育心理学',
          scientist: '多位学者',
          year: 2000,
          description: '研究心理特征在发展过程中如何通过进化历程逐步显现。',
          formula: '发展 = 进化过程的重现',
          impact: '中'
        }
      ],

      concepts: [
        // 基础进化
        { id: 'nat_sel', nameZh: '自然选择', nameEn: 'Natural Selection', category: '基础进化', definition: '环境对生物体的筛选作用，有利的特征逐代保留。', example: '长颈鹿在食物竞争中，颈部更长的个体生存概率更高', learned: false },
        { id: 'adap', nameZh: '适应', nameEn: 'Adaptation', category: '基础进化', definition: '生物为适应环境而演化出的特征或行为。', example: '骆驼的驼峰储存脂肪以适应沙漠环境', learned: false },
        { id: 'fit', nameZh: '适应度', nameEn: 'Fitness', category: '基础进化', definition: '一个个体将基因传递给下一代的相对成功程度。', example: '拥有更多健康后代的个体有更高的进化适应度', learned: false },
        { id: 'evo_stable', nameZh: '进化稳定策略', nameEn: 'Evolutionary Stable Strategy (ESS)', category: '基础进化', definition: '一种策略，一旦被种群采纳，就无法被其他策略入侵。', example: '鹰鸽博弈中的混合策略', learned: false },

        // 性选择与择偶
        { id: 'sex_sel', nameZh: '性选择', nameEn: 'Sexual Selection', category: '择偶行为', definition: '为了获得交配机会而竞争，导致某些特征过度发展。', example: '孔雀的华丽尾羽吸引异性，但增加被捕食的风险', learned: false },
        { id: 'mate_choice', nameZh: '配偶选择', nameEn: 'Mate Choice', category: '择偶行为', definition: '个体选择交配伴侣的过程，通常偏向于优质个体。', example: '女性倾向于选择表现出资源和承诺迹象的男性', learned: false },
        { id: 'pref_evolve', nameZh: '好偏的进化', nameEn: 'Evolution of Preference', category: '择偶行为', definition: '某些特征的偏好如何在种群中进化和维持。', example: '如果拥有某特征的个体更优质，偏好该特征的个体会获得更好的基因', learned: false },
        { id: 'handicap', nameZh: '累赘原理', nameEn: 'Handicap Principle', category: '择偶行为', definition: '低质量的个体无法负担的夸张特征可以作为真实品质的诚实信号。', example: '健康的孔雀才能维持巨大的尾羽，所以尾羽是健康的信号', learned: false },

        // 亲属和社会行为
        { id: 'kin_sel', nameZh: '亲属选择', nameEn: 'Kin Selection', category: '社会行为', definition: '通过帮助携带相同基因的亲属来传播自己的基因。', example: '姑姑照顾侄女，帮助传播共享的基因', learned: false },
        { id: 'incl_fit', nameZh: '包容适应度', nameEn: 'Inclusive Fitness', category: '社会行为', definition: '一个个体的自身繁殖和通过亲属繁殖传播基因的总成功。', example: '一个个体的基因既可通过自己的孩子，也可通过兄弟姐妹的孩子传播', learned: false },
        { id: 'reciprocal', nameZh: '互惠利他', nameEn: 'Reciprocal Altruism', category: '社会行为', definition: '帮助他人并期望在未来获得回报的行为。', example: '朋友帮你搬家，期望将来你也帮他', learned: false },
        { id: 'cooperation', nameZh: '合作', nameEn: 'Cooperation', category: '社会行为', definition: '个体协同工作以实现互利目标。', example: '狩猎采集社会中的集体狩猎', learned: false },
        { id: 'cheating', nameZh: '欺骗', nameEn: 'Cheating', category: '社会行为', definition: '获取互惠利益但不提供回报的策略。', example: '接受他人帮助但从不回报', learned: false },
        { id: 'coalition', nameZh: '联盟', nameEn: 'Coalition', category: '社会行为', definition: '个体结成小组以对抗其他个体或群体。', example: '男性朋友群体在社会竞争中的联合', learned: false },

        // 认知与情绪
        { id: 'modularity', nameZh: '模块化心理', nameEn: 'Modularity of Mind', category: '认知进化', definition: '心智由许多专业化模块组成，每个模块处理特定的进化问题。', example: '人类有专门的面孔识别模块，可以快速识别亲友', learned: false },
        { id: 'domain_spec', nameZh: '领域特异性', nameEn: 'Domain Specificity', category: '认知进化', definition: '认知模块针对特定问题类型优化，不是通用的。', example: '婚配选择的逻辑推理与威胁检测的逻辑推理遵循不同的规则', learned: false },
        { id: 'fear', nameZh: '恐惧', nameEn: 'Fear', category: '情绪进化', definition: '对潜在威胁的进化适应性反应。', example: '对蛇和蜘蛛的天生恐惧可能源于祖先环境的真实危险', learned: false },
        { id: 'disgust', nameZh: '厌恶', nameEn: 'Disgust', category: '情绪进化', definition: '对可能有害物质的强烈负面反应，原本为防止疾病传播。', example: '对腐烂食物和粪便的厌恶保护我们免受感染', learned: false },
        { id: 'jealousy', nameZh: '嫉妒', nameEn: 'Jealousy', category: '情绪进化', definition: '保护重要关系免受威胁的进化适应性情绪。', example: '配偶的不忠威胁将基因传递给下一代的可能性', learned: false },
        { id: 'anger', nameZh: '愤怒', nameEn: 'Anger', category: '情绪进化', definition: '对被他人不公正对待时的强硬反应，展示解决冲突的承诺。', example: '受到欺骗时的愤怒可以威慑他人再次欺骗', learned: false },

        // 文化与进化
        { id: 'gene_culture', nameZh: '基因-文化协同进化', nameEn: 'Gene-Culture Coevolution', category: '文化', definition: '基因和文化特征相互影响的进化过程。', example: '乳糖耐受基因在有乳制品养殖文化的种群中更常见', learned: false },
        { id: 'cult_trans', nameZh: '文化传播', nameEn: 'Cultural Transmission', category: '文化', definition: '文化信息从一个人或一代传递到另一个人或一代。', example: '技能、信念和习俗通过教学和模仿代代相传', learned: false },
        { id: 'memes', nameZh: '迷因', nameEn: 'Memes', category: '文化', definition: '文化中的最小信息单位，像基因一样复制和传播。', example: '流行语、歌曲旋律和笑话像基因一样在文化中传播', learned: false }
      ],

      experiments: [
        {
          id: 'prisoners',
          title: '囚徒困境',
          type: '博弈论',
          description: '两个嫌疑人被分别审讯，如果都保持沉默会更好，但单独来看背叛对方更有利。这说明个人利益与集体利益的冲突。',
          finding: '在不重复的博弈中，理性个体会背叛；在重复博弈中，合作可能进化出来。',
          implication: '解释了人类社会中为什么需要法律和制度来鼓励合作。'
        },
        {
          id: 'ultimatum',
          title: '最后通牒博弈',
          type: '经济心理学',
          description: '一个人提议如何分配金钱给另一个人，另一个人可以接受或拒绝。如果拒绝，双方都不会获得任何东西。',
          finding: '人们经常拒绝不公平的提议，即使这意味着自己也得不到好处。',
          implication: '表明人们重视公平性和惩罚不公正行为的意愿，这是人类合作的基础。'
        },
        {
          id: 'baby_face',
          title: '娃娃脸效应',
          type: '社会心理学',
          description: '研究发现具有幼稚特征（大眼睛、圆脸、小鼻子）的成年人被评为更值得信任和更聪慧。',
          finding: '对婴儿的进化设计的偏好被应用到成年人身上。',
          implication: '解释了为什么某些面部特征被认为更具吸引力，以及如何利用这些特征影响他人判断。'
        },
        {
          id: 'mhc_odor',
          title: '嗅觉与 MHC 相容性',
          type: '进化生物学',
          description: '研究发现女性倾向于偏好与自己 MHC（主要组织相容性复合体）不同个体的体味。',
          finding: '女性可能通过嗅觉识别遗传相容性的伴侣，有助于遗传多样性。',
          implication: '支持人类存在无意识的择偶机制以避免近亲繁殖。'
        },
        {
          id: 'infant_morality',
          title: '婴儿道德感实验',
          type: '发展心理学',
          description: '耶鲁大学研究发现，仅 6 个月大的婴儿能够区分"好"的和"坏"的行为者，倾向于帮助好的行为者。',
          finding: '道德判断的基础可能在婴幼儿期就已经存在。',
          implication: '表明道德能力可能是内在的进化适应，而不仅仅是后天学习。'
        },
        {
          id: 'facial_symmetry',
          title: '面部对称与吸引力',
          type: '进化心理学',
          description: '研究发现高度对称的面部被广泛认为更有吸引力，跨越不同文化。',
          finding: '面部对称可能是健康和遗传优质性的信号。',
          implication: '解释了对某些面部特征的普遍美学偏好的进化起源。'
        },
        {
          id: 'milk_anxiety',
          title: '牛奶与焦虑研究',
          type: '进化营养学',
          description: '研究发现，在进化历史上缺乏乳制品的种群的后代可能对牛奶有不同的心理反应。',
          finding: '文化和遗传背景影响我们对食物的心理反应。',
          implication: '表明进化历史对当代行为和偏好的持久影响。'
        }
      ]
    }
  },

  computed: {
    conceptCategories() {
      return [...new Set(this.concepts.map(c => c.category))]
    },

    filteredConcepts() {
      return this.concepts.filter(concept => {
        const matchesSearch =
          concept.nameZh.toLowerCase().includes(this.conceptSearch.toLowerCase()) ||
          concept.nameEn.toLowerCase().includes(this.conceptSearch.toLowerCase()) ||
          concept.definition.toLowerCase().includes(this.conceptSearch.toLowerCase())

        const matchesCategory = this.selectedCategory === null || concept.category === this.selectedCategory

        return matchesSearch && matchesCategory
      })
    },

    learnedCount() {
      return this.concepts.filter(c => c.learned).length
    }
  },

  methods: {
    toggleLearned(conceptId) {
      const concept = this.concepts.find(c => c.id === conceptId)
      if (concept) {
        concept.learned = !concept.learned
        this.saveLearned()
      }
    },

    saveLearned() {
      const learned = this.concepts.filter(c => c.learned).map(c => c.id)
      localStorage.setItem(STORAGE_LEARNED_KEY, JSON.stringify(learned))
    },

    loadLearned() {
      const learned = JSON.parse(localStorage.getItem(STORAGE_LEARNED_KEY) || '[]')
      this.concepts.forEach(concept => {
        concept.learned = learned.includes(concept.id)
      })
    },

    saveNotes() {
      localStorage.setItem(STORAGE_NOTES_KEY, this.userNotes)
    },

    loadNotes() {
      this.userNotes = localStorage.getItem(STORAGE_NOTES_KEY) || ''
    }
  },

  mounted() {
    this.loadLearned()
    this.loadNotes()
  }
}
</script>

<style scoped>
.evo-psych-page {
  min-height: 100vh;
  background: var(--app-bg, #f5f7fa);
  color: var(--app-text, #333);
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, color-mix(in srgb, var(--app-primary, #667eea) 20%, transparent) 0%, color-mix(in srgb, var(--app-primary, #667eea) 10%, transparent) 100%),
              linear-gradient(to bottom, var(--app-card, #fff), var(--app-bg, #f5f7fa));
  border-radius: 20px;
  padding: 60px 40px;
  margin-bottom: 40px;
  text-align: center;
  box-shadow: 0 8px 20px var(--app-shadow-light, rgba(0, 0, 0, 0.08));
}

.hero-content h1 {
  font-size: 3em;
  margin: 0 0 15px 0;
  background: linear-gradient(135deg, var(--app-primary, #667eea), #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.5em;
  color: var(--app-text-muted, #666);
  margin: 0 0 20px 0;
}

.hero-description {
  font-size: 1.1em;
  color: var(--app-text-secondary, #555);
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  gap: 12px;
  margin-bottom: 30px;
  flex-wrap: wrap;
  border-bottom: 2px solid var(--app-border, #e0e0e0);
  padding-bottom: 15px;
}

.tab-button {
  padding: 10px 20px;
  background: transparent;
  border: none;
  color: var(--app-text-muted, #999);
  font-size: 1em;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  border-radius: 8px 8px 0 0;
}

.tab-button:hover {
  color: var(--app-text, #333);
  background: color-mix(in srgb, var(--app-primary, #667eea) 5%, transparent);
}

.tab-button.active {
  color: var(--app-primary, #667eea);
  font-weight: 600;
  border-bottom: 3px solid var(--app-primary, #667eea);
}

/* Tab Content */
.tab-content {
  animation: fadeIn 0.3s ease;
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

.tab-pane {
  display: block;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: var(--app-card, #fff);
  border-radius: 15px;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 0 4px 12px var(--app-shadow-light, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--app-border, #e0e0e0);
}

.stat-number {
  font-size: 2.5em;
  font-weight: 700;
  color: var(--app-primary, #667eea);
}

.stat-label {
  font-size: 1.1em;
  color: var(--app-text-muted, #999);
  margin-top: 10px;
}

/* Intro Cards */
.intro-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.intro-card {
  background: var(--app-card, #fff);
  border-radius: 15px;
  padding: 25px;
  border-left: 4px solid var(--app-primary, #667eea);
  box-shadow: 0 4px 12px var(--app-shadow-light, rgba(0, 0, 0, 0.05));
}

.intro-card h3 {
  margin: 0 0 15px 0;
  font-size: 1.2em;
  color: var(--app-text, #333);
}

.intro-card p {
  margin: 0;
  color: var(--app-text-secondary, #555);
  line-height: 1.6;
}

/* Quick Navigation */
.quick-nav {
  background: var(--app-card, #fff);
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 4px 12px var(--app-shadow-light, rgba(0, 0, 0, 0.05));
}

.quick-nav h3 {
  margin-top: 0;
  color: var(--app-text, #333);
}

.nav-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.nav-btn {
  padding: 15px 20px;
  background: linear-gradient(135deg, var(--app-primary, #667eea), #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1em;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.nav-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--app-primary, #667eea) 30%, transparent);
}

/* Theories Grid */
.theories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.theory-card {
  background: var(--app-card, #fff);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 4px 12px var(--app-shadow-light, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--app-border, #e0e0e0);
  transition: transform 0.2s, box-shadow 0.2s;
}

.theory-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px var(--app-shadow-light, rgba(0, 0, 0, 0.1));
}

.theory-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 15px;
}

.theory-header h3 {
  margin: 0;
  font-size: 1.2em;
  color: var(--app-text, #333);
  flex: 1;
}

.year {
  background: color-mix(in srgb, var(--app-primary, #667eea) 10%, transparent);
  color: var(--app-primary, #667eea);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9em;
  font-weight: 600;
  white-space: nowrap;
  margin-left: 10px;
}

.scientist {
  margin: 0 0 12px 0;
  color: var(--app-text-muted, #999);
  font-size: 0.95em;
}

.theory-card .description {
  margin: 0 0 12px 0;
  color: var(--app-text-secondary, #555);
  line-height: 1.5;
}

.formula {
  background: color-mix(in srgb, #f5a623 10%, transparent);
  padding: 12px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.95em;
  margin: 12px 0;
  color: var(--app-text-secondary, #555);
}

.impact {
  display: flex;
  gap: 10px;
}

.badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 600;
}

.impact-高 {
  background: color-mix(in srgb, #ff4081 15%, transparent);
  color: #ff4081;
}

.impact-中 {
  background: color-mix(in srgb, #f5a623 15%, transparent);
  color: #f5a623;
}

/* Search Section */
.search-section {
  margin-bottom: 30px;
}

.search-box {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 15px 20px;
  font-size: 1em;
  border: 2px solid var(--app-border, #e0e0e0);
  border-radius: 10px;
  background: var(--app-card, #fff);
  color: var(--app-text, #333);
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: var(--app-primary, #667eea);
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-section label {
  font-weight: 600;
  color: var(--app-text, #333);
}

.filter-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 8px 15px;
  background: var(--app-card, #fff);
  border: 1px solid var(--app-border, #e0e0e0);
  border-radius: 20px;
  cursor: pointer;
  color: var(--app-text-muted, #999);
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: var(--app-primary, #667eea);
  color: var(--app-primary, #667eea);
}

.filter-btn.active {
  background: var(--app-primary, #667eea);
  border-color: var(--app-primary, #667eea);
  color: white;
}

/* Concepts Grid */
.concepts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.concept-card {
  background: var(--app-card, #fff);
  border-radius: 12px;
  padding: 20px;
  border: 2px solid var(--app-border, #e0e0e0);
  transition: all 0.2s;
  position: relative;
}

.concept-card:hover {
  border-color: var(--app-primary, #667eea);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--app-primary, #667eea) 20%, transparent);
}

.concept-card.learned {
  background: color-mix(in srgb, #4caf50 5%, transparent);
  border-color: #4caf50;
}

.concept-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}

.concept-header h4 {
  margin: 0;
  font-size: 1.1em;
  color: var(--app-text, #333);
  flex: 1;
}

.learn-btn {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s;
}

.learn-btn:hover {
  transform: scale(1.2);
}

.english {
  margin: 0 0 8px 0;
  color: var(--app-text-muted, #999);
  font-style: italic;
  font-size: 0.95em;
}

.category-badge {
  display: inline-block;
  background: color-mix(in srgb, var(--app-primary, #667eea) 15%, transparent);
  color: var(--app-primary, #667eea);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8em;
  margin: 0 0 12px 0;
}

.definition,
.example {
  margin: 8px 0;
  color: var(--app-text-secondary, #555);
  font-size: 0.95em;
  line-height: 1.5;
}

.definition strong,
.example strong {
  color: var(--app-text, #333);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--app-text-muted, #999);
}

/* Experiments Grid */
.experiments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
}

.experiment-card {
  background: var(--app-card, #fff);
  border-radius: 15px;
  padding: 25px;
  border: 1px solid var(--app-border, #e0e0e0);
  box-shadow: 0 4px 12px var(--app-shadow-light, rgba(0, 0, 0, 0.05));
  transition: transform 0.2s, box-shadow 0.2s;
}

.experiment-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px var(--app-shadow-light, rgba(0, 0, 0, 0.1));
}

.exp-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 15px;
}

.exp-header h3 {
  margin: 0;
  font-size: 1.2em;
  color: var(--app-text, #333);
  flex: 1;
}

.exp-type {
  background: color-mix(in srgb, var(--app-primary, #667eea) 15%, transparent);
  color: var(--app-primary, #667eea);
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.8em;
  font-weight: 600;
  white-space: nowrap;
  margin-left: 10px;
}

.experiment-card .description {
  margin: 0 0 15px 0;
  color: var(--app-text-secondary, #555);
  line-height: 1.6;
}

.finding,
.implication {
  margin: 12px 0;
  padding: 12px;
  background: color-mix(in srgb, var(--app-primary, #667eea) 5%, transparent);
  border-left: 3px solid var(--app-primary, #667eea);
  border-radius: 4px;
  color: var(--app-text-secondary, #555);
  line-height: 1.6;
}

/* Notes Section */
.notes-section {
  background: var(--app-card, #fff);
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 4px 12px var(--app-shadow-light, rgba(0, 0, 0, 0.05));
}

.notes-section h3 {
  margin-top: 0;
  color: var(--app-text, #333);
}

.notes-textarea {
  width: 100%;
  min-height: 300px;
  padding: 20px;
  font-size: 1em;
  border: 2px solid var(--app-border, #e0e0e0);
  border-radius: 10px;
  background: var(--app-bg, #f5f7fa);
  color: var(--app-text, #333);
  font-family: 'Courier New', monospace;
  resize: vertical;
  transition: border-color 0.3s;
}

.notes-textarea:focus {
  outline: none;
  border-color: var(--app-primary, #667eea);
}

.notes-info {
  margin-top: 12px;
  color: var(--app-text-muted, #999);
  font-size: 0.9em;
}

/* Responsive */
@media (max-width: 768px) {
  .evo-psych-page {
    padding: 12px;
  }

  .hero-section {
    padding: 40px 20px;
  }

  .hero-content h1 {
    font-size: 2em;
  }

  .hero-subtitle {
    font-size: 1.2em;
  }

  .tab-navigation {
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 10px;
  }

  .tab-button {
    padding: 8px 15px;
    font-size: 0.9em;
  }

  .stats-grid,
  .intro-cards,
  .theories-grid,
  .concepts-grid,
  .experiments-grid {
    grid-template-columns: 1fr;
  }

  .nav-buttons {
    grid-template-columns: 1fr 1fr;
  }

  .search-section {
    display: flex;
    flex-direction: column;
  }

  .filter-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .notes-textarea {
    min-height: 200px;
  }
}
</style>
