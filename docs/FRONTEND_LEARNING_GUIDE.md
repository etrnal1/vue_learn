# 前端完全学习指南 - Vue Learning App

> 从零开始学习前端开发，专为 Vue Learning App 项目设计

## 📚 目录

1. [前端基础知识](#前端基础知识)
2. [HTML 基础](#html-基础)
3. [CSS 基础](#css-基础)
4. [JavaScript 基础](#javascript-基础)
5. [Vue 3 核心概念](#vue-3-核心概念)
6. [项目架构与约定](#项目架构与约定)
7. [实战案例教学](#实战案例教学)
8. [常见问题解答](#常见问题解答)

---

## 前端基础知识

### 什么是前端？

前端是用户在浏览器中直接看到和交互的部分。由三种技术组成：

| 技术 | 作用 | 类比 |
|------|------|------|
| **HTML** | 结构和内容 | 房子的框架和墙体 |
| **CSS** | 样式和美化 | 房子的装修和涂料 |
| **JavaScript** | 交互和逻辑 | 房子的电气系统和自动化 |

### 前端开发工作流

```
设计稿
  ↓
HTML 编写结构
  ↓
CSS 美化样式
  ↓
JavaScript 添加交互
  ↓
浏览器渲染
  ↓
用户看到页面并交互
```

### 浏览器如何工作

1. 用户在浏览器地址栏输入 URL
2. 浏览器向服务器请求 HTML 文件
3. 浏览器解析 HTML，加载 CSS、JavaScript、图片等资源
4. 浏览器渲染页面，显示给用户
5. JavaScript 监听用户交互（点击、输入等）
6. 用户交互触发代码执行，更新页面

---

## HTML 基础

### 什么是 HTML？

HTML (HyperText Markup Language) 是用来定义网页结构和内容的标记语言。

### HTML 基本结构

```html
<!DOCTYPE html>                    <!-- 声明这是HTML5文档 -->
<html lang="zh-CN">               <!-- 根元素，lang属性指定语言 -->
  <head>                           <!-- 头部：包含元数据、样式等 -->
    <meta charset="UTF-8">         <!-- 字符编码 -->
    <title>页面标题</title>         <!-- 浏览器标签页显示的标题 -->
    <link rel="stylesheet" href="style.css">  <!-- 链接CSS文件 -->
  </head>

  <body>                           <!-- 主体：用户看到的内容 -->
    <h1>这是标题</h1>
    <p>这是段落</p>
    <script src="main.js"></script>  <!-- 引入JavaScript文件 -->
  </body>
</html>
```

### 常用 HTML 标签

#### 文本标签
```html
<h1> 到 <h6>    <!-- 标题，h1最大，h6最小 -->
<p>              <!-- 段落 -->
<strong>         <!-- 强调（加粗），语义化 -->
<em>             <!-- 强调（斜体），语义化 -->
<br>             <!-- 换行 -->
<hr>             <!-- 水平线 -->
```

#### 链接和图片
```html
<a href="https://example.com">链接文本</a>       <!-- 超链接 -->
<img src="image.jpg" alt="图片描述">             <!-- 图片 -->
```

#### 列表
```html
<!-- 无序列表 -->
<ul>
  <li>项目1</li>
  <li>项目2</li>
</ul>

<!-- 有序列表 -->
<ol>
  <li>第一步</li>
  <li>第二步</li>
</ol>
```

#### 表单
```html
<form>
  <!-- 文本输入 -->
  <input type="text" placeholder="输入文本">

  <!-- 密码输入 -->
  <input type="password" placeholder="输入密码">

  <!-- 选择框 -->
  <select>
    <option>选项1</option>
    <option>选项2</option>
  </select>

  <!-- 多行文本 -->
  <textarea rows="4"></textarea>

  <!-- 按钮 -->
  <button type="submit">提交</button>
</form>
```

#### 容器和结构
```html
<div>            <!-- 通用容器，块级元素 -->
<span>           <!-- 通用容器，行内元素 -->
<section>        <!-- 章节容器 -->
<header>         <!-- 页头 -->
<footer>         <!-- 页脚 -->
<nav>            <!-- 导航 -->
<main>           <!-- 主内容 -->
```

### div 和 span 的区别

| 特性 | div | span |
|------|-----|------|
| 类型 | 块级元素 | 行内元素 |
| 占用空间 | 独占一行 | 不独占行 |
| 用途 | 大区域分组 | 小文本分组 |
| 宽度 | 默认100% | 由内容决定 |

```html
<!-- div：块级，独占一行 -->
<div>我独占一行</div>
<div>我也独占一行</div>

<!-- span：行内，共享一行 -->
<span>我和</span><span>我在同一行</span>
```

---

## CSS 基础

### 什么是 CSS？

CSS (Cascading Style Sheets) 是用来美化 HTML 的样式语言。

### CSS 语法

```css
选择器 {
  属性名: 属性值;
  属性名: 属性值;
}

例子：
p {
  color: blue;        /* 文字颜色 */
  font-size: 16px;    /* 字体大小 */
}
```

### CSS 选择器

#### 基础选择器
```css
/* 1. 标签选择器：选择所有该标签 */
p { color: blue; }

/* 2. 类选择器：选择有该类名的元素 */
.header { background-color: gray; }

/* 3. ID选择器：选择有该ID的元素（一般一个ID对应一个元素） */
#main { width: 1200px; }

/* 4. 通配符：选择所有元素 */
* { margin: 0; }
```

#### 组合选择器
```css
/* 后代选择器：选择该元素内的所有后代 */
.container p { color: red; }

/* 子选择器：只选择直接子元素 */
.container > p { color: blue; }

/* 相邻选择器：选择紧邻的下一个元素 */
h1 + p { font-size: 18px; }

/* 通用兄弟选择器：选择后面的所有兄弟元素 */
h1 ~ p { margin-top: 20px; }
```

#### 属性选择器
```css
/* 选择有特定属性的元素 */
input[type="text"] { border: 1px solid blue; }

/* 选择属性值包含特定文本的元素 */
a[href*="example"] { color: green; }
```

### 常用样式属性

#### 颜色和背景
```css
color: red;                    /* 文字颜色 */
background-color: blue;       /* 背景色 */
background-image: url('...'); /* 背景图片 */
opacity: 0.5;                 /* 不透明度 (0-1) */
```

#### 文字样式
```css
font-size: 16px;              /* 字体大小 */
font-family: Arial, sans-serif; /* 字体 */
font-weight: bold;            /* 字体粗细 (normal, bold, 100-900) */
text-align: center;           /* 对齐方式 (left, center, right) */
line-height: 1.5;             /* 行高 */
text-decoration: underline;   /* 文本装饰 (underline, overline, line-through) */
```

#### 盒子模型（非常重要！）
```css
/* 盒子模型顺序：content -> padding -> border -> margin */

width: 200px;                 /* 内容宽度 */
height: 100px;                /* 内容高度 */

padding: 10px;                /* 内边距（内容和边框之间） */
padding: 10px 20px;           /* 上下10px, 左右20px */
padding: 10px 20px 30px 40px; /* 上右下左 */

border: 1px solid black;      /* 边框：宽度 样式 颜色 */
border-radius: 5px;           /* 圆角 */

margin: 20px;                 /* 外边距（边框外） */
margin: 0 auto;               /* 上下0，左右自动（水平居中） */
```

**盒子模型示意图：**
```
┌─ margin ─────────────────────────────┐
│  ┌─ border ───────────────────────┐  │
│  │  ┌─ padding ──────────────────┐│  │
│  │  │  ┌─ content ─────────────┐││  │
│  │  │  │  (width × height)     │││  │
│  │  │  └────────────────────────┘││  │
│  │  └──────────────────────────────┘│  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

#### 布局方式

**1. Flexbox（弹性布局）- 推荐用！**
```css
.container {
  display: flex;              /* 启用flex */
  justify-content: space-between; /* 水平对齐 */
  align-items: center;        /* 垂直对齐 */
  gap: 20px;                  /* 元素间距 */
}

.item {
  flex: 1;                    /* 平均分配空间 */
  flex: 0 0 200px;            /* 不伸缩，宽度200px */
}
```

**Flex 常用属性：**
```css
/* 容器属性 */
display: flex;
flex-direction: row;          /* row(横), column(竖) */
justify-content: center;      /* 主轴对齐 (space-between, space-around, flex-start, flex-end) */
align-items: center;          /* 交叉轴对齐 (center, flex-start, flex-end, stretch) */
gap: 10px;                    /* 元素间距 */
flex-wrap: wrap;              /* 换行 */

/* 元素属性 */
flex: 1;                      /* 伸缩比例 */
order: 1;                     /* 元素顺序 */
```

**2. Grid（网格布局）**
```css
.container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;  /* 三列等宽 */
  grid-template-rows: 100px auto;       /* 两行 */
  gap: 20px;
}
```

**3. Position（定位）**
```css
position: static;      /* 默认流式布局 */
position: relative;    /* 相对定位，相对原来位置 */
position: absolute;    /* 绝对定位，相对最近定位父元素 */
position: fixed;       /* 固定定位，相对视口固定 */

top: 10px;            /* 距离顶部 */
left: 20px;           /* 距离左边 */
z-index: 10;          /* 堆叠顺序（层级） */
```

#### 显示和隐藏
```css
display: block;        /* 显示为块级元素 */
display: inline;       /* 显示为行内元素 */
display: inline-block; /* 行内块元素 */
display: none;         /* 隐藏（不占空间） */

visibility: hidden;    /* 隐藏（占空间） */
visibility: visible;

opacity: 0;           /* 透明但占空间 */
```

#### 动画和过渡
```css
/* 过渡：属性值变化时的平滑动画 */
transition: all 0.3s ease;
transition: color 0.3s, transform 0.5s;

/* 悬停效果 */
button:hover {
  background-color: blue;
  transform: scale(1.1);  /* 放大 */
}

/* 关键帧动画 */
@keyframes slideIn {
  from {
    transform: translateX(-100px);
  }
  to {
    transform: translateX(0);
  }
}

.animated {
  animation: slideIn 0.5s ease-in;
}
```

---

## JavaScript 基础

### 什么是 JavaScript？

JavaScript 是前端的编程语言，用来添加交互和逻辑。

### 变量和数据类型

#### 声明变量
```javascript
// let：推荐使用，块级作用域
let name = "张三";
let age = 25;

// const：常量，声明后不能改变
const PI = 3.14159;
const CONFIG = { host: 'localhost', port: 3000 };

// var：旧方式，避免使用
var old = "不推荐";
```

#### 基本数据类型
```javascript
// 1. 字符串 String
let text = "Hello";
let text2 = 'World';
let text3 = `模板字符串：${text} ${text2}`;

// 2. 数字 Number
let integer = 42;
let decimal = 3.14;
let negative = -10;

// 3. 布尔值 Boolean
let isTrue = true;
let isFalse = false;

// 4. 对象 Object（最常用！）
let person = {
  name: "张三",
  age: 25,
  city: "北京",
  greet() {
    console.log(`你好，我是${this.name}`);
  }
};

// 5. 数组 Array
let fruits = ["苹果", "香蕉", "橙子"];
let numbers = [1, 2, 3, 4, 5];
let mixed = [1, "text", true, { id: 1 }];

// 6. null 和 undefined
let empty = null;      // 表示空值
let notDefined;        // 未定义，值是 undefined

// 7. 判断类型
typeof "text"      // "string"
typeof 42          // "number"
typeof true        // "boolean"
typeof {}          // "object"
typeof []          // "object" (数组也是对象)
```

### 操作符

#### 算术操作符
```javascript
10 + 5      // 15
10 - 5      // 5
10 * 5      // 50
10 / 5      // 2
10 % 3      // 1 (取余)
2 ** 3      // 8 (幂)
```

#### 比较操作符
```javascript
5 > 3       // true
5 < 3       // false
5 >= 5      // true
5 <= 5      // true
5 === 5     // true (严格相等，推荐用)
5 == "5"    // true (宽松相等，避免用)
5 !== 5     // false
```

#### 逻辑操作符
```javascript
true && true   // true (与)
true || false  // true (或)
!true          // false (非)
```

#### 赋值和增减
```javascript
let x = 5;
x += 3;        // x = x + 3  =>  8
x -= 2;        // x = x - 2  =>  6
x *= 2;        // x = x * 2  =>  12
x++;           // x = x + 1  =>  13
x--;           // x = x - 1  =>  12
```

### 控制流

#### 条件判断
```javascript
// if...else if...else
if (age < 18) {
  console.log("未成年");
} else if (age < 60) {
  console.log("成年");
} else {
  console.log("老年");
}

// 三元操作符（简写if）
let status = age >= 18 ? "成年" : "未成年";

// switch
switch (dayOfWeek) {
  case 1:
    console.log("星期一");
    break;
  case 2:
    console.log("星期二");
    break;
  default:
    console.log("其他");
}
```

#### 循环
```javascript
// for 循环
for (let i = 0; i < 10; i++) {
  console.log(i);
}

// while 循环
let i = 0;
while (i < 10) {
  console.log(i);
  i++;
}

// do...while（至少执行一次）
do {
  console.log(i);
  i++;
} while (i < 10);

// for...of（遍历值）
for (let fruit of fruits) {
  console.log(fruit);
}

// for...in（遍历键）
for (let key in person) {
  console.log(key, person[key]);
}

// 数组方法
fruits.forEach(fruit => {
  console.log(fruit);
});
```

### 函数

#### 函数声明
```javascript
// 方式1：声明式
function greet(name) {
  return `你好，${name}！`;
}

// 方式2：表达式（推荐）
const greet = function(name) {
  return `你好，${name}！`;
};

// 方式3：箭头函数（最推荐！）
const greet = (name) => {
  return `你好，${name}！`;
};

// 箭头函数简写
const greet = name => `你好，${name}！`;

// 调用
console.log(greet("张三"));  // 输出：你好，张三！
```

#### 函数参数
```javascript
// 默认参数
const add = (a, b = 10) => a + b;
console.log(add(5));      // 15
console.log(add(5, 3));   // 8

// 剩余参数
const sum = (...numbers) => numbers.reduce((a, b) => a + b, 0);
console.log(sum(1, 2, 3, 4));  // 10

// 解构参数
const person = { name: "张三", age: 25 };
const greet = ({ name, age }) => `${name}已经${age}岁了`;
```

#### 回调函数（Callback）
```javascript
// 回调函数：将函数作为参数传递
function fetchData(callback) {
  setTimeout(() => {
    callback("数据加载完成");
  }, 1000);
}

fetchData((message) => {
  console.log(message);  // 1秒后打印：数据加载完成
});
```

### 异步编程

#### Promise
```javascript
// Promise：表示一个最终会完成或失败的操作
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve("成功！");
    // 或 reject("失败！");
  }, 1000);
});

// 使用 then 和 catch
promise
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => console.log("完成"));
```

#### async/await（推荐！）
```javascript
// async 函数返回 Promise
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("错误:", error);
  }
}

// 调用 async 函数
fetchData().then(data => console.log(data));
```

### 对象和数组操作

#### 对象
```javascript
// 创建对象
let user = {
  id: 1,
  name: "张三",
  email: "zs@example.com",
  skills: ["Vue", "JavaScript"],
  address: {
    city: "北京",
    street: "中关村"
  }
};

// 访问属性
console.log(user.name);           // "张三"
console.log(user["email"]);       // "zs@example.com"
console.log(user.address.city);   // "北京"

// 修改属性
user.name = "李四";
user["email"] = "ls@example.com";

// 添加属性
user.phone = "13800000000";

// 删除属性
delete user.phone;

// 检查属性是否存在
"name" in user;           // true
user.hasOwnProperty("id"); // true

// 获取所有键
Object.keys(user);        // ["id", "name", "email", "skills", "address"]

// 获取所有值
Object.values(user);

// 遍历对象
for (let key in user) {
  console.log(key, user[key]);
}

// 对象合并
let merged = { ...user, status: "active" };
```

#### 数组
```javascript
let arr = [1, 2, 3, 4, 5];

// 访问
arr[0];              // 1
arr.length;          // 5

// 修改
arr[0] = 10;

// 添加
arr.push(6);         // 末尾添加，返回新长度
arr.unshift(0);      // 开头添加

// 删除
arr.pop();           // 删除末尾
arr.shift();         // 删除开头
arr.splice(1, 2);    // 从索引1开始删除2个元素

// 查找
arr.indexOf(3);      // 找到返回索引，没有返回-1
arr.includes(3);     // 检查是否包含

// 变换数组
arr.map(x => x * 2);              // [2, 4, 6, 8, 10]
arr.filter(x => x > 3);           // [4, 5]
arr.reduce((sum, x) => sum + x, 0); // 15（求和）
arr.find(x => x > 3);             // 4（找第一个）
arr.some(x => x > 4);             // true（是否有符合）
arr.every(x => x > 0);            // true（全部符合）

// 连接
arr.join("-");                    // "1-2-3-4-5"

// 反转
arr.reverse();

// 排序
arr.sort();                       // 字符串排序，可能有问题
arr.sort((a, b) => a - b);       // 数字排序（升序）
arr.sort((a, b) => b - a);       // 数字排序（降序）
```

### DOM 操作

#### 什么是 DOM？

DOM (Document Object Model) 是 JavaScript 操纵 HTML 的接口。HTML 中的每个元素都是 DOM 中的对象。

#### 选择元素
```javascript
// 按ID选择
let header = document.getElementById("header");

// 按类名选择（返回所有匹配）
let buttons = document.getElementsByClassName("btn");

// 按标签选择
let paragraphs = document.getElementsByTagName("p");

// 使用选择器（推荐！）
let main = document.querySelector("#main");        // 第一个匹配
let items = document.querySelectorAll(".item");    // 所有匹配
```

#### 修改 HTML
```javascript
// 修改文本内容
element.textContent = "新的文本";

// 修改 HTML 内容
element.innerHTML = "<strong>粗体文本</strong>";

// 修改属性
element.setAttribute("id", "new-id");
element.removeAttribute("disabled");
element.getAttribute("class");

// 修改样式
element.style.color = "red";
element.style.backgroundColor = "blue";
element.style.fontSize = "20px";

// 修改类名
element.classList.add("active");        // 添加类
element.classList.remove("inactive");   // 移除类
element.classList.toggle("highlight");  // 切换
element.classList.contains("active");   // 检查
```

#### 创建和删除元素
```javascript
// 创建元素
let newDiv = document.createElement("div");
newDiv.textContent = "新元素";
newDiv.classList.add("container");

// 添加到页面
document.body.appendChild(newDiv);       // 添加到末尾
container.insertBefore(newDiv, reference); // 插入在reference之前

// 删除元素
newDiv.remove();                         // 删除自己
parent.removeChild(newDiv);              // 父元素删除子元素
```

#### 事件处理
```javascript
// 点击事件
button.addEventListener("click", (event) => {
  console.log("被点击了！");
});

// 常见事件
// click      - 点击
// dblclick   - 双击
// input      - 输入框输入时触发
// change     - 值改变时触发
// submit     - 表单提交
// mouseover  - 鼠标悬停
// mouseout   - 鼠标离开
// keydown    - 按键按下
// keyup      - 按键抬起
// focus      - 获得焦点
// blur       - 失去焦点

// 移除事件监听
button.removeEventListener("click", handler);

// 阻止默认行为
link.addEventListener("click", (event) => {
  event.preventDefault();  // 阻止链接跳转
});

// 阻止事件冒泡
child.addEventListener("click", (event) => {
  event.stopPropagation();  // 不会触发父元素的点击事件
});
```

---

## Vue 3 核心概念

### 什么是 Vue？

Vue 是一个 **JavaScript 框架**，用来快速构建交互式用户界面。

### Vue 的优点

| 优点 | 说明 |
|------|------|
| **声明式** | 直观描述 UI，而不是命令式编程 |
| **响应式** | 数据改变时，UI 自动更新 |
| **组件化** | 复用代码，提高开发效率 |
| **简单易学** | 学习曲线平缓，上手快 |
| **生态完善** | 有很多优秀的库和工具 |

### Vue 的核心概念

#### 1. 响应式数据（Reactivity）

在 Vue 中，当数据改变时，UI 会自动更新。

```javascript
import { ref } from 'vue';

export default {
  setup() {
    // ref 创建响应式数据
    let count = ref(0);

    function increment() {
      count.value++;  // 注意：修改时要用 .value
    }

    return { count, increment };
  }
}
```

```vue
<template>
  <div>
    <p>计数器：{{ count }}</p>  <!-- 自动显示count的值 -->
    <button @click="increment">加1</button>
  </div>
</template>
```

#### 2. 模板语法

Vue 使用特殊的语法在 HTML 中嵌入 JavaScript。

```vue
<template>
  <!-- 文本插值 -->
  <p>{{ message }}</p>

  <!-- 表达式 -->
  <p>{{ count + 1 }}</p>
  <p>{{ ok ? '是' : '否' }}</p>

  <!-- 属性绑定 -->
  <div :id="dynamicId"></div>
  <img :src="imageUrl">
  <a :href="link">链接</a>

  <!-- 类绑定 -->
  <div :class="{ active: isActive, disabled: isDisabled }"></div>
  <div :class="[activeClass, errorClass]"></div>

  <!-- 样式绑定 -->
  <div :style="{ color: dynamicColor, fontSize: fontSize + 'px' }"></div>

  <!-- 事件绑定 -->
  <button @click="handleClick">点击</button>
  <input @input="handleInput" @keyup.enter="submit">

  <!-- 双向绑定 -->
  <input v-model="message">
  <p>{{ message }}</p>

  <!-- 条件渲染 -->
  <p v-if="show">显示</p>
  <p v-else-if="showElse">显示其他</p>
  <p v-else>都不显示</p>

  <!-- 列表渲染 -->
  <ul>
    <li v-for="(item, index) in items" :key="index">
      {{ index }}: {{ item }}
    </li>
  </ul>
</template>

<script>
import { ref } from 'vue';

export default {
  setup() {
    let message = ref('');
    let count = ref(0);
    let isActive = ref(true);
    let isDisabled = ref(false);
    let dynamicId = ref('my-div');
    let imageUrl = ref('/image.jpg');
    let dynamicColor = ref('red');
    let show = ref(true);
    let items = ref(['苹果', '香蕉', '橙子']);

    function handleClick() {
      count.value++;
    }

    function handleInput(event) {
      message.value = event.target.value;
    }

    function submit() {
      console.log('提交:', message.value);
    }

    return {
      message, count, isActive, isDisabled,
      dynamicId, imageUrl, dynamicColor, show, items,
      handleClick, handleInput, submit
    };
  }
}
</script>
```

#### 3. 计算属性（Computed）

当数据依赖于其他响应式数据时，使用计算属性自动更新。

```javascript
import { ref, computed } from 'vue';

export default {
  setup() {
    let firstName = ref('张');
    let lastName = ref('三');

    // 计算属性：当firstName或lastName改变时自动更新
    let fullName = computed(() => {
      return firstName.value + lastName.value;
    });

    return { firstName, lastName, fullName };
  }
}
```

```vue
<template>
  <div>
    <p>姓：<input v-model="firstName"></p>
    <p>名：<input v-model="lastName"></p>
    <p>全名：{{ fullName }}</p>  <!-- 自动显示最新值 -->
  </div>
</template>
```

#### 4. 侦听器（Watch）

当某个数据改变时，执行某些操作。

```javascript
import { ref, watch } from 'vue';

export default {
  setup() {
    let count = ref(0);
    let message = ref('');

    // 侦听单个属性
    watch(count, (newValue, oldValue) => {
      console.log(`count从${oldValue}改为${newValue}`);
    });

    // 侦听多个属性
    watch([count, message], ([newCount, newMsg]) => {
      console.log('count或message改变了');
    });

    // 侦听对象属性（深度监听）
    watch(() => count.value, (newValue) => {
      console.log('count改变了');
    });

    return { count, message };
  }
}
```

#### 5. 组件生命周期（Lifecycle）

组件从创建到销毁的各个阶段。

```javascript
import { onMounted, onUpdated, onUnmounted } from 'vue';

export default {
  setup() {
    // 组件挂载完成（适合初始化，如获取数据）
    onMounted(() => {
      console.log('组件已挂载');
      // 获取数据
      fetchData();
    });

    // 组件更新完成
    onUpdated(() => {
      console.log('组件已更新');
    });

    // 组件即将卸载（适合清理）
    onUnmounted(() => {
      console.log('组件即将卸载');
      // 清理事件、定时器等
    });

    function fetchData() {
      // 获取数据
    }

    return { };
  }
}
```

**生命周期顺序：**
```
setup()
  ↓
onBeforeMount()
  ↓
onMounted()          ← 通常在这里初始化
  ↓
(用户交互，数据改变)
  ↓
onBeforeUpdate()
  ↓
onUpdated()
  ↓
(卸载组件)
  ↓
onBeforeUnmount()
  ↓
onUnmounted()        ← 通常在这里清理
```

---

## 项目架构与约定

### 项目结构回顾

```
vue-learning-app/
├── src/
│   ├── pages/                  # 页面组件（每个标签页一个）
│   ├── components/             # 可复用的小组件
│   ├── utils/                  # 工具函数
│   │   ├── api.js             # API客户端
│   │   └── pwa.js             # PWA工具
│   ├── App.vue                # 主应用组件
│   ├── main.js                # 入口文件
│   └── style.css              # 全局样式
│
├── server/
│   ├── index.js               # Express服务器入口
│   ├── routes/                # API路由
│   └── data/                  # 数据存储
│
├── public/
│   ├── manifest.webmanifest   # PWA清单
│   └── sw.js                  # Service Worker
│
└── package.json               # 项目配置
```

### 文件命名约定

| 类型 | 命名规则 | 示例 |
|------|--------|------|
| Vue 组件文件 | PascalCase | `VideoManager.vue`, `IssueDetail.vue` |
| 普通 JavaScript 文件 | camelCase | `api.js`, `helpers.js` |
| 常量 | UPPER_SNAKE_CASE | `CACHE_VERSION`, `API_BASE_URL` |
| 方法 | camelCase | `fetchData()`, `handleClick()` |

### App.vue 的结构

`src/App.vue` 是主应用，管理标签页和主题。

```vue
<template>
  <div class="app" :style="{ '--primary': primaryColor, ... }">
    <!-- 侧栏：标签页列表 -->
    <aside class="sidebar">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="{ active: activeTab === tab.id }"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 主题和设置 -->
      <div class="settings">
        <!-- 主题选择 -->
        <!-- 颜色调整 -->
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 动态加载当前页面 -->
      <KeepAlive>
        <component :is="currentPageComponent" />
      </KeepAlive>
    </main>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'App',

  setup() {
    let activeTab = ref('home');
    let primaryColor = ref('#667eea');

    // 标签页定义
    const tabs = [
      { id: 'home', label: '主页' },
      { id: 'video', label: '视频' },
      // ...更多标签页
    ];

    // 动态加载页面组件
    const tabLoaders = {
      home: () => import('./pages/HomePage.vue'),
      video: () => import('./pages/VideoManager.vue'),
      // ...更多页面
    };

    // 计算当前页面组件
    const currentPageComponent = computed(() => {
      return tabLoaders[activeTab.value];
    });

    return {
      activeTab,
      tabs,
      currentPageComponent,
      primaryColor
    };
  }
}
</script>

<style>
:root {
  --primary: #667eea;
  --text: #333;
  --bg: #fff;
}

.app {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 200px;
  background: var(--bg);
  border-right: 1px solid #ddd;
}

.main-content {
  flex: 1;
  overflow-y: auto;
}
</style>
```

### 添加新页面的完整流程

假设你要添加一个"天气"页面：

**步骤1：创建页面组件** (`src/pages/WeatherPage.vue`)
```vue
<template>
  <div class="weather-page">
    <h1>天气预报</h1>
    <p>当前温度：{{ temperature }}°C</p>
    <button @click="refresh">刷新</button>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '../utils/api';

export default {
  name: 'WeatherPage',

  setup() {
    let temperature = ref(0);

    onMounted(() => {
      loadWeather();
    });

    async function loadWeather() {
      try {
        const data = await api.weather.getCurrent();
        temperature.value = data.temp;
      } catch (error) {
        console.error('加载天气失败:', error);
      }
    }

    function refresh() {
      loadWeather();
    }

    return { temperature, refresh };
  }
}
</script>

<style scoped>
.weather-page {
  padding: 20px;
}
</style>
```

**步骤2：注册到 App.vue**
```javascript
// 在 App.vue 的 tabs 数组中添加：
{ id: 'weather', label: '天气' }

// 在 tabLoaders 中添加：
weather: () => import('./pages/WeatherPage.vue')
```

**步骤3：添加后端 API**（如需要）

在 `server/routes/weather.js`：
```javascript
const express = require('express');
const router = express.Router();

router.get('/api/weather/current', (req, res) => {
  // 获取天气数据
  res.json({
    temp: 25,
    condition: '晴天',
    humidity: 60
  });
});

module.exports = router;
```

在 `server/index.js` 中注册路由：
```javascript
const weatherRouter = require('./routes/weather');
app.use(weatherRouter);
```

**步骤4：在 api.js 中注册 API 客户端**
```javascript
weather: {
  getCurrent: () => fetch('/api/weather/current').then(r => r.json())
}
```

### API 调用规范

项目使用 `src/utils/api.js` 统一管理所有 API 调用。

```javascript
// api.js 的结构
const api = {
  // 分组API
  video: {
    list: () => fetch('/api/video/list').then(r => r.json()),
    upload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetch('/api/video/upload', {
        method: 'POST',
        body: formData
      }).then(r => r.json());
    }
  },

  issues: {
    list: (params) => {
      const url = new URL('/api/issues', window.location.origin);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      return fetch(url).then(r => r.json());
    },
    get: (id) => fetch(`/api/issues/${id}`).then(r => r.json()),
    create: (data) => fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json())
  }
};

export default api;
```

**在页面中使用：**
```javascript
import api from '@/utils/api';

// 获取数据
const issues = await api.issues.list({ page: 1, limit: 10 });

// 创建数据
const newIssue = await api.issues.create({
  title: '新问题',
  description: '问题描述'
});
```

### 主题系统

项目有完整的主题系统，支持预设主题和自定义颜色。

```javascript
// App.vue 中的主题定义
const themes = [
  { id: 'blue', name: '经典蓝', preview: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { id: 'dark', name: '深夜', preview: 'linear-gradient(135deg, #1a1a2e, #16213e)' },
  // ...
];

const colorPresets = [
  { id: 'default', name: '默认', primary: '#667eea', text: '#333', bg: '#fff' },
  { id: 'warm', name: '温暖', primary: '#f59e0b', text: '#333', bg: '#fff' },
  // ...
];

// CSS变量
:root {
  --primary: #667eea;      /* 主色 */
  --text: #333;            /* 文字色 */
  --bg: #fff;              /* 背景色 */
  /* ...更多颜色变量 */
}
```

在组件中使用主题颜色：
```vue
<style scoped>
.button {
  background-color: var(--primary);
  color: var(--text);
}
</style>
```

---

## 实战案例教学

### 案例1：计数器（最简单）

**目标：** 创建一个简单的计数器，有加和减按钮。

**代码：**
```vue
<template>
  <div class="counter">
    <h1>计数器</h1>
    <p class="count">{{ count }}</p>
    <div class="buttons">
      <button @click="decrement">-</button>
      <button @click="increment">+</button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  setup() {
    let count = ref(0);

    const increment = () => count.value++;
    const decrement = () => count.value--;

    return { count, increment, decrement };
  }
}
</script>

<style scoped>
.counter {
  text-align: center;
  padding: 40px;
}

.count {
  font-size: 48px;
  font-weight: bold;
  margin: 20px 0;
}

.buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

button {
  width: 60px;
  height: 60px;
  font-size: 24px;
  cursor: pointer;
  border: 2px solid var(--primary);
  background: white;
  color: var(--primary);
  border-radius: 8px;
}

button:hover {
  background: var(--primary);
  color: white;
}
</style>
```

**学到的：**
- ref 创建响应式数据
- @click 事件绑定
- {{ }} 模板插值

### 案例2：待办事项列表（中等）

**目标：** 创建一个待办清单，可以添加、删除、标记完成。

```vue
<template>
  <div class="todo">
    <h1>待办事项</h1>

    <!-- 输入框和添加按钮 -->
    <div class="input-group">
      <input
        v-model="newTodo"
        @keyup.enter="addTodo"
        placeholder="输入新任务..."
      >
      <button @click="addTodo">添加</button>
    </div>

    <!-- 任务列表 -->
    <div class="stats">
      总数: {{ todos.length }} | 完成: {{ completed }} | 未完成: {{ pending }}
    </div>

    <ul class="list">
      <li v-for="(todo, index) in todos" :key="index" :class="{ done: todo.completed }">
        <input
          type="checkbox"
          v-model="todo.completed"
        >
        <span>{{ todo.text }}</span>
        <button @click="deleteTodo(index)" class="delete">删除</button>
      </li>
    </ul>

    <!-- 过滤选项 -->
    <div class="filters">
      <button
        @click="filter = 'all'"
        :class="{ active: filter === 'all' }"
      >全部</button>
      <button
        @click="filter = 'active'"
        :class="{ active: filter === 'active' }"
      >未完成</button>
      <button
        @click="filter = 'completed'"
        :class="{ active: filter === 'completed' }"
      >已完成</button>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  setup() {
    let newTodo = ref('');
    let todos = ref([
      { text: '学习Vue3', completed: true },
      { text: '完成项目', completed: false }
    ]);
    let filter = ref('all');

    // 计算统计数据
    const completed = computed(() => {
      return todos.value.filter(t => t.completed).length;
    });

    const pending = computed(() => {
      return todos.value.length - completed.value;
    });

    // 计算过滤后的列表
    const filteredTodos = computed(() => {
      switch(filter.value) {
        case 'active':
          return todos.value.filter(t => !t.completed);
        case 'completed':
          return todos.value.filter(t => t.completed);
        default:
          return todos.value;
      }
    });

    function addTodo() {
      if (!newTodo.value.trim()) return;

      todos.value.push({
        text: newTodo.value,
        completed: false
      });

      newTodo.value = '';
    }

    function deleteTodo(index) {
      todos.value.splice(index, 1);
    }

    return {
      newTodo,
      todos: filteredTodos,
      completed,
      pending,
      filter,
      addTodo,
      deleteTodo
    };
  }
}
</script>

<style scoped>
.todo {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.input-group input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.input-group button {
  padding: 10px 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.stats {
  text-align: center;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 14px;
}

.list {
  list-style: none;
  padding: 0;
}

.list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid #eee;
  transition: 0.3s;
}

.list li:hover {
  background: #f9f9f9;
}

.list li.done span {
  text-decoration: line-through;
  color: #999;
}

.list input[type="checkbox"] {
  cursor: pointer;
}

.list span {
  flex: 1;
}

.delete {
  padding: 6px 12px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.filters {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: center;
}

.filters button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.filters button.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
</style>
```

**学到的：**
- v-model 双向绑定
- v-for 列表渲染
- computed 计算属性
- 数组操作（push, splice）
- 条件类名绑定

### 案例3：用户数据表格（复杂）

**目标：** 创建一个用户表格，支持搜索、排序、分页。

```vue
<template>
  <div class="users-table">
    <h1>用户管理</h1>

    <!-- 搜索框 -->
    <div class="search">
      <input
        v-model="searchKeyword"
        placeholder="搜索用户名或邮箱..."
        @input="search"
      >
    </div>

    <!-- 表格 -->
    <table>
      <thead>
        <tr>
          <th @click="sortBy('id')">ID {{ getSortIcon('id') }}</th>
          <th @click="sortBy('name')">姓名 {{ getSortIcon('name') }}</th>
          <th @click="sortBy('email')">邮箱 {{ getSortIcon('email') }}</th>
          <th @click="sortBy('status')">状态 {{ getSortIcon('status') }}</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in paginatedUsers" :key="user.id">
          <td>{{ user.id }}</td>
          <td>{{ user.name }}</td>
          <td>{{ user.email }}</td>
          <td>
            <span :class="['status', user.status]">
              {{ user.status === 'active' ? '活跃' : '禁用' }}
            </span>
          </td>
          <td>
            <button @click="editUser(user)">编辑</button>
            <button @click="deleteUser(user.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 分页 -->
    <div class="pagination">
      <button @click="previousPage" :disabled="currentPage === 1">上一页</button>
      <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  setup() {
    // 数据
    let users = ref([
      { id: 1, name: '张三', email: 'zs@example.com', status: 'active' },
      { id: 2, name: '李四', email: 'ls@example.com', status: 'active' },
      { id: 3, name: '王五', email: 'ww@example.com', status: 'inactive' },
      { id: 4, name: '赵六', email: 'zl@example.com', status: 'active' },
      { id: 5, name: '孙七', email: 'sq@example.com', status: 'inactive' },
      { id: 6, name: '周八', email: 'zb@example.com', status: 'active' },
      { id: 7, name: '吴九', email: 'wj@example.com', status: 'active' },
      { id: 8, name: '郑十', email: 'zs2@example.com', status: 'inactive' },
    ]);

    // 搜索和排序
    let searchKeyword = ref('');
    let sortField = ref('id');
    let sortOrder = ref('asc');
    let currentPage = ref(1);
    const pageSize = 5;

    // 搜索过滤
    const filteredUsers = computed(() => {
      return users.value.filter(user => {
        const keyword = searchKeyword.value.toLowerCase();
        return (
          user.name.toLowerCase().includes(keyword) ||
          user.email.toLowerCase().includes(keyword)
        );
      });
    });

    // 排序
    const sortedUsers = computed(() => {
      return [...filteredUsers.value].sort((a, b) => {
        let aVal = a[sortField.value];
        let bVal = b[sortField.value];

        // 字符串比较
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1;
        return 0;
      });
    });

    // 分页
    const totalPages = computed(() => {
      return Math.ceil(sortedUsers.value.length / pageSize);
    });

    const paginatedUsers = computed(() => {
      const start = (currentPage.value - 1) * pageSize;
      const end = start + pageSize;
      return sortedUsers.value.slice(start, end);
    });

    // 方法
    function sortBy(field) {
      if (sortField.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortField.value = field;
        sortOrder.value = 'asc';
      }
    }

    function getSortIcon(field) {
      if (sortField.value !== field) return '';
      return sortOrder.value === 'asc' ? '▲' : '▼';
    }

    function search() {
      currentPage.value = 1;  // 搜索后回到第一页
    }

    function previousPage() {
      if (currentPage.value > 1) currentPage.value--;
    }

    function nextPage() {
      if (currentPage.value < totalPages.value) currentPage.value++;
    }

    function editUser(user) {
      alert(`编辑用户: ${user.name}`);
    }

    function deleteUser(id) {
      users.value = users.value.filter(u => u.id !== id);
    }

    return {
      users,
      searchKeyword,
      paginatedUsers,
      currentPage,
      totalPages,
      sortBy,
      getSortIcon,
      search,
      previousPage,
      nextPage,
      editUser,
      deleteUser
    };
  }
}
</script>

<style scoped>
.users-table {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.search {
  margin-bottom: 20px;
}

.search input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

thead {
  background: var(--primary);
  color: white;
}

th {
  padding: 12px;
  text-align: left;
  cursor: pointer;
  user-select: none;
}

th:hover {
  opacity: 0.8;
}

td {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

tbody tr:hover {
  background: #f9f9f9;
}

.status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status.active {
  background: #d4edda;
  color: #155724;
}

.status.inactive {
  background: #f8d7da;
  color: #721c24;
}

button {
  padding: 6px 12px;
  margin-right: 8px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

button:hover {
  background: #f0f0f0;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.pagination button {
  padding: 8px 16px;
}
</style>
```

**学到的：**
- 复杂的计算属性（多层计算）
- 数组排序和过滤
- 分页逻辑
- 更复杂的事件处理

---

## 常见问题解答

### Q1: {{ }} 和 v-text 的区别？

```vue
<!-- {{ }} 会闪烁（如果网速慢）-->
<p>{{ message }}</p>

<!-- v-text 不会闪烁 -->
<p v-text="message"></p>
```

推荐用 `{{ }}`，因为更常见。如果有闪烁问题，用 `v-cloak` 指令。

### Q2: v-show 和 v-if 的区别？

```vue
<!-- v-if：不显示时不渲染DOM（性能好，切换消耗大） -->
<p v-if="show">内容</p>

<!-- v-show：不显示时只隐藏（切换快，占用内存） -->
<p v-show="show">内容</p>
```

**使用场景：**
- 频繁切换：用 `v-show`
- 初始不显示：用 `v-if`

### Q3: ref 和 reactive 的区别？

```javascript
import { ref, reactive } from 'vue';

// ref：包装单个值，需要 .value 访问
const count = ref(0);
console.log(count.value);  // 0

// reactive：包装对象，直接访问属性
const user = reactive({ name: '张三', age: 25 });
console.log(user.name);    // '张三'
```

推荐用 `ref`，因为更灵活，兼容任何类型。

### Q4: 如何获取 DOM 元素？

```vue
<template>
  <input ref="inputElement">
</template>

<script>
import { ref } from 'vue';

export default {
  setup() {
    let inputElement = ref(null);

    // onMounted 中可以访问
    onMounted(() => {
      console.log(inputElement.value);  // DOM元素
      inputElement.value.focus();
    });

    return { inputElement };
  }
}
</script>
```

### Q5: 如何在组件间通信？

**父传子：props**
```javascript
// 父组件
<Child :message="parentMessage" />

// 子组件
export default {
  props: ['message']
}
```

**子传父：emits**
```javascript
// 子组件
const emit = defineEmits(['update']);
function handleClick() {
  emit('update', newValue);
}

// 父组件
<Child @update="handleParentUpdate" />
```

**跨组件通信：provide/inject**
```javascript
// 提供数据的组件
import { provide } from 'vue';
provide('theme', 'dark');

// 使用数据的组件
import { inject } from 'vue';
const theme = inject('theme');  // 'dark'
```

### Q6: 如何修复"未定义"错误？

通常是因为：
1. 拼写错误：`mesage` vs `message`
2. 忘记 return：setup() 中定义但没有 return
3. 作用域问题：在 setup() 外使用 setup() 内的变量

**解决方案：**
```javascript
setup() {
  let count = ref(0);

  // ❌ 错误：没有 return
  // return { };

  // ✅ 正确
  return { count };
}
```

### Q7: 如何调试代码？

**浏览器 DevTools：**
1. F12 打开开发者工具
2. Console 标签查看错误信息
3. Sources 标签设置断点调试
4. Network 标签查看 API 调用

**Vue DevTools 插件：**
1. 在浏览器中安装 Vue.js DevTools 扩展
2. 查看组件数据和事件
3. 追踪组件更新

**console.log 调试：**
```javascript
console.log('变量值:', count.value);
console.log('对象:', user);
console.log('时间戳:', new Date().toISOString());
```

### Q8: 如何处理 API 错误？

```javascript
async function fetchData() {
  try {
    const response = await fetch('/api/data');

    // 检查HTTP状态
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('错误:', error.message);
    // 显示用户友好的错误信息
    showErrorMessage('数据加载失败，请重试');
  }
}
```

---

## 总结

这份指南涵盖了：
- ✅ HTML/CSS/JavaScript 基础
- ✅ Vue 3 核心概念
- ✅ 项目架构和约定
- ✅ 三个实战案例
- ✅ 常见问题解答

**后续学习路径：**
1. 掌握基础（本指南）
2. 在项目中实践（修改现有页面）
3. 创建新页面（从简到复杂）
4. 深入学习（路由、状态管理等）

**推荐资源：**
- [Vue 3 官方文档](https://vuejs.org/)
- [MDN Web 文档](https://developer.mozilla.org/)
- [JavaScript.info](https://javascript.info/)

祝你学习愉快！如有问题，随时提问。
