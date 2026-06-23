# readto.ai Website

English | [中文辅助版](./README.zh.md)

> The product website and privacy policy site for the readto Chrome extension. Built with Astro and Tailwind CSS, deployed from the `website` branch to GitHub Pages.

## What is readto?

readto is a Chrome extension that helps Chinese-speaking learners read English web pages more fluently.

On any English page, readto automatically adds small Chinese glosses above words that are likely to be above the user's English level. The goal is simple: keep the reader inside the article, without selecting words, opening dictionary popups, or breaking the reading flow.

This website explains the product in the same spirit: quiet, readable, and focused.

## Live URLs

| Environment | URL |
|---|---|
| GitHub Pages | `https://gandli.github.io/readto-chrome-extension/` |
| Local dev | `http://127.0.0.1:4321/readto-chrome-extension/` |
| LAN preview | `http://<your-lan-ip>:4321/readto-chrome-extension/` |
| Privacy policy | `/readto-chrome-extension/privacy/` |

> `astro.config.mjs` currently uses `base: '/readto-chrome-extension'` for GitHub Pages project-site deployment. If the site is later deployed from a custom root domain, change the base path to `/` and update links accordingly.

## Features

| Area | Description |
|---|---|
| Landing page | Minimal product introduction for the readto Chrome extension |
| Reading preview | Simulates an English news article with inline Chinese word glosses |
| Level slider | Lets users preview how annotation density changes by English level |
| Tooltip cards | Hover/click word cards with pronunciation, translation, examples, and speech playback |
| Privacy policy | Explains what the extension does not collect and what stays on-device |
| GitHub Pages deploy | Automatic build and deployment from the `website` branch |

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Astro 7 |
| Styling | Tailwind CSS 4 + global CSS tokens |
| Language | Astro / TypeScript / CSS |
| Package manager | Bun preferred; npm lockfile retained for GitHub/Dependabot scanning |
| Testing | Playwright |
| Deployment | GitHub Pages + GitHub Actions |

## Quick Start

### Install dependencies

```bash
bun install
```

### Start the dev server

```bash
bun run dev
```

Open:

```txt
http://127.0.0.1:4321/readto-chrome-extension/
```

### LAN-accessible dev server

`astro.config.mjs` already sets `host: '0.0.0.0'`, so the normal dev command is usually enough:

```bash
bun run dev
```

You can also pass the host explicitly:

```bash
bun run dev -- --host 0.0.0.0
```

Then visit from another device on the same network:

```txt
http://<your-lan-ip>:4321/readto-chrome-extension/
```

Example:

```txt
http://192.168.5.46:4321/readto-chrome-extension/
```

### Build for production

```bash
bun run build
```

The output is written to:

```txt
dist/
```

### Preview the production build

```bash
bun run preview
```

## Scripts

| Command | Purpose |
|---|---|
| `bun install` | Install dependencies |
| `bun run dev` | Start Astro dev server |
| `bun run build` | Build the static site |
| `bun run preview` | Preview the production build locally |
| `bun run test` | Run Playwright tests |
| `bun run test:ui` | Open Playwright UI mode |
| `bun run test:headed` | Run Playwright in headed mode |

## Project Structure

```txt
.
├── .github/
│   └── workflows/
│       └── astro.yml          # GitHub Pages deployment workflow
├── public/                    # Static assets
├── src/
│   ├── layouts/
│   │   └── Layout.astro       # Global HTML layout, metadata, favicon
│   ├── pages/
│   │   ├── index.astro        # Landing page, reading preview, slider, tooltip logic
│   │   └── privacy.astro      # Privacy policy page
│   └── styles/
│       └── global.css         # Tailwind entry, design tokens, dynamic element styles
├── astro.config.mjs           # Astro config, GitHub Pages base path, LAN host
├── package.json               # Scripts and dependencies
├── bun.lock                   # Bun lockfile
├── package-lock.json          # npm lockfile for GitHub/Dependabot scanning
├── README.md                  # English primary documentation
└── README.zh.md               # Chinese supplementary documentation
```

## Architecture

```txt
Browser request
   │
   ▼
Astro static output
   │
   ├── Layout.astro
   │     ├── document metadata
   │     ├── Open Graph metadata
   │     └── global stylesheet import
   │
   ├── index.astro
   │     ├── navigation
   │     ├── hero copy
   │     ├── reading preview
   │     ├── level slider
   │     ├── tooltip interaction script
   │     └── explanation sections
   │
   └── privacy.astro
         ├── navigation
         ├── policy content
         └── footer
```

The site is fully static. There is no backend service, database, account system, analytics service, or server-side storage in this website.

## Core Pages

### `src/pages/index.astro`

The landing page contains:

- Header navigation;
- Hero section;
- Chrome Web Store CTA;
- Simulated English article preview;
- Inline Chinese glosses;
- English-level slider;
- Tooltip cards;
- Web Speech API pronunciation playback;
- Short explanation sections;
- Footer.

### `src/pages/privacy.astro`

The privacy policy explains:

- What readto is;
- What data readto does not collect;
- Which settings the extension stores locally;
- Which third-party services the extension may contact;
- Why browser permissions are needed;
- How users can delete local data;
- Where the latest policy is published.

## Interaction Details

### Level slider

The homepage slider has five levels:

| Level | Preview behavior |
|---|---|
| 入门 | Show the most basic words |
| 基础 | Show words below high-school level |
| 进阶 | Show words above CET-4/CET-6 level |
| 熟练 | Show IELTS/TOEFL-level words |
| 精通 | Show only the rarest words |

The slider labels, tick marks, and knob all share the same coordinate system:

```txt
0% / 25% / 50% / 75% / 100%
```

This prevents label/tick/knob drift across screen sizes.

### Annotated words and tooltip cards

Annotated words use the `data-readto` and `data-word` attributes:

```html
<span data-readto data-word="sweeping">
  sweeping<span class="rt">影响广泛的</span>
</span>
```

Interaction behavior:

- Hover an annotated word to show the tooltip after a short delay;
- Leave the word to hide the tooltip after a short delay;
- Click a word to pin/unpin the tooltip;
- Click outside to close it;
- Press `Escape` to close it;
- Click the speaker button to pronounce the English word through the browser Web Speech API.

## Styling System

Design tokens live in `src/styles/global.css`.

| Token | Purpose |
|---|---|
| `--color-readto-bg` | Page background |
| `--color-readto-fg` | Main foreground text |
| `--color-readto-fg-2` | Secondary text |
| `--color-readto-muted` | Muted UI text |
| `--color-readto-rule` | Borders and dividers |
| `--color-readto-card` | Card background |
| `--color-readto-accent` | Brand accent color |
| `--font-sans` | UI and body text |
| `--font-serif` | Display and reading-like text |
| `--max-w-content` | Main content max width |

Static layout uses Tailwind utility classes. Dynamic or script-controlled elements, such as `.tooltip`, `.rt`, and `.slider-*`, are styled in global CSS so they are not affected by Astro scoped-style limitations.

## Deployment

Deployment is defined in:

```txt
.github/workflows/astro.yml
```

The workflow runs on:

```yaml
on:
  push:
    branches: [website]
  workflow_dispatch:
```

Deployment flow:

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
   ├── upload dist artifact
   └── deploy to GitHub Pages
```

## Branch Strategy

This repository uses two long-lived product branches:

| Branch | Purpose |
|---|---|
| `main` | Chrome extension source code |
| `website` | Product website, landing page, and privacy policy |

Recommended local worktrees:

```txt
C:\Users\user\Desktop\readto-extension
C:\Users\user\Desktop\readto-extension-website-security
```

## Development Notes

| Topic | Notes |
|---|---|
| GitHub Pages base path | Use `import.meta.env.BASE_URL` for internal links because the site is deployed under `/readto-chrome-extension` |
| LAN preview | `host: '0.0.0.0'` is configured, so mobile devices on the same network can access the dev server |
| Slider alignment | Labels, ticks, and knob must use the same coordinate system; do not mix `justify-between`, padding, and different JS percentages |
| Dynamic tooltip styles | Keep tooltip and annotation CSS in `global.css`, not in scoped Astro styles |
| Bun and npm lockfiles | Use Bun for daily development; keep `package-lock.json` synchronized for GitHub security scanning |
| Visual direction | The site should stay quiet, minimal, and reading-oriented. Avoid dense marketing sections unless intentionally requested |

## Verification Checklist

Run at minimum:

```bash
bun run build
git diff --check
```

For visual or interaction changes, also check:

- Desktop homepage;
- Mobile homepage;
- Privacy page;
- Slider label/tick/knob alignment;
- Tooltip hover, click pinning, outside click, and Escape close behavior;
- Horizontal overflow;
- `/privacy/` link correctness.

## License

No license is declared in this branch yet. Add the appropriate license according to the repository policy.
