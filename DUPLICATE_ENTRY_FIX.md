# 修复：Duplicate entry 'flow_xxx' 错误

## 问题描述

当用户在流程编辑器中：
1. 创建新流程
2. 填写流程名称
3. 添加步骤
4. 点击保存

系统返回错误：
```
Duplicate entry 'flow_1772103548835' for key 'flows.PRIMARY'
```

## 根本原因分析

这个错误有**两个根本原因**：

### 原因 1：前端 isNew 判断错误

在前端的 `saveFlow()` 方法中：

```javascript
// ❌ 错误的判断逻辑
const isNew = !this.editingFlow.id || this.editingFlow.id.startsWith('flow_')
```

这个逻辑有问题：
- 当 ID 是 `flow_xxx` 格式时，总是被认为是新流程
- 即使这个流程已经存在于数据库中（例如第二次编辑同一个流程）
- 导致用 POST 请求而不是 PUT 请求，尝试插入重复的 ID

### 原因 2：前端未传递 order 字段

前端步骤对象中没有 `order` 字段：

```javascript
// ❌ 后端期望的字段缺失
const step = {
  id: 'step_xxx',
  name: '步骤名',
  // ❌ 缺少 order 字段
  conditional: false
}
```

但后端 SQL 查询使用了 `step.order`：

```javascript
// ❌ 后端代码中
[
  step.id,
  id,
  step.order,  // ❌ undefined！
  step.name
]
```

导致 `undefined` 被存储到数据库，后续查询失败。

## 解决方案

### 前端修复

改进 `isNew` 判断逻辑，检查流程是否真的存在于列表中：

```javascript
// ✅ 正确的判断逻辑
const isNew = !this.flows.some(f => f.id === this.editingFlow.id)
```

确保步骤有完整的字段，包括 `order`：

```javascript
// ✅ 完整的步骤对象
const flowData = {
  id: this.editingFlow.id,
  name: this.editingFlow.name,
  steps: (this.editingFlow.steps || []).map((step, index) => ({
    id: step.id,
    name: step.name,
    description: step.description,
    assignee: step.assignee,
    duration: step.duration,
    order: index,  // ✅ 添加 order 字段
    conditional: step.conditional
  }))
}
```

### 后端修复

后端需要容错处理，确保即使没有收到 `order` 也能工作：

```javascript
// ✅ 容错的后端逻辑
for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
  const step = steps[stepIndex];
  await connection.query(
    `INSERT INTO flow_steps (id, flow_id, step_order, name, description, assignee, duration, conditional)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      step.id || `step_${Date.now()}_${stepIndex}`,
      id,
      step.order !== undefined ? step.order : stepIndex,  // ✅ 默认使用 index
      step.name || '',
      step.description || null,
      step.assignee || null,
      step.duration || null,
      step.conditional || false
    ]
  );
}
```

## 修改的文件

### 1. `src/pages/workflow/FlowDiagramEditor.vue`

**修改内容**：
- 改进 `isNew` 判断逻辑
- 在 `saveFlow()` 中构造完整的 `flowData` 对象
- 确保所有步骤都有 `order` 字段

**关键代码**：
```javascript
// 改进的 isNew 判断
const isNew = !this.flows.some(f => f.id === this.editingFlow.id)

// 构造完整的步骤数据
steps: (this.editingFlow.steps || []).map((step, index) => ({
  id: step.id || `step_${Date.now()}_${index}`,
  name: step.name || '',
  description: step.description || '',
  assignee: step.assignee || '',
  duration: step.duration || '',
  order: index,  // ✅ 关键：确保有 order
  conditional: step.conditional || false
}))
```

### 2. `server/routes/flows.js`

**修改内容**：
- POST 时的步骤插入逻辑
- PUT 时的步骤更新逻辑
- 添加容错处理

**关键代码**：
```javascript
for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
  const step = steps[stepIndex];
  // 关键：使用容错的 order 值
  step.order !== undefined ? step.order : stepIndex
}
```

## 测试步骤

1. **清空浏览器缓存**
   - 按 Cmd+Shift+Delete 或 Ctrl+Shift+Delete
   - 清除所有缓存

2. **创建新流程**
   ```
   点击 [+ 新建流程]
   → 输入流程名称："测试流程"
   → 点击 [+ 添加步骤]
   → 输入步骤名称："步骤 1"
   → 点击 [保存]
   → ✅ 应该显示 "流程已保存"
   ```

3. **编辑已存在的流程**
   ```
   点击 [编辑]
   → 修改流程名称
   → 添加新步骤
   → 点击 [保存]
   → ✅ 应该使用 PUT 请求而不是 POST
   ```

4. **检查数据库**
   ```bash
   # 查看流程表
   SELECT * FROM flows;

   # 查看步骤表
   SELECT * FROM flow_steps;

   # 查看步骤顺序
   SELECT id, flow_id, step_order, name FROM flow_steps ORDER BY flow_id, step_order;
   ```

## 验证清单

- [ ] ✅ 可以创建新流程
- [ ] ✅ 可以添加 3+ 个步骤
- [ ] ✅ 点击保存，显示"流程已保存"提示
- [ ] ✅ 网络请求使用 POST 方式 (status 201)
- [ ] ✅ 可以编辑已存在的流程
- [ ] ✅ 编辑流程时，网络请求使用 PUT 方式 (status 200)
- [ ] ✅ 没有 "Duplicate entry" 错误
- [ ] ✅ 数据库中 flow_steps 的 step_order 值正确
- [ ] ✅ 刷新页面后，流程和步骤仍然存在
- [ ] ✅ 在移动端也能正常保存

## 调试技巧

### 检查 API 请求

打开浏览器 DevTools (F12) → Network 选项卡：

1. **新建流程时**
   ```
   请求方式: POST /api/flows
   状态码: 201
   请求体: { id, name, steps: [...] }
   ```

2. **编辑流程时**
   ```
   请求方式: PUT /api/flows/:id
   状态码: 200
   请求体: { name, steps: [...] }
   ```

### 检查数据库

```sql
-- 查看是否有重复的 flow ID
SELECT id, COUNT(*) FROM flows GROUP BY id HAVING COUNT(*) > 1;

-- 查看步骤顺序是否正确
SELECT id, flow_id, step_order, name FROM flow_steps
ORDER BY flow_id, step_order;

-- 查看步骤的 step_order 是否有 NULL
SELECT * FROM flow_steps WHERE step_order IS NULL;
```

### 浏览器控制台日志

前端添加了详细的错误日志：

```javascript
// 在 saveFlow() 中
catch (error) {
  this.showMessage(`保存失败: ${error?.message}`, 'error')
  console.error('保存流程错误:', error)  // ✅ 查看完整的错误信息
}
```

## 相关文件

- 前端修改: `src/pages/workflow/FlowDiagramEditor.vue` (第 213-255 行)
- 后端修改: `server/routes/flows.js` (第 194-212 行 和 274-296 行)

## 提交信息

```
修复: 解决流程编辑时 Duplicate entry 错误

问题: 创建和编辑流程时出现 "Duplicate entry 'flow_xxx'" 错误

根本原因:
1. 前端 isNew 判断逻辑错误，导致重复 POST 请求
2. 前端步骤对象缺少 order 字段

解决方案:
1. 改进 isNew 逻辑，检查流程是否在列表中存在
2. 确保步骤有完整的 order 字段（基于数组索引）
3. 后端添加容错处理，即使没有 order 也能使用索引

Generated with Claude Code
```

## FAQ

### Q: 为什么会出现 Duplicate entry 错误?
A: 因为前端错误地判断了流程是新的，用 POST 尝试创建一个已存在的 ID。

### Q: 为什么步骤的 step_order 是 NULL?
A: 因为前端步骤对象中没有 `order` 字段，后端 SQL 参数为 undefined。

### Q: 修复后如何处理旧的错误流程?
A: 可以手动删除重复的流程记录：
```sql
DELETE FROM flows WHERE id = 'flow_1772103548835' AND created_at > ?;
```

### Q: 是否需要数据库迁移?
A: 不需要。修复只涉及应用代码，数据库结构不变。

## 参考资源

- MySQL Duplicate Entry 错误: https://dev.mysql.com/doc/refman/8.0/en/constraint-primary-key.html
- Vue 响应式系统: https://vuejs.org/guide/extras/reactivity-in-depth.html
- REST API 最佳实践: https://restfulapi.net/http-methods/

---

**修复日期**: 2026年2月26日
**受影响的版本**: 全部使用 FlowDiagramEditor.vue 的版本
**修复状态**: ✅ 完成
