# 工作流编辑器故障排除指南

> 本指南帮助开发者快速诊断和解决工作流编辑器中的常见问题。

## 常见问题和解决方案

### 问题 1: 添加步骤后编辑其他步骤失败

**症状**:
- 点击 [+ 添加步骤] 按钮成功添加新步骤
- 但尝试编辑已有步骤时发生错误或无响应

**根本原因**:
Vue 3 的响应式系统需要唯一的 `key` 来追踪列表项。如果两个步骤有相同的 ID，Vue 会混淆它们的状态。

**解决方案** ✅ (已修复):

```javascript
// ❌ 错误方式 - 时间戳可能重复
addStep() {
  this.editingFlow.steps.push({
    id: `step_${Date.now()}`,  // 毫秒级时间戳，高并发下会重复
    name: ''
  })
}

// ✅ 正确方式 - 确保唯一性
addStep() {
  const newStep = {
    id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: ''
  }
  this.editingFlow.steps.push(newStep)
  this.$nextTick(() => {
    this.editingStepIndex = this.editingFlow.steps.length - 1
  })
}
```

**关键点**:
- 使用 `Date.now()` + 随机字符串生成唯一 ID
- 用 `$nextTick()` 确保 DOM 更新后再设置选中状态
- 在模板中使用 `:key="step.id || index"` 作为备选

### 问题 2: 步骤列表不更新

**症状**:
- 添加、删除或移动步骤后，UI 不刷新
- 虽然数据已改变，但列表显示未变

**根本原因**:
Vue 的响应式系统对数组的某些操作不敏感（如直接修改索引）。

**解决方案** ✅ (已修复):

```javascript
// ❌ 错误方式 - 直接修改数组元素
this.editingFlow.steps[index] = newValue

// ✅ 正确方式 - 使用 Vue.set()
this.$set(this.editingFlow.steps, index, newValue)

// ❌ 错误方式 - 删除元素不彻底
this.editingFlow.steps.splice(index, 1)

// ✅ 正确方式 - 先删除，再拼接
this.$delete(this.editingFlow.steps, index)
this.editingFlow.steps.splice(index, 1)
```

### 问题 3: 移动步骤时出现顺序错乱

**症状**:
- 点击步骤的上移/下移按钮
- 视觉上看不到变化，或变化不正确

**根本原因**:
数组交换操作需要正确的响应式追踪。

**解决方案** ✅ (已修复):

```javascript
// ❌ 错误方式 - 无法追踪
const temp = this.steps[i]
this.steps[i] = this.steps[j]
this.steps[j] = temp

// ✅ 正确方式 - 使用 $set()
const temp = this.steps[i]
this.$set(this.steps, i, this.steps[j])
this.$set(this.steps, j, temp)
```

### 问题 4: 步骤文字保存成功，但刷新后消失

**症状**:
- 填写步骤名称和描述，点击保存
- 消息提示"保存成功"
- 但刷新页面后步骤内容不见了

**根本原因**:
流程数据可能未正确保存到后端，或者保存时缺少必要字段。

**诊断步骤**:

1. 打开浏览器开发者工具 (F12)
2. 切换到 Network 选项卡
3. 点击保存流程
4. 查看 API 请求:
   - 请求 URL: `/api/flows` 或 `/api/flows/:id`
   - 请求体: 检查是否包含所有步骤信息
   - 响应状态: 应该是 200 或 201

**解决方案**:

检查 `saveFlow()` 方法是否正确传递步骤数据:

```javascript
async saveFlow() {
  const flowData = {
    id: this.editingFlow.id,
    name: this.editingFlow.name,
    description: this.editingFlow.description,
    steps: this.editingFlow.steps,  // 确保包含所有步骤
    created_at: this.editingFlow.created_at,
    updated_at: Date.now()
  }

  const result = await api.flows.create(flowData)
  // 检查返回结果中的 steps 是否完整
}
```

### 问题 5: 输入框无法聚焦或输入

**症状**:
- 点击步骤名称字段，光标无法输入
- 字段显示灰色或不可用的样式

**根本原因**:
可能是 CSS 禁用状态或 Vue 绑定问题。

**解决方案**:

检查步骤字段是否被意外禁用:

```vue
<!-- ❌ 错误 - 字段被禁用 -->
<input v-model="step.name" :disabled="true" />

<!-- ✅ 正确 - 字段可编辑 -->
<input v-model="step.name" :disabled="false" />

<!-- ✅ 检查 CSS -->
<style scoped>
.step-input:disabled {
  opacity: 0.5;  /* 只改变外观，不影响输入 */
}
</style>
```

---

## 调试技巧

### 技巧 1: 在浏览器控制台检查数据

```javascript
// 打开浏览器 DevTools Console，运行:
// 1. 获取 Vue 实例
const app = document.querySelector('#app').__vue__

// 2. 查看当前编辑的流程
console.log(app.$children[0].editingFlow)

// 3. 查看步骤数组
console.log(app.$children[0].editingFlow.steps)

// 4. 检查步骤 ID 是否唯一
const ids = app.$children[0].editingFlow.steps.map(s => s.id)
console.log(new Set(ids).size === ids.length ? '✅ 所有 ID 唯一' : '❌ 有重复 ID')
```

### 技巧 2: 添加调试日志

在 `addStep()` 方法中添加日志:

```javascript
addStep() {
  console.log('📝 添加步骤前:', this.editingFlow.steps.length)

  const newStep = { /* ... */ }
  this.editingFlow.steps.push(newStep)

  this.$nextTick(() => {
    console.log('📝 添加步骤后:', this.editingFlow.steps.length)
    console.log('📝 新步骤 ID:', newStep.id)
    this.editingStepIndex = this.editingFlow.steps.length - 1
  })
}
```

### 技巧 3: 检查网络请求

使用 Network 选项卡查看 API 请求:

```
请求: POST /api/flows
请求头:
  Content-Type: application/json

请求体:
{
  "id": "flow_1708925000000",
  "name": "请假申请",
  "steps": [
    { "id": "step_...", "name": "填写申请", ... },
    { "id": "step_...", "name": "部门审核", ... }
  ]
}

响应:
{
  "id": "flow_1708925000000",
  "name": "请假申请",
  "steps": [ ... ]  // 检查步骤是否完整返回
}
```

---

## Vue 3 响应式最佳实践

### ✅ DO: 使用正确的更新方式

```javascript
// 1. 添加新属性 - 使用 $set()
this.$set(object, 'newProperty', value)
// 或
this.$set(array, index, value)

// 2. 修改数组 - 使用响应式方法
array.push(item)      // ✅
array.splice(i, 1)    // ✅
array.sort()          // ✅

// 3. 等待 DOM 更新 - 使用 $nextTick()
this.$nextTick(() => {
  // DOM 已更新，此时可以访问 $refs 等
})
```

### ❌ DON'T: 避免这些操作

```javascript
// 1. 直接修改数组索引
object.array[0] = newValue  // ❌ 不会触发更新

// 2. 向对象添加新属性
object.newProperty = value   // ❌ 不会触发更新

// 3. 删除对象属性
delete object.property       // ❌ 不会触发更新

// 4. 重新分配整个数组
this.array = newArray        // ⚠️ 可能导致绑定丢失

// 5. 不使用 key 的列表
<div v-for="item in items">  <!-- ❌ 没有 :key -->
```

---

## 步骤编辑器架构

### 数据流

```
用户输入
   ↓
v-model 双向绑定
   ↓
editingFlow.steps[i] 更新
   ↓
$set() / $delete() 触发响应式
   ↓
Vue 检测变化
   ↓
重新渲染模板
   ↓
用户看到更新
```

### 关键文件

- `/src/pages/workflow/FlowDiagramEditor.vue` - 主组件
  - 第 252-268 行: `addStep()` 方法
  - 第 266-272 行: `removeStep()` 方法
  - 第 274-282 行: `moveStep()` 方法

- `/src/utils/api.js` - API 层
  - `api.flows.create()` - 创建流程
  - `api.flows.update()` - 更新流程
  - `api.flows.delete()` - 删除流程

---

## 测试清单

在提交代码前，检查以下项目:

- [ ] ✅ 可以创建新流程
- [ ] ✅ 可以添加多个步骤
- [ ] ✅ 可以编辑步骤名称和描述
- [ ] ✅ 可以删除步骤
- [ ] ✅ 可以移动步骤（上移/下移）
- [ ] ✅ 步骤顺序正确
- [ ] ✅ 可以保存流程
- [ ] ✅ 刷新页面后数据仍存在
- [ ] ✅ 移动端可以正常编辑
- [ ] ✅ 没有控制台错误

---

## 获取帮助

如果问题仍未解决，检查:

1. **浏览器控制台** - 有无红色错误信息?
2. **网络选项卡** - API 请求是否成功 (状态 200)?
3. **Application/Storage** - LocalStorage 是否保存了数据?
4. **Vue DevTools** - 组件状态是否正确?

如果都不行，尝试:

```bash
# 1. 清除浏览器缓存
# 按 Cmd+Shift+Delete (Mac) 或 Ctrl+Shift+Delete (Windows)

# 2. 重启开发服务器
npm run dev

# 3. 检查后端日志
# 在服务器终端查看是否有错误
```

---

**文档版本**: 1.0
**最后更新**: 2026年2月26日
**修复日期**: 2026年2月26日 (步骤管理响应式问题)
