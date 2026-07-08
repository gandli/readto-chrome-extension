---
version: alpha
name: Readto
description: 一款为超出 CEFR 等级的英文单词标注中文注音的 Chrome 阅读辅助扩展。设计语言以「Journalistic Serif × Modern Sans」为骨，「Warm Kraft Paper」为面，追求安静克制、专注可读，让注释像编辑手记般融入原文。
colors:
  # ── 品牌牛皮纸底色（浅色主题 / warm off-white）──────────────
  brand-bg: "#F5F2EB"          # readto-bg · 主背景，暖白偏米，仿旧书页
  brand-ink: "#111111"         # readto-ink · 主文字，纯黑略偏暖
  brand-fg-2: "#3D3530"        # readto-fg-2 · 次级文字（副标题、引导）
  brand-muted: "#8A857E"       # readto-muted · 弱文字（元数据、时间戳、ruby 注音）
  brand-muted-2: "#B8B3AC"     # readto-muted-2 · 极弱文字（占位符、分隔线上文字、暗色 ruby）
  brand-rule: "#E3DFD8"        # readto-rule · 分隔线，比背景暗一档
  brand-accent: "#C97B4A"      # readto-accent · 陶土橙，唯一交互强调色（focus / active）
  brand-track: "#D6D0C4"       # readto-track · 滑轨背景（等级选择器）

  # ── shadcn 语义 token · 浅色 ───────────────────────────
  background: "#F7F5F2"        # hsl(30 7% 97%) · Options 页面背景
  foreground: "#1C1917"        # hsl(24 10% 10%) · 前景
  card: "#F7F5F2"
  card-foreground: "#1C1917"
  popover: "#F7F5F2"
  popover-foreground: "#1C1917"
  primary: "#1C1917"           # 主按钮底
  primary-foreground: "#F7F5F2"
  secondary: "#EFECE7"         # hsl(30 6% 94%) · 次级按钮底
  secondary-foreground: "#1C1917"
  muted: "#EFECE7"
  muted-foreground: "#78716C"  # hsl(25 5% 45%)
  accent: "#EBE7E1"            # hsl(25 6% 92%)
  accent-foreground: "#1C1917"
  destructive: "#AB2323"       # hsl(0 62% 42%)
  destructive-foreground: "#F7F5F2"
  border: "#D6D0C7"            # hsl(25 6% 85%)
  input: "#D6D0C7"
  ring: "#1C1917"

  # ── Tooltip 交互色 ─────────────────────────────────────
  tooltip-speaker-playing-light: "#1A73E8"   # 播放态图标（浅色主题）
  tooltip-speaker-playing-dark: "#66B1FF"    # 播放态图标（深色主题）

  # ── 深色主题（prefers-color-scheme: dark）─────────────
  dark-background: "#111111"    # hsl(24 10% 6%)
  dark-foreground: "#F0EDE6"    # hsl(30 7% 95%)
  dark-border: "#2E2A27"        # hsl(24 6% 18%)
  dark-muted-fg: "#A8A29E"      # hsl(25 5% 65%)
  dark-target-highlight: "#F5A623"  # hsl(30 90% 65%) · 深色模式例句关键词高亮

typography:
  # ── 显示层（Newsreader Variable · 编辑感） ─────────────
  display-lg:
    fontFamily: "'Newsreader Variable', 'Noto Serif SC Variable', Georgia, serif"
    fontSize: 2.5rem
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  display-md:
    fontFamily: "'Newsreader Variable', 'Noto Serif SC Variable', Georgia, serif"
    fontSize: 1.75rem
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.015em"

  # ── 正文（Segoe UI 系统栈 · 中英兼容） ──────────────────
  body-md:
    fontFamily: "'Segoe UI', Arial, 'Microsoft Yahei', sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "'Segoe UI', Arial, 'Microsoft Yahei', sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "'Segoe UI', Arial, 'Microsoft Yahei', sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45

  # ── Options UI 层（Inter Variable · 现代无衬线） ────────
  ui-lg:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif"
    fontSize: 1.125rem
    fontWeight: 500
    lineHeight: 1.4
  ui-md:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif"
    fontSize: 0.9375rem
    fontWeight: 500
    lineHeight: 1.5
  ui-sm:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.45

  # ── Tooltip 内部（Charter serif · 词典质感） ────────────
  tooltip-word:
    fontFamily: "Charter, 'Iowan Old Style', 'Source Serif 4', Georgia, serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  tooltip-example-en:
    fontFamily: "Charter, 'Iowan Old Style', 'Source Serif 4', Georgia, serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  tooltip-example-zh:
    fontFamily: "'Segoe UI', Arial, 'Microsoft Yahei', sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45

  # ── Ruby 注音（0.6em·极弱视觉重量）─────────────────────
  ruby-rt:
    fontFamily: "'Segoe UI', Arial, 'Microsoft Yahei', sans-serif"
    fontSize: 0.6em
    fontWeight: 400
    lineHeight: 1

rounded:
  none: 0
  sm: 4px       # 按钮 · 小图标背景 (speaker hover)
  md: 6px       # tooltip · 卡片 · 输入框
  lg: 8px       # 大卡片 / 弹窗
  full: 9999px

spacing:
  xs: 2px       # ruby 与主字间距
  sm: 4px       # 图标 padding
  md: 8px
  lg: 12px      # tooltip 内边距
  xl: 16px
  xxl: 24px

elevation:
  # 双层柔和阴影，模拟纸张微微离开桌面，非拟物化
  tooltip-light:
    boxShadow: "0 1px 2px rgba(24,20,18,0.05), 0 6px 16px rgba(24,20,18,0.06)"
  tooltip-dark:
    boxShadow: "0 1px 2px rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.45)"
  focus-ring:
    outline: "2px solid {colors.brand-ink}"
    outlineOffset: "4px"

components:
  # ── Tooltip · 单词悬停卡 ───────────────────────────────
  tooltip:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    typography: "{typography.tooltip-word}"

  tooltip-speaker:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    size: "22px"
    padding: "2px"

  tooltip-speaker-hover:
    backgroundColor: "#181412"      # rgba(24,20,18,0.06) 展开
    textColor: "{colors.foreground}"

  tooltip-speaker-playing:
    textColor: "{colors.tooltip-speaker-playing-light}"

  # ── 按钮 ───────────────────────────────────────────────
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.ui-md}"

  button-primary-hover:
    backgroundColor: "{colors.brand-fg-2}"
    textColor: "{colors.primary-foreground}"

  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"

  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"

  # ── 输入框 ─────────────────────────────────────────────
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    typography: "{typography.ui-sm}"

  input-focus:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"

  # ── 卡片（Options 卡） ─────────────────────────────────
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"

  # ── Ruby 注音 ─────────────────────────────────────────
  ruby-rt:
    textColor: "{colors.brand-muted}"
    typography: "{typography.ruby-rt}"

  ruby-rt-dark:
    textColor: "{colors.brand-muted-2}"

  # ── 等级滑轨（CEFR selector） ──────────────────────────
  slider-track:
    backgroundColor: "{colors.brand-track}"
    rounded: "{rounded.full}"
    height: "6px"

  slider-knob:
    backgroundColor: "{colors.brand-ink}"
    rounded: "{rounded.full}"
    size: "18px"
---

## Overview

**Readto** 是一款 Chrome 扩展，为超出 CEFR 阅读等级的英文单词自动标注中文注音（`<ruby>` 语义标签），并在悬停时弹出词典卡片。设计语言的核心命题是**「让注释像编辑手记，而非弹幕」**：视觉重量必须低于原文，但语义可读性要高于装饰。

### 设计原则

1. **安静优先于活跃**：Ruby 注音走 0.6em / muted 色，不与正文抢夺注意力。
2. **克制的强调**：整个系统只有一种交互强调色（陶土橙 `#C97B4A`），仅用于滑轨激活、focus ring 与语义警示。
3. **纸质隐喻**：主背景 `#F5F2EB` 偏暖的牛皮纸色，阴影模拟纸张微离桌面（`0 1px 2px + 0 6px 16px` 双层柔光），杜绝 material design 的深色投影。
4. **中英同源字号**：所有正文栈同时列出中文与英文回退族（`Segoe UI, Arial, Microsoft Yahei`），保证中英混排时字重与 x-height 一致。
5. **系统色跟随**：`prefers-color-scheme: dark` 自动切深色变体，无手动开关。

## Colors

### 品牌层（`--color-readto-*`）
- **Brand BG `#F5F2EB`**：主背景，仿旧书页暖白。所有 UI 表面（tooltip 除外）以此为默认底。
- **Brand Ink `#111111`**：主文字，偏暖的近黑，避免纯 `#000` 的机械感。
- **Brand FG-2 `#3D3530`**：副标题、引导文案，比 Ink 弱一级但仍可阅读。
- **Brand Muted `#8A857E`**：ruby 注音、元数据、次要标签，故意做弱以退出主注意力通道。
- **Brand Muted-2 `#B8B3AC`**：极弱层，占位符、深色模式 ruby、被禁用文本。
- **Brand Rule `#E3DFD8`**：分隔线，比背景暗一档但不形成断裂感。
- **Brand Accent `#C97B4A` — "Kraft Clay"**：**唯一**的交互强调色。用于滑轨激活轨道、focus ring 外描边、语义警告图标。**禁止**用于大面积填色。
- **Brand Track `#D6D0C4`**：滑轨未激活区，与背景形成 4-5% 亮度差。

### shadcn 语义层
用于 Options 页面组件（按钮、输入框、卡片）。所有 hsl 值以浅色为基础，深色变体经 `prefers-color-scheme` 覆盖。`primary` = ink 反相，`destructive` 走深暗红 `#AB2323`（避免 material red）。

### Tooltip 播放态
唯一使用蓝色的场景 — `#1A73E8`（浅色）/ `#66B1FF`（深色）。这是**功能色**（正在播放 TTS），不进入品牌系统。

### 深色主题
`prefers-color-scheme: dark` 触发。主要变化：
- 背景 `#F5F2EB` → `#111111`（近黑但保留 hue 24 的暖度）
- Ruby 注音 `#8A857E` → `#B8B3AC`（升 muted-2 保证 4.5:1）
- 例句高亮 `#F5A623` — 陶土橙的深色版，用于句中关键词

## Typography

### 字族分工

| 场景 | 字族 | 理由 |
|---|---|---|
| Tooltip 单词/例句 | **Charter → Iowan Old Style → Source Serif 4 → Georgia** | 词典字体传统，衬线让释义显得权威 |
| 页面显示层（H1/H2） | **Newsreader Variable → Noto Serif SC Variable** | 现代新闻衬线，中英同族厚度匹配 |
| Options UI | **Inter Variable → Noto Sans SC Variable → -apple-system** | 界面控件走无衬线，可变字重节省字重资源 |
| Ruby 注音 | **Segoe UI → Arial → Microsoft Yahei** | 系统栈保证 0.6em 极小字号清晰 |
| 正文 body | **Segoe UI 系统栈** | 中英混排默认最稳 |

### 字号层级
- `display-lg 2.5rem` / `display-md 1.75rem` — 仅用于 Options 页面首页大标题
- `ui-md 0.9375rem` — 表单标签、按钮、菜单项（Inter）
- `body-md 14px` — Tooltip 主体、正文
- `body-sm 13px` — Tooltip 例句英文
- `caption 12px` — Tooltip 例句中文、时间戳
- `ruby-rt 0.6em` — 严格相对 host 字号，保证任何原文尺寸下比例一致

### 特性设置
所有 body 启用 `font-feature-settings: "liga" 1, "calt" 1`，`text-rendering: optimizeLegibility`，`-webkit-font-smoothing: antialiased`。Newsreader 的可变字重区间 200-800、Inter 100-900 已 self-hosted 到 `assets/*.woff2`，避免运行时 Google Fonts 请求泄露隐私。

## Layout

### 空间基准
- 基础单位 **8px**（`spacing.md`），其他 token 均为其乘除
- Ruby 与主字水平间隙 `spacing.xs 2px`（`margin-left:1px` 兼容）
- Tooltip padding `10px 12px` — 竖向留白略小于横向，控件感更紧凑
- 卡片 padding `16px`（`spacing.xl`）

### Tooltip 尺寸
- `min-width 180px`：保证短单词也能承载音标 + 播放按钮
- `max-width 340px`：单行不超 40 字符英文（≈舒适阅读上限）
- `position: fixed`：脱离页面滚动
- `z-index: 2147483647`：Chrome MV3 最高，避免被沉浸式翻译类扩展覆盖

## Elevation & Depth

**两层柔光**是 Readto 的签名阴影：
- 第一层 `0 1px 2px 5%` — 定义边缘，模拟纸张边线
- 第二层 `0 6px 16px 6%` — 定义悬浮，模拟离桌面 6px

**禁用**：单层大阴影（material design 感）、彩色阴影、内阴影。

Focus ring 是唯一的「硬」视觉：`2px solid ink` + `outline-offset: 4px`，穿透卡片留白，明确交互目标。

## Shapes

- 只有 4 种圆角：`0 / 4px / 6px / 8px`
- Tooltip 与输入框：`6px`（`md`）— 略比按钮大以形成层级
- 按钮与小图标底：`4px`（`sm`）
- 卡片：`8px`（`lg`）
- 滑轨/knob/头像：`9999px`（`full`）

## Components

### `tooltip`
词典卡片，Charter 衬线，双层阴影，深浅主题各自的边框与背景。播放按钮 22×22，hover 时 6% 主色叠底。

### `button-primary`
Options 页面主操作（保存 / 测试连接）。深色 ink 底 + 暖白字。hover 走 `brand-fg-2` 微降对比，绝不加边框或阴影。

### `slider-track` / `slider-knob`
CEFR 等级滑轨。轨道 `brand-track`，knob 走 `brand-ink`，focus 时 `focus-ring` 白光穿透 4px 留白。**这是全站唯一使用陶土橙的地方**（激活段轨道），保持强调色的稀缺性。

### `ruby-rt`
`<rt>` 元素的样式合同：`font-size: 0.6em` · `vertical-align: super` · `line-height: 0` · `pointer-events: none` · `user-select: none`。用户不能选中注音，不能点击，从根本上退出交互层。

## Do's and Don'ts

### ✅ Do
- **对深色模式做真实测试**：用 macOS「显示 > 深色」+ Chrome DevTools「Emulate `prefers-color-scheme: dark`」都跑一遍。系统假 dark 与 Chrome 假 dark 有差异。
- **Ruby 注音字号必须相对 (`em`)，不能绝对 (`px`)**：因为 host 页面字号未知，绝对值在小字页面会撑破行高。
- **例句英文用衬线，例句中文用无衬线**：保持视觉重量对称（中文本身笔画多，衬线会过重）。
- **播放态图标用蓝色 `#1A73E8`**：这是 Chrome / Google TTS 生态的默认「播放中」信号，用户直觉命中。
- **所有交互组件必须有 focus-visible 状态**：`.readto-track-wrap:focus-visible .readto-knob { outline: 2px solid ink; outline-offset: 4px; }` 是键盘用户的救命稻草。

### ❌ Don't
- **不要给 Tooltip 加背景模糊 (backdrop-filter)**：Chrome 扩展页面性能预算紧，模糊在长文页面滚动时卡顿。
- **不要用陶土橙 `#C97B4A` 做大面积填色**：它是强调色，稀释后失去意义。
- **不要在 ruby 注音上加交互**：`pointer-events: none` 是硬约束，否则会阻挡原文选中。
- **不要用 material design 深色投影**：与纸质隐喻冲突。
- **不要引入运行时 Google Fonts / Typekit 请求**：所有字体必须 self-host 到 `dist/assets/`，Chrome Web Store 审核会拒绝外部字体加载。
- **不要在 dark mode 里保留浅色 tooltip 阴影**：`rgba(24,20,18,0.06)` 在黑底上完全消失，必须切到 `rgba(0,0,0,0.4)+0.45` 双层组合。
- **不要用 `<i class="icon-*">` 引入 icon font**：MV3 CSP 禁止外部字体，且 icon font 无法响应 `currentColor`。所有图标走内联 SVG `stroke="currentColor"`。

## Accessibility

### WCAG 对比校验清单

| 组合 | 比值 | 级别 |
|---|---:|---|
| `foreground` `#1C1917` on `background` `#F7F5F2` | 16.4:1 | AAA |
| `brand-muted` `#8A857E` on `brand-bg` `#F5F2EB` | 3.5:1 | ⚠ 仅 large text AA — **ruby 用 0.6em 属小字**，实际需在 dark mode 升级到 `brand-muted-2` |
| `brand-accent` `#C97B4A` on `brand-bg` `#F5F2EB` | 3.4:1 | AA large only — 因此**禁用于正文**，只作装饰边框 |
| `destructive` `#AB2323` on `background` `#F7F5F2` | 6.8:1 | AAA |
| `tooltip-speaker-playing-light` `#1A73E8` on background | 4.6:1 | AA |

**已知伪 A11y 问题**：
- Ruby 注音 3.5:1 未满足小字 AA。缓解：ruby 是**冗余信息**（原文本身完整可读），注音丢失不阻断理解，因此接受。
- 陶土橙 3.4:1 只用于焦点环外描边，不承载文本。

### 键盘操作
- 所有 focusable 元素启用 `:focus-visible`（非 `:focus`），鼠标点击不显示环
- Tooltip 触发通过 `data-readto` 元素的 `mouseenter` + `focusin` 双事件，键盘 Tab 也能唤出
- Escape 关闭当前 tooltip
- Options 页面所有表单元素支持原生 Tab 顺序，未劫持

### Reduced Motion
`prefers-reduced-motion: reduce` 应关闭所有 `transition`（当前 `.speaker` 的 `.15s` transition 与滑轨 `.08s` transform）。**待办**：在 `tooltip.css` 加：
```css
@media (prefers-reduced-motion: reduce) {
  .tooltip .speaker { transition: none; }
  .readto-knob { transition: none; }
}
```

## Implementation Notes

### Token 位置
- **单一来源**：`src/options/options.css`（`@theme` + `:root`）
- **Tailwind 消费**：Tailwind 4 `@theme` 语法自动生成 `bg-readto-bg` / `text-readto-ink` 等原子类
- **Tooltip 内联样式**：`src/lib/level-filter.ts:360` + `src/styles/tooltip.css` + `src/lib/selection-tooltip.ts` 三处**必须同步**（当前已重复 3 份，Phase 2 收敛）
- **已知漂移**：`selection-tooltip.ts` 的 shadow DOM 内 CSS 与 `tooltip.css` 是硬编码副本，token 更新需三处一起改

### 上架合规
- 字体 self-host：`Inter Variable` + `Newsreader Variable` 已打进 `dist/assets/*.woff2`
- 图标：`icons/16.png` `48.png` `128.png` 齐全，来源为 `public/icon.svg`
- 无外部资源加载，CSP `script-src 'self'; object-src 'self'; base-uri 'self'` 完整生效
