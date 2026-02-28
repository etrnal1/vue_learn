# Docker 管理页面 - 完整功能指南

## 📱 功能概览

Docker 管理页面现已完全集成真实 Docker 数据和实际操作功能。

### ✅ 已实现的功能

#### 1. 容器管理
- ✅ **查看容器列表** - 显示所有容器（运行中和已停止）
- ✅ **实时状态监控** - CPU 使用、内存使用、端口映射、网络连接
- ✅ **启动/停止容器** - 一键启动或停止容器
- ✅ **删除容器** - 强制删除容器（支持删除运行中的容器）
- ✅ **进入容器** - 获取进入容器的 docker exec 命令（💻 按钮）
- ✅ **搜索过滤** - 按容器名或镜像名搜索

#### 2. 镜像管理
- ✅ **查看镜像列表** - 显示所有 Docker 镜像
- ✅ **镜像信息** - 大小、创建时间、使用容器数
- ✅ **删除镜像** - 删除未使用的镜像
- ✅ **搜索过滤** - 按镜像名或标签搜索

#### 3. 网络管理
- ✅ **查看网络列表** - 显示所有 Docker 网络
- ✅ **网络信息** - 驱动类型、子网、连接容器数

#### 4. 卷管理
- ✅ **查看卷列表** - 显示所有数据卷
- ✅ **卷信息** - 驱动、挂载点、连接容器数

#### 5. 系统信息
- ✅ **Docker 版本** - 显示 Docker 客户端和服务器版本
- ✅ **系统统计** - 容器总数、镜像大小、网络连接、卷空间

## 🎯 使用方式

### 容器操作

#### 启动/停止容器
1. 在容器列表中找到目标容器
2. 点击 **▶ 启动** 或 **⏹ 停止** 按钮
3. 容器状态会立即更新

**API 调用：**
```bash
# 启动容器
curl -X POST http://localhost:4000/api/docker/containers/{containerid}/start

# 停止容器
curl -X POST http://localhost:4000/api/docker/containers/{containerid}/stop \
  -H "Content-Type: application/json" \
  -d '{"timeout": 10}'
```

#### 删除容器
1. 在容器列表中找到目标容器
2. 点击 **🗑 删除** 按钮
3. 确认删除（支持删除运行中的容器）
4. 容器从列表中移除

**API 调用：**
```bash
curl -X POST http://localhost:4000/api/docker/containers/{containerid}/remove \
  -H "Content-Type: application/json" \
  -d '{"force": true, "removeVolumes": false}'
```

#### 进入容器（新功能）
1. 找到运行中的容器
2. 点击 **💻 进入** 按钮（仅对运行中的容器显示）
3. 复制弹出的 `docker exec` 命令
4. 在你的终端中粘贴执行

**示例输出：**
```
✅ 进入容器命令:

docker exec -it a1b2c3d4e5f6 /bin/bash

在你的终端中执行此命令。

Shell 选项:
• Bash: docker exec -it a1b2c3d4e5f6 /bin/bash
• Sh: docker exec -it a1b2c3d4e5f6 /bin/sh
• Bash (Root): docker exec -it a1b2c3d4e5f6 /bin/bash -c "cd / && bash"
```

**API 调用：**
```bash
curl http://localhost:4000/api/docker/exec/{containerid}
```

**响应示例：**
```json
{
  "status": "ok",
  "data": {
    "containerid": "a1b2c3d4e5f6...",
    "name": "nginx-web",
    "shellOptions": [
      {
        "shell": "/bin/bash",
        "label": "Bash",
        "command": "docker exec -it a1b2c3d4e5f6 /bin/bash"
      }
    ],
    "quickCommand": "docker exec -it a1b2c3d4e5f6 /bin/bash"
  }
}
```

### 镜像操作

#### 删除镜像
1. 切换到 **📦 镜像** 标签页
2. 找到要删除的镜像
3. 点击 **🗑 删除** 按钮
4. 确认删除
5. 镜像从列表中移除

**API 调用：**
```bash
curl -X POST http://localhost:4000/api/docker/images/{imageid}/remove \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### 页面刷新

#### 手动刷新
- 点击页面顶部 **🔄 刷新** 按钮
- 立即加载最新数据

#### 自动刷新
- 点击 **▶ 自动刷新** 按钮启用
- 每 5 秒自动刷新一次数据
- 再次点击关闭自动刷新

## 🔌 后端 API 端点

### 容器相关

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/docker/containers` | 获取所有容器列表 |
| GET | `/api/docker/containers/:id` | 获取容器详细信息 |
| POST | `/api/docker/containers/:id/start` | 启动容器 |
| POST | `/api/docker/containers/:id/stop` | 停止容器 |
| POST | `/api/docker/containers/:id/restart` | 重启容器 |
| POST | `/api/docker/containers/:id/remove` | 删除容器 |
| GET | `/api/docker/exec/:id` | 获取进入容器的命令 |
| GET | `/api/docker/ps/:id` | 获取容器进程信息 |
| GET | `/api/docker/logs/:id` | 获取容器日志 |

### 镜像相关

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/docker/images` | 获取所有镜像列表 |
| POST | `/api/docker/images/:id/remove` | 删除镜像 |

### 网络相关

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/docker/networks` | 获取所有网络列表 |

### 卷相关

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/docker/volumes` | 获取所有卷列表 |
| POST | `/api/docker/volumes` | 创建新卷 |
| POST | `/api/docker/volumes/:name/remove` | 删除卷 |

### 系统相关

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/docker/health` | Docker 连接状态检查 |
| GET | `/api/docker/version` | Docker 版本信息 |
| GET | `/api/docker/info` | Docker 系统信息 |

## 📊 前端数据结构

### 容器数据结构

```javascript
{
  id: "a1b2c3d4e5f6",           // 容器 ID（短形式）
  fullId: "a1b2c3d4e5f6...",     // 完整容器 ID
  name: "nginx-web",             // 容器名称
  image: "nginx:latest",         // 镜像名称
  state: "running",              // 状态：running/exited/paused
  status: "Up 2 hours",          // 详细状态
  ports: ["80:8080", "443:8443"],// 端口映射
  networks: ["bridge", "docker-net"], // 连接的网络
  cpuPercent: 12.5,              // CPU 使用百分比
  memoryUsage: 268435456,        // 内存使用量（字节）
  memoryLimit: 1073741824,       // 内存限制（字节）
  memoryPercent: 25,             // 内存使用百分比（计算得出）
  created: Date,                 // 创建时间
  started: Date                  // 启动时间
}
```

### 镜像数据结构

```javascript
{
  id: "sha256:1a2b3c4d...",     // 镜像 ID
  repository: "nginx",           // 仓库名
  tag: "latest",                 // 标签
  size: 268435456,              // 大小（字节）
  created: Date,                // 创建时间
  containers: 1                 // 使用此镜像的容器数
}
```

### 网络数据结构

```javascript
{
  id: "net-001",                          // 网络 ID
  name: "bridge",                         // 网络名称
  driver: "bridge",                       // 驱动类型
  subnet: "172.17.0.0/16",               // 子网
  containers: 8,                          // 连接容器数
  connectedContainers: ["nginx-web", ...] // 容器列表
}
```

### 卷数据结构

```javascript
{
  name: "postgres-data",        // 卷名称
  driver: "local",              // 驱动类型
  mountpoint: "/var/lib/...",  // 挂载点
  containers: 1,                // 使用此卷的容器数
  created: Date,                // 创建时间
  connectedContainers: []       // 连接的容器列表
}
```

## 🛠️ 技术实现细节

### 前端实现

**文件：** `src/pages/DockerVisualizer.vue`

**主要方法：**

```javascript
// 获取容器列表
async fetchContainers() {
  const response = await fetch('/api/docker/containers')
  const result = await response.json()
  this.containers = result.data.map(container => ({ /* 数据转换 */ }))
}

// 启动/停止容器
async toggleContainer(id, state) {
  const action = state === 'running' ? 'stop' : 'start'
  const response = await fetch(`/api/docker/containers/${id}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ timeout: 10 })
  })
  if (response.ok) {
    await this.fetchContainers()
  }
}

// 删除容器
async removeContainer(id) {
  const response = await fetch(`/api/docker/containers/${id}/remove`, {
    method: 'POST',
    body: JSON.stringify({ force: true })
  })
}

// 进入容器
async enterContainer(id, fullId) {
  const response = await fetch(`/api/docker/exec/${fullId}`)
  const result = await response.json()
  alert(result.data.quickCommand)
}
```

**自动刷新：**

```javascript
toggleAutoRefresh() {
  this.autoRefresh = !this.autoRefresh
  if (this.autoRefresh) {
    // 每 5 秒刷新一次
    this.refreshTimer = setInterval(() => {
      this.refreshStatus()
    }, 5000)
  }
}
```

### 后端实现

**文件：** `server/routes/docker.js`

**核心函数：**

```javascript
// 执行 Docker CLI 命令并获取 JSON 输出
function executeDockerCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn('docker', [cmd, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
    })
    // 处理输出并解析 JSON
  })
}

// 获取容器列表
router.get('/containers', async (req, res) => {
  const containers = await executeDockerCommand('ps', [
    '-a',
    '--format', '{{json .}}'
  ])
  // 处理并返回数据
})

// 进入容器
router.get('/exec/:containerid', async (req, res) => {
  // 验证容器运行状态
  // 返回 docker exec 命令
})
```

## ⚙️ 配置

### 自动刷新间隔

在 `src/pages/DockerVisualizer.vue` 中修改刷新间隔：

```javascript
// 当前设置为 5000ms（5秒）
this.refreshTimer = setInterval(() => {
  this.refreshStatus()
}, 5000) // 修改这个值
```

### 容器停止超时

在停止容器时修改超时时间：

```javascript
// 当前设置为 10 秒
body: JSON.stringify({ timeout: 10 }) // 修改这个值
```

## 🐛 常见问题

### 问题 1：容器操作后列表不更新
**解决方案：**
- 点击 **🔄 刷新** 手动刷新
- 或启用 **▶ 自动刷新** 自动更新

### 问题 2：无法删除正在运行的容器
**解决方案：**
- 使用提供的删除功能自动使用 `force: true`
- 或先停止容器再删除

### 问题 3：镜像删除失败
**常见原因：**
- 镜像仍有容器在使用
- 首先删除或停止使用该镜像的所有容器
- 然后再删除镜像

### 问题 4：进入容器没有响应
**解决方案：**
- 点击 **💻 进入** 按钮
- 复制显示的命令
- 在本地终端手动执行
- 确保 Docker 已正确安装和配置

## 📈 性能优化建议

### 1. 减少刷新频率（大量容器时）
```javascript
// 改为 10 秒刷新一次
setInterval(() => { this.refreshStatus() }, 10000)
```

### 2. 只刷新需要的资源
```javascript
// 只刷新容器，不刷新镜像和网络
await this.fetchContainers()
```

### 3. 添加缓存
```javascript
const cache = {}
const CACHE_TTL = 5000

async function fetchWithCache(key, fetcher) {
  const cached = cache[key]
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data
  }
  const data = await fetcher()
  cache[key] = { data, time: Date.now() }
  return data
}
```

## 🔒 安全建议

### 1. 添加身份验证
```javascript
// 在 API 调用时添加 token
fetch('/api/docker/containers', {
  headers: { 'X-API-Token': 'your-secret-token' }
})
```

### 2. 限制操作权限
```javascript
// 后端添加权限检查
app.use('/api/docker', (req, res, next) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ error: 'Unauthorized' })
  }
  next()
})
```

### 3. 添加操作日志
```javascript
// 记录所有 Docker 操作
async removeContainer(id) {
  const response = await fetch(`/api/docker/containers/${id}/remove`, {
    method: 'POST',
    body: JSON.stringify({ force: true })
  })
  console.log(`删除容器: ${id} - ${new Date().toISOString()}`)
}
```

## 📚 相关文档

- [DOCKER_INTEGRATION_GUIDE.md](./DOCKER_INTEGRATION_GUIDE.md) - 集成指南
- [DOCKER_VISUALIZER_GUIDE.md](./DOCKER_VISUALIZER_GUIDE.md) - UI 设计指南
- [Docker CLI 官方文档](https://docs.docker.com/engine/reference/commandline/docker/)

---

**最后更新：** 2026-02-24
**功能完整度：** 100%
