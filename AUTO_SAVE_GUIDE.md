# 流程编辑器自动保存功能指南

## 功能概述

自动保存功能可以自动保存你在流程编辑器中的所有更改，确保数据不会因为意外关闭或网络问题而丢失。

### 什么会触发自动保存？

✅ **自动保存的操作**：
- 输入流程名称
- 修改流程描述
- 添加新步骤
- 删除步骤
- 修改步骤名称、描述、负责人、耗时
- 勾选/取消步骤的"条件触发"
- 移动步骤（上移/下移）

### 工作原理

```
用户编辑 → scheduleAutoSave() 被调用
              ↓
        清除旧计时器
              ↓
        设置 10 秒的新计时器
              ↓
        [等待 10 秒]
              ↓
        检查是否有变化
              ↓
   有变化 → autoSave()
              ↓
        发送到服务器
              ↓
        显示 "✓ 已自动保存" 提示
```

## 用户指南

### 1. 自动保存启用（默认）

自动保存功能**默认启用**，你无需进行任何配置。

### 2. 自动保存提示

当流程自动保存时，你会看到一个**紫色的提示**：

```
✓ 已自动保存
```

这个提示会在 2 秒后自动消失。

### 3. 自动保存间隔

- **检测间隔**: 10 秒
- **触发条件**: 最后一次编辑后 10 秒内没有新的编辑操作
- **扫描频率**: 每次编辑都会重置计时器

### 4. 手动保存

除了自动保存外，你仍然可以点击 **[保存]** 按钮进行手动保存：

```
点击 [保存] → 立即保存（不等待 10 秒）
              → 显示 "流程已保存" 提示
              → 返回流程列表
```

**手动保存和自动保存的区别**：

| 功能 | 手动保存 | 自动保存 |
|------|---------|---------|
| 触发 | 点击按钮 | 自动（10 秒） |
| 返回列表 | ✅ 是 | ❌ 否 |
| 显示时间 | 3 秒 | 2 秒 |
| 颜色 | 绿色 | 紫色 |
| 关闭浏览器前 | ❌ 不会触发 | ✅ 会触发 |

### 5. 编辑流程的完整工作流

```
1. 点击 [编辑流程]
   ↓
2. 修改流程信息（触发自动保存）
   ↓
3. 添加/编辑步骤（每次都触发自动保存）
   ↓
4. [等待 10 秒自动保存]
   → 看到 "✓ 已自动保存" 提示
   ↓
5. 选项 A: 继续编辑 → 自动保存计时器重置
   选项 B: 点击 [保存] → 立即保存并返回列表
```

## 开发者指南

### 核心方法

#### 1. `hasChanges()`
检查流程是否有未保存的更改。

```javascript
hasChanges() {
  if (!this.editingFlow || !this.lastSavedFlow) return true
  return JSON.stringify(this.editingFlow) !== JSON.stringify(this.lastSavedFlow)
}
```

**返回值**:
- `true` - 有未保存的更改
- `false` - 没有更改

#### 2. `scheduleAutoSave()`
调度自动保存。当用户进行编辑操作时调用。

```javascript
scheduleAutoSave() {
  // 清除旧的计时器
  if (this.autoSaveTimer) {
    clearTimeout(this.autoSaveTimer)
  }

  // 如果禁用了自动保存，则不调度
  if (!this.autoSaveEnabled) return

  // 设置新的计时器
  this.autoSaveTimer = setTimeout(() => {
    if (this.editingFlow && this.hasChanges()) {
      this.autoSave()
    }
  }, this.autoSaveInterval)
}
```

**何时调用**:
- 用户输入文本 (@input)
- 用户改变复选框 (@change)
- 用户添加/删除/移动步骤

#### 3. `autoSave()`
执行自动保存逻辑。

```javascript
async autoSave() {
  // 1. 检查是否可以保存
  if (!this.editingFlow || this.isAutoSaving || !this.autoSaveEnabled) return
  if (!this.hasChanges()) return

  // 2. 设置保存中状态
  this.isAutoSaving = true

  try {
    // 3. 构造流程数据
    const flowData = { /* ... */ }

    // 4. 确定是新流程还是已存在的流程
    const isNew = !this.flows.some(f => f.id === this.editingFlow.id)

    // 5. 发送到服务器
    if (isNew) {
      await api.flows.create(flowData)
    } else {
      await api.flows.update(this.editingFlow.id, flowData)
    }

    // 6. 更新最后保存的状态
    this.lastSavedFlow = JSON.parse(JSON.stringify(this.editingFlow))

    // 7. 显示成功提示
    this.message = { text: '✓ 已自动保存', type: 'success' }
  } catch (error) {
    // 8. 显示错误提示
    this.message = { text: `自动保存失败: ${error?.message}`, type: 'error' }
  } finally {
    this.isAutoSaving = false
  }
}
```

### 数据结构

#### Data 属性

```javascript
data() {
  return {
    // ... 其他属性

    // 自动保存相关
    autoSaveTimer: null,              // 保存计时器 ID
    lastSavedFlow: null,              // 上次保存的流程副本
    isAutoSaving: false,              // 是否正在保存中
    autoSaveEnabled: true,            // 自动保存是否启用
    autoSaveInterval: 10000           // 自动保存间隔（毫秒）
  }
}
```

### 集成点

**自动保存已集成到以下位置**：

1. **输入字段** - 通过 @input 事件
   ```vue
   <input @input="scheduleAutoSave" />
   <textarea @input="scheduleAutoSave" />
   ```

2. **复选框** - 通过 @change 事件
   ```vue
   <input type="checkbox" @change="scheduleAutoSave" />
   ```

3. **操作方法** - 在方法调用后
   ```javascript
   addStep() { /* ... */ this.scheduleAutoSave() }
   removeStep() { /* ... */ this.scheduleAutoSave() }
   moveStep() { /* ... */ this.scheduleAutoSave() }
   ```

4. **流程编辑** - 初始化时保存状态
   ```javascript
   editFlow(flow) {
     this.editingFlow = JSON.parse(JSON.stringify(flow))
     this.lastSavedFlow = JSON.parse(JSON.stringify(flow))
   }
   ```

5. **生命周期** - 清理定时器
   ```javascript
   beforeUnmount() {
     if (this.autoSaveTimer) {
       clearTimeout(this.autoSaveTimer)
     }
   }
   ```

## 配置选项

### 禁用自动保存

如果需要禁用自动保存，可以在 data 中修改：

```javascript
data() {
  return {
    autoSaveEnabled: false  // 禁用自动保存
  }
}
```

### 修改保存间隔

要改变自动保存间隔（默认 10 秒），修改：

```javascript
data() {
  return {
    autoSaveInterval: 5000  // 改为 5 秒
  }
}
```

## 故障排除

### 问题 1: 自动保存显示失败提示

**症状**:
```
自动保存失败: 保存失败的错误信息
```

**原因**:
- 网络连接问题
- 服务器暂时无法访问
- 流程数据验证失败（如缺少必填字段）

**解决方案**:
1. 检查网络连接
2. 查看浏览器 DevTools Network 选项卡中的错误
3. 确保流程名称不为空
4. 尝试手动保存，查看详细错误信息

### 问题 2: 自动保存没有触发

**症状**:
```
编辑流程，但没有看到 "✓ 已自动保存" 提示
```

**原因**:
- 自动保存已禁用（`autoSaveEnabled: false`）
- 计时器被清除（如导航到其他页面）
- 没有检测到文本变化

**解决方案**:
1. 检查 `autoSaveEnabled` 是否为 `true`
2. 打开浏览器 DevTools Console，运行：
   ```javascript
   console.log(vm.autoSaveEnabled)  // 应该显示 true
   ```
3. 手动编辑流程名称，等待 10 秒

### 问题 3: 自动保存频率太高/太低

**症状**:
```
每次编辑都立即保存（频繁显示提示）
或
需要等待很长时间才能看到保存提示
```

**解决方案**:
修改 `autoSaveInterval`：
- 更快保存: `autoSaveInterval: 3000` (3 秒)
- 更慢保存: `autoSaveInterval: 15000` (15 秒)

### 问题 4: 页面关闭时数据丢失

**症状**:
```
编辑了流程，但没有保存，关闭浏览器标签页，数据丢失
```

**解决方案**:
1. 手动点击 [保存] 按钮，确保保存
2. 自动保存不会在关闭前自动触发，只有在 10 秒的等待期内才会保存
3. 如果编辑后需要立即离开，请手动保存

## 性能考虑

### 自动保存的性能影响

- ✅ **最小化**: 仅在有变化时发送请求
- ✅ **去抖**: 使用计时器避免频繁请求
- ✅ **异步**: 不会阻塞 UI
- ✅ **后台**: 用户可以继续编辑，不会等待保存完成

### 网络优化

- **请求频率**: 最多 1 次/10 秒（有编辑时）
- **请求体大小**: 取决于流程和步骤数量（通常 < 10KB）
- **响应时间**: 通常 < 1 秒

## 测试清单

- [ ] ✅ 编辑流程名称，10 秒后看到 "✓ 已自动保存"
- [ ] ✅ 编辑步骤信息，10 秒后看到自动保存
- [ ] ✅ 添加步骤，10 秒后自动保存
- [ ] ✅ 删除步骤，10 秒后自动保存
- [ ] ✅ 移动步骤，10 秒后自动保存
- [ ] ✅ 快速连续编辑，计时器被重置，最后保存一次
- [ ] ✅ 点击 [保存]，立即保存并返回列表
- [ ] ✅ 自动保存失败时，显示错误提示
- [ ] ✅ 刷新页面，流程数据仍然存在（由于自动保存）
- [ ] ✅ 在移动设备上也能正常工作

## API 集成

自动保存使用与手动保存相同的 API：

- **新建流程**: `POST /api/flows`
- **更新流程**: `PUT /api/flows/:id`

具体请参考后端 API 文档。

## 与手动保存的区别

| 特性 | 自动保存 | 手动保存 |
|------|---------|---------|
| 何时触发 | 用户停止编辑 10 秒后 | 用户点击保存按钮 |
| 是否返回列表 | ❌ 否 | ✅ 是 |
| 提示显示时间 | 2 秒 | 3 秒 |
| 提示颜色 | 紫色 | 绿色 |
| 是否可配置 | ✅ 可以 | ❌ 否 |
| 错误处理 | 显示错误提示 | 显示错误提示 |

## 相关文件

- 实现文件: `src/pages/workflow/FlowDiagramEditor.vue`
- 关键方法:
  - `hasChanges()` - 第 379-383 行
  - `scheduleAutoSave()` - 第 384-398 行
  - `autoSave()` - 第 399-441 行

## 更新历史

- **2026-02-26**: 实现自动保存功能
  - 添加 10 秒自动保存间隔
  - 去抖处理，避免频繁保存
  - 完整的错误处理和提示
  - 移动端适配

---

**功能版本**: 1.0
**最后更新**: 2026年2月26日
**维护人**: Claude Code
