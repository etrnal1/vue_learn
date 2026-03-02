# Issue 管理系统 - 功能设计说明书

## 📋 功能概述

Issue 管理系统是一个完整的问题跟踪和协作平台，类似于 GitHub Issues，用于管理项目中的任务、缺陷、需求和讨论。该系统支持问题的创建、分配、跟踪、评论、标签管理、里程碑规划等功能，帮助团队高效协作和项目管理。

**用户价值：**
- 📊 **集中化管理** - 所有问题和任务在一个地方管理，避免信息分散
- 👥 **团队协作** - 支持指派、评论、@提及等协作功能
- 📈 **进度追踪** - 通过看板视图和统计图表实时了解项目进展
- 🏷️ **灵活分类** - 标签、里程碑、优先级等多维度组织问题
- 🔍 **强大搜索** - 全文搜索和高级筛选快速定位问题

## ✨ 核心特性

### 基础功能
- ✅ Issue 的创建、编辑、删除、关闭/重开
- ✅ 富文本编辑器（支持 Markdown）
- ✅ 评论系统（支持编辑、删除、引用回复）
- ✅ 用户指派和关注者系统
- ✅ 标签管理（创建、编辑、颜色配置）
- ✅ 优先级设置（紧急、高、中、低）
- ✅ 状态管理（开放、进行中、已关闭、已解决）
- ✅ @提及功能和通知系统

### 高级功能
- ✅ 里程碑管理（进度追踪、截止日期）
- ✅ 看板视图（拖拽式任务管理）
- ✅ 时间追踪（预估时间、实际用时）
- ✅ 附件上传（图片、文档、代码片段）
- ✅ Issue 模板（Bug报告、功能请求、任务模板）
- ✅ 高级搜索和筛选器（保存的过滤器）
- ✅ 统计分析（燃尽图、完成率、趋势分析）
- ✅ Webhook 集成（外部系统通知）
- ✅ 批量操作（批量关闭、批量分配、批量打标签）
- ✅ Issue 关联（阻塞关系、父子任务）

### 协作功能
- ✅ 实时协作（WebSocket 推送更新）
- ✅ 活动流（时间线展示所有操作）
- ✅ 订阅/取消订阅 Issue
- ✅ 团队成员工作量统计
- ✅ 评论反应（👍 👎 😄 🎉 😕 ❤️）

## 🏗️ 系统架构

### 数据流图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端界面   │────▶│  REST API   │────▶│   MySQL     │
│  Vue 3 SPA  │     │  Express.js │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       │                    ▼                    │
       │            ┌─────────────┐             │
       └───────────▶│  WebSocket  │◀────────────┘
                    │   实时推送   │
                    └─────────────┘
```

### 组件结构

```
IssueManagement/
├── IssueList.vue          # Issue 列表页面
├── IssueDetail.vue        # Issue 详情页面
├── IssueBoard.vue         # 看板视图
├── components/
│   ├── IssueCard.vue      # Issue 卡片组件
│   ├── IssueForm.vue      # 创建/编辑表单
│   ├── IssueFilter.vue    # 筛选器组件
│   ├── IssueTimeline.vue  # 活动时间线
│   ├── CommentEditor.vue  # 评论编辑器
│   ├── CommentList.vue    # 评论列表
│   ├── LabelManager.vue   # 标签管理器
│   ├── MilestoneCard.vue  # 里程碑卡片
│   └── AssigneeSelect.vue # 指派人选择器
├── dialogs/
│   ├── IssueTemplateDialog.vue  # 模板选择
│   ├── BatchOperationDialog.vue # 批量操作
│   └── IssueSearchDialog.vue    # 高级搜索
└── utils/
    ├── issueHelper.js     # Issue 工具函数
    └── markdownParser.js  # Markdown 解析器
```

## 💾 数据库设计

### 核心表结构

#### 1. issues 表 - Issue 主表
```sql
CREATE TABLE issues (
  id INT PRIMARY KEY AUTO_INCREMENT,
  issue_number INT UNIQUE NOT NULL,           -- Issue 编号 (#1, #2, ...)
  title VARCHAR(255) NOT NULL,                -- 标题
  description TEXT,                           -- 描述（Markdown）
  type ENUM('bug','feature','task','question','enhancement') DEFAULT 'task',
  status ENUM('open','in_progress','closed','resolved','reopened') DEFAULT 'open',
  priority ENUM('urgent','high','medium','low') DEFAULT 'medium',

  -- 用户相关
  author_id INT NOT NULL,                     -- 创建者
  assignee_id INT,                           -- 指派给

  -- 时间相关
  estimated_hours DECIMAL(5,2),              -- 预估工时
  actual_hours DECIMAL(5,2),                 -- 实际工时
  due_date DATE,                             -- 截止日期
  closed_at TIMESTAMP NULL,                  -- 关闭时间

  -- 关联
  milestone_id INT,                          -- 里程碑
  parent_issue_id INT,                       -- 父 Issue

  -- 元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (assignee_id) REFERENCES users(id),
  FOREIGN KEY (milestone_id) REFERENCES milestones(id),
  FOREIGN KEY (parent_issue_id) REFERENCES issues(id),
  INDEX idx_status (status),
  INDEX idx_assignee (assignee_id),
  INDEX idx_milestone (milestone_id),
  FULLTEXT idx_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 2. issue_comments 表 - 评论表
```sql
CREATE TABLE issue_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  issue_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,                      -- Markdown 内容
  is_edited BOOLEAN DEFAULT FALSE,           -- 是否编辑过
  edited_at TIMESTAMP NULL,                  -- 编辑时间
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_issue_comments (issue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 3. issue_labels 表 - 标签表
```sql
CREATE TABLE issue_labels (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) NOT NULL,                  -- 十六进制颜色 #FF0000
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Issue 与标签的关联表
CREATE TABLE issue_label_relations (
  issue_id INT NOT NULL,
  label_id INT NOT NULL,
  PRIMARY KEY (issue_id, label_id),
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES issue_labels(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

#### 4. milestones 表 - 里程碑表
```sql
CREATE TABLE milestones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  due_date DATE,
  status ENUM('open','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 5. issue_watchers 表 - 关注者表
```sql
CREATE TABLE issue_watchers (
  issue_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (issue_id, user_id),
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

#### 6. issue_activities 表 - 活动日志表
```sql
CREATE TABLE issue_activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  issue_id INT NOT NULL,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,                  -- created, closed, reopened, commented, assigned, labeled
  description TEXT,                           -- 活动描述
  metadata JSON,                              -- 额外数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_issue_activities (issue_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 7. issue_attachments 表 - 附件表
```sql
CREATE TABLE issue_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  issue_id INT,
  comment_id INT,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100),
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES issue_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 8. issue_templates 表 - Issue 模板表
```sql
CREATE TABLE issue_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,                  -- bug_report, feature_request, task
  title_template VARCHAR(255),
  content_template TEXT,                      -- Markdown 模板
  labels JSON,                                -- 默认标签
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 🔌 API 接口设计

### Issue 管理 API

#### 1. 获取 Issue 列表
```http
GET /api/issues
```

**查询参数：**
```javascript
{
  status: 'open|closed|all',           // 状态筛选
  assignee: 'user_id|unassigned',     // 指派人筛选
  author: 'user_id',                   // 创建者筛选
  labels: 'label1,label2',            // 标签筛选（逗号分隔）
  milestone: 'milestone_id',           // 里程碑筛选
  priority: 'urgent|high|medium|low',  // 优先级筛选
  search: 'keyword',                   // 关键词搜索
  sort: 'created|updated|priority',    // 排序方式
  order: 'asc|desc',                   // 排序顺序
  page: 1,                             // 页码
  limit: 20                            // 每页数量
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "id": 1,
        "issue_number": 1,
        "title": "添加用户认证功能",
        "type": "feature",
        "status": "open",
        "priority": "high",
        "author": {
          "id": 1,
          "name": "张三",
          "avatar": "/avatars/1.png"
        },
        "assignee": {
          "id": 2,
          "name": "李四",
          "avatar": "/avatars/2.png"
        },
        "labels": [
          {"id": 1, "name": "enhancement", "color": "#84CC16"},
          {"id": 2, "name": "backend", "color": "#3B82F6"}
        ],
        "milestone": {
          "id": 1,
          "title": "v1.0",
          "progress": 65
        },
        "comment_count": 5,
        "created_at": "2024-03-02T10:00:00Z",
        "updated_at": "2024-03-02T15:30:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "pages": 8,
      "limit": 20
    }
  }
}
```

#### 2. 获取 Issue 详情
```http
GET /api/issues/:issue_number
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "issue_number": 1,
    "title": "添加用户认证功能",
    "description": "## 需求描述\n\n需要实现基于 JWT 的用户认证...",
    "type": "feature",
    "status": "in_progress",
    "priority": "high",
    "author": {
      "id": 1,
      "name": "张三",
      "avatar": "/avatars/1.png"
    },
    "assignee": {
      "id": 2,
      "name": "李四",
      "avatar": "/avatars/2.png"
    },
    "labels": [
      {"id": 1, "name": "enhancement", "color": "#84CC16"},
      {"id": 2, "name": "backend", "color": "#3B82F6"}
    ],
    "milestone": {
      "id": 1,
      "title": "v1.0",
      "description": "第一个正式版本",
      "due_date": "2024-04-01",
      "progress": 65
    },
    "estimated_hours": 8,
    "actual_hours": 5.5,
    "due_date": "2024-03-15",
    "watchers": [
      {"id": 3, "name": "王五", "avatar": "/avatars/3.png"}
    ],
    "parent_issue": null,
    "sub_issues": [],
    "attachments": [
      {
        "id": 1,
        "filename": "auth-flow.png",
        "file_size": 45678,
        "mime_type": "image/png",
        "url": "/uploads/issues/1/auth-flow.png"
      }
    ],
    "created_at": "2024-03-02T10:00:00Z",
    "updated_at": "2024-03-02T15:30:00Z"
  }
}
```

#### 3. 创建 Issue
```http
POST /api/issues
```

**请求体：**
```json
{
  "title": "添加用户认证功能",
  "description": "需要实现基于 JWT 的用户认证...",
  "type": "feature",
  "priority": "high",
  "assignee_id": 2,
  "label_ids": [1, 2],
  "milestone_id": 1,
  "estimated_hours": 8,
  "due_date": "2024-03-15",
  "template_id": 2
}
```

#### 4. 更新 Issue
```http
PUT /api/issues/:issue_number
```

**请求体：**
```json
{
  "title": "添加用户认证功能（JWT）",
  "status": "in_progress",
  "assignee_id": 3,
  "actual_hours": 5.5
}
```

#### 5. 关闭/重开 Issue
```http
POST /api/issues/:issue_number/close
POST /api/issues/:issue_number/reopen
```

### 评论管理 API

#### 6. 获取 Issue 评论
```http
GET /api/issues/:issue_number/comments
```

#### 7. 添加评论
```http
POST /api/issues/:issue_number/comments
```

**请求体：**
```json
{
  "content": "已经完成了认证模块的基础框架，明天开始实现具体功能。"
}
```

#### 8. 更新评论
```http
PUT /api/issues/:issue_number/comments/:comment_id
```

#### 9. 删除评论
```http
DELETE /api/issues/:issue_number/comments/:comment_id
```

### 标签管理 API

#### 10. 获取所有标签
```http
GET /api/labels
```

#### 11. 创建标签
```http
POST /api/labels
```

**请求体：**
```json
{
  "name": "bug",
  "color": "#FF0000",
  "description": "代码缺陷"
}
```

#### 12. 更新 Issue 标签
```http
PUT /api/issues/:issue_number/labels
```

**请求体：**
```json
{
  "label_ids": [1, 2, 3]
}
```

### 里程碑管理 API

#### 13. 获取里程碑列表
```http
GET /api/milestones
```

#### 14. 创建里程碑
```http
POST /api/milestones
```

**请求体：**
```json
{
  "title": "v1.0",
  "description": "第一个正式版本",
  "due_date": "2024-04-01"
}
```

#### 15. 获取里程碑统计
```http
GET /api/milestones/:id/stats
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "total_issues": 20,
    "open_issues": 7,
    "closed_issues": 13,
    "progress": 65,
    "estimated_hours": 160,
    "actual_hours": 120,
    "contributors": [
      {"id": 1, "name": "张三", "issues_count": 5},
      {"id": 2, "name": "李四", "issues_count": 8}
    ]
  }
}
```

### 活动流 API

#### 16. 获取 Issue 活动历史
```http
GET /api/issues/:issue_number/activities
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "created",
      "user": {"id": 1, "name": "张三"},
      "description": "创建了 Issue",
      "created_at": "2024-03-02T10:00:00Z"
    },
    {
      "id": 2,
      "type": "assigned",
      "user": {"id": 1, "name": "张三"},
      "description": "指派给 李四",
      "metadata": {
        "from": null,
        "to": {"id": 2, "name": "李四"}
      },
      "created_at": "2024-03-02T10:05:00Z"
    }
  ]
}
```

### 统计分析 API

#### 17. 获取 Issue 统计数据
```http
GET /api/issues/stats
```

**查询参数：**
```javascript
{
  range: '7d|30d|3m|1y',  // 时间范围
  group_by: 'status|priority|assignee|label'  // 分组方式
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 150,
      "open": 45,
      "in_progress": 20,
      "closed": 85
    },
    "trend": [
      {"date": "2024-02-26", "created": 5, "closed": 3},
      {"date": "2024-02-27", "created": 8, "closed": 6}
    ],
    "by_priority": {
      "urgent": 5,
      "high": 20,
      "medium": 60,
      "low": 65
    },
    "by_assignee": [
      {"user": "张三", "count": 15},
      {"user": "李四", "count": 12}
    ]
  }
}
```

## 🎨 前端实现设计

### 页面结构

#### 1. Issue 列表页面 (IssueList.vue)
```vue
<template>
  <div class="issue-list-container">
    <!-- 顶部工具栏 -->
    <div class="issue-toolbar">
      <div class="toolbar-left">
        <button class="btn-primary" @click="showCreateDialog">
          <icon name="plus" /> 新建 Issue
        </button>
        <button class="btn-secondary" @click="toggleView">
          <icon :name="viewMode === 'list' ? 'grid' : 'list'" />
          {{ viewMode === 'list' ? '看板视图' : '列表视图' }}
        </button>
      </div>
      <div class="toolbar-right">
        <IssueFilter v-model="filters" @change="loadIssues" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索 Issue..."
          class="search-input"
          @input="debounceSearch"
        />
      </div>
    </div>

    <!-- Issue 列表/看板 -->
    <div v-if="viewMode === 'list'" class="issue-list">
      <IssueCard
        v-for="issue in issues"
        :key="issue.id"
        :issue="issue"
        @click="openIssue(issue)"
      />
    </div>

    <IssueBoard
      v-else
      :issues="issues"
      @update="handleBoardUpdate"
    />

    <!-- 分页 -->
    <div class="pagination">
      <button
        :disabled="currentPage === 1"
        @click="changePage(currentPage - 1)"
      >
        上一页
      </button>
      <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button
        :disabled="currentPage === totalPages"
        @click="changePage(currentPage + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>
```

#### 2. Issue 详情页面 (IssueDetail.vue)
```vue
<template>
  <div class="issue-detail">
    <!-- Issue 标题 -->
    <div class="issue-header">
      <h1>
        <span class="issue-number">#{{ issue.issue_number }}</span>
        {{ issue.title }}
      </h1>
      <div class="issue-actions">
        <button @click="editIssue" class="btn-edit">
          <icon name="edit" /> 编辑
        </button>
        <button
          v-if="issue.status === 'open'"
          @click="closeIssue"
          class="btn-close"
        >
          <icon name="check" /> 关闭 Issue
        </button>
        <button
          v-else
          @click="reopenIssue"
          class="btn-reopen"
        >
          <icon name="refresh" /> 重新打开
        </button>
      </div>
    </div>

    <!-- Issue 元信息 -->
    <div class="issue-meta">
      <span class="status-badge" :class="issue.status">
        {{ getStatusText(issue.status) }}
      </span>
      <span class="author">
        <img :src="issue.author.avatar" class="avatar-small" />
        {{ issue.author.name }} 创建于 {{ formatDate(issue.created_at) }}
      </span>
      <span v-if="issue.updated_at !== issue.created_at" class="updated">
        最后更新于 {{ formatDate(issue.updated_at) }}
      </span>
    </div>

    <!-- 主体内容区 -->
    <div class="issue-content-wrapper">
      <!-- 左侧主要内容 -->
      <div class="issue-main">
        <!-- Issue 描述 -->
        <div class="issue-description">
          <div v-html="parseMarkdown(issue.description)"></div>
        </div>

        <!-- 附件 -->
        <div v-if="issue.attachments.length > 0" class="attachments">
          <h3>附件</h3>
          <div class="attachment-list">
            <a
              v-for="attachment in issue.attachments"
              :key="attachment.id"
              :href="attachment.url"
              class="attachment-item"
              target="_blank"
            >
              <icon name="paperclip" />
              {{ attachment.filename }}
              <span class="file-size">{{ formatFileSize(attachment.file_size) }}</span>
            </a>
          </div>
        </div>

        <!-- 活动时间线 -->
        <IssueTimeline :issue-id="issue.id" />

        <!-- 评论区 -->
        <div class="comments-section">
          <h3>评论 ({{ comments.length }})</h3>
          <CommentList :comments="comments" @edit="editComment" @delete="deleteComment" />
          <CommentEditor @submit="addComment" />
        </div>
      </div>

      <!-- 右侧边栏 -->
      <div class="issue-sidebar">
        <!-- 指派人 -->
        <div class="sidebar-section">
          <h4>指派给</h4>
          <AssigneeSelect
            v-model="issue.assignee_id"
            :users="availableUsers"
            @change="updateAssignee"
          />
        </div>

        <!-- 标签 -->
        <div class="sidebar-section">
          <h4>标签</h4>
          <LabelManager
            v-model="issue.labels"
            :available-labels="availableLabels"
            @change="updateLabels"
          />
        </div>

        <!-- 里程碑 -->
        <div class="sidebar-section">
          <h4>里程碑</h4>
          <select v-model="issue.milestone_id" @change="updateMilestone">
            <option :value="null">无里程碑</option>
            <option v-for="milestone in milestones" :key="milestone.id" :value="milestone.id">
              {{ milestone.title }}
            </option>
          </select>
          <div v-if="issue.milestone" class="milestone-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: issue.milestone.progress + '%' }"></div>
            </div>
            <span>{{ issue.milestone.progress }}% 完成</span>
          </div>
        </div>

        <!-- 优先级 -->
        <div class="sidebar-section">
          <h4>优先级</h4>
          <select v-model="issue.priority" @change="updatePriority">
            <option value="urgent">🔴 紧急</option>
            <option value="high">🟠 高</option>
            <option value="medium">🟡 中</option>
            <option value="low">🟢 低</option>
          </select>
        </div>

        <!-- 时间追踪 -->
        <div class="sidebar-section">
          <h4>时间追踪</h4>
          <div class="time-tracking">
            <div class="time-row">
              <span>预估：</span>
              <input
                v-model.number="issue.estimated_hours"
                type="number"
                step="0.5"
                min="0"
                @change="updateTimeEstimate"
              />
              <span>小时</span>
            </div>
            <div class="time-row">
              <span>实际：</span>
              <input
                v-model.number="issue.actual_hours"
                type="number"
                step="0.5"
                min="0"
                @change="updateActualTime"
              />
              <span>小时</span>
            </div>
          </div>
        </div>

        <!-- 关注者 -->
        <div class="sidebar-section">
          <h4>关注者 ({{ issue.watchers.length }})</h4>
          <div class="watchers">
            <img
              v-for="watcher in issue.watchers"
              :key="watcher.id"
              :src="watcher.avatar"
              :title="watcher.name"
              class="avatar-small"
            />
            <button @click="toggleWatch" class="btn-watch">
              {{ isWatching ? '取消关注' : '关注' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

#### 3. Issue 看板视图 (IssueBoard.vue)
```vue
<template>
  <div class="issue-board">
    <div class="board-columns">
      <!-- 待办列 -->
      <div class="board-column" data-status="open">
        <div class="column-header">
          <h3>待办 ({{ openIssues.length }})</h3>
        </div>
        <draggable
          v-model="openIssues"
          group="issues"
          class="column-content"
          @change="handleDragChange"
        >
          <IssueCard
            v-for="issue in openIssues"
            :key="issue.id"
            :issue="issue"
            :compact="true"
          />
        </draggable>
      </div>

      <!-- 进行中列 -->
      <div class="board-column" data-status="in_progress">
        <div class="column-header">
          <h3>进行中 ({{ inProgressIssues.length }})</h3>
        </div>
        <draggable
          v-model="inProgressIssues"
          group="issues"
          class="column-content"
          @change="handleDragChange"
        >
          <IssueCard
            v-for="issue in inProgressIssues"
            :key="issue.id"
            :issue="issue"
            :compact="true"
          />
        </draggable>
      </div>

      <!-- 已完成列 -->
      <div class="board-column" data-status="closed">
        <div class="column-header">
          <h3>已完成 ({{ closedIssues.length }})</h3>
        </div>
        <draggable
          v-model="closedIssues"
          group="issues"
          class="column-content"
          @change="handleDragChange"
        >
          <IssueCard
            v-for="issue in closedIssues"
            :key="issue.id"
            :issue="issue"
            :compact="true"
          />
        </draggable>
      </div>
    </div>
  </div>
</template>
```

### 关键组件设计

#### IssueCard 组件
```vue
<template>
  <div class="issue-card" :class="{ compact }" @click="$emit('click', issue)">
    <div class="card-header">
      <span class="issue-number">#{{ issue.issue_number }}</span>
      <span class="issue-type" :class="issue.type">
        <icon :name="getTypeIcon(issue.type)" />
      </span>
      <span class="priority-indicator" :class="issue.priority">
        {{ getPrioritySymbol(issue.priority) }}
      </span>
    </div>

    <h4 class="issue-title">{{ issue.title }}</h4>

    <div class="issue-labels">
      <span
        v-for="label in issue.labels"
        :key="label.id"
        class="label"
        :style="{ backgroundColor: label.color }"
      >
        {{ label.name }}
      </span>
    </div>

    <div class="card-footer">
      <img
        v-if="issue.assignee"
        :src="issue.assignee.avatar"
        :title="issue.assignee.name"
        class="avatar-tiny"
      />
      <span class="comment-count">
        <icon name="message" /> {{ issue.comment_count }}
      </span>
      <span class="updated-time">{{ formatRelativeTime(issue.updated_at) }}</span>
    </div>
  </div>
</template>
```

## 📝 使用指南

### 创建 Issue

1. **点击"新建 Issue"按钮**
   - 位于列表页面顶部
   - 快捷键：`Ctrl + I`

2. **选择 Issue 模板（可选）**
   - Bug 报告
   - 功能请求
   - 任务
   - 自定义

3. **填写 Issue 信息**
   - 标题（必填）
   - 描述（支持 Markdown）
   - 类型选择
   - 优先级设置
   - 指派人选择
   - 标签添加
   - 里程碑关联

4. **上传附件（可选）**
   - 支持拖拽上传
   - 支持粘贴图片
   - 最大 10MB/文件

5. **提交创建**
   - 点击"创建 Issue"
   - 自动跳转到详情页

### 管理 Issue

#### 状态流转
```
开放 (Open) → 进行中 (In Progress) → 已解决 (Resolved) → 已关闭 (Closed)
                ↑                                              ↓
                └──────────── 重新打开 (Reopened) ←────────────┘
```

#### 批量操作
1. 选择多个 Issue（Shift/Ctrl + 点击）
2. 点击"批量操作"
3. 选择操作类型：
   - 批量关闭
   - 批量分配
   - 批量添加标签
   - 批量更改优先级

### 使用看板视图

1. **切换到看板视图**
   - 点击视图切换按钮
   - 快捷键：`V`

2. **拖拽管理**
   - 拖动卡片到不同列改变状态
   - 按住 Ctrl 拖动复制 Issue

3. **快速筛选**
   - 点击列标题筛选该状态
   - 使用泳道按标签分组

### 高级搜索

#### 搜索语法
```
assignee:@me                    # 分配给我的
author:张三                     # 张三创建的
label:bug                       # 带有 bug 标签的
milestone:v1.0                  # v1.0 里程碑的
priority:high                   # 高优先级的
status:open                     # 开放状态的
created:>2024-03-01            # 3月1日后创建的
updated:<2024-03-01            # 3月1日前更新的
has:attachment                  # 有附件的
no:assignee                    # 未分配的
```

#### 组合搜索
```
assignee:@me status:open priority:high
label:bug milestone:v1.0 -status:closed
```

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + I` | 新建 Issue |
| `Ctrl + /` | 聚焦搜索框 |
| `V` | 切换视图 |
| `L` | 打开标签管理 |
| `M` | 打开里程碑 |
| `G I` | 跳转到 Issue 列表 |
| `G B` | 跳转到看板 |
| `?` | 显示快捷键帮助 |

## 🔧 故障排除

### 问题 1: Issue 创建失败

**症状：**
- 提交后显示错误提示
- 页面无响应

**可能原因：**
1. 网络连接问题
2. 必填字段未填写
3. 权限不足
4. 服务器错误

**解决方案：**
1. 检查网络连接
2. 确认标题已填写
3. 确认有创建权限
4. 查看控制台错误信息
5. 联系管理员

### 问题 2: 拖拽功能不工作

**症状：**
- 无法拖动 Issue 卡片
- 拖动后位置不改变

**解决方案：**
1. 刷新页面
2. 清除浏览器缓存
3. 检查浏览器兼容性
4. 确认有编辑权限

### 问题 3: 搜索结果不准确

**症状：**
- 搜索不到已知 Issue
- 搜索结果包含无关内容

**解决方案：**
1. 检查搜索语法
2. 使用精确匹配（加引号）
3. 尝试不同关键词
4. 重建搜索索引（管理员）

### 问题 4: 实时更新不生效

**症状：**
- 其他用户的更改不显示
- 需要手动刷新

**解决方案：**
1. 检查 WebSocket 连接状态
2. 查看浏览器控制台
3. 检查防火墙设置
4. 尝试不同浏览器

## ⚡ 性能优化

### 前端优化

1. **虚拟滚动**
   - Issue 列表超过 100 条时启用
   - 只渲染可见区域

2. **懒加载**
   - 图片和附件按需加载
   - 评论分页加载

3. **缓存策略**
   - localStorage 缓存用户偏好
   - IndexedDB 缓存 Issue 数据
   - Service Worker 离线支持

4. **优化渲染**
   - 使用 `v-show` 替代 `v-if`
   - 合理使用 `key`
   - 防抖搜索输入

### 后端优化

1. **数据库优化**
   - 添加合适索引
   - 使用查询缓存
   - 分页查询

2. **API 优化**
   - 响应压缩（gzip）
   - 字段按需返回
   - 批量操作接口

3. **缓存策略**
   - Redis 缓存热点数据
   - HTTP 缓存头设置
   - CDN 静态资源

### 性能指标

| 指标 | 目标值 | 当前值 |
|------|--------|--------|
| 首屏加载 | < 1.5s | 1.2s |
| API 响应 | < 200ms | 150ms |
| 搜索响应 | < 500ms | 350ms |
| 页面切换 | < 100ms | 80ms |

## 🧪 测试清单

### 功能测试

- [ ] ✅ Issue CRUD 操作正常
- [ ] ✅ 评论功能正常
- [ ] ✅ 标签管理正常
- [ ] ✅ 里程碑功能正常
- [ ] ✅ 搜索筛选正常
- [ ] ✅ 拖拽功能正常
- [ ] ✅ 批量操作正常
- [ ] ✅ 实时更新正常
- [ ] ✅ 附件上传正常
- [ ] ✅ 权限控制正常

### 兼容性测试

- [ ] ✅ Chrome 90+
- [ ] ✅ Firefox 88+
- [ ] ✅ Safari 14+
- [ ] ✅ Edge 90+
- [ ] ✅ 移动端浏览器

### 性能测试

- [ ] ✅ 1000+ Issue 列表流畅
- [ ] ✅ 100+ 并发用户正常
- [ ] ✅ 大文件上传正常
- [ ] ✅ 长时间运行稳定

### 安全测试

- [ ] ✅ XSS 防护
- [ ] ✅ SQL 注入防护
- [ ] ✅ CSRF 防护
- [ ] ✅ 权限验证

## 🚀 部署指南

### 环境要求

- Node.js 18+
- MySQL 5.7+
- Redis 6+（可选）
- 2GB+ RAM
- 10GB+ 磁盘空间

### 部署步骤

1. **数据库初始化**
```bash
mysql -u root -p < sql/init.sql
mysql -u root -p < sql/issue_tables.sql
```

2. **后端配置**
```bash
cd server
cp .env.example .env
# 编辑 .env 配置数据库连接等
npm install
npm run migrate
```

3. **前端构建**
```bash
cd client
npm install
npm run build
```

4. **启动服务**
```bash
# 开发环境
npm run dev

# 生产环境
npm run start

# 使用 PM2
pm2 start ecosystem.config.js
```

### 环境变量配置

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=issue_tracker
DB_USER=root
DB_PASSWORD=password

# Redis 配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 文件上传
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# WebSocket
WS_PORT=3001

# 邮件通知（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

## 🔐 安全考虑

### 认证与授权

1. **JWT Token 认证**
   - Access Token（15分钟）
   - Refresh Token（7天）
   - Token 黑名单机制

2. **基于角色的权限控制（RBAC）**
   - 管理员：所有权限
   - 开发者：创建、编辑、关闭
   - 测试员：创建、评论
   - 访客：只读

3. **API 速率限制**
   - 每分钟 60 次请求
   - 登录尝试限制

### 数据安全

1. **输入验证**
   - 参数类型检查
   - 长度限制
   - 特殊字符过滤

2. **SQL 注入防护**
   - 参数化查询
   - ORM 使用

3. **XSS 防护**
   - 内容转义
   - CSP 头设置

4. **文件上传安全**
   - 文件类型白名单
   - 文件大小限制
   - 病毒扫描（可选）

## 📈 监控与分析

### 性能监控

1. **应用性能监控（APM）**
   - 响应时间追踪
   - 错误率统计
   - 资源使用率

2. **用户行为分析**
   - 页面访问统计
   - 功能使用频率
   - 用户路径分析

3. **业务指标**
   - Issue 创建/关闭趋势
   - 平均解决时间
   - 团队工作量分布

### 告警规则

| 指标 | 阈值 | 告警级别 |
|------|------|---------|
| API 错误率 | > 1% | 警告 |
| 响应时间 | > 1s | 警告 |
| 内存使用 | > 80% | 严重 |
| 磁盘空间 | < 1GB | 严重 |

## 🔄 后续扩展

### 计划功能

1. **第二阶段**
   - GitHub/GitLab 集成
   - CI/CD 集成
   - 代码关联
   - PR/MR 联动

2. **第三阶段**
   - AI 智能分类
   - 自动分配
   - 工作流引擎
   - 自定义字段

3. **第四阶段**
   - 移动端 APP
   - 桌面客户端
   - 第三方集成
   - 插件系统

### 集成建议

1. **版本控制集成**
   - Git commit 关联
   - 分支管理
   - 代码审查

2. **通讯工具集成**
   - 钉钉/企业微信
   - Slack/Teams
   - 邮件通知

3. **项目管理集成**
   - Jira 同步
   - Trello 卡片
   - 甘特图

## 📚 相关文档

- [API 接口文档](./API_DOCUMENTATION.md)
- [数据库设计文档](./DATABASE_DESIGN.md)
- [前端组件文档](./COMPONENT_GUIDE.md)
- [部署运维手册](./DEPLOYMENT_GUIDE.md)
- [用户使用手册](./USER_MANUAL.md)

---

**文档版本**: 1.0
**创建日期**: 2026-03-02
**最后更新**: 2026-03-02
**作者**: Claude Assistant

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)