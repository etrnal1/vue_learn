# ⚡ 5分钟快速启动

## 最快的启动方式

### 方式 1️⃣: 使用启动脚本（推荐）

```bash
cd /Users/mac/vue-learning-app
./start.sh
```

脚本会自动：
✅ 检查 Node.js
✅ 安装依赖（如果需要）
✅ 启动开发服务器
✅ 打开浏览器

### 方式 2️⃣: 手动启动

```bash
# 进入项目目录
cd /Users/mac/vue-learning-app

# 安装依赖（首次）
npm install

# 启动开发服务器
npm run dev
```

### 方式 3️⃣: 使用 VS Code

1. 在 VS Code 中打开 `/Users/mac/vue-learning-app`
2. 打开终端（Ctrl + `）
3. 运行 `npm run dev`

---

## 🎉 启动成功标志

当看到这样的输出说明启动成功：

```
  VITE v4.3.9  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

浏览器会自动打开 `http://localhost:5173`

---

## 📋 项目内容一览

### 🏠 首页
- 项目介绍
- 功能特点
- 技术栈

### 🚀 Spring 参考
**注解参考**
- @SpringBootApplication
- @Bean
- @Component
- @Service
- @Autowired
- @RestController
- ...等更多

**核心流程**
- 启动流程图
- 请求处理流程
- Bean 生命周期

### 📊 Excel 参考
**5 个分类，25+ 个函数**
- 📐 数学函数 (SUM, AVERAGE, MAX, MIN, COUNT, ROUND)
- 🔀 逻辑函数 (IF, AND, OR, NOT)
- 🔍 查找函数 (VLOOKUP, HLOOKUP, INDEX, MATCH)
- ✏️ 文本函数 (CONCATENATE, LEFT, RIGHT, LEN, UPPER, LOWER)
- 📅 日期函数 (TODAY, NOW, YEAR, MONTH, DAY)

---

## 💻 开发中的实时修改

当你修改代码时：

```
修改 src/App.vue
     ↓
保存文件
     ↓
Vite 检测到变化
     ↓
自动编译 (< 1秒)
     ↓
浏览器自动更新 (无需手动刷新)
     ↓
继续开发 ✓
```

---

## 🛠️ 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产版本 |
| `npm install` | 安装依赖 |
| `npm update` | 更新依赖 |

---

## 📂 项目文件树

```
vue-learning-app/
├── 📄 package.json          # 项目配置
├── 📄 vite.config.js        # Vite 配置
├── 📄 index.html            # 入口 HTML
├── 📄 README.md             # 项目文档
├── 📄 STARTUP_GUIDE.md      # 详细启动指南
├── 📄 QUICK_START.md        # 快速启动 (此文件)
├── 📄 start.sh              # 启动脚本
├── 📁 src/
│   ├── 📄 main.js           # 应用入口
│   ├── 📄 App.vue           # 根组件
│   ├── 📄 style.css         # 全局样式
│   ├── 📁 pages/            # 页面组件
│   │   ├── HomePage.vue
│   │   ├── SpringReference.vue
│   │   └── ExcelReference.vue
│   └── 📁 components/       # 可复用组件
│       ├── Header.vue
│       ├── ConceptCard.vue
│       ├── FunctionCard.vue
│       └── FlowChart.vue
└── 📁 dist/                 # 生产输出 (npm run build)
```

---

## ❓ 故障排除

### 问题：npm install 失败

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 问题：端口 5173 被占用

```bash
# 改用其他端口，编辑 vite.config.js:
port: 3000  # 改为 3000

# 或杀死占用进程
lsof -i :5173
kill -9 <PID>
```

### 问题：浏览器无法打开

手动访问：`http://localhost:5173`

---

## 📚 学到什么

通过这个项目，你可以学到：

✅ Vue 3 组件化开发
✅ 响应式数据绑定
✅ 组件通信 (props, emits)
✅ Vite 构建工具
✅ 模块化项目结构
✅ 现代化前端开发流程

---

## 🚀 下一步

### 1. 理解项目结构
- 打开 `src/App.vue` 了解组件结构
- 查看 `src/pages/HomePage.vue` 学习组件用法

### 2. 修改内容
- 改变文字和颜色
- 添加新的 Spring 注解
- 添加新的 Excel 函数

### 3. 创建新功能
- 在 `src/pages/` 创建新页面
- 在 `src/components/` 创建新组件
- 在 `App.vue` 中集成

### 4. 扩展项目
- 添加路由 (Vue Router)
- 集成状态管理 (Pinia)
- 连接后端 API
- 添加 TypeScript

---

## 🎓 推荐学习资源

- [Vue 3 官方教程](https://vuejs.org/guide/introduction.html)
- [Vite 官方文档](https://vitejs.dev/)
- [Vue 3 API 速查](https://vuejs.org/api/)

---

## 💡 小贴士

- 按 `h` 在终端查看 Vite 帮助
- 按 `q` 停止开发服务器
- 按 `F12` 打开浏览器开发者工具
- 查看 `Network` 标签页理解资源加载
- 查看 `Console` 标签页调试代码

---

## 🎉 现在你已准备好了！

```bash
cd /Users/mac/vue-learning-app
./start.sh
```

**Happy Coding! 🚀**
