# 流程管理模块 - 设置和使用指南

> 完整的流程管理系统设置说明

## 问题解决

### 错误：Table 'itsm_db.flow_releases' doesn't exist

**症状**：
- 点击流程管理页面时出现错误
- 控制台显示：`Table 'itsm_db.flow_releases' doesn't exist`
- 流程列表无法加载

**原因**：
数据库表未成功创建（可能是初始化脚本在某个步骤失败）

**解决方案**：

#### 步骤 1：重新运行数据库初始化

```bash
cd /Users/mac/vue-learning-app/server
node init-db.js
```

预期输出：
```
✅ 连接到 MySQL 服务器
✅ 数据库 itsm_db 已创建/存在
✅ 表 users 已创建
...
✅ 表 flow_releases 已创建
✅ 表 flow_releases payload 字段已存在
...
🎉 数据库初始化完成！所有表已成功创建。
```

#### 步骤 2：验证表是否已创建

```bash
# 进入 MySQL
mysql -u root -pfcs itsm_db

# 检查表是否存在
SHOW TABLES;

# 应该能看到 flow_releases 表
```

#### 步骤 3：重启开发服务器

```bash
npm run dev
```

#### 步骤 4：访问流程管理

在浏览器中访问：
```
http://localhost:5173/workflow
```

现在应该能够正常显示流程管理界面。

---

## 流程管理系统概览

### 核心功能

流程管理模块提供了完整的工作流管理能力：

#### 1. 流程列表视图 (Flow List)
- 查看所有已创建的流程
- 显示流程名称、描述、步骤数
- 预览流程中的前 3 个步骤
- 查看当前发布版本

#### 2. 流程编辑器 (Flow Editor)
- 编辑流程名称和描述
- 添加、删除、移动步骤
- 为每个步骤设置：
  - 名称
  - 描述
  - 负责人
  - 预计耗时
  - 条件触发标志
- 自动保存（10 秒防抖）

#### 3. 版本管理 (Release Management)
- 发布流程版本
- 查看版本历史
- 比较版本差异
- 回滚到上一个版本

#### 4. 步骤预览 (Step Preview)
- 在列表卡片中预览流程步骤
- 显示步骤名称和描述
- 最多显示 3 个步骤，超出部分显示 "+N 更多"

---

## 数据库表结构

### flows 表
```sql
CREATE TABLE flows (
  id VARCHAR(50) PRIMARY KEY,
  flow_no VARCHAR(20) UNIQUE NOT NULL,        -- 流程编号
  name VARCHAR(200) NOT NULL,                  -- 流程名称
  description TEXT,                            -- 流程描述
  icon VARCHAR(50),                            -- 流程图标
  author_id VARCHAR(50),                       -- 创建人
  created_at BIGINT NOT NULL,                  -- 创建时间
  updated_at BIGINT NOT NULL,                  -- 更新时间
  FOREIGN KEY (author_id) REFERENCES users(id)
)
```

### flow_steps 表
```sql
CREATE TABLE flow_steps (
  id VARCHAR(50) PRIMARY KEY,
  flow_id VARCHAR(50) NOT NULL,                -- 所属流程
  step_order INT NOT NULL,                     -- 步骤顺序
  name VARCHAR(200) NOT NULL,                  -- 步骤名称
  description TEXT,                            -- 步骤描述
  assignee VARCHAR(50),                        -- 负责人
  duration INT,                                -- 预计耗时（秒）
  conditional BOOLEAN DEFAULT FALSE,           -- 是否条件触发
  FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
)
```

### flow_releases 表
```sql
CREATE TABLE flow_releases (
  id VARCHAR(50) PRIMARY KEY,
  flow_id VARCHAR(50) NOT NULL,                -- 流程 ID
  version VARCHAR(50) NOT NULL,                -- 版本号 (e.g., v1, v2)
  note TEXT,                                   -- 版本说明
  payload JSON,                                -- 流程内容快照
  created_at BIGINT NOT NULL,                  -- 发布时间
  FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
)
```

---

## 数据流程

### 创建新流程

```
点击 [编辑流程] (FlowDiagramEditor)
    ↓
输入流程名称和描述
    ↓
点击 [+ 添加步骤]
    ↓
编辑步骤信息（名称、描述、负责人等）
    ↓
点击 [保存]
    ↓
保存到数据库 (flows 和 flow_steps 表)
    ↓
自动 POST /api/flows 或 PUT /api/flows/:id
    ↓
返回流程列表 (FlowManagement)
    ↓
显示新创建的流程卡片和步骤预览
```

### 发布流程版本

```
点击流程卡片的 [发布版本]
    ↓
输入版本号 (e.g., v1)
    ↓
输入版本说明 (可选)
    ↓
API POST /api/flows/:id/releases
    ↓
创建发布记录到 flow_releases 表
    ↓
更新版本历史
    ↓
显示版本记录和差异
```

### 回滚版本

```
点击 [回滚版本]
    ↓
确认操作
    ↓
API POST /api/flows/:id/releases/rollback
    ↓
删除最新的发布记录
    ↓
更新版本历史
    ↓
返回上一个版本
```

---

## API 端点

### 流程管理 API

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/api/flows` | 获取所有流程 |
| GET | `/api/flows/:id` | 获取单个流程详情 |
| POST | `/api/flows` | 创建新流程 |
| PUT | `/api/flows/:id` | 更新流程 |
| DELETE | `/api/flows/:id` | 删除流程 |

### 版本管理 API

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/api/flows/releases` | 获取所有发布记录 |
| POST | `/api/flows/:id/releases` | 创建发布版本 |
| POST | `/api/flows/:id/releases/rollback` | 回滚版本 |

---

## 使用示例

### 创建一个流程

**示例：请假审批流程**

```
1. 进入流程管理页面
2. 点击 [编辑流程] (在 FlowDiagramEditor 中)
3. 输入流程信息：
   - 名称：请假审批
   - 描述：员工请假申请和审批流程
4. 点击 [+ 添加步骤]，添加以下步骤：

   步骤 1：申请请假
   - 描述：员工填写请假申请表
   - 负责人：申请人
   - 预计耗时：10分钟

   步骤 2：部门审核
   - 描述：部门经理审核申请
   - 负责人：部门经理
   - 预计耗时：30分钟

   步骤 3：HR确认
   - 描述：HR确认并办理交接
   - 负责人：HR
   - 预计耗时：15分钟
   - 条件触发：是（仅当通过时）

   步骤 4：归档
   - 描述：存档相关文件
   - 负责人：HR
   - 预计耗时：5分钟

5. 点击 [保存]
```

### 发布流程版本

```
1. 流程创建完成后，在流程卡片上点击 [发布版本]
2. 输入版本号：v1
3. 输入版本说明：初版发布
4. 点击确定
5. 流程版本已发布，可以在版本历史中查看
```

---

## 常见问题

### Q: 数据库表为什么不存在？

A: 可能是以下原因：
1. 初始化脚本未运行
2. 初始化脚本运行失败（如 SQL 语法错误）
3. 数据库连接配置错误

**解决方案**：
1. 检查 `.env` 中的数据库配置
2. 重新运行初始化脚本：`node server/init-db.js`
3. 如果仍有错误，检查 MySQL 错误日志

### Q: 为什么自动保存不工作？

A: 自动保存在 FlowDiagramEditor 中实现，每 10 秒保存一次（有编辑时）

**检查清单**：
- 是否在编辑流程？（只有编辑时才会自动保存）
- 是否有足够的等待时间？（需要 10 秒）
- 控制台中是否有错误？(F12 → Console)
- 网络连接是否正常？(F12 → Network)

### Q: 版本历史为什么是空的？

A: 需要手动发布版本

**步骤**：
1. 进入流程管理
2. 点击流程卡片上的 [发布版本]
3. 输入版本号和说明
4. 确认发布
5. 版本历史应该会显示

### Q: 如何删除一个流程？

A: 在流程列表中，找到要删除的流程卡片，点击 [删除] 按钮

**注意**：
- 此操作不可撤销
- 流程的所有步骤和版本记录也会被删除

---

## 性能考虑

### 数据库查询优化

已添加的索引：
- `flow_steps.flow_id` - 快速查询某个流程的所有步骤
- `flow_releases.flow_id` - 快速查询流程版本历史

### 前端性能

- 使用虚拟滚动处理大量流程（待实现）
- 版本历史使用分页加载（待实现）
- 自动保存使用防抖（已实现）

---

## 故障排除

### 错误：ERR_PARSE_ERROR

**症状**：数据库初始化时显示 SQL 语法错误

**原因**：ALTER TABLE 语句使用了无效的语法

**解决方案**：
1. 确保使用最新的 `init-db.js`
2. 重新运行初始化脚本

### 错误：ER_NO_REFERENCED_COLUMN_ERROR

**症状**：创建流程时显示外键错误

**原因**：参考的表或列不存在

**解决方案**：
1. 运行初始化脚本确保所有表都已创建
2. 检查用户表是否存在

### 流程列表加载缓慢

**原因**：
- 流程数量太多
- 网络连接慢
- 服务器响应慢

**解决方案**：
1. 检查网络连接
2. 检查服务器日志
3. 考虑添加分页或虚拟滚动

---

## 开发扩展

### 添加新功能

如果想为流程管理系统添加新功能，可以考虑：

#### 1. 条件分支 (Conditional Branching)
目前支持在步骤上标记"条件触发"，但完整的条件分支逻辑（if-else）还未实现

**实现步骤**：
1. 扩展 `flow_steps` 表，添加条件字段
2. 在编辑器中实现条件编辑 UI
3. 在发布时验证条件逻辑
4. 在执行流程时根据条件判断

#### 2. 流程执行跟踪
目前只支持流程定义，不支持实际执行和进度跟踪

**实现步骤**：
1. 创建 `flow_instances` 表记录流程实例
2. 创建 `flow_step_executions` 表记录步骤执行
3. 实现流程启动和执行 API
4. 实现进度跟踪界面

#### 3. 拖拽排序
目前通过上移/下移按钮调整步骤顺序

**实现步骤**：
1. 添加拖拽库 (vue-draggable)
2. 实现拖拽事件处理
3. 更新步骤顺序

#### 4. 步骤模板库
为常见的步骤提供模板

**实现步骤**：
1. 创建 `step_templates` 表
2. 实现模板管理界面
3. 支持从模板快速添加步骤

---

## 相关文件

- `src/pages/workflow/FlowManagement.vue` - 流程管理页面
- `src/pages/workflow/FlowDiagramEditor.vue` - 流程编辑器
- `server/routes/flows.js` - 后端 API 路由
- `server/init-db.js` - 数据库初始化脚本
- `src/utils/api.js` - API 客户端

---

## 更新历史

- **2026-02-26**：修复数据库初始化脚本 SQL 语法错误
  - 修复 ALTER TABLE 语句
  - 流程管理模块现在可以正常使用

---

**文档版本**：1.0
**创建日期**：2026年2月26日
**最后更新**：2026年2月26日
**维护人**：Claude Code
