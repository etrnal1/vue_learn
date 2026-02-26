# 局域网访问配置指南

## 📱 概述

本应用已配置支持通过局域网访问，包括本地 localhost 和远程 macOS 主机名 `macdemac-mini.taileeb849.ts.net`。

## 🔧 已配置的白名单

### 前端 Vite 白名单 (`vite.config.js`)

```javascript
allowedHosts: [
  'localhost',
  '127.0.0.1',
  '*.local',
  'macdemac-mini.taileeb849.ts.net'
]
```

### 后端 CORS 白名单 (`server/index.js`)

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://macdemac-mini.taileeb849.ts.net:5173',
  'http://macdemac-mini.taileeb849.ts.net:5174'
]
```

## 🌐 访问方式

### 1. 本地开发环境

#### Localhost 访问
```
前端：http://localhost:5173
后端：http://localhost:4000
```

**启动命令：**
```bash
npm run dev
```

#### 127.0.0.1 访问
```
前端：http://127.0.0.1:5173
后端：http://127.0.0.1:4000
```

### 2. 局域网访问（通过主机名）

#### 使用 Tailscale 主机名
```
前端：http://macdemac-mini.taileeb849.ts.net:5173
后端：http://macdemac-mini.taileeb849.ts.net:4000
```

**前置条件：**
- Tailscale 已安装和连接
- 其他设备也在同一个 Tailscale 网络中

**使用场景：**
- ✅ 从其他电脑访问开发中的应用
- ✅ 从移动设备（iOS/Android）访问
- ✅ 从不同的网络环境访问
- ✅ 安全的 VPN 隧道（自动加密）

### 3. 局域网 IP 访问（可选）

如需通过本地网络 IP 访问，可以获取你的本地 IP：

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Linux
ip addr show

# Windows
ipconfig
```

**示例（假设你的 IP 是 192.168.1.100）：**
```
前端：http://192.168.1.100:5173
后端：http://192.168.1.100:4000
```

> ⚠️ **注意：** 这需要在 Vite 配置中额外添加该 IP 到 `allowedHosts`

## 🔐 安全机制

### 前端安全（Vite）

**白名单检查：**
- Vite 开发服务器会验证 Host 请求头
- 只允许白名单中的主机访问
- 防止 DNS rebinding 攻击

**配置位置：** `vite.config.js` → `server.allowedHosts`

### 后端安全（Express + CORS）

**CORS 检查：**
- 验证 Origin 请求头
- 只允许白名单中的来源
- 生产环境更严格（仅白名单）
- 开发环境警告但放行（便于开发）

**配置位置：** `server/index.js` → CORS 中间件

**开发模式行为：**
```javascript
const isDev = process.env.NODE_ENV !== 'production';
if (isDev) {
  console.warn(`⚠️  CORS: 请求来自非白名单源 ${origin}，已放行（开发模式）`);
  callback(null, true);
}
```

## 📋 访问流程

### 从同一网络内的其他电脑访问

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **确保 Tailscale 连接**
   ```bash
   tailscale status
   ```

3. **从其他电脑访问**
   - 浏览器访问：`http://macdemac-mini.taileeb849.ts.net:5173`
   - 或查看启动日志中的完整 URL

### 从移动设备访问

**前置条件：**
- 移动设备已安装 Tailscale 应用
- 连接到同一个 Tailscale 网络
- Tailscale 应用处于连接状态

**访问步骤：**
1. 在移动浏览器中输入：`http://macdemac-mini.taileeb849.ts.net:5173`
2. 或扫描开发电脑显示的 QR 码（如果可用）

## 🛠️ 自定义白名单

### 添加新的主机名或 IP

#### 前端（Vite）

编辑 `vite.config.js`：
```javascript
server: {
  allowedHosts: [
    'localhost',
    '127.0.0.1',
    '*.local',
    'macdemac-mini.taileeb849.ts.net',
    'your-new-hostname.local',  // 添加新主机名
    '192.168.1.100'              // 添加 IP 地址
  ]
}
```

#### 后端（Express）

编辑 `server/index.js`：
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://macdemac-mini.taileeb849.ts.net:5173',
  'http://macdemac-mini.taileeb849.ts.net:5174',
  'http://your-new-hostname.local:5173',  // 添加新来源
  'http://192.168.1.100:5173'             // 添加 IP
];
```

### 启用所有本地网络（不推荐）

如果你想完全信任本地网络，可以修改配置：

```javascript
// Vite - 允许所有 .local 域名和 192.168.* 网络
allowedHosts: [
  'localhost',
  '127.0.0.1',
  '*.local',
  '*.taileeb849.ts.net'
]
```

```javascript
// Express - 允许所有本地来源（开发环境）
app.use(cors({
  origin: ['localhost', '127.0.0.1', /\.local$/, /\.taileeb849\.ts\.net$/],
  credentials: true
}));
```

## 🔍 诊断和故障排除

### 检查端口是否开放

```bash
# 检查前端端口
lsof -i :5173

# 检查后端端口
lsof -i :4000

# 或使用 netstat
netstat -tuln | grep -E '5173|4000'
```

### 测试网络连接

```bash
# 测试到你的主机的连接
ping macdemac-mini.taileeb849.ts.net

# 测试 DNS 解析
nslookup macdemac-mini.taileeb849.ts.net

# 或使用 dig
dig macdemac-mini.taileeb849.ts.net
```

### 检查 Tailscale 状态

```bash
# 显示 Tailscale 状态
tailscale status

# 查看你的 IP 地址（包括 Tailscale IP）
tailscale ip -4

# 启用或禁用 Tailscale
tailscale up
tailscale down
```

### 浏览器控制台检查

在浏览器控制台（F12）中检查：

1. **CORS 错误**
   ```
   Access to XMLHttpRequest at 'http://...' from origin 'http://...'
   has been blocked by CORS policy
   ```
   - 解决：检查源是否在白名单中

2. **网络错误**
   ```
   Failed to fetch
   ```
   - 检查后端是否运行
   - 检查防火墙设置
   - 检查网络连接

### 查看启动日志

```bash
# 启动时查看日志
npm run dev

# 在日志中寻找类似的信息：
# VITE v4.3.9  ready in 234 ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

## 🚨 常见问题

### Q: 从其他电脑访问时出现 CORS 错误

**A:**
1. 检查白名单是否包含你的主机名或 IP
2. 检查前端和后端的配置是否同步
3. 尝试清除浏览器缓存
4. 重启前后端服务

### Q: Tailscale 主机名无法解析

**A:**
1. 确保 Tailscale 已连接：`tailscale status`
2. 尝试使用 Tailscale IP：`tailscale ip -4`
3. 检查防火墙是否阻止了 Tailscale 流量
4. 重新启动 Tailscale：`tailscale down && tailscale up`

### Q: 本地网络 IP 访问不通

**A:**
1. 检查你的本地 IP：`ifconfig` 或 `ipconfig`
2. 将 IP 添加到 Vite `allowedHosts` 白名单
3. 检查防火墙是否允许该端口
4. 确保两台设备在同一网络上

### Q: 移动设备无法访问

**A:**
1. 确保移动设备已安装 Tailscale
2. 连接到相同的 Tailscale 网络
3. 检查 Tailscale 应用是否处于活跃状态
4. 尝试使用完整 URL 而非 localhost

## 📊 配置总结表

| 场景 | URL 格式 | 白名单配置 | 跨域需要 |
|------|---------|---------|--------|
| 同机 localhost | `http://localhost:5173` | 默认 | ✅ 不需要 |
| 同机 127.0.0.1 | `http://127.0.0.1:5173` | 默认 | ✅ 不需要 |
| Tailscale 主机名 | `http://macdemac-mini.taileeb849.ts.net:5173` | 已配置 | ✅ 需要 CORS |
| 本地网络 IP | `http://192.168.x.x:5173` | 需要添加 | ✅ 需要 CORS |
| .local 域名 | `http://hostname.local:5173` | 已支持 | ✅ 需要 CORS |

## 🔗 相关命令快速参考

```bash
# 启动开发服务器
npm run dev

# 启动仅后端
npm run server:test

# 启动仅前端
npm run client:test

# 生产构建
npm run build

# 预览构建结果
npm run preview

# 查看 Tailscale 状态
tailscale status

# 查看网络配置
ifconfig          # macOS/Linux
ipconfig          # Windows
```

---

**配置日期：** 2026-02-24
**更新：** 添加 Vite allowedHosts 和 Express CORS 白名单配置
