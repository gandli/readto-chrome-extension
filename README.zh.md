# readto.ai 官网 / 落地页

[English](./README.md) | 中文

> `readto.ai` 是 readto Chrome 扩展的产品官网与隐私政策站点。页面使用 Astro + Tailwind CSS 构建，部署到 GitHub Pages 的 `website` 分支。

## 项目定位

readto 是一个 Chrome 扩展：在任意英文网页中，根据用户的英语水平，自动在生词上方显示中文小注。

官网的目标不是做复杂营销页，而是用安静、清晰、像阅读页的方式说明三件事：

1. readto 做什么：给英文网页自动加中文词义小注；
2. 为什么有用：不中断阅读，不需要划词查词；
3. 是否可信：隐私政策明确说明不收集阅读历史。

## 在线地址

| 环境 | 地址 |
|---|---|
| GitHub Pages | `https://gandli.github.io/readto-chrome-extension/` |
| 本地开发 | `http://127.0.0.1:4321/readto-chrome-extension/` |
| 局域网预览 | `http://<你的局域网 IP>:4321/readto-chrome-extension/` |
| 隐私政策 | `/readto-chrome-extension/privacy/` |

> 当前 `astro.config.mjs` 的 `base` 是 `/readto-chrome-extension`，用于 GitHub Pages 项目页部署。如果后续绑定独立域名并从根路径部署，需要把 `base` 改为 `/`。

## 功能概览

| 模块 | 说明 |
|---|---|
| 首页 Hero | 简洁说明 readto 的核心价值：读懂每一个词 |
| 英文阅读预览 | 模拟真实英文新闻页面，展示单词上方中文小注 |
| 水平等级滑杆 | 用户可切换英语水平，预览中不同难度词的标注会变化 |
| 悬浮词卡 | 鼠标悬停/点击标注词时显示音标、释义、例句和朗读按钮 |
| 工作原理 | 说明“只标不会的词 / 不打断阅读 / 任何英文页面可用” |
| 隐私政策 | 说明本地运行、不收集阅读历史、不内置分析追踪 |
| GitHub Pages 部署 | `website` 分支推送后由 GitHub Actions 自动构建部署 |

## 技术栈

| 类型 | 技术 |
|---|---|
| 框架 | Astro 7 |
| 样式 | Tailwind CSS 4 + 全局 CSS tokens |
| 语言 | TypeScript / Astro / CSS |
| 包管理 | Bun 优先，同时保留 `package-lock.json` 供 GitHub/Dependabot 扫描 |
| 测试 | Playwright |
| 部署 | GitHub Pages + GitHub Actions |

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 启动本地开发

```bash
bun run dev
```

访问：

```txt
http://127.0.0.1:4321/readto-chrome-extension/
```

### 3. 启动局域网可访问预览

`astro.config.mjs` 已配置 `host: '0.0.0.0'`，通常直接运行即可：

```bash
bun run dev
```

如果需要显式指定：

```bash
bun run dev -- --host 0.0.0.0
```

然后在同一 Wi-Fi/局域网设备上访问：

```txt
http://<电脑局域网 IP>:4321/readto-chrome-extension/
```

例如：

```txt
http://192.168.5.46:4321/readto-chrome-extension/
```

### 4. 构建生产版本

```bash
bun run build
```

构建产物输出到：

```txt
dist/
```

### 5. 本地预览构建结果

```bash
bun run preview
```

## 常用命令

| 命令 | 作用 |
|---|---|
| `bun install` | 安装依赖 |
| `bun run dev` | 启动 Astro 开发服务器 |
| `bun run build` | 生产构建 |
| `bun run preview` | 预览构建产物 |
| `bun run test` | 运行 Playwright 测试 |
| `bun run test:ui` | 打开 Playwright UI |
| `bun run test:headed` | 有头模式运行 Playwright |

## 项目结构

```txt
.
├── .github/
│   └── workflows/
│       └── astro.yml          # GitHub Pages 自动部署流程
├── public/                    # 静态资源目录
├── src/
│   ├── layouts/
│   │   └── Layout.astro       # 全局 HTML layout、SEO meta、favicon
│   ├── pages/
│   │   ├── index.astro        # 首页：Hero、阅读预览、滑杆、词卡、说明区
│   │   └── privacy.astro      # 隐私政策页
│   └── styles/
│       └── global.css         # Tailwind 入口、设计 tokens、动态元素样式
├── astro.config.mjs           # Astro 配置：GitHub Pages site/base、局域网 host
├── package.json               # 脚本与依赖
├── bun.lock                   # Bun 锁文件
├── package-lock.json          # npm 锁文件，供 GitHub/Dependabot 扫描
├── README.md                  # English documentation
└── README.zh.md               # 中文文档
```

## 架构说明

```txt
浏览器请求
   │
   ▼
Astro 静态页面
   │
   ├── Layout.astro
   │     ├── meta / OG 信息
   │     └── 引入 global.css
   │
   ├── index.astro
   │     ├── 顶部导航
   │     ├── Hero 文案
   │     ├── 阅读预览 Demo
   │     ├── 等级滑杆
   │     ├── 词卡 tooltip 脚本
   │     └── 工作原理说明
   │
   └── privacy.astro
         ├── 顶部导航
         ├── 隐私政策正文
         └── 页脚
```

这个站点是纯静态输出，没有后端服务、数据库或登录系统。

## 核心页面

### `src/pages/index.astro`

首页是产品落地页，包含：

- 顶部导航；
- Hero 文案；
- Chrome Web Store 安装入口；
- 英文新闻阅读模拟窗口；
- 生词中文小注；
- 等级滑杆；
- 词卡 tooltip；
- Web Speech API 朗读；
- 工作原理说明；
- 页脚。

### `src/pages/privacy.astro`

隐私政策页说明：

- readto 是什么；
- 不收集哪些数据；
- 扩展在本机保存哪些设置；
- 第三方服务请求范围；
- 浏览器权限用途；
- 如何删除本地数据；
- 联系与政策版本。

## 交互逻辑

### 等级滑杆

滑杆有 5 个等级：

| 等级 | 说明 |
|---|---|
| 入门 | 只标最基础的词 |
| 基础 | 标高考以下的词 |
| 进阶 | 只标大学四六级以上的词 |
| 熟练 | 标雅思托福以上的词 |
| 精通 | 只标最生僻的词 |

标签、刻度、滑块共用同一套坐标：

```txt
0% / 25% / 50% / 75% / 100%
```

这样在不同屏幕宽度下，文字、刻度、滑块不会漂移。

### 标注词与 tooltip

首页 Demo 中的标注词使用：

```html
<span data-readto data-word="sweeping">
  sweeping<span class="rt">影响广泛的</span>
</span>
```

交互规则：

- 鼠标悬停：延迟显示词卡；
- 鼠标离开：延迟隐藏词卡；
- 点击单词：固定/取消固定词卡；
- 点击页面其他区域：关闭词卡；
- 按 `Escape`：关闭词卡；
- 点击朗读按钮：使用浏览器 Web Speech API 朗读英文单词。

## 样式系统

`src/styles/global.css` 中定义了 readto 的基础设计 token：

| Token | 用途 |
|---|---|
| `--color-readto-bg` | 页面背景 |
| `--color-readto-fg` | 主文字 |
| `--color-readto-fg-2` | 次级正文 |
| `--color-readto-muted` | 辅助文字 |
| `--color-readto-rule` | 分隔线 |
| `--color-readto-card` | 卡片背景 |
| `--color-readto-accent` | 品牌强调色 |
| `--font-sans` | UI/正文无衬线字体 |
| `--font-serif` | 标题/阅读感字体 |
| `--container-content` | 页面最大内容宽度，对应 `max-w-content` |

静态布局主要使用 Tailwind utility class；动态生成/交互元素，如 `.tooltip`、`.rt`、`.slider-*`，写在全局 CSS 中，避免 Astro scoped CSS 对动态 DOM 不生效的问题。

## 部署

部署流程在：

```txt
.github/workflows/astro.yml
```

触发条件：

```yaml
on:
  push:
    branches: [website]
  workflow_dispatch:
```

流程：

```txt
push website
   │
   ▼
GitHub Actions
   │
   ├── checkout
   ├── setup bun
   ├── bun install
   ├── bun run build
   ├── upload dist
   └── deploy to GitHub Pages
```

## 分支策略

当前仓库长期保留两个业务分支：

| 分支 | 用途 |
|---|---|
| `main` | Chrome 扩展源码开发 |
| `website` | 官网/落地页/隐私政策站点 |

网站开发在独立 worktree 中进行：

```txt
C:\Users\user\Desktop\readto-extension-website-security
```

扩展开发在：

```txt
C:\Users\user\Desktop\readto-extension
```

## 开发注意事项

| 问题 | 说明 / 解决方式 |
|---|---|
| GitHub Pages 路径 | 当前 `base` 是 `/readto-chrome-extension`，页面内链接要使用 `import.meta.env.BASE_URL` |
| 局域网预览 | `host: '0.0.0.0'` 已配置，移动设备可用局域网 IP 访问 |
| 滑杆对齐 | 标签、刻度、滑块必须共用同一坐标系，不要分别用 padding/justify/JS 百分比凑位置 |
| 动态 tooltip 样式 | 不要放在 scoped `<style>` 中，统一写入 `global.css` |
| Bun 与 npm 锁文件 | 日常用 Bun；依赖安全修复时同步 `package-lock.json` 以便 GitHub 扫描 |
| 页面复杂度 | readto 官网应保持安静、简洁、接近阅读页，不要堆叠复杂营销模块 |

## 验证清单

每次修改后至少运行：

```bash
bun run build
git diff --check
```

视觉/交互修改建议额外检查：

- 首页桌面端；
- 首页移动端；
- 隐私政策页；
- 滑杆标签、刻度、滑块是否对齐；
- tooltip 是否能悬浮、点击固定、关闭；
- 是否有横向滚动；
- `/privacy/` 链接是否正确。

## License

未声明。请根据仓库实际授权策略补充。