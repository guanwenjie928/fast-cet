# Fast CET — CET-4 英语考级一站式备考网站

Fast CET 是一个面向中国大学生的 CET-4 英语考级备考网站，覆盖听力、阅读、翻译、作文、真题和模拟题六大模块。视觉采用洋橙色系（珊瑚橙 + 洋红暖色调），动画交互参考 Framer.com 的落地页效果（GSAP + ScrollTrigger 驱动）。

## 快速开始

纯静态站点，无需构建工具，直接在浏览器中打开即可使用：

```bash
# 克隆项目后，使用任意 HTTP 服务器打开
npx serve .
# 或
python3 -m http.server 8080
```

然后访问 `http://localhost:8080` 即可。

## 技术栈

| 层 | 技术 |
|----|------|
| 页面 | HTML5 |
| 样式 | CSS3（自定义属性 + 毛玻璃 + 响应式） |
| 动画 | GSAP 3.12.5 + ScrollTrigger |
| 字体 | Google Fonts — Inter |
| 数据 | 静态 JSON（可无缝切换至后端 API） |

## 项目结构

```
fast-cet/
├── index.html              # 首页 — Framer 风格落地页
├── sw.js                   # Service Worker（离线缓存）
├── pages/                  # 内容页
│   ├── zhenti.html         # 历年真题（2024年6套）
│   ├── moni.html           # 模拟试题（3套）
│   ├── listening.html      # 听力理解专项
│   ├── reading.html        # 阅读理解专项
│   ├── translation.html    # 段落翻译专项
│   └── writing.html        # 作文训练专项
├── css/                    # 样式表
│   ├── variables.css       # CSS 自定义属性（色彩/间距/字体/过渡）
│   ├── reset.css           # 浏览器默认样式重置
│   ├── global.css          # 全局排版 + 工具类 + 按钮基类
│   ├── nav.css             # 导航栏（毛玻璃 + 滚动渐变）
│   ├── hero.css            # Hero 区域（动画渐变 + 浮动图形）
│   ├── cards.css           # Bento 网格 + 统计 + 时间线 + 跑马灯 + CTA
│   ├── content.css         # 内容页通用样式
│   └── responsive.css      # 响应式补充（3 断点）
├── js/                     # JavaScript
│   ├── main.js             # 导航注入 + 页脚注入 + GSAP 引导 + 通用工具
│   ├── animations.js       # 首页 GSAP 动画编排
│   ├── parallax.js         # 多层视差 + 鼠标漂移 + 3D 倾斜
│   ├── data-loader.js      # JSON 数据统一加载器（fetch + 缓存 + 异步）
│   ├── exam-renderer.js    # 试卷卡片渲染器
│   ├── audio-player.js     # 听力自定义播放器
│   ├── filter.js           # 筛选标签组件
│   ├── counters.js         # 统计数字递增动画
│   └── content-animations.js # 内容页通用动画
├── data/                   # JSON 数据
│   ├── zhenti-2024-06-a.json ~ zhenti-2024-12-c.json  # 6套真题
│   ├── moni-01.json ~ moni-03.json                    # 3套模拟题
│   ├── listening-bank.json  # 听力题库
│   ├── reading-bank.json    # 阅读题库
│   ├── translation-bank.json # 翻译题库
│   └── writing-bank.json    # 作文题库
└── assets/                 # 资源文件
    ├── logo.svg            # Fast CET Logo
    ├── hero-bg.svg         # Hero 背景装饰
    ├── icons/              # 模块图标
    └── audio/              # 听力音频文件（预留）
```

## 色彩系统

```css
--color-primary:        #FF5E4D  /* 活力珊瑚橙 — 主色 */
--color-primary-dark:   #E54D3D  /* 深珊瑚橙 — hover */
--color-secondary:      #FF2D78  /* 洋红 — 辅色 */
--color-accent:         #FFB84D  /* 暖橙 — 强调色 */
--color-bg:             #FFF8F5  /* 暖白背景 */
--color-text:           #2D1A14  /* 深棕正文 */
--color-text-secondary: #8B6B5E  /* 浅棕副文本 */
--color-border:         rgba(255,94,77,0.15) /* 珊瑚橙边框 */
```

## 动画系统

首页实现了 Framer.com 级别的多维度动画体系：

- **Hero 入场动画**：浮动图形 + 标题逐字揭示 + CTA 按钮弹入（总时长约 2.5s）
- **多层视差滚动**：背景/中景/前景三层不同速度跟随 ScrollTrigger
- **光标感知交互**：Hero 光标光晕、卡片 3D 倾斜（rotateX/Y）、磁性按钮
- **Clip-path 区块揭示**：各区域从底部向上展开，统计区从中间向两侧展开
- **统计数字递增**：ScrollTrigger 触发 + easeOut 插值 + 弹性缩放
- **Bento 卡片交错入场**：带 3D 旋转的 stagger 动画 + 悬停渐变旋转边框
- **学习路径时间线**：连接线从左延伸 + 节点弹性弹入
- **跑马灯**：双行无限滚动 + 鼠标悬停减速
- **CTA 弹性入场**：缩放 + 背景光斑浮动 + 闪烁星点

动画参数严格按照蓝皮书（Animation Parameter Blueprint）执行，涵盖时长、缓动、位移量、透明度等精确值。

## 内容页特性

- 面包屑导航
- 筛选标签（分类过滤 + GSAP 动画过渡）
- 卡片列表：3D 倾斜悬停 + 光晕跟随 + 过滤淡入淡出
- 答案/范文揭示动画（GSAP）
- 听力自定义播放器（进度条 + 速度调节）
- 统一的入场动画（逐字标题 + 渐入描述 + 标签弹入）

## 浏览器兼容性

| 特性 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| CSS 自定义属性 | 49+ | 31+ | 9.1+ | 15+ |
| backdrop-filter | 76+ | 103+ | 18+ | 17+ |
| @property | 85+ | — (JS 降级) | 15.4+ | 85+ |
| IntersectionObserver | 51+ | 55+ | 12.1+ | 15+ |
| GSAP 3.12 | 全部支持 | 全部支持 | 全部支持 | 全部支持 |
| Service Worker | 45+ | 44+ | 11.1+ | 17+ |

## 后端对接指南

当前数据层使用静态 JSON 文件，`data-loader.js` 通过 `fetch('/data/xxx.json')` 加载。对接后端仅需修改一个配置：

```javascript
// js/data-loader.js 顶部
const API_BASE = '/data/';  // 当前：静态 JSON

// 改为后端 API 地址即可：
const API_BASE = '/api/v1/';
```

API 响应格式须保持一致。完整的后端数据库设计（MySQL 建表 SQL + RESTful API 规范）和三大核心功能（随机出题、单模块训练、仿真考试）的技术方案详见项目规划文档。

## 许可证

MIT License
