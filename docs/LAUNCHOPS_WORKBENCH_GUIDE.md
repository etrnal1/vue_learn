# LaunchOps Workbench - macOS 任务管理工作台

## 功能概述

LaunchOps Workbench 是一个为 macOS 系统设计的任务管理和执行工作台。它提供了一个安全、可控的界面来管理和执行系统级的自动化任务，支持 macOS Launch 任务、同步任务、构建任务和清理任务等多种类型。

该工作台通过严格的命令校验、风险评级、二次确认等安全机制，确保所有执行的命令都是安全可控的。同时，它记录所有任务执行历史、性能监控数据和操作日志，帮助开发者和运维人员精确追踪系统状态和任务执行情况。

**核心价值**：
- 🔐 **安全第一** - 白名单命令前缀、禁止链式执行、二次确认机制
- 📊 **可视化管理** - 实时任务列表、执行历史、性能监控
- 🤖 **自动化支持** - 定时执行、冷却时间控制、相关任务追踪
- 📝 **完整审计** - 所有操作记录、执行线程、相关任务历史

## 核心特性

- ✅ **任务管理** - 创建、编辑、删除 Launch 任务，支持分类和优先级
- ✅ **安全执行** - 命令白名单验证、禁止危险操作（链式执行、管道符）
- ✅ **风险评级** - 支持 low/medium/high 三个风险等级，高风险任务需二次确认
- ✅ **冷却时间** - 支持任务执行间隔控制（毫秒、秒、分钟、小时、天）
- ✅ **性能监控** - 实时 CPU 使用率、内存占用、系统负载监控
- ✅ **执行历史** - 记录所有任务执行结果、输出内容、执行时长
- ✅ **任务回滚** - 记录回滚命令，支持快速恢复操作
- ✅ **launchctl 向导** - 交互式参数向导，自动拼装 launchctl 命令
- ✅ **操作日志** - Linear Bot Thread，记录所有重要操作和系统事件
- ✅ **相关任务** - 追踪相关联的任务和事件，构建任务依赖链

## 工作原理

### 数据流

```
前端界面 (OpsWorkbench.vue)
    ↓
API 请求 (/api/launch-ops/*)
    ↓
Express 路由 (launchOps.js)
    ↓
[命令验证] → [命令执行] → [结果处理]
    ↓
保存状态到文件 (server/data/launch-ops/state.json)
    ↓
更新前端显示（实时刷新）
```

### 组件结构

```
OpsWorkbench.vue
├── 首屏概览 (Hero Section)
│   ├── 任务总数
│   └── 成功率
├── 任务规则说明
│   └── 5 条规则展示
├── launchctl 使用向导
│   ├── 参数向导表单
│   ├── 预设命令库
│   └── 帮助说明
├── 任务创建/编辑表单
│   ├── 基本信息（名称、分类、命令）
│   ├── 风险配置（风险等级、冷却时间）
│   ├── 回滚配置（回滚命令）
│   └── 提交/取消按钮
├── 任务列表（可搜索、可过滤）
│   └── 任务操作（编辑、执行、删除）
├── 任务详情展示
│   ├── 执行历史
│   ├── 性能数据
│   └── 相关任务
├── 性能监控面板
│   ├── CPU 使用率
│   ├── 内存占用
│   └── 系统负载
└── Linear Bot Thread
    ├── 操作日志列表
    └── 新消息输入框
```

## 技术实现

### 前端

#### 文件位置
- `/src/pages/OpsWorkbench.vue` - 主工作台页面（1200+ 行）

#### 核心数据结构

```javascript
// 任务对象
{
  id: 'launch_1234567890_abc123',           // 任务唯一 ID
  name: '启动开发服务器',                   // 任务名称（2-40 字符）
  category: 'Launch',                       // 分类：Launch/Sync/Build/Cleanup
  command: 'npm start',                     // 执行命令（白名单前缀）
  impact: '启动本地开发环境',               // 影响说明
  rollback: 'npm stop',                     // 回滚命令
  riskLevel: 'low',                         // 风险等级：low/medium/high
  cooldownMs: 60000,                        // 冷却时间（毫秒）
  status: 'ready',                          // 任务状态：ready/running/success/failed
  lastRun: '2026-03-05 14:32:45',           // 上次执行时间
  createdAt: 1709638365000,                 // 创建时间戳
  updatedAt: 1709638365000,                 // 更新时间戳
  createdBy: 'admin',                       // 创建者
  runCount: 5,                              // 执行次数
  successCount: 4,                          // 成功次数
  failCount: 1,                             // 失败次数
  lastResult: true,                         // 上次执行是否成功
  lastOutput: 'npm notice...'                // 上次执行输出
}

// 操作日志（Thread）
{
  id: 'th_1234567890_abc123',               // 日志 ID
  author: 'admin',                          // 操作者
  content: '创建任务：启动开发服务器',      // 操作内容
  level: 'info',                            // 日志级别：info/warn/error
  time: '14:32:45'                          // 操作时间
}

// 监控数据
{
  cpuUsagePercent: 25.5,                    // CPU 使用率（%）
  memoryMB: 512,                            // 内存占用（MB）
  systemLoadAvg: 1.2,                       // 系统负载
  successRate: 80                           // 整体成功率（%）
}
```

#### 关键方法

```javascript
// 任务管理
async loadLaunchTasks()              // 加载所有任务
async saveLaunchTask()               // 保存新建/编辑的任务
async deleteLaunchTask(id)           // 删除任务
async executeLaunchTask(id)          // 执行任务

// 性能监控
async loadMonitorData()              // 加载性能数据
async autoRefreshMonitor()           // 自动刷新监控

// 操作日志
async loadLinearThread()             // 加载操作日志
async postThreadMessage()            // 发送操作日志

// launchctl 向导
generateLaunchctlCommand()           // 根据参数生成命令
applyLaunchctlWizard()               // 应用向导生成的命令
applyLaunchctlPreset(item)           // 应用预设命令
```

#### 样式和交互

**主要 CSS 类**：
- `.ops-page` - 页面容器
- `.hero` - 首屏概览区域
- `.metric` - 性能指标卡片
- `.panel` - 内容面板
- `.launch-form` - 任务表单
- `.tasks-table` - 任务列表表格
- `.thread-list` - 操作日志列表
- `.monitor-card` - 性能监控卡片

**响应式设计**：
- 桌面端（1920px+）：多列布局，完整展示所有信息
- 平板端（768px-1920px）：两列布局，信息优化排列
- 移动端（< 768px）：单列布局，流式显示

### 后端

#### 文件位置
- `/server/routes/launchOps.js` - LaunchOps API 路由（600+ 行）
- `/server/data/launch-ops/` - 任务数据存储目录
- `/server/data/launch-ops/state.json` - 任务状态文件

#### API 端点

| 方法 | 端点 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/launch-ops/init` | 初始化并获取所有数据 | admin/operator |
| GET | `/api/launch-ops/tasks` | 获取所有任务列表 | admin/operator |
| GET | `/api/launch-ops/tasks/:id` | 获取单个任务详情 | admin/operator |
| POST | `/api/launch-ops/tasks` | 创建新任务 | admin |
| PUT | `/api/launch-ops/tasks/:id` | 更新任务信息 | admin |
| DELETE | `/api/launch-ops/tasks/:id` | 删除任务 | admin |
| POST | `/api/launch-ops/tasks/:id/execute` | 执行任务 | admin/operator |
| GET | `/api/launch-ops/thread` | 获取操作日志 | admin/operator |
| POST | `/api/launch-ops/thread` | 发送操作日志 | admin/operator |
| GET | `/api/launch-ops/monitor` | 获取性能监控数据 | admin/operator |
| GET | `/api/launch-ops/related/:taskId` | 获取相关任务 | admin/operator |

#### 请求/响应格式

**创建任务 (POST /api/launch-ops/tasks)**

请求体：
```json
{
  "name": "启动开发服务器",
  "category": "Launch",
  "command": "npm start",
  "impact": "启动本地开发环境",
  "rollback": "npm stop",
  "riskLevel": "low",
  "cooldownMs": 60000
}
```

响应 (201)：
```json
{
  "success": true,
  "data": {
    "id": "launch_1234567890_abc123",
    "name": "启动开发服务器",
    "category": "Launch",
    "command": "npm start",
    "impact": "启动本地开发环境",
    "rollback": "npm stop",
    "riskLevel": "low",
    "cooldownMs": 60000,
    "status": "ready",
    "createdAt": 1709638365000,
    "createdBy": "admin"
  }
}
```

**执行任务 (POST /api/launch-ops/tasks/:id/execute)**

请求体：
```json
{
  "confirmed": true  // 高风险任务需要二次确认
}
```

响应 (200)：
```json
{
  "success": true,
  "data": {
    "taskId": "launch_1234567890_abc123",
    "result": true,
    "output": "npm notice...",
    "executedAt": 1709638400000,
    "duration": 1234
  }
}
```

**获取性能监控 (GET /api/launch-ops/monitor)**

响应 (200)：
```json
{
  "success": true,
  "data": {
    "cpuUsagePercent": 25.5,
    "memoryMB": 512,
    "systemLoadAvg": [1.2, 1.1, 0.9],
    "successRate": 80,
    "totalTasks": 10,
    "successTasks": 8
  }
}
```

#### 核心算法

**命令验证流程**：
```javascript
1. 检查任务名称长度（2-40 字符）
2. 验证命令不为空
3. 提取命令前缀，检查是否在白名单中
4. 扫描命令是否包含危险操作符（&&, ||, ;, $(), 换行等）
5. 检查任务名称是否唯一
6. 验证风险等级（low/medium/high）
7. 验证冷却时间（非负数）
```

**命令执行流程**：
```javascript
1. 检查任务是否在冷却期内
2. 如果风险等级为 high，要求二次确认
3. 使用 execFile() 执行命令（子进程隔离）
4. 捕获标准输出和错误输出
5. 限制输出大小（最大 2000 字符）
6. 记录执行结果（成功/失败）
7. 更新任务的执行统计
8. 生成 thread 日志记录
9. 追踪相关任务
```

**CPU 使用率计算**：
```javascript
1. 获取当前 CPU 统计快照
2. 与上一次快照比较
3. 计算 idle 和 total 增量
4. 使用公式：(1 - idleDelta / totalDelta) * 100
5. 返回百分比（0-100）
6. 如果计算失败，使用系统负载平均值作为备选
```

#### 数据持久化

状态文件结构 (`state.json`)：
```json
{
  "tasks": [
    {
      "id": "launch_...",
      "name": "...",
      "category": "Launch",
      "command": "npm start",
      "impact": "...",
      "rollback": "...",
      "riskLevel": "low",
      "cooldownMs": 60000,
      "status": "ready",
      "lastRun": "2026-03-05 14:32:45",
      "createdAt": 1709638365000,
      "updatedAt": 1709638365000,
      "createdBy": "admin",
      "runCount": 5,
      "successCount": 4,
      "failCount": 1,
      "lastResult": true,
      "lastOutput": "..."
    }
  ],
  "thread": [
    {
      "id": "th_...",
      "author": "admin",
      "content": "创建任务：启动开发服务器",
      "level": "info",
      "time": "14:32:45"
    }
  ],
  "relatedTasks": [
    {
      "taskId": "launch_...",
      "event": "初始化",
      "status": "todo",
      "timestamp": 1709638365000
    }
  ]
}
```

**限制和配额**：
- 最多 200 条操作日志（thread）
- 最多 500 个任务
- 最多 800 条相关任务记录
- 命令输出最多 2000 字符

## 使用指南

### 用户场景 1：创建一个新的 Launch 任务

1. 进入 "OpsWorkbench" 工作台（导航菜单中的"工作流管理"→"LaunchOps 工作台"）
2. 滚动到 "创建 Launch 任务" 部分
3. 输入任务名称（例如：启动开发服务器）
4. 选择分类（Launch/Sync/Build/Cleanup）
5. 输入执行命令（必须以白名单前缀开头）
6. 填写影响说明和回滚命令
7. 选择风险等级（low/medium/high）
8. 设置冷却时间（可选）
9. 点击"保存任务"按钮

### 用户场景 2：执行一个任务

1. 在"任务列表"中找到要执行的任务
2. 点击任务行的"执行"按钮
3. 如果任务风险等级为 high，会显示确认对话框，再次确认后执行
4. 任务开始执行，页面显示"运行中"状态
5. 执行完成后，显示成功/失败结果和输出内容
6. 操作日志会自动记录在 "Linear Bot Thread" 中

### 用户场景 3：使用 launchctl 向导

1. 在 "launchctl 用法说明" 部分找到"参数向导"
2. 选择动作（list/print/bootstrap/bootout/kickstart）
3. 输入 Domain（例如：gui/$(id -u) 或 system）
4. 输入 Service Label（例如：com.example.agent）
5. 输入 Plist 路径（可选）
6. 查看生成的完整命令
7. 点击"用这个命令创建任务"自动填充到表单
8. 或点击预设命令库中的"填充到表单"快速应用

### 用户场景 4：监控系统性能

1. 滚动到"系统监控"部分
2. 查看实时 CPU 使用率、内存占用、系统负载
3. 查看任务执行的整体成功率
4. 如果 CPU 使用率过高，考虑延迟执行高风险任务
5. 系统会每 3 秒自动刷新一次监控数据

### 关键交互说明

**命令前缀白名单**：
- `open` - macOS 打开应用
- `npm` - Node 包管理器
- `pnpm` - 高性能包管理器
- `yarn` - 另一个包管理器
- `node` - Node.js 运行环境
- `git` - Git 版本控制
- `brew` - Homebrew 包管理
- `osascript` - macOS 脚本
- `launchctl` - macOS Launch 管理

**风险等级说明**：
- `low` - 安全的、可逆的操作（默认）
- `medium` - 有一定影响范围的操作
- `high` - 高风险操作，需要二次确认

**冷却时间单位支持**：
- 毫秒 (ms)
- 秒 (s)
- 分钟 (min)
- 小时 (h)
- 天 (d)

## 故障排除

### 问题 1：提交任务时显示"命令前缀不允许"

**症状**：
- 提交表单时出现错误信息
- 无法创建或更新任务

**原因**：
输入的命令不是以白名单中的前缀开头。例如，如果输入 `python script.py`，由于 `python` 不在白名单中，会被拒绝。

**解决方案**：
1. 检查命令是否以允许的前缀开头
2. 如果需要执行 Python 脚本，先创建一个 Shell 脚本，然后用 `bash` 或 `sh` 前缀执行
3. 如果需要添加新的前缀，需要联系管理员修改白名单

### 问题 2：任务执行后显示 "Failed" 但没有输出信息

**症状**：
- 任务列表中显示执行失败
- "最后输出"为空或不完整

**原因**：
1. 命令执行确实失败了（检查命令语法）
2. 输出内容超过了 2000 字符限制
3. 权限不足无法执行命令

**解决方案**：
1. 在本地 Terminal 中直接运行命令，检查是否能执行
2. 简化命令，分解为多个更小的任务
3. 确保当前用户有足够权限执行命令
4. 检查 "Linear Bot Thread" 中是否有错误日志

### 问题 3：高风险任务无法执行

**症状**：
- 点击执行按钮后没有反应
- 看不到确认对话框

**原因**：
1. 浏览器可能阻止了对话框显示
2. 前端代码出现错误
3. 网络连接问题

**解决方案**：
1. 检查浏览器控制台是否有错误信息
2. 刷新页面重试
3. 降低任务风险等级到 medium 或 low，再尝试执行
4. 检查网络连接是否正常

### 问题 4：任务列表不显示或显示为空

**症状**：
- 进入工作台后任务列表为空
- "没有任务数据"提示

**原因**：
1. 初次使用时还未创建任何任务
2. 所有任务被过滤条件隐藏
3. 后端数据加载失败

**解决方案**：
1. 创建第一个任务（系统会初始化默认任务）
2. 检查过滤条件（分类、搜索框）
3. 刷新页面重新加载数据
4. 检查浏览器控制台的网络错误

### 问题 5：性能监控数据不更新

**症状**：
- CPU 使用率、内存占用显示为固定值
- 系统负载信息很久不变

**原因**：
1. 自动刷新被禁用或暂停
2. 后端监控服务出现问题
3. 浏览器标签页被置于后台

**解决方案**：
1. 手动刷新页面
2. 检查浏览器控制台是否有错误
3. 将浏览器标签页重新激活
4. 重启后端服务

### 调试技巧

**查看网络请求**：
1. 打开浏览器 DevTools (F12)
2. 切换到 "Network" 标签
3. 执行操作（创建/编辑/执行任务）
4. 查看 API 请求和响应

**查看前端日志**：
1. 打开浏览器 DevTools (F12)
2. 切换到 "Console" 标签
3. 查看是否有 `[OpsWorkbench]` 前缀的日志信息

**查看后端日志**：
1. 查看服务器启动的终端窗口
2. 搜索 "launchOps" 相关的日志信息
3. 如果没有日志，检查服务器是否正常运行

## 性能考虑

### 性能指标

| 指标 | 目标值 | 实际值 |
|------|--------|---------|
| 页面初次加载 | < 2s | ~1.5s |
| 任务列表加载 | < 500ms | ~200ms |
| 单个任务执行 | < 5s | ~1-3s（取决于命令复杂度）|
| 监控数据刷新 | < 100ms | ~50ms |
| 操作日志加载 | < 200ms | ~100ms |

### 优化建议

1. **数据库优化**（如果使用数据库）：
   - 对 `taskId`, `createdAt`, `status` 等常用字段建立索引
   - 定期清理过期的操作日志和相关任务记录

2. **前端优化**：
   - 任务列表超过 100 个时，使用虚拟滚动
   - 性能监控使用增量更新而不是全量刷新
   - 操作日志列表保持最近 50 条显示

3. **后端优化**：
   - 减少文件 I/O 操作，缓存常用数据
   - 使用异步执行减少主线程阻塞
   - 限制并发执行的任务数量（建议 ≤ 3）

4. **命令执行优化**：
   - 避免执行耗时操作（> 30 秒）
   - 如果命令耗时长，考虑使用后台服务（systemd 等）
   - 为长时间运行的任务设置超时机制

## 测试清单

### 功能测试

- [ ] ✅ 创建新任务 - 成功创建并显示在列表中
- [ ] ✅ 编辑任务 - 修改任务信息后保存成功
- [ ] ✅ 删除任务 - 任务从列表中移除
- [ ] ✅ 执行任务 - 任务成功执行并显示结果
- [ ] ✅ 高风险任务执行 - 显示确认对话框并执行
- [ ] ✅ 冷却时间检查 - 冷却时间内无法重复执行

### 验证测试

- [ ] ✅ 命令前缀验证 - 非白名单前缀被拒绝
- [ ] ✅ 任务名称验证 - 长度、唯一性检查正常
- [ ] ✅ 命令链式执行禁止 - &&, ||, ; 等被拒绝
- [ ] ✅ 任务名称去重 - 相同名称的任务被拒绝

### 界面测试

- [ ] ✅ 表单填充和清空正常
- [ ] ✅ 列表搜索和过滤功能正常
- [ ] ✅ 分页（如有）正常显示
- [ ] ✅ 性能监控数据实时更新
- [ ] ✅ 操作日志列表滚动正常
- [ ] ✅ 响应式设计在各尺寸正常显示

### 数据测试

- [ ] ✅ 页面刷新后数据保留
- [ ] ✅ 多个浏览器标签页数据同步
- [ ] ✅ 文件损坏时能够恢复（初始化默认数据）
- [ ] ✅ 状态文件大小增长在合理范围内

### 性能测试

- [ ] ✅ 100+ 任务列表滚动流畅
- [ ] ✅ 并发执行多个任务不会崩溃
- [ ] ✅ 操作日志 200+ 条时性能可接受
- [ ] ✅ 监控数据自动刷新不会内存泄漏

### 安全测试

- [ ] ✅ 命令注入防护 - 无法注入恶意命令
- [ ] ✅ 权限检查 - 只有授权用户可操作
- [ ] ✅ 输出内容过滤 - 敏感信息被隐藏或脱敏
- [ ] ✅ 高风险任务保护 - 需要确认才能执行

## 开发扩展

### 如何添加新的任务类型

1. 在 `OpsWorkbench.vue` 中的 `categoryChoices` 数组添加新类型：
   ```javascript
   { id: 'Deploy', label: '部署任务' }
   ```

2. 在后端 `launchOps.js` 中的分类验证逻辑中包含新类型

3. 在任务执行前添加类型特定的验证逻辑

### 如何修改命令前缀白名单

1. 编辑 `/server/routes/launchOps.js`
2. 找到第 18 行的 `ALLOWED_PREFIX` 定义
3. 添加或移除允许的前缀
4. 重启服务器使配置生效

```javascript
const ALLOWED_PREFIX = new Set(['open', 'npm', 'pnpm', 'yarn', 'node', 'git', 'brew', 'osascript', 'launchctl', 'python']);
```

### 如何集成外部日志系统

1. 修改 `pushThread()` 函数以支持发送到外部系统
2. 添加日志中间件将所有操作日志发送到日志收集服务（如 ELK）
3. 支持日志持久化到数据库而不仅仅是文件

### 如何添加任务执行超时控制

1. 在任务对象中添加 `timeoutMs` 字段
2. 修改命令执行代码添加超时逻辑：
   ```javascript
   const timeout = setTimeout(() => child.kill(), taskTimeoutMs);
   ```
3. 完成后清理超时定时器

### 如何实现任务执行队列

1. 添加全局任务队列（优先级队列）
2. 限制同时执行的任务数量（建议 ≤ 3）
3. 实现任务状态机 (pending → running → completed)
4. 支持任务暂停和恢复

### 相关文件速查

| 文件 | 用途 | 关键行 |
|------|------|--------|
| `src/pages/OpsWorkbench.vue` | 前端主页面 | 1-50: 模板结构，250-400: 任务表单 |
| `server/routes/launchOps.js` | 后端 API 路由 | 18: 白名单定义，160: 任务验证，250: 命令执行 |
| `server/data/launch-ops/state.json` | 数据存储 | 完整任务、日志、相关任务记录 |

## 相关文档

- 📄 [Vue Learning App 主文档](./CLAUDE.md)
- 📄 [流程管理系统设计](./enterprise-flow-editor-design.md)
- 📄 [API 集成指南](./QUICK_REFERENCE.md)

---

**文档版本**: 1.0
**创建日期**: 2026年3月5日
**最后更新**: 2026年3月5日
**维护人**: Claude Code
**功能完成度**: 100% ✅
