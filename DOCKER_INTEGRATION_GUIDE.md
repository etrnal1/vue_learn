# Docker 真实数据集成指南

## 📋 概述

本指南介绍如何将 Docker 可视化页面（DockerVisualizer.vue）与真实的 Docker 守护进程集成，完全替换 mock 数据，实时获取和管理 Docker 资源。

## ✅ 集成状态

✅ **后端已完成：** Docker API 路由实现
✅ **Docker CLI 可用：** 已验证 Docker 27.3.1 安装
⏳ **前端集成待做：** 连接 Vue 组件到实际 API

## 🏗️ 技术架构

### 连接方式

当前实现使用 **Docker CLI（命令行）** 方式，优点：

- ✅ **零依赖**：无需安装额外的 npm 包（如 dockerode）
- ✅ **系统兼容**：支持所有 Docker 安装方式（官方、Colima、Docker Desktop 等）
- ✅ **完全特性支持**：Docker CLI 支持所有功能
- ✅ **安全**：不暴露 Docker Socket，使用标准命令行接口

### 其他可选方式

如果需要更高级特性，可以考虑：

| 方式 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **Docker CLI**（当前） | 零依赖，简单，安全 | 稍微慢一些 | 大多数场景 |
| **Dockerode NPM** | 高性能，流式处理 | 依赖额外包 | 实时监控，高频调用 |
| **Docker REST API** | 标准接口 | 需要手动 HTTP 调用 | 分布式环境 |

## 🔌 后端 API 接口

已在 `/api/docker` 路径下实现以下端点：

### 信息类 API

#### `GET /api/docker/health`
检查 Docker 守护进程连接状态

**响应：**
```json
{
  "status": "ok",
  "docker": "connected"
}
```

#### `GET /api/docker/version`
获取 Docker 版本信息

**响应：**
```json
{
  "status": "ok",
  "data": {
    "Client": { "Version": "27.3.1", ... },
    "Server": { "Version": "27.3.1", ... }
  }
}
```

#### `GET /api/docker/info`
获取 Docker 系统信息

**响应：**
```json
{
  "status": "ok",
  "data": {
    "Containers": 5,
    "ContainersRunning": 2,
    "ContainersPaused": 0,
    "ContainersStopped": 3,
    "Images": 12,
    ...
  }
}
```

### 容器管理 API

#### `GET /api/docker/containers`
获取所有容器列表（包括已停止的）

**查询参数：**
- 无

**响应：**
```json
{
  "status": "ok",
  "data": [
    {
      "ID": "a1b2c3d4e5f6...",
      "Names": ["/nginx-web"],
      "Image": "nginx:latest",
      "State": "running",
      "Status": "Up 2 hours",
      "Ports": "0.0.0.0:80->80/tcp",
      "Mounts": [],
      "stats": {
        "MemUsage": "268.4 MB",
        "MemLimit": "1 GB",
        "CPUPercent": "0.12%"
      }
    },
    ...
  ]
}
```

#### `GET /api/docker/containers/:id`
获取特定容器的详细信息（包括网络、挂载卷等）

**参数：**
- `id`：容器 ID 或容器名称

**响应：**
```json
{
  "status": "ok",
  "data": {
    "Id": "a1b2c3d4e5f6...",
    "Created": "2026-02-24T10:00:00Z",
    "Path": "/bin/nginx",
    "State": {
      "Status": "running",
      "Running": true,
      "Pid": 12345,
      "StartedAt": "2026-02-24T10:00:00Z",
      "FinishedAt": "0001-01-01T00:00:00Z"
    },
    "NetworkSettings": {
      "Networks": {
        "bridge": {
          "IPAddress": "172.17.0.2",
          "Gateway": "172.17.0.1",
          "Ports": { "80/tcp": [{ "HostIp": "0.0.0.0", "HostPort": "80" }] }
        }
      }
    },
    "Mounts": [
      {
        "Type": "volume",
        "Name": "nginx-data",
        "Source": "/var/lib/docker/volumes/nginx-data/_data",
        "Destination": "/usr/share/nginx/html"
      }
    ]
  }
}
```

#### `POST /api/docker/containers/:id/start`
启动已停止的容器

**参数：**
- `id`：容器 ID 或名称

**响应：**
```json
{
  "status": "ok",
  "message": "Container a1b2c3d4e5f6 started"
}
```

#### `POST /api/docker/containers/:id/stop`
停止运行的容器

**请求体：**
```json
{
  "timeout": 10
}
```

**响应：**
```json
{
  "status": "ok",
  "message": "Container a1b2c3d4e5f6 stopped"
}
```

#### `POST /api/docker/containers/:id/restart`
重启容器

**请求体：**
```json
{
  "timeout": 10
}
```

**响应：**
```json
{
  "status": "ok",
  "message": "Container a1b2c3d4e5f6 restarted"
}
```

#### `POST /api/docker/containers/:id/remove`
删除容器

**请求体：**
```json
{
  "force": false,
  "removeVolumes": false
}
```

**响应：**
```json
{
  "status": "ok",
  "message": "Container a1b2c3d4e5f6 removed"
}
```

#### `GET /api/docker/logs/:containerid`
获取容器日志

**查询参数：**
- `tail`：返回最后 N 行日志（默认 100）
- `timestamps`：是否包含时间戳（默认 false）

**响应：**
```json
{
  "status": "ok",
  "data": "172.17.0.1 - - [24/Feb/2026 10:00:00] \"GET / HTTP/1.1\" 200 612\n..."
}
```

### 镜像管理 API

#### `GET /api/docker/images`
获取所有 Docker 镜像列表

**响应：**
```json
{
  "status": "ok",
  "data": [
    {
      "Repository": "nginx",
      "Tag": "latest",
      "ID": "sha256:1a2b3c4d...",
      "Created": "2026-01-15",
      "Size": "268MB",
      "VirtualSize": "268MB"
    },
    ...
  ]
}
```

#### `POST /api/docker/images/:id/remove`
删除镜像

**请求体：**
```json
{
  "force": false
}
```

**响应：**
```json
{
  "status": "ok",
  "message": "Image sha256:1a2b3c4d removed"
}
```

### 网络管理 API

#### `GET /api/docker/networks`
获取所有 Docker 网络

**响应：**
```json
{
  "status": "ok",
  "data": [
    {
      "ID": "net-001",
      "Name": "bridge",
      "Driver": "bridge",
      "Scope": "local",
      "Containers": 2,
      "Options": {},
      "Labels": {}
    },
    ...
  ]
}
```

### 数据卷管理 API

#### `GET /api/docker/volumes`
获取所有 Docker 数据卷

**响应：**
```json
{
  "status": "ok",
  "data": [
    {
      "Name": "postgres-data",
      "Driver": "local",
      "Mountpoint": "/var/lib/docker/volumes/postgres-data/_data",
      "Labels": {},
      "Scope": "local"
    },
    ...
  ]
}
```

#### `POST /api/docker/volumes`
创建新的数据卷

**请求体：**
```json
{
  "name": "my-volume",
  "driver": "local",
  "driverOpts": {
    "type": "tmpfs",
    "device": "tmpfs"
  }
}
```

**响应：**
```json
{
  "status": "ok",
  "message": "Volume my-volume created"
}
```

#### `POST /api/docker/volumes/:name/remove`
删除数据卷

**请求体：**
```json
{
  "force": false
}
```

**响应：**
```json
{
  "status": "ok",
  "message": "Volume postgres-data removed"
}
```

## 🔄 前端集成步骤

### 第 1 步：替换 Mock 数据 API 调用

编辑 `src/pages/DockerVisualizer.vue`，替换所有 mock 数据加载为实际 API 调用。

**示例 - 加载容器列表：**

```javascript
// 替换前（mock 数据）：
onMounted(() => {
  containers.value = mockContainers;
  loading.value = false;
});

// 替换后（实际 API）：
async function fetchContainers() {
  try {
    loading.value = true;
    const response = await fetch('/api/docker/containers');
    const result = await response.json();

    if (response.ok && result.status === 'ok') {
      // 转换 Docker CLI 数据格式为 UI 期望的格式
      containers.value = result.data.map(container => ({
        id: container.ID.substring(0, 12),
        fullId: container.ID,
        name: container.Names[0]?.replace('/', '') || 'unknown',
        image: container.Image,
        state: container.State,
        status: container.Status,
        ports: container.Ports.split(',').map(p => p.trim()),
        networks: Object.keys(container.NetworkSettings?.Networks || {}),
        cpuPercent: parseFloat(container.stats?.CPUPercent || 0),
        memoryUsage: container.stats?.MemUsage || '0 B',
        created: new Date(container.Created),
        started: new Date(container.StartedAt)
      }));
    }
  } catch (error) {
    console.error('Failed to fetch containers:', error);
    // 显示错误提示
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchContainers();
  // 设置自动刷新（可选）
  setInterval(fetchContainers, 5000);
});
```

### 第 2 步：更新容器操作方法

```javascript
// 启动容器
async function startContainer(containerId) {
  try {
    const response = await fetch(`/api/docker/containers/${containerId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      // 刷新容器列表
      await fetchContainers();
      // 显示成功提示
    }
  } catch (error) {
    console.error('Failed to start container:', error);
  }
}

// 停止容器
async function stopContainer(containerId) {
  try {
    const response = await fetch(`/api/docker/containers/${containerId}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeout: 10 })
    });

    if (response.ok) {
      await fetchContainers();
    }
  } catch (error) {
    console.error('Failed to stop container:', error);
  }
}

// 删除容器
async function removeContainer(containerId) {
  try {
    const response = await fetch(`/api/docker/containers/${containerId}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true })
    });

    if (response.ok) {
      await fetchContainers();
    }
  } catch (error) {
    console.error('Failed to remove container:', error);
  }
}
```

### 第 3 步：类似方式更新其他资源

对 images、networks、volumes 使用相同模式：

```javascript
// 镜像列表
async function fetchImages() {
  const response = await fetch('/api/docker/images');
  const result = await response.json();
  images.value = result.data || [];
}

// 网络列表
async function fetchNetworks() {
  const response = await fetch('/api/docker/networks');
  const result = await response.json();
  networks.value = result.data || [];
}

// 数据卷列表
async function fetchVolumes() {
  const response = await fetch('/api/docker/volumes');
  const result = await response.json();
  volumes.value = result.data || [];
}
```

### 第 4 步：添加错误处理和健康检查

```javascript
// 检查 Docker 连接状态
async function checkDockerHealth() {
  try {
    const response = await fetch('/api/docker/health');
    const result = await response.json();

    dockerConnected.value = result.status === 'ok' && result.docker === 'connected';

    if (!dockerConnected.value) {
      errorMessage.value = '无法连接到 Docker 守护进程，请确保 Docker 已启动';
    }
  } catch (error) {
    dockerConnected.value = false;
    errorMessage.value = 'Docker 服务不可用';
  }
}

// 页面加载时检查
onMounted(() => {
  checkDockerHealth();
  if (dockerConnected.value) {
    fetchContainers();
    fetchImages();
    fetchNetworks();
    fetchVolumes();
  }
});
```

## 📊 数据转换参考

Docker CLI 输出格式 → UI 显示格式的映射

### 容器数据转换

```javascript
// Docker ps 输出
{
  "ID": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "Names": ["/nginx-web"],
  "Image": "nginx:latest",
  "State": "running",
  "Status": "Up 2 hours",
  "Ports": "0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp",
  "Mounts": "nginx-data"
}

// 转换为 UI 格式
{
  id: "a1b2c3d4e5f6",
  fullId: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  name: "nginx-web",
  image: "nginx:latest",
  state: "running",
  status: "Up 2 hours",
  ports: ["0.0.0.0:80->80/tcp", "0.0.0.0:443->443/tcp"],
  networks: ["bridge"],
  created: Date,
  started: Date,
  cpuPercent: 0.12,
  memoryUsage: 268435456,
  memoryLimit: 1073741824
}
```

## 🔒 安全考虑

### 权限管理

- ✅ Docker 命令运行在后端，前端无直接访问
- ✅ API 端点应添加身份验证（未在此实现，可根据需要添加）
- ✅ 敏感操作（delete、stop）应要求确认

### 建议的安全增强

```javascript
// 在 server/index.js 中添加身份验证中间件
app.use('/api/docker', (req, res, next) => {
  const token = req.headers['x-api-token'];

  if (!token || token !== process.env.DOCKER_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});
```

## 🐛 故障排除

### Docker 连接失败

**症状：** `/api/docker/health` 返回 503

**解决方案：**

1. 验证 Docker 已启动：
   ```bash
   docker ps
   ```

2. 验证权限：
   ```bash
   # macOS 上检查 Docker Desktop 是否运行
   open /Applications/Docker.app
   ```

3. 查看后端日志：
   ```bash
   npm run server:test
   ```

### 容器数据不更新

**症状：** 修改容器状态后列表未更新

**解决方案：**

- 增加自动刷新间隔
- 手动刷新页面
- 检查浏览器控制台错误

### 内存/CPU 数据不准确

**症状：** stats 显示 0% 或不显示

**解决方案：**

Docker stats 需要容器正在运行，且数据延迟 1-2 秒。确保：
- 容器状态为 `running`
- 刷新频率不要太高（最少 1 秒）

## 🚀 性能优化

### 1. 缓存数据

```javascript
const containerCache = new Map();
const CACHE_TTL = 5000; // 5 秒

async function fetchContainersWithCache() {
  const cached = containerCache.get('list');

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchContainers();
  containerCache.set('list', { data, timestamp: Date.now() });

  return data;
}
```

### 2. 分页加载（容器数量很多时）

```javascript
// 后端支持分页
async function fetchContainers(page = 1, pageSize = 50) {
  const response = await fetch(
    `/api/docker/containers?page=${page}&limit=${pageSize}`
  );
  // ...
}
```

### 3. WebSocket 实时更新（可选）

```javascript
// 使用 WebSocket 获取实时容器状态更新
const ws = new WebSocket('ws://localhost:4000/api/docker/events');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);

  if (update.Type === 'container' && update.Action === 'start') {
    // 更新容器列表
  }
};
```

## 📝 完整集成检查清单

- [ ] 后端 Docker API 路由已实现（server/routes/docker.js）
- [ ] 路由已注册到 server/index.js
- [ ] 前端组件已导入必要的 API 函数
- [ ] 所有 mock 数据已替换为实际 API 调用
- [ ] 容器的 start/stop/restart/remove 操作已连接
- [ ] 镜像管理操作已连接
- [ ] 网络和数据卷操作已连接
- [ ] 错误处理已实现
- [ ] Docker 健康检查已实现
- [ ] 自动刷新已配置（可选）
- [ ] UI 已针对真实数据格式调整
- [ ] 测试所有操作是否正常工作

## 📚 参考文档

- [Docker CLI 参考](https://docs.docker.com/engine/reference/commandline/cli/)
- [Docker API JSON 格式](https://docs.docker.com/engine/api/)
- [Dockerode NPM 包](https://github.com/apocas/dockerode)（如果后续升级）

---

**实现日期：** 2026-02-24
**最后更新：** 2026-02-24
