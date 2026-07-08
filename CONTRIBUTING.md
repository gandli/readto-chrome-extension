# Contributing to readto

Thanks for looking at readto. Small drive-by fixes to typos, docs, or dictionary entries are welcome as PRs. For larger changes, open an issue first so we can align on scope.

## Dev quick-start

```bash
bun install
bun run dev       # vite dev with source maps
bun run test      # vitest unit — 500+ tests, should be all green
bun run lint      # ESLint — src/ must be 0 warnings, tests/ ignores `any`
bun run build     # produce dist/ ready to load in chrome://extensions
```

Load `dist/` unpacked in Chrome to smoke-test manually.

## Quality gates

Every PR must pass:

- ✅ `tsc --noEmit` — zero type errors
- ✅ `bun run lint` — zero warnings under `src/**` (strict ceiling since v3b)
- ✅ `bun run test` — full vitest suite green (currently 510+ tests)
- ✅ `bun run build` — Vite production build succeeds
- ✅ No open Dependabot / Secret-scanning alerts introduced

CI enforces all of the above. `bun run format` before pushing keeps prettier diffs quiet.

## Security

If you find a security issue, do **not** open a public issue. Follow [.github/SECURITY.md](.github/SECURITY.md) for private disclosure.

## PR conventions

- **Branch names**: `feat/…`, `fix/…`, `refactor/…`, `docs/…`, `chore/…`
- **Commit messages**: Conventional Commits (`feat:`, `fix:`, etc.) — CHANGELOG.md is auto-generated.
- **PR body**: use the template in [.github/pull_request_template.md](.github/pull_request_template.md). Include the Verification section (tsc/lint/test/build results) — reviewers rely on it.
- **Squash + delete-branch on merge** — keeps history linear.

## Architecture at a glance

```text
src/
├── background/service-worker.ts   MV3 SW — LLM translation gateway, local dict
├── content/                        page/bilibili/youtube/index — DOM scanning
├── lib/                            shared: sanitize/translations/tooltip/edge-tts
└── options/                        settings UI (React 19 + Tailwind)
```

Read [.audit-reports/](.audit-reports/) for the most recent audit white paper — it explains coverage matrix, known limitations, and where new tests are most needed.

## Code style

- TypeScript strict mode; **no `any` in `src/`** (tests/ are exempt for mocking).
- React functional components only, hooks preferred over class state.
- CSS: Tailwind utility-first, custom classes in `src/styles/*.css` for shadow-DOM tooltips.
- Prefer small pure functions over long methods. Add a comment when doing something non-obvious — future readers thank you.

## Filing bugs

Include: Chrome version, extension version (see `chrome://extensions`), page URL that reproduces (if not private), console errors from the SW inspector, and expected vs actual behavior.
