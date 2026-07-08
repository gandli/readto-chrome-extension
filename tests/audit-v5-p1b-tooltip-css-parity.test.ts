/**
 * Audit v5 P1-B — tooltip CSS single source of truth regression test
 *
 * 背景：level-filter.ts 曾经手工维护过 tooltip CSS 的精简副本 (FALLBACK_TOOLTIP_CSS)，
 * 结果 tooltip.css 的 @keyframes readto-speaker-pulse 和 @media (prefers-reduced-motion)
 * 都没同步过去，形成 pattern shadow。v5 修复用 `?raw` import 让 FALLBACK 直接引用
 * tooltip.css，从此单一真值源。
 *
 * 这些测试断言：任何未来对 tooltip.css 的关键条款修改都会被 shadow DOM 加载路径继承。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CANONICAL_CSS = readFileSync(
  resolve(__dirname, '../src/styles/tooltip.css'),
  'utf-8'
);

describe('tooltip CSS single source of truth (audit v5 P1-B)', () => {
  it('canonical stylesheet contains prefers-reduced-motion guard', () => {
    // 用户前庭反应保护：v4 P2-C 引入。v5 前只在 tooltip.css 生效，
    // level-filter.ts 的内嵌 CSS 副本没有；v5 用 ?raw import 后自动继承。
    expect(CANONICAL_CSS).toMatch(/prefers-reduced-motion/);
    expect(CANONICAL_CSS).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
  });

  it('canonical stylesheet contains speaker pulse keyframe', () => {
    // @keyframes readto-speaker-pulse 是 .speaker.playing 的核心动画。
    // level-filter.ts 的旧内嵌 CSS 副本缺失这段，会让点击发音按钮的脉冲失效。
    expect(CANONICAL_CSS).toMatch(/@keyframes\s+readto-speaker-pulse/);
  });

  it('canonical stylesheet contains dark mode block', () => {
    expect(CANONICAL_CSS).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/);
  });

  it('level-filter.ts uses ?raw import (no hand-maintained duplicate)', () => {
    const levelFilterSrc = readFileSync(
      resolve(__dirname, '../src/lib/level-filter.ts'),
      'utf-8'
    );
    // 必须包含 raw import 语句
    expect(levelFilterSrc).toMatch(/import\s+TOOLTIP_CSS_RAW\s+from\s+['"]\.\.\/styles\/tooltip\.css\?raw['"]/);
    // 不能再有内嵌的 .tooltip 大段样式字面量（历史副本）
    const inlineTooltipBlockPattern = /`[^`]*\.tooltip\s*\{[^`]*z-index:\s*2147483647[^`]*`/;
    expect(levelFilterSrc).not.toMatch(inlineTooltipBlockPattern);
  });
});
