# Vue 3 学习参考应用

一个使用 **Vue 3 + Vite** 构建的学习参考平台，包含 Spring 框架、Excel 函数等完整的参考资料。

## 🎯 项目特点

- ✨ **Vue 3 组件化架构** - 模块化设计，易于维护
- ⚡ **Vite 高速开发** - 闪电般的热更新体验
- 📚 **丰富的参考资料** - Spring 注解、Excel 函数等
- 🔍 **实时搜索和筛选** - 快速查找所需内容
- 📱 **响应式设计** - 完美适配各种屏幕
- 🎨 **现代化 UI** - 优雅的界面设计

## 📁 项目结构

```
vue-learning-app/
├── index.html                 # 入口 HTML
├── package.json              # 项目配置
├── vite.config.js           # Vite 配置
├── src/
│   ├── main.js              # 应用入口
│   ├── App.vue              # 根组件
│   ├── style.css            # 全局样式
│   ├── pages/
│   │   ├── HomePage.vue           # 首页
│   │   ├── SpringReference.vue    # Spring 参考页
│   │   └── ExcelReference.vue     # Excel 参考页
│   └── components/
│       ├── Header.vue             # 头部组件
│       ├── ConceptCard.vue        # 概念卡片
│       ├── FunctionCard.vue       # 函数卡片
│       └── FlowChart.vue          # 流程图组件
├── .gitignore
└── README.md
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /Users/mac/vue-learning-app
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

浏览器会自动打开 `http://localhost:5173`

### 3. 构建生产版本

```bash
npm run build
```

生产文件会输出到 `dist/` 目录

## 🛠️ 技术栈

- **Vue 3** - 现代的 JavaScript 框架
- **Vite** - 闪电般的构建工具
- **CSS 3** - 现代样式方案
- **JavaScript ES6+** - 最新的 JavaScript 标准

## 📊 功能说明

### 首页 (HomePage)
- 项目介绍和特点展示
- 快速访问各个参考资料
- 技术栈信息

### Spring 参考 (SpringReference)
- 📚 **注解参考** - 10+ 核心注解讲解
  - 响应式搜索
  - 难度分级筛选
  - 详细用法说明

- 🔄 **核心流程** - 3 种重要流程可视化
  - 启动流程
  - 请求处理流程
  - Bean 生命周期

### Excel 参考 (ExcelReference)
- 📐 数学函数 - SUM、AVERAGE、MAX 等
- 🔀 逻辑函数 - IF、AND、OR 等
- 🔍 查找函数 - VLOOKUP、INDEX 等
- ✏️ 文本函数 - CONCATENATE、LEFT 等
- 📅 日期函数 - TODAY、NOW 等

## 💡 核心组件说明

### App.vue (根组件)
```vue
<template>
  <!-- Tab 导航 -->
  <div class="tabs-container">
    <!-- 首页、Spring 参考、Excel 参考 -->
  </div>

  <!-- 页面内容 -->
  <HomePage v-if="activeTab === 'home'" />
  <SpringReference v-if="activeTab === 'spring'" />
  <ExcelReference v-if="activeTab === 'excel'" />
</template>
```

### ConceptCard.vue (概念卡片)
展示 Spring 注解的卡片组件，支持：
- 标题和徽章显示
- 点击展开详情
- 难度分级展示

### FunctionCard.vue (函数卡片)
展示 Excel 函数的卡片组件，支持：
- 函数名称和描述
- 使用示例
- 返回结果

### FlowChart.vue (流程图)
展示 Spring 三大流程的组件：
- 启动流程
- 请求处理
- Bean 生命周期

## 🎓 学习路径

### Vue 3 学习要点

1. **组件基础**
   - 如何定义和使用 `.vue` 文件
   - props 传递数据
   - emits 触发事件

2. **响应式数据**
   - `data()` 函数
   - `computed` 计算属性
   - `methods` 方法

3. **模板语法**
   - `v-model` 双向绑定
   - `v-for` 循环渲染
   - `v-if` 条件渲染
   - `@click` 事件处理
   - `:class` 动态类名

4. **组件通信**
   - props 下传数据
   - emits 上传事件
   - 父子组件交互

5. **生命周期**
   - `mounted` 组件挂载
   - `updated` 组件更新

## 📈 扩展建议

### 可以添加的功能：
1. **状态管理** - 使用 Pinia 管理全局状态
2. **路由** - 使用 Vue Router 实现页面路由
3. **样式预处理** - 集成 SCSS/LESS
4. **类型支持** - 添加 TypeScript 支持
5. **API 集成** - 连接后端 API
6. **权限管理** - 用户认证和授权

## 🔧 常见命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 清理依赖
rm -rf node_modules
npm install
```

## 📝 开发建议

### 添加新功能的步骤：

1. **在 `src/pages/` 或 `src/components/` 中创建新组件**
   ```vue
   <template>
     <!-- 组件模板 -->
   </template>

   <script>
   export default {
     name: 'NewComponent'
   }
   </script>

   <style scoped>
     /* 组件样式 */
   </style>
   ```

2. **在 `App.vue` 中导入并使用**
   ```javascript
   import NewComponent from './pages/NewComponent.vue'
   ```

3. **在模板中使用**
   ```html
   <NewComponent v-if="activeTab === 'new'" />
   ```

## 🎨 样式系统

项目使用一致的色彩方案：
- **主色** - #667eea (紫蓝色)
- **辅色** - #10b981 (绿色)
- **强调** - #764ba2 (深紫色)
- **中立** - #666, #999 (灰色)

## 📞 支持

如有问题，请：
1. 检查浏览器控制台是否有错误
2. 确保 Node.js 版本 >= 16.0
3. 尝试删除 `node_modules` 和 `package-lock.json` 重新安装

## 📄 许可证

MIT License

---

**Enjoy Learning! 🎉**
