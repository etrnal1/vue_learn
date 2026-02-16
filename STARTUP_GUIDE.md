# Vue 3 项目启动指南

## 🎯 完整启动步骤

### 步骤 1️⃣: 检查 Node.js

首先确保你已安装 Node.js：

```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version
```

要求：Node.js >= 16.0 版本

如果未安装，[下载 Node.js](https://nodejs.org/)

---

### 步骤 2️⃣: 进入项目目录

```bash
cd /Users/mac/vue-learning-app
```

---

### 步骤 3️⃣: 安装依赖

```bash
npm install
```

这会下载并安装项目所需的所有包：
- `vue@^3.3.4` - Vue 3 框架
- `vite@^4.3.9` - 构建工具
- `@vitejs/plugin-vue@^4.2.3` - Vue 插件

**预计时间**：2-5 分钟（取决于网速）

---

### 步骤 4️⃣: 启动开发服务器

```bash
npm run dev
```

你会看到这样的输出：

```
  VITE v4.3.9  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**浏览器会自动打开** `http://localhost:5173`

---

## 🎮 开发工作流

### 修改代码

编辑任何 `.vue` 或 `.js` 文件后：
- 浏览器会**自动刷新**（热更新）
- 无需手动刷新页面
- 状态会保留，只更新改变的部分

### 停止服务器

在终端按 `Ctrl + C`

### 重新启动

```bash
npm run dev
```

---

## 📦 生产构建

当你完成开发，准备发布时：

```bash
npm run build
```

这会：
1. 编译所有 `.vue` 文件
2. 优化代码和资源
3. 输出到 `dist/` 目录
4. 生成可部署的版本

输出示例：
```
dist/
├── index.html
├── assets/
│   ├── index-xxxxx.js
│   ├── index-xxxxx.css
│   └── ...
```

### 预览生产版本

```bash
npm run preview
```

---

## 🐛 常见问题

### ❌ 问题 1: 端口被占用

如果看到错误 `EADDRINUSE: address already in use`

**解决方案**：
```bash
# 找到占用 5173 端口的进程
lsof -i :5173

# 杀死进程
kill -9 <PID>

# 重新启动
npm run dev
```

### ❌ 问题 2: npm 安装失败

**解决方案**：
```bash
# 清除 npm 缓存
npm cache clean --force

# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### ❌ 问题 3: 模块未找到

**解决方案**：
```bash
# 确保所有依赖都已安装
npm install

# 重启开发服务器
npm run dev
```

---

## 📁 文件说明

### 项目文件

| 文件 | 说明 |
|------|------|
| `package.json` | 项目依赖和脚本配置 |
| `vite.config.js` | Vite 构建配置 |
| `index.html` | 入口 HTML 文件 |
| `src/main.js` | 应用入口 |
| `src/App.vue` | 根组件 |
| `.gitignore` | Git 忽略文件 |

### 源代码

| 目录 | 说明 |
|------|------|
| `src/pages/` | 页面组件（完整页面）|
| `src/components/` | UI 组件（复用组件）|
| `src/style.css` | 全局样式 |

### 生成目录

| 目录 | 说明 |
|------|------|
| `node_modules/` | 安装的依赖包 |
| `dist/` | 生产构建输出 |

---

## 🏗️ 项目架构

```
用户交互 (浏览器)
    ↓
App.vue (根组件)
    ↓
Tab 导航 (切换页面)
    ├─→ HomePage.vue
    ├─→ SpringReference.vue
    │   ├─ ConceptCard.vue (多个)
    │   └─ FlowChart.vue
    └─→ ExcelReference.vue
        ├─ FunctionCard.vue (多个)
        └─ Header.vue
```

---

## 🔧 项目配置

### 更改端口

编辑 `vite.config.js`：

```javascript
export default defineConfig({
  server: {
    port: 3000,  // 改为 3000
    open: true
  }
})
```

然后重启：`npm run dev`

### 更改标题

编辑 `index.html`：

```html
<title>你的标题</title>
```

---

## 📚 Vue 3 学习资源

- [Vue 3 官方文档](https://vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Vue 3 组件速查](https://vuejs.org/guide/components/)

---

## ✅ 验证启动成功

打开浏览器访问 `http://localhost:5173` 后，你应该看到：

✅ 紫蓝色的头部
✅ 三个 Tab：首页、Spring 参考、Excel 参考
✅ 响应式卡片布局
✅ 搜索和筛选功能

---

## 🎉 完成！

现在你可以开始开发了！

### 接下来你可以：

1. **浏览现有功能**
   - 尝试搜索 Spring 注解
   - 查看 Excel 函数参考
   - 查看流程图

2. **修改代码**
   - 编辑 `src/pages/HomePage.vue`
   - 改变颜色或文字
   - 实时看到页面更新

3. **添加新功能**
   - 创建新的 Vue 组件
   - 添加更多参考资料
   - 集成后端 API

4. **构建生产版本**
   - 运行 `npm run build`
   - 将 `dist/` 文件夹部署到服务器

---

## 💡 有用的 npm 命令

```bash
# 安装新包
npm install package-name

# 删除包
npm uninstall package-name

# 列出所有已安装的包
npm list

# 更新所有包
npm update

# 检查过时的包
npm outdated
```

---

**遇到问题？检查浏览器控制台（F12）的错误信息，或查看终端输出！** 🔍

**Happy Coding! 🚀**
