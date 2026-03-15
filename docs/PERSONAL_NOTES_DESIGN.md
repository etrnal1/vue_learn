# 个人笔记系统 - 完整设计文档

> 一个功能完整的笔记应用，支持创建、编辑、删除、搜索、分类、标签以及统计可视化

## 📋 功能概述

**个人笔记系统** 是一个轻量级的笔记管理应用，帮助用户快速记录想法、任务和知识。系统提供了直观的笔记编辑界面，强大的搜索过滤功能，以及数据统计和可视化面板，让用户能够更好地管理和分析笔记数据。

### 用户价值

- 📝 **快速记录** - 一键创建笔记，无需繁琐的配置
- 🔍 **智能搜索** - 按标题、内容、标签快速查找
- 📊 **数据可视化** - 清晰的统计图表展示笔记概览
- 🏷️ **灵活分类** - 支持分类和标签，方便组织
- 📱 **响应式设计** - 完美支持桌面、平板、手机

---

## ⭐ 核心特性

### 基础功能
- ✅ **创建笔记** - 支持标题、内容、分类、标签
- ✅ **编辑笔记** - 实时编辑，自动保存草稿
- ✅ **删除笔记** - 支持单个或批量删除
- ✅ **笔记列表** - 卡片视图或列表视图，支持排序

### 搜索和过滤
- ✅ **文本搜索** - 按标题和内容搜索
- ✅ **分类过滤** - 按分类显示笔记
- ✅ **标签过滤** - 按标签筛选笔记
- ✅ **日期过滤** - 按创建时间范围过滤
- ✅ **排序选项** - 按时间、标题、优先级排序

### 统计和可视化
- ✅ **统计面板** - 显示笔记总数、分类数、标签数
- ✅ **分类分布饼图** - 各分类笔记数量分布
- ✅ **时间趋势折线图** - 笔记创建趋势
- ✅ **标签云图** - 常用标签可视化
- ✅ **热门分类排行** - Top 5 分类统计

### 高级功能
- ✅ **星标笔记** - 标记重要笔记
- ✅ **颜色标签** - 彩色标签分类
- ✅ **最近访问** - 快速访问常用笔记
- ✅ **数据导出** - 导出为 JSON/CSV/Markdown

---

## 🔄 工作原理

### 数据流

```
用户输入
  ↓
笔记编辑器（创建/编辑）
  ↓
验证和处理数据
  ↓
发送 API 请求
  ↓
后端数据库存储
  ↓
响应成功/失败
  ↓
更新前端列表和统计
  ↓
实时刷新图表
```

### 页面结构

```
┌─────────────────────────────────────────┐
│         个人笔记系统                      │
├──────────────┬──────────────────────────┤
│              │                          │
│   操作栏      │      笔记列表或编辑器     │
│  (搜索/过滤)  │    (卡片/列表/详情)     │
│              │                          │
├──────────────┼──────────────────────────┤
│              │                          │
│   侧栏        │                          │
│  (分类/统计)  │      统计面板            │
│              │   (图表/数据总览)        │
│              │                          │
└──────────────┴──────────────────────────┘
```

### 组件结构

```
NotesPage.vue (主页面)
├── NotesHeader.vue (顶部搜索和操作栏)
├── NotesSidebar.vue (侧栏：分类和统计)
│   ├── CategoryList.vue (分类列表)
│   └── StatsPanel.vue (快速统计)
├── NotesContent.vue (主内容区)
│   ├── NotesList.vue (笔记列表)
│   │   └── NoteCard.vue (笔记卡片)
│   └── NoteEditor.vue (笔记编辑器)
└── StatsModal.vue (统计详情弹窗)
    ├── CategoryChart.vue (分类饼图)
    ├── TrendChart.vue (时间趋势)
    ├── TagCloud.vue (标签云)
    └── TopCategories.vue (热门分类)
```

---

## 🛠️ 技术实现

### 前端

#### 文件结构

```
src/
├── pages/
│   └── PersonalNotes.vue          # 主页面 (500+ 行)
├── pages/notes/
│   ├── NotesHeader.vue            # 搜索栏和操作
│   ├── NotesSidebar.vue           # 侧栏
│   ├── NotesList.vue              # 笔记列表
│   ├── NoteCard.vue               # 笔记卡片
│   ├── NoteEditor.vue             # 编辑器
│   ├── NoteDetail.vue             # 详情页
│   └── components/
│       ├── CategoryList.vue       # 分类列表
│       ├── StatsPanel.vue         # 快速统计
│       ├── CategoryChart.vue      # 饼图
│       ├── TrendChart.vue         # 折线图
│       ├── TagCloud.vue           # 标签云
│       └── TopCategories.vue      # 排行榜
└── utils/
    └── notesStats.js              # 统计计算工具
```

#### 核心数据结构

```javascript
// 笔记对象
{
  id: "note_1234567890",           // 唯一ID
  title: "笔记标题",                 // 标题
  content: "笔记内容...",             // 内容（Markdown）
  category: "工作",                  // 分类
  tags: ["Vue", "前端"],             // 标签数组
  color: "#FF6B6B",                 // 标签颜色
  isStarred: false,                 // 是否星标
  createdAt: 1693478400000,         // 创建时间戳
  updatedAt: 1693478400000,         // 更新时间戳
  wordCount: 250,                   // 字数统计
}

// 分类对象
{
  id: "cat_1",
  name: "工作",
  color: "#667eea",
  noteCount: 12
}

// 统计对象
{
  totalNotes: 50,                    // 总笔记数
  totalWords: 12500,                 // 总字数
  categories: [                      // 分类统计
    { name: "工作", count: 20, percentage: 40 },
    { name: "生活", count: 15, percentage: 30 },
    // ...
  ],
  tags: [                            // 标签统计
    { name: "Vue", count: 8 },
    { name: "前端", count: 6 },
    // ...
  ],
  trendData: [                       // 时间趋势
    { date: "2024-01-01", count: 5 },
    { date: "2024-01-02", count: 3 },
    // ...
  ],
  lastWeekCount: 15,                 // 本周笔记数
  avgWordCount: 250                  // 平均字数
}
```

#### 关键计算逻辑

```javascript
// 笔记统计计算
function calculateStats(notes) {
  // 1. 分类统计
  const categories = groupBy(notes, 'category');

  // 2. 标签统计
  const tags = countTags(notes);

  // 3. 时间趋势
  const trendData = groupByDate(notes);

  // 4. 总体指标
  return {
    totalNotes: notes.length,
    totalWords: notes.reduce((sum, n) => sum + n.wordCount, 0),
    categories: Object.entries(categories).map(([name, items]) => ({
      name,
      count: items.length,
      percentage: (items.length / notes.length * 100).toFixed(1)
    })),
    tags,
    trendData
  };
}

// 搜索和过滤
function filterNotes(notes, filters) {
  return notes.filter(note => {
    // 搜索文本
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      if (!note.title.toLowerCase().includes(keyword) &&
          !note.content.toLowerCase().includes(keyword)) {
        return false;
      }
    }

    // 分类过滤
    if (filters.category && note.category !== filters.category) {
      return false;
    }

    // 标签过滤
    if (filters.tags && filters.tags.length > 0) {
      if (!filters.tags.some(tag => note.tags.includes(tag))) {
        return false;
      }
    }

    // 日期过滤
    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      if (note.createdAt < start || note.createdAt > end) {
        return false;
      }
    }

    // 星标过滤
    if (filters.starred && !note.isStarred) {
      return false;
    }

    return true;
  });
}

// 排序
function sortNotes(notes, sortBy) {
  const sortFunctions = {
    'newest': (a, b) => b.createdAt - a.createdAt,
    'oldest': (a, b) => a.createdAt - b.createdAt,
    'title': (a, b) => a.title.localeCompare(b.title),
    'length': (a, b) => b.wordCount - a.wordCount,
    'updated': (a, b) => b.updatedAt - a.updatedAt,
  };

  return [...notes].sort(sortFunctions[sortBy] || sortFunctions.newest);
}
```

#### 主页面组件框架

```vue
<template>
  <div class="notes-page">
    <!-- 顶部操作栏 -->
    <NotesHeader
      :keyword="searchKeyword"
      :view-mode="viewMode"
      :sort-by="sortBy"
      @search="handleSearch"
      @view-mode-change="viewMode = $event"
      @sort-change="sortBy = $event"
      @create="openEditor"
    />

    <div class="notes-container">
      <!-- 侧栏 -->
      <NotesSidebar
        :categories="categories"
        :stats="stats"
        :active-category="activeCategory"
        @category-select="activeCategory = $event"
        @stats-click="showStatsModal = true"
      />

      <!-- 主内容 -->
      <NotesContent>
        <template v-if="currentView === 'list'">
          <NotesList
            :notes="filteredNotes"
            :view-mode="viewMode"
            @edit="editNote"
            @delete="deleteNote"
            @toggle-star="toggleStar"
          />
        </template>

        <template v-if="currentView === 'edit'">
          <NoteEditor
            :note="editingNote"
            :categories="categories"
            :all-tags="allTags"
            @save="saveNote"
            @cancel="cancelEdit"
          />
        </template>
      </NotesContent>
    </div>

    <!-- 统计详情弹窗 -->
    <StatsModal
      v-if="showStatsModal"
      :stats="stats"
      @close="showStatsModal = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import api from '@/utils/api';
import { calculateStats, filterNotes, sortNotes } from '@/utils/notesStats';

export default {
  name: 'PersonalNotes',

  components: {
    NotesHeader,
    NotesSidebar,
    NotesContent,
    NotesList,
    NoteEditor,
    StatsModal,
  },

  setup() {
    // 数据
    let notes = ref([]);
    let categories = ref([]);
    let allTags = ref([]);

    // 状态
    let searchKeyword = ref('');
    let viewMode = ref('card');  // card 或 list
    let sortBy = ref('newest');
    let activeCategory = ref(null);
    let selectedTags = ref([]);
    let currentView = ref('list');
    let editingNote = ref(null);
    let showStatsModal = ref(false);

    // 计算属性
    const filteredNotes = computed(() => {
      let result = notes.value;

      // 应用过滤
      result = filterNotes(result, {
        keyword: searchKeyword.value,
        category: activeCategory.value,
        tags: selectedTags.value,
      });

      // 应用排序
      result = sortNotes(result, sortBy.value);

      return result;
    });

    const stats = computed(() => calculateStats(notes.value));

    // 方法
    async function loadNotes() {
      try {
        const data = await api.notes.list();
        notes.value = data;

        // 提取分类和标签
        categories.value = [...new Set(notes.value.map(n => n.category))].map(cat => ({
          name: cat,
          count: notes.value.filter(n => n.category === cat).length
        }));

        allTags.value = [...new Set(notes.value.flatMap(n => n.tags))];
      } catch (error) {
        console.error('加载笔记失败:', error);
      }
    }

    async function saveNote(noteData) {
      try {
        if (noteData.id) {
          await api.notes.update(noteData.id, noteData);
        } else {
          await api.notes.create(noteData);
        }
        await loadNotes();
        currentView.value = 'list';
        editingNote.value = null;
      } catch (error) {
        console.error('保存笔记失败:', error);
      }
    }

    async function deleteNote(id) {
      if (!confirm('确定要删除这条笔记吗？')) return;

      try {
        await api.notes.delete(id);
        await loadNotes();
      } catch (error) {
        console.error('删除笔记失败:', error);
      }
    }

    function editNote(note) {
      editingNote.value = note;
      currentView.value = 'edit';
    }

    function openEditor() {
      editingNote.value = null;
      currentView.value = 'edit';
    }

    function cancelEdit() {
      currentView.value = 'list';
      editingNote.value = null;
    }

    async function toggleStar(id) {
      const note = notes.value.find(n => n.id === id);
      if (note) {
        note.isStarred = !note.isStarred;
        await api.notes.update(id, { isStarred: note.isStarred });
      }
    }

    function handleSearch(keyword) {
      searchKeyword.value = keyword;
    }

    // 生命周期
    onMounted(() => {
      loadNotes();
    });

    return {
      notes,
      categories,
      allTags,
      searchKeyword,
      viewMode,
      sortBy,
      activeCategory,
      selectedTags,
      currentView,
      editingNote,
      showStatsModal,
      filteredNotes,
      stats,
      loadNotes,
      saveNote,
      deleteNote,
      editNote,
      openEditor,
      cancelEdit,
      toggleStar,
      handleSearch,
    };
  }
}
</script>

<style scoped>
.notes-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
  color: var(--text);
}

.notes-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notes-container {
    flex-direction: column;
  }
}
</style>
```

#### 编辑器组件

```vue
<template>
  <div class="editor">
    <div class="editor-header">
      <h2>{{ editingNote ? '编辑笔记' : '新建笔记' }}</h2>
      <div class="editor-actions">
        <button @click="$emit('cancel')" class="btn-cancel">取消</button>
        <button @click="save" class="btn-save">保存</button>
      </div>
    </div>

    <div class="editor-form">
      <!-- 标题 -->
      <input
        v-model="form.title"
        type="text"
        placeholder="笔记标题..."
        class="input-title"
      >

      <!-- 内容 -->
      <textarea
        v-model="form.content"
        placeholder="输入笔记内容..."
        class="textarea-content"
      ></textarea>

      <!-- 元数据 -->
      <div class="editor-meta">
        <!-- 分类 -->
        <div class="form-group">
          <label>分类</label>
          <select v-model="form.category">
            <option value="">选择分类</option>
            <option v-for="cat in categories" :key="cat">{{ cat }}</option>
          </select>
          <input
            v-if="!categories.includes(form.category)"
            v-model="form.category"
            placeholder="新分类..."
            type="text"
          >
        </div>

        <!-- 标签 -->
        <div class="form-group">
          <label>标签</label>
          <div class="tag-input">
            <div class="tags">
              <span
                v-for="(tag, index) in form.tags"
                :key="index"
                class="tag"
              >
                {{ tag }}
                <button @click="removeTag(index)" type="button">×</button>
              </span>
            </div>
            <input
              ref="tagInput"
              v-model="newTag"
              @keyup.enter="addTag"
              placeholder="添加标签，按Enter..."
              type="text"
            >
          </div>
        </div>

        <!-- 星标 -->
        <div class="form-group">
          <label>
            <input v-model="form.isStarred" type="checkbox">
            标记为重要
          </label>
        </div>
      </div>

      <!-- 预览 -->
      <div class="editor-stats">
        <span>字数: {{ form.content.length }}</span>
        <span>标签: {{ form.tags.length }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'NoteEditor',

  props: {
    note: { type: Object, default: null },
    categories: { type: Array, default: () => [] },
    allTags: { type: Array, default: () => [] },
  },

  emits: ['save', 'cancel'],

  setup(props, { emit }) {
    let form = ref(initializeForm());
    let newTag = ref('');

    function initializeForm() {
      return props.note ? { ...props.note } : {
        title: '',
        content: '',
        category: '',
        tags: [],
        isStarred: false,
      };
    }

    function addTag() {
      if (newTag.value && !form.value.tags.includes(newTag.value)) {
        form.value.tags.push(newTag.value);
        newTag.value = '';
      }
    }

    function removeTag(index) {
      form.value.tags.splice(index, 1);
    }

    function save() {
      if (!form.value.title.trim()) {
        alert('请输入笔记标题');
        return;
      }

      emit('save', {
        ...form.value,
        wordCount: form.value.content.length,
        updatedAt: Date.now(),
      });
    }

    return {
      form,
      newTag,
      addTag,
      removeTag,
      save,
    };
  }
}
</script>

<style scoped>
.editor {
  padding: 30px;
  background: var(--bg);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.input-title {
  width: 100%;
  font-size: 24px;
  font-weight: bold;
  border: none;
  border-bottom: 2px solid var(--primary);
  padding: 10px 0;
  margin-bottom: 20px;
}

.textarea-content {
  width: 100%;
  min-height: 400px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: vertical;
  font-family: monospace;
  font-size: 14px;
}

.editor-meta {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: bold;
  margin-bottom: 8px;
}

.form-group select,
.form-group input[type="text"] {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.tag-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.tag {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.tag button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  margin-left: 4px;
}

.editor-stats {
  display: flex;
  gap: 20px;
  margin-top: 15px;
  color: #999;
  font-size: 12px;
}

.btn-save {
  background: var(--primary);
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-save:hover {
  opacity: 0.9;
}

.btn-cancel {
  background: #eee;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

#### 统计图表组件

```javascript
// TrendChart.vue - 时间趋势折线图
// 使用 ECharts 绘制笔记创建趋势

import { onMounted, ref } from 'vue';
import * as echarts from 'echarts';

export default {
  props: {
    data: Array  // 格式: [{ date: '2024-01-01', count: 5 }, ...]
  },

  setup(props) {
    let chartEl = ref(null);
    let chart = null;

    onMounted(() => {
      chart = echarts.init(chartEl.value);
      updateChart();
    });

    function updateChart() {
      const dates = props.data.map(d => d.date);
      const counts = props.data.map(d => d.count);

      chart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: dates,
        },
        yAxis: {
          type: 'value',
        },
        series: [{
          data: counts,
          type: 'line',
          smooth: true,
          areaStyle: { color: 'rgba(102, 126, 234, 0.2)' },
          itemStyle: { color: '#667eea' },
        }],
      });
    }

    return { chartEl };
  }
}
```

### 后端

#### API 端点

| 方法 | 端点 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/notes` | 获取笔记列表 | 用户 |
| POST | `/api/notes` | 创建笔记 | 用户 |
| GET | `/api/notes/:id` | 获取笔记详情 | 用户 |
| PUT | `/api/notes/:id` | 更新笔记 | 用户 |
| DELETE | `/api/notes/:id` | 删除笔记 | 用户 |
| GET | `/api/notes/stats` | 获取统计数据 | 用户 |
| GET | `/api/notes/categories` | 获取分类列表 | 用户 |
| GET | `/api/notes/tags` | 获取标签列表 | 用户 |
| POST | `/api/notes/export` | 导出笔记 | 用户 |

#### 请求/响应格式

**创建笔记 (POST /api/notes)**

请求体：
```json
{
  "title": "我的第一条笔记",
  "content": "笔记内容",
  "category": "工作",
  "tags": ["Vue", "前端"],
  "isStarred": false
}
```

响应 (201)：
```json
{
  "id": "note_1693478400000",
  "title": "我的第一条笔记",
  "content": "笔记内容",
  "category": "工作",
  "tags": ["Vue", "前端"],
  "isStarred": false,
  "wordCount": 5,
  "createdAt": 1693478400000,
  "updatedAt": 1693478400000
}
```

**获取笔记列表 (GET /api/notes?category=工作&tags=Vue&sort=newest)**

响应 (200)：
```json
{
  "data": [
    {
      "id": "note_1",
      "title": "笔记1",
      "content": "内容...",
      "category": "工作",
      "tags": ["Vue"],
      "isStarred": true,
      "wordCount": 150,
      "createdAt": 1693478400000,
      "updatedAt": 1693478400000
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20
}
```

**获取统计数据 (GET /api/notes/stats)**

响应 (200)：
```json
{
  "totalNotes": 50,
  "totalWords": 12500,
  "categories": [
    { "name": "工作", "count": 25, "percentage": 50 },
    { "name": "生活", "count": 15, "percentage": 30 },
    { "name": "学习", "count": 10, "percentage": 20 }
  ],
  "tags": [
    { "name": "Vue", "count": 15 },
    { "name": "前端", "count": 12 },
    { "name": "JavaScript", "count": 10 }
  ],
  "trendData": [
    { "date": "2024-01-01", "count": 5 },
    { "date": "2024-01-02", "count": 3 }
  ],
  "lastWeekCount": 12,
  "avgWordCount": 250,
  "createdToday": 2
}
```

#### 数据库设计

**表: notes**
```sql
CREATE TABLE notes (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  category VARCHAR(50),
  is_starred BOOLEAN DEFAULT FALSE,
  word_count INT DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT NULL,
  KEY idx_user (user_id),
  KEY idx_category (category),
  KEY idx_created (created_at)
);
```

**表: note_tags**
```sql
CREATE TABLE note_tags (
  id VARCHAR(50) PRIMARY KEY,
  note_id VARCHAR(50) NOT NULL,
  tag VARCHAR(50) NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  KEY idx_note (note_id),
  KEY idx_tag (tag)
);
```

**表: note_categories**
```sql
CREATE TABLE note_categories (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7),
  created_at BIGINT NOT NULL,
  KEY idx_user (user_id)
);
```

#### 后端实现示例 (Express)

```javascript
// server/routes/notes.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取笔记列表
router.get('/api/notes', async (req, res) => {
  try {
    const { category, tags, sort, page = 1, limit = 20 } = req.query;

    let query = 'SELECT * FROM notes WHERE deleted_at IS NULL';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    // 排序
    const sortMap = {
      'newest': 'created_at DESC',
      'oldest': 'created_at ASC',
      'title': 'title ASC',
      'updated': 'updated_at DESC',
    };
    query += ` ORDER BY ${sortMap[sort] || sortMap.newest}`;

    // 分页
    const offset = (page - 1) * limit;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const notes = await db.query(query, params);
    const total = await db.query(
      'SELECT COUNT(*) as count FROM notes WHERE deleted_at IS NULL',
      []
    );

    res.json({
      data: notes,
      total: total[0].count,
      page: parseInt(page),
      pageSize: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建笔记
router.post('/api/notes', async (req, res) => {
  try {
    const { title, content, category, tags = [], isStarred } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const id = 'note_' + Date.now();
    const now = Date.now();
    const wordCount = content.length;

    await db.query(
      'INSERT INTO notes (id, title, content, category, is_starred, word_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, content, category, isStarred || false, wordCount, now, now]
    );

    // 插入标签
    for (const tag of tags) {
      const tagId = 'tag_' + Date.now() + Math.random();
      await db.query(
        'INSERT INTO note_tags (id, note_id, tag) VALUES (?, ?, ?)',
        [tagId, id, tag]
      );
    }

    res.status(201).json({
      id, title, content, category, tags, isStarred, wordCount,
      createdAt: now, updatedAt: now
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取统计数据
router.get('/api/notes/stats', async (req, res) => {
  try {
    const stats = {};

    // 总笔记数
    const total = await db.query(
      'SELECT COUNT(*) as count FROM notes WHERE deleted_at IS NULL'
    );
    stats.totalNotes = total[0].count;

    // 总字数
    const words = await db.query(
      'SELECT SUM(word_count) as total FROM notes WHERE deleted_at IS NULL'
    );
    stats.totalWords = words[0].total || 0;

    // 分类统计
    const categories = await db.query(
      'SELECT category, COUNT(*) as count FROM notes WHERE deleted_at IS NULL GROUP BY category'
    );
    stats.categories = categories.map(c => ({
      name: c.category,
      count: c.count,
      percentage: ((c.count / stats.totalNotes) * 100).toFixed(1)
    }));

    // 标签统计
    const tags = await db.query(
      'SELECT tag, COUNT(*) as count FROM note_tags GROUP BY tag ORDER BY count DESC LIMIT 20'
    );
    stats.tags = tags;

    // 时间趋势（最近30天）
    const trendQuery = `
      SELECT DATE(FROM_UNIXTIME(created_at/1000)) as date, COUNT(*) as count
      FROM notes
      WHERE deleted_at IS NULL AND created_at > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY)) * 1000
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    const trend = await db.query(trendQuery);
    stats.trendData = trend;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新笔记
router.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, isStarred } = req.body;
    const now = Date.now();
    const wordCount = content.length;

    await db.query(
      'UPDATE notes SET title=?, content=?, category=?, is_starred=?, word_count=?, updated_at=? WHERE id=?',
      [title, content, category, isStarred, wordCount, now, id]
    );

    // 更新标签
    await db.query('DELETE FROM note_tags WHERE note_id=?', [id]);
    for (const tag of tags) {
      const tagId = 'tag_' + Date.now() + Math.random();
      await db.query(
        'INSERT INTO note_tags (id, note_id, tag) VALUES (?, ?, ?)',
        [tagId, id, tag]
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除笔记
router.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      'UPDATE notes SET deleted_at=? WHERE id=?',
      [Date.now(), id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## 📱 UI/UX 设计

### 页面布局

#### 列表视图
```
┌─────────────────────────────────────────────┐
│ 搜索... [分类▼] [标签▼] [排序▼] [+ 新建]    │
├────────────┬────────────────────────────────┤
│ 分类 (3)   │  [笔记卡片] [笔记卡片]         │
│ ▸ 工作 25  │  [笔记卡片] [笔记卡片]         │
│ ▾ 生活 15  │  [笔记卡片] [笔记卡片]         │
│ ▸ 学习 10  │                              │
│ ──────────  │  📊 统计面板                  │
│ 统计        │  总数: 50 | 字数: 12500      │
│ 50 笔记     │  [查看详情]                  │
│ 12500 字   │                              │
│ 20 标签    │                              │
└────────────┴────────────────────────────────┘
```

#### 编辑视图
```
┌─────────────────────────────────────────────┐
│ 新建笔记                        [取消] [保存]│
├─────────────────────────────────────────────┤
│ 笔记标题                                    │
│ ─────────────────────────────────────────  │
│                                            │
│ 笔记内容                                    │
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ │                                         │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                            │
│ 分类: [工作    ] 标签: [Vue][前端]         │
│                   新标签... ↵              │
│ ☐ 标记为重要                              │
│                                            │
│ 字数: 250  标签: 2                        │
└─────────────────────────────────────────────┘
```

### 配色方案

| 元素 | 颜色 | 用途 |
|------|------|------|
| 主色 | var(--primary) | 按钮、高亮 |
| 工作 | #FF6B6B | 分类标记 |
| 生活 | #4ECDC4 | 分类标记 |
| 学习 | #FFE66D | 分类标记 |
| 文本 | var(--text) | 正文文字 |
| 背景 | var(--bg) | 页面背景 |

### 响应式设计

**桌面 (> 1024px)**
- 侧栏宽度: 250px
- 三列卡片布局
- 完整统计面板

**平板 (768px - 1024px)**
- 侧栏宽度: 200px
- 两列卡片布局
- 统计面板折叠

**手机 (< 768px)**
- 侧栏隐藏（汉堡菜单）
- 单列列表
- 统计面板滑动

---

## 📝 使用指南

### 用户场景

#### 场景 1: 快速记录想法
1. 点击主页面的 "+ 新建" 按钮
2. 输入笔记标题和内容
3. 选择分类（可选）
4. 添加相关标签（可选）
5. 点击 "保存" 按钮
6. 笔记自动保存到数据库

#### 场景 2: 查找之前的笔记
1. 使用顶部搜索框输入关键词
2. 或点击左侧分类快速过滤
3. 或点击标签进行标签过滤
4. 笔记列表实时更新
5. 点击笔记卡片查看详情或编辑

#### 场景 3: 分析笔记数据
1. 点击右侧统计面板的 "查看详情" 按钮
2. 查看统计面板包含：
   - 分类分布饼图（各分类笔记数量）
   - 时间趋势折线图（过去30天创建趋势）
   - 标签云图（常用标签可视化）
   - 热门分类排行（Top 5分类）
3. 根据统计数据规划笔记内容

### 快捷操作

| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 新建笔记 | Ctrl/Cmd + N | 快速创建 |
| 保存笔记 | Ctrl/Cmd + S | 快速保存 |
| 搜索笔记 | Ctrl/Cmd + F | 打开搜索框 |
| 删除笔记 | Delete | 删除选中 |
| 星标笔记 | Ctrl/Cmd + D | 标记重要 |

---

## 🔄 实现步骤

### Phase 1: 基础功能 (第1-2周)

**目标**: 实现笔记的CRUD操作

1. **数据库设计和初始化**
   - 创建notes表、note_tags表、note_categories表
   - 编写初始化脚本

2. **后端API开发**
   - 实现 GET /api/notes (列表)
   - 实现 POST /api/notes (创建)
   - 实现 PUT /api/notes/:id (更新)
   - 实现 DELETE /api/notes/:id (删除)

3. **前端基础页面**
   - PersonalNotes.vue (主页面框架)
   - NotesList.vue (笔记列表)
   - NoteCard.vue (笔记卡片)
   - NoteEditor.vue (编辑器)

### Phase 2: 搜索和过滤 (第3周)

**目标**: 实现强大的搜索和筛选功能

1. **后端搜索优化**
   - 实现全文搜索
   - 添加分类和标签过滤的API支持
   - 实现日期范围筛选

2. **前端搜索UI**
   - NotesHeader.vue (搜索栏和过滤)
   - 集成搜索、分类、标签、日期过滤

3. **优化用户体验**
   - 搜索实时反馈
   - 高亮搜索结果
   - 记住用户的过滤偏好

### Phase 3: 统计和图表 (第4周)

**目标**: 实现数据可视化统计面板

1. **后端统计API**
   - 实现 GET /api/notes/stats
   - 计算分类、标签、时间趋势等统计数据

2. **图表组件开发**
   - CategoryChart.vue (分类分布饼图)
   - TrendChart.vue (时间趋势折线图)
   - TagCloud.vue (标签云)
   - TopCategories.vue (热门分类排行)

3. **统计面板集成**
   - StatsPanel.vue (快速统计显示)
   - StatsModal.vue (详情面板)
   - 实时图表更新

### Phase 4: 高级功能 (第5周)

**目标**: 实现星标、分组、导出等功能

1. **高级功能**
   - 星标笔记 (is_starred字段)
   - 笔记排序选项 (时间、标题、字数等)
   - 视图切换 (卡片视图/列表视图)

2. **数据导出**
   - 实现导出为JSON
   - 实现导出为CSV
   - 实现导出为Markdown

3. **性能优化**
   - 分页加载
   - 虚拟列表 (大量笔记时)
   - 缓存策略

### Phase 5: 增强功能 (第6周)

**目标**: 完善和优化系统

1. **用户体验**
   - 添加撤销/重做功能
   - 自动保存草稿
   - 快捷键支持

2. **数据安全**
   - 笔记版本历史
   - 恢复已删除笔记
   - 数据加密存储

3. **集成优化**
   - 与PWA离线功能整合
   - 桌面快捷方式
   - 通知提醒

---

## 🐛 故障排除

### 问题 1: 笔记列表显示为空

**症状**:
- 创建笔记后列表仍为空
- 或打开页面时列表为空

**原因**:
- 后端API返回失败
- 前端未正确解析响应
- 数据库查询有问题

**解决方案**:
1. 打开浏览器 DevTools (F12)
2. 切换到 Network 标签页
3. 查看 GET /api/notes 请求是否成功
4. 检查响应数据格式是否正确
5. 查看 Console 标签页的错误信息
6. 如果是后端问题，检查数据库连接

### 问题 2: 编辑笔记后没有保存

**症状**:
- 刷新页面后编辑内容消失
- 点击保存按钮无反应

**原因**:
- 保存API请求失败
- 请求超时
- 网络连接问题

**解决方案**:
1. 检查浏览器 Network 标签，查看 PUT 请求状态
2. 查看后端日志是否有错误
3. 增加请求超时时间
4. 检查网络连接

### 问题 3: 统计图表不显示

**症状**:
- 统计面板为空
- 图表加载中但不显示数据

**原因**:
- ECharts库未正确加载
- 统计数据为空
- 图表容器尺寸问题

**解决方案**:
1. 检查 ECharts 是否正确引入
2. 检查 GET /api/notes/stats 响应数据
3. 在浏览器 DevTools 中检查图表容器的宽高
4. 手动调用 chart.resize() 重新绘制

### 问题 4: 搜索结果不正确

**症状**:
- 搜索关键词无结果
- 或返回不相关的笔记

**原因**:
- 搜索逻辑有bug
- 数据库索引未创建
- 字符编码问题

**解决方案**:
1. 检查搜索逻辑是否正确
2. 验证数据库中的数据
3. 创建全文搜索索引提高性能
4. 检查字符编码设置

### 调试技巧

```javascript
// 1. 查看完整的数据结构
console.log(JSON.stringify(notes, null, 2));

// 2. 检查API响应
fetch('/api/notes')
  .then(r => r.json())
  .then(data => console.log('API响应:', data))
  .catch(e => console.error('API错误:', e));

// 3. 监听数据变化
watch(notes, (newVal) => {
  console.log('笔记数据已更新:', newVal);
});

// 4. 性能监控
console.time('加载笔记');
loadNotes().then(() => console.timeEnd('加载笔记'));
```

---

## 📊 性能考虑

### 性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 初次加载 | < 1s | 页面加载到可交互 |
| API响应 | < 500ms | 列表查询响应时间 |
| 列表渲染 | < 200ms | 100+ 条笔记的渲染时间 |
| 搜索响应 | < 300ms | 搜索结果返回时间 |
| 图表绘制 | < 500ms | 统计图表绘制时间 |

### 优化建议

#### 1. 列表虚拟化
```javascript
// 使用虚拟列表库处理大量笔记
// 只渲染可见区域的笔记，提高性能

<VirtualList
  :items="notes"
  :item-height="100"
  :buffer="5"
>
  <template #default="{ item }">
    <NoteCard :note="item" />
  </template>
</VirtualList>
```

#### 2. 数据缓存
```javascript
// 缓存API响应，减少重复请求
const notesCache = new Map();

async function getNotes(cacheKey) {
  if (notesCache.has(cacheKey)) {
    return notesCache.get(cacheKey);
  }

  const data = await api.notes.list();
  notesCache.set(cacheKey, data);
  return data;
}
```

#### 3. 分页加载
```javascript
// 实现无限滚动或分页
const pageSize = 20;
let currentPage = 1;

async function loadMore() {
  const newNotes = await api.notes.list({
    page: currentPage++,
    limit: pageSize
  });
  notes.value.push(...newNotes);
}
```

#### 4. 图表优化
```javascript
// 使用节流防止频繁重绘
import throttle from 'lodash/throttle';

watch(stats, throttle(() => {
  updateChart();
}, 500));
```

---

## ✅ 测试清单

### 功能测试

- [ ] 能创建新笔记
- [ ] 能编辑现有笔记
- [ ] 能删除笔记
- [ ] 能搜索笔记 (标题)
- [ ] 能搜索笔记 (内容)
- [ ] 能按分类过滤
- [ ] 能按标签过滤
- [ ] 能标记星标笔记
- [ ] 能查看统计数据
- [ ] 图表正确显示
- [ ] 能导出笔记数据
- [ ] 分页正确加载

### UI/UX测试

- [ ] 页面布局正确
- [ ] 按钮功能正常
- [ ] 输入框可输入
- [ ] 样式美观一致
- [ ] 文字可读性好
- [ ] 颜色对比度高

### 响应式设计测试

- [ ] 桌面设备适配
- [ ] 平板设备适配
- [ ] 手机设备适配
- [ ] 侧栏可折叠
- [ ] 触摸操作流畅

### 性能测试

- [ ] 页面加载 < 1s
- [ ] 列表滚动流畅
- [ ] 搜索响应快速
- [ ] 没有明显卡顿
- [ ] 图表加载快速

### 浏览器兼容性

- [ ] Chrome 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] Edge 最新版
- [ ] 移动浏览器

### 错误处理

- [ ] 网络错误显示提示
- [ ] API错误正确处理
- [ ] 数据验证有效
- [ ] 没有控制台错误
- [ ] 没有内存泄漏

---

## 🔗 开发扩展

### 如何添加新功能

#### 1. 添加笔记分享功能

```javascript
// 后端API
router.post('/api/notes/:id/share', async (req, res) => {
  const { id } = req.params;
  const shareCode = generateShareCode();
  await db.query(
    'INSERT INTO note_shares (note_id, share_code, created_at) VALUES (?, ?, ?)',
    [id, shareCode, Date.now()]
  );
  res.json({ shareUrl: `${host}/share/${shareCode}` });
});

// 前端组件
<button @click="shareNote">分享</button>
```

#### 2. 添加笔记协作编辑

```javascript
// 使用 WebSocket 实现实时协作
socket.on('note:update', (data) => {
  applyRemoteChange(data);
});

socket.emit('note:update', {
  noteId: currentNote.id,
  changes: delta
});
```

#### 3. 添加AI摘要生成

```javascript
// 调用AI API生成摘要
const summary = await ai.generateSummary(note.content);
note.summary = summary;
```

### 相关文件速查

| 功能 | 文件位置 | 行数 |
|------|---------|------|
| 主页面 | src/pages/PersonalNotes.vue | - |
| 编辑器 | src/pages/notes/NoteEditor.vue | - |
| 列表 | src/pages/notes/NotesList.vue | - |
| 统计 | src/pages/notes/StatsModal.vue | - |
| API | src/utils/api.js | - |
| 后端 | server/routes/notes.js | - |
| 工具 | src/utils/notesStats.js | - |

---

## 📚 相关文档

- 📄 [FRONTEND_LEARNING_GUIDE.md](./FRONTEND_LEARNING_GUIDE.md) - 前端学习指南
- 📄 [CLAUDE.md](../CLAUDE.md) - 项目开发指南

---

## 版本历史

| 版本 | 日期 | 内容 |
|------|------|------|
| 1.0 | 2026-03-15 | 初始设计文档 |

---

**文档版本**: 1.0
**创建日期**: 2026年3月15日
**维护人**: Claude Code
**状态**: ✅ 设计阶段完成，准备实现
