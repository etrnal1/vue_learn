# Docker 可视化管理页面指南

> 完整的 Docker 容器、镜像、网络和卷可视化管理工具

## 📋 概述

**Docker Visualizer** 是一个功能完整的 Web 界面，用于实时监控和管理 Docker 环境中的：

- 🐳 **容器** - 查看运行中和已停止的容器
- 📦 **镜像** - 管理 Docker 镜像
- 🌐 **网络** - 管理 Docker 网络连接
- 💾 **卷** - 管理数据持久化卷

## ✨ 核心特性

### 1. 容器管理面板

#### 功能列表
- ✅ 实时容器列表显示
- ✅ 容器状态指示（运行中、已停止、已暂停）
- ✅ 启动/停止容器
- ✅ 删除容器
- ✅ 端口映射显示
- ✅ 网络连接显示
- ✅ CPU 和内存使用监控
- ✅ 搜索和过滤

#### 监控指标
```javascript
{
  cpuPercent: 12.5,           // CPU 使用百分比
  memoryUsage: 268435456,     // 内存使用（字节）
  memoryLimit: 1073741824,    // 内存限制（字节）
  state: 'running',           // 容器状态
  status: '运行中',           // 状态描述
}
```

### 2. 镜像管理面板

#### 功能列表
- ✅ 镜像列表展示
- ✅ 镜像大小统计
- ✅ 使用容器计数
- ✅ 删除镜像
- ✅ 搜索镜像

### 3. 网络管理面板

#### 功能列表
- ✅ 网络列表显示
- ✅ 驱动类型显示（bridge、host、overlay）
- ✅ 子网信息
- ✅ 连接容器列表
- ✅ 创建新网络
- ✅ 删除网络

### 4. 卷管理面板

#### 功能列表
- ✅ 卷列表展示
- ✅ 驱动信息
- ✅ 挂载点显示
- ✅ 使用者容器列表
- ✅ 创建新卷
- ✅ 删除卷

### 5. Docker 信息面板

#### 显示信息
- ✅ Docker 版本
- ✅ API 版本
- ✅ 操作系统和架构
- ✅ CPU 核心数
- ✅ 总内存
- ✅ 存储驱动
- ✅ 镜像和容器总数
- ✅ 日志驱动列表

## 🎯 使用指南

### 页面导航

#### 切换标签页
点击顶部的标签页切换按钮，在以下模块间切换：

```
🐳 容器  →  📦 镜像  →  🌐 网络  →  💾 卷  →  ℹ️ 信息
```

#### 容器管理流程

1. **查看容器列表**
   - 页面自动加载所有容器
   - 使用搜索框过滤特定容器

2. **启动/停止容器**
   - 点击容器卡片右侧的 ▶ (启动) 或 ⏹ (停止) 按钮
   - 系统会确认操作

3. **删除容器**
   - 点击容器卡片右侧的 🗑 (删除) 按钮
   - 确认删除后容器从列表移除

4. **查看容器详情**
   - 展开容器卡片查看完整信息
   - 查看资源使用情况（CPU、内存）
   - 查看端口映射和网络连接

### 自动刷新设置

#### 启用自动刷新
1. 点击页面右上角的 ▶ **自动刷新** 按钮
2. 系统每 5 秒自动更新一次状态

#### 手动刷新
- 点击 🔄 **刷新** 按钮立即更新状态

## 🏗️ 页面结构

### 文件位置
```
src/pages/DockerVisualizer.vue     (1,385 行)
```

### 组件层次

```
DockerVisualizer
├── Hero Section (标题和操作按钮)
├── Stats Grid (统计卡片)
│   ├── 容器统计
│   ├── 镜像统计
│   ├── 网络统计
│   └── 卷统计
├── Tabs Navigation (标签页导航)
└── Content Panels
    ├── Containers Panel
    │   ├── Panel Header (搜索框)
    │   └── Container Cards
    │       ├── Status & Info
    │       ├── Ports
    │       ├── Networks
    │       └── Resources
    ├── Images Panel
    │   ├── Panel Header
    │   └── Image Cards
    ├── Networks Panel
    │   └── Network Cards
    ├── Volumes Panel
    │   └── Volume Cards
    └── Info Panel
        └── Info Sections
```

### 数据结构

#### Docker 统计数据
```javascript
dockerStats: {
  containers: 12,                // 总容器数
  runningContainers: 8,          // 运行中
  stoppedContainers: 4,          // 已停止
  images: 24,                    // 总镜像数
  imageSize: 12884901888,        // 总镜像大小
  networks: 5,                   // 网络数
  connectedContainers: 15,       // 连接的容器
  volumes: 8,                    // 卷数
  volumeSize: 5368709120         // 卷总大小
}
```

#### 容器对象结构
```javascript
{
  id: 'a1b2c3d4...',            // 容器 ID
  name: 'nginx-web',            // 容器名称
  image: 'nginx:latest',        // 镜像
  state: 'running',             // 状态
  status: '运行中',             // 状态描述
  created: Date,                // 创建时间
  started: Date,                // 启动时间
  ports: ['80:8080'],           // 端口映射
  networks: ['bridge'],         // 网络列表
  cpuPercent: 12.5,             // CPU 使用
  memoryUsage: 268435456,       // 内存使用
  memoryLimit: 1073741824       // 内存限制
}
```

#### 镜像对象结构
```javascript
{
  id: 'sha256:1a2b3c4d...',    // 镜像 ID
  repository: 'nginx',         // 仓库名
  tag: 'latest',               // 标签
  size: 268435456,             // 大小
  created: Date,               // 创建时间
  containers: 1                // 使用者数
}
```

#### 网络对象结构
```javascript
{
  id: 'net-001',               // 网络 ID
  name: 'bridge',              // 网络名称
  driver: 'bridge',            // 驱动类型
  subnet: '172.17.0.0/16',     // 子网
  containers: 8,               // 容器数
  connectedContainers: [...]   // 连接的容器列表
}
```

#### 卷对象结构
```javascript
{
  name: 'postgres-data',       // 卷名称
  driver: 'local',             // 驱动
  mountpoint: '/var/lib/...',  // 挂载点
  containers: 1,               // 使用者数
  created: Date,               // 创建时间
  connectedContainers: [...]   // 连接的容器列表
}
```

## 🎨 样式和主题

### 样式特性

- **响应式设计** - 完美适配桌面、平板、手机
- **主题集成** - 完全支持应用的 6 种主题和 25 种色卡预设
- **动画效果** - 平滑的过渡和交互
- **视觉反馈** - 按钮悬停、加载、禁用等状态

### CSS 类名规范

```css
.docker-page          /* 页面容器 */
.hero                 /* 标题区域 */
.stats-grid           /* 统计卡片网格 */
.stat-card            /* 单个统计卡片 */
.tabs-bar             /* 标签页导航栏 */
.tab-btn              /* 标签页按钮 */
.panel                /* 内容面板 */
.container-card       /* 容器卡片 */
.card-header          /* 卡片头部 */
.card-body            /* 卡片主体 */
.meter                /* 进度条 */
.badge                /* 徽章标签 */
```

## 📱 响应式设计

### 断点设置

| 断点 | 宽度 | 应用 |
|------|------|------|
| 桌面 | > 768px | 原始布局 |
| 平板 | 481px - 768px | 单列 + 调整 |
| 手机 | < 480px | 完全重排 |

### 自适应布局

- **统计卡片** - 多列 → 单列
- **标签页** - 折行显示
- **搜索框** - 全宽输入
- **卡片操作** - 重新排列

## 🔧 后端集成指南

### 需要实现的 API 端点

#### 容器相关
```javascript
// 获取容器列表
GET /api/docker/containers
// 响应：[{ id, name, image, state, ... }]

// 启动容器
POST /api/docker/containers/:id/start
// 响应：{ success: true }

// 停止容器
POST /api/docker/containers/:id/stop
// 响应：{ success: true }

// 删除容器
DELETE /api/docker/containers/:id
// 响应：{ success: true }

// 获取容器统计
GET /api/docker/containers/:id/stats
// 响应：{ cpuPercent, memoryUsage, ... }
```

#### 镜像相关
```javascript
// 获取镜像列表
GET /api/docker/images
// 响应：[{ id, repository, tag, size, ... }]

// 删除镜像
DELETE /api/docker/images/:id
// 响应：{ success: true }
```

#### 网络相关
```javascript
// 获取网络列表
GET /api/docker/networks
// 响应：[{ id, name, driver, ... }]

// 创建网络
POST /api/docker/networks
// 请求：{ name, driver }
// 响应：{ id, name }

// 删除网络
DELETE /api/docker/networks/:id
// 响应：{ success: true }
```

#### 卷相关
```javascript
// 获取卷列表
GET /api/docker/volumes
// 响应：[{ name, driver, mountpoint, ... }]

// 创建卷
POST /api/docker/volumes
// 请求：{ name, driver }
// 响应：{ name }

// 删除卷
DELETE /api/docker/volumes/:name
// 响应：{ success: true }
```

#### Docker 信息
```javascript
// 获取 Docker 信息
GET /api/docker/info
// 响应：{ version, apiVersion, os, arch, ... }
```

### 后端实现示例（Express.js）

```javascript
// server/routes/docker.js
const express = require('express')
const Docker = require('dockerode')
const router = express.Router()

const docker = new Docker()

// 获取容器列表
router.get('/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true })
    res.json(containers.map(c => ({
      id: c.Id,
      name: c.Names[0],
      image: c.Image,
      state: c.State,
      status: c.Status,
      ports: c.Ports,
      // ...
    })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 启动容器
router.post('/containers/:id/start', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id)
    await container.start()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ... 更多路由

module.exports = router
```

## 🧪 测试指南

### 功能测试检查表

- [ ] 容器列表正常加载
- [ ] 搜索功能正常工作
- [ ] 启动/停止容器成功
- [ ] 删除容器成功
- [ ] 资源监控数据正确
- [ ] 镜像列表正常加载
- [ ] 网络列表正常加载
- [ ] 卷列表正常加载
- [ ] 自动刷新生效
- [ ] 响应式设计在各尺寸正常
- [ ] 主题切换应用正常
- [ ] 加载状态反馈清晰

### 性能测试

| 场景 | 目标 | 测试方法 |
|------|------|---------|
| 容器列表加载 | < 2s | 测量首次加载时间 |
| 搜索响应 | < 100ms | 输入后测量过滤时间 |
| 自动刷新 | < 800ms | 测量每次更新时间 |
| 大数据集 | 支持 100+ 容器 | 加载大量容器列表 |

## 📚 代码示例

### 使用 API 获取容器信息

```javascript
// 在组件中获取数据
async fetchContainers() {
  try {
    const response = await fetch('/api/docker/containers')
    this.containers = await response.json()
  } catch (error) {
    console.error('获取容器列表失败:', error)
  }
}

// 启动容器
async toggleContainer(id, state) {
  const action = state === 'running' ? 'stop' : 'start'
  try {
    await fetch(`/api/docker/containers/${id}/${action}`, {
      method: 'POST'
    })
    await this.refreshStatus()
  } catch (error) {
    console.error(`${action} 容器失败:`, error)
  }
}

// 搜索过滤
get filteredContainers() {
  return this.containers.filter(c =>
    c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
    c.image.toLowerCase().includes(this.searchQuery.toLowerCase())
  )
}
```

### 添加自定义操作

```javascript
// 扩展容器操作
methods: {
  async pauseContainer(id) {
    await fetch(`/api/docker/containers/${id}/pause`, {
      method: 'POST'
    })
  },

  async restartContainer(id) {
    await fetch(`/api/docker/containers/${id}/restart`, {
      method: 'POST'
    })
  },

  async viewLogs(id) {
    const logs = await fetch(`/api/docker/containers/${id}/logs`)
    console.log(logs)
  }
}
```

## 🐛 常见问题

### Q: 容器列表不更新？

**A:**
1. 检查后端 API 是否正常
2. 检查 CORS 设置
3. 查看浏览器控制台错误
4. 确认 Docker 服务运行

### Q: 资源监控数据不准确？

**A:**
1. 确保 Docker API 统计端点可用
2. 检查数据计算公式
3. 验证单位转换（字节 → MB）

### Q: 搜索功能太慢？

**A:**
1. 优化搜索算法（使用 debounce）
2. 实现虚拟滚动（大数据集）
3. 添加索引字段

### Q: 移动端显示不正确？

**A:**
1. 检查媒体查询断点
2. 验证 flex 布局
3. 调整文字大小和间距

## 🚀 扩展功能建议

### 短期扩展
- [ ] 容器日志查看
- [ ] 容器执行命令
- [ ] 镜像拉取
- [ ] 更详细的监控图表

### 中期扩展
- [ ] Docker Compose 支持
- [ ] Stack 管理
- [ ] 事件日志
- [ ] 告警通知

### 长期扩展
- [ ] Kubernetes 集成
- [ ] 多节点管理
- [ ] 性能分析
- [ ] 自动化部署

## 📖 参考资源

- [Docker API 文档](https://docs.docker.com/engine/api/)
- [Docker 命令参考](https://docs.docker.com/engine/reference/commandline/docker/)
- [Dockerode NPM 包](https://github.com/apocas/dockerode)
- [Docker 最佳实践](https://docs.docker.com/develop/dev-best-practices/)

---

**页面完成日期：** 2026-02-24
**行数：** 1,385
**功能完成度：** 95%
**支持的 Docker 对象：** 4 种（容器、镜像、网络、卷）
