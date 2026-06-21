# readto

> **Read to know. 读懂每一个词。**

一款 Chrome 浏览器扩展，根据你的英语水平，在英文网页的生词上方自动标注中文释义。不划词、不跳窗、不中断阅读。

[安装 Chrome 扩展](https://chromewebstore.google.com/detail/readto/dcnmjckcjcfagfnjblkocojgpnmllcga) · [官网](https://readto.ai)

---

## 工作原理

1. **设定英语水平** — 从 A1（入门）到 C2（精通），选择你的 CEFR 等级
2. **正常浏览英文网页** — readto 自动扫描文本，识别超出你水平的词汇
3. **边读边学** — 生词上方会出现小字中文翻译，类似日文的振假名注音

无需点击、无需侧栏、无需切换。读就完了。

## 功能特性

### 核心功能

- **CEFR 智能过滤** — 内置 16 万词 CEFR 词典，精准判断哪些词"超纲"
- **行内注音标注** — 用 `<ruby>` 元素在单词上方显示中文翻译，类似日文振假名
- **Shadow DOM 渲染** — 标注样式与宿主页面完全隔离，零冲突
- **悬停查看详情** — 鼠标悬停生词，查看音标、释义、例句
- **4 源语音朗读** — Free Dictionary API → Google TTS → 有道 → 浏览器 SpeechSynthesis

### AI 增强（可选）

- **LLM 上下文翻译** — 配置你自己的 OpenAI 兼容 API，获得更精准的上下文感知翻译
- **流式预览** — 本地词典翻译即时显示，LLM 翻译随后补全

### 站点适配

- **YouTube** — 实时标注视频字幕
- **Bilibili** — 标注视频字幕
- **GitHub、StackOverflow、Wikipedia** — 智能跳过代码块、导航栏等区域
- **所有英文网页** — 支持任意 `http://` / `https://` 页面

### 设计

- **暗色模式** — 自动跟随系统 `prefers-color-scheme`
- **最小权限** — 仅需 `storage` + `<all_urls>`
- **隐私优先** — 不收集任何数据；LLM 模式直接发送到你配置的 API

## 截图

| 选项页 | 网页标注 | 翻译详情 |
|:---:|:---:|:---:|
| ![选项页](screenshots/01-options.png) | ![网页标注](screenshots/02-annotations.png) | ![翻译详情](screenshots/03-tooltip.png) |

## 项目架构

```
src/
├── background/
│   └── service-worker.ts        # 消息路由、限流、词典加载
├── content/
│   ├── index.ts                 # 主内容脚本（所有站点）
│   ├── youtube.ts / youtube-loader.ts   # YouTube 字幕注入
│   ├── bilibili.ts / bilibili-world.ts  # Bilibili 字幕注入
│   └── page-world.ts / page-world-loader.ts  # MAIN world 脚本
├── lib/
│   ├── level-filter.ts          # CEFR 词级过滤、站点规则、标注渲染
│   ├── level-data.ts            # CEFR 词典加载器（16万词，按首字母懒加载）
│   ├── inline-renderer.ts       # Shadow DOM 标注 + LRU 缓存
│   ├── translations.ts          # 翻译器工厂（本地 / LLM）
│   ├── llm-stream.ts            # LLM 流式批量翻译
│   ├── llm-url.ts               # LLM 端点 URL 规范化
│   ├── pronunciation.ts         # 4 源语音朗读回退链
│   ├── storage.ts               # Chrome Storage 抽象 + 数据迁移
│   └── stream-preview.ts        # 选项页流式预览
└── options/
    └── App.tsx                  # 设置界面（React）
```

## 技术栈

- **TypeScript** + **Vite**（Manifest V3）
- **React**（选项页）
- **Vitest**（单元测试，462 个测试，81% 覆盖率）
- **Playwright**（E2E 测试）

## 开发指南

```bash
# 安装依赖
npm install

# 开发构建（监听模式）
npm run dev

# 生产构建
npm run build

# 运行单元测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行 E2E 测试
npm run test:e2e
```

### 本地加载扩展

1. `npm run build`
2. 打开 `chrome://extensions`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」→ 选择 `dist/` 文件夹

## 数据文件

| 文件 | 大小 | 用途 |
|------|------|------|
| `level-data-full.json` | 3.4 MB | CEFR 词→等级映射（16 万词） |
| `translations-data.json` | 4.4 MB | 本地词典（音标、释义、例句） |
| `public/assets/detail/` | 48 MB | 按首字母拆分的详情文件（A-Z，按需加载） |

## 隐私

- **无遥测** — 扩展不收集任何数据
- **无外部服务器** — 所有处理均在本地完成
- **LLM 模式** — 启用后，段落文本直接发送到你配置的 API 端点。扩展作者看不到这些数据。
- 完整隐私政策：[readto.ai/privacy](https://readto.ai/privacy)

## 许可

私有软件。详见 [readto.ai](https://readto.ai)。
