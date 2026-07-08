// @vitest-environment jsdom
/**
 * Audit v5 P1-A — selection-tooltip pure functions skeleton tests
 *
 * 背景：selection-tooltip.ts (429 loc) v4 前测试覆盖率 0%——用户核心路径之一
 * （selection → 悬停查词），完全无回归护栏。v5 骨架化：先把纯函数（无 DOM 副作用）
 * 抽出测试，把 selection-tooltip 从 0% 拉到 ~30%，剩余 setupSelectionTooltip
 * 事件绑定链留 v6 E2E 补齐。
 *
 * 覆盖：
 * - parseExampleSegments — 例句 {target} 标记解析
 * - positionTooltip — 视口自适应定位（上/下/水平钳制）
 * - isInReadtoElement — 跨 Shadow DOM 边界的 [data-readto] 检测
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseExampleSegments,
  positionTooltip,
  isInReadtoElement,
} from '../src/lib/selection-tooltip';

describe('parseExampleSegments (audit v5 P1-A)', () => {
  it('returns empty array for empty input', () => {
    expect(parseExampleSegments('')).toEqual([]);
  });

  it('returns single text segment when no markers', () => {
    expect(parseExampleSegments('Hello world')).toEqual([
      { kind: 'text', value: 'Hello world' },
    ]);
  });

  it('extracts single {target} marker', () => {
    expect(parseExampleSegments('I saw a {cat} today.')).toEqual([
      { kind: 'text', value: 'I saw a ' },
      { kind: 'target', value: 'cat' },
      { kind: 'text', value: ' today.' },
    ]);
  });

  it('handles marker at start', () => {
    expect(parseExampleSegments('{Cats} are cute.')).toEqual([
      { kind: 'target', value: 'Cats' },
      { kind: 'text', value: ' are cute.' },
    ]);
  });

  it('handles marker at end', () => {
    expect(parseExampleSegments('I have a {cat}')).toEqual([
      { kind: 'text', value: 'I have a ' },
      { kind: 'target', value: 'cat' },
    ]);
  });

  it('extracts multiple markers in a row', () => {
    expect(parseExampleSegments('{The} quick {brown} fox')).toEqual([
      { kind: 'target', value: 'The' },
      { kind: 'text', value: ' quick ' },
      { kind: 'target', value: 'brown' },
      { kind: 'text', value: ' fox' },
    ]);
  });

  it('ignores nested braces (regex does not match {{...}})', () => {
    // The regex is /\{([^{}]+)\}/g, so nested { are excluded from the content.
    // "{a{b}c}" — the inner {b} matches; outer becomes literal text.
    const result = parseExampleSegments('{a{b}c}');
    // Inner {b} matches: text before "{a", then target "b", then text "c}"
    expect(result).toEqual([
      { kind: 'text', value: '{a' },
      { kind: 'target', value: 'b' },
      { kind: 'text', value: 'c}' },
    ]);
  });

  it('preserves Unicode content inside markers', () => {
    expect(parseExampleSegments('这是 {单词} 的例句')).toEqual([
      { kind: 'text', value: '这是 ' },
      { kind: 'target', value: '单词' },
      { kind: 'text', value: ' 的例句' },
    ]);
  });
});

describe('positionTooltip (audit v5 P1-A)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Fresh jsdom viewport per test
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.style.position = 'fixed';
    document.body.appendChild(container);
    // Force a stable tooltip rect via getBoundingClientRect mock
    Object.defineProperty(container, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 200, height: 100, top: 0, left: 0, bottom: 100, right: 200, x: 0, y: 0, toJSON: () => ({}) } as DOMRect),
    });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  });

  it('prefers below when there is room', () => {
    const rangeRect = { top: 100, bottom: 120, left: 400, right: 500, width: 100, height: 20 } as DOMRect;
    positionTooltip(container, rangeRect);
    // belowTop = 120 + 6 = 126
    expect(container.style.top).toBe('126px');
  });

  it('falls back to above when no room below', () => {
    // rangeRect at bottom of viewport → tooltip cannot fit below
    const rangeRect = { top: 750, bottom: 770, left: 400, right: 500, width: 100, height: 20 } as DOMRect;
    positionTooltip(container, rangeRect);
    // aboveTop = 750 - 100 - 6 = 644
    expect(container.style.top).toBe('644px');
  });

  it('clamps left edge when selection is at viewport left', () => {
    const rangeRect = { top: 100, bottom: 120, left: 0, right: 20, width: 20, height: 20 } as DOMRect;
    positionTooltip(container, rangeRect);
    // left would be 0 + (20-200)/2 = -90, clamped to GAP=6
    expect(container.style.left).toBe('6px');
  });

  it('clamps right edge when selection is at viewport right', () => {
    const rangeRect = { top: 100, bottom: 120, left: 980, right: 1000, width: 20, height: 20 } as DOMRect;
    positionTooltip(container, rangeRect);
    // left would push tooltip past viewport right → clamped to vw - tipWidth - GAP = 1000-200-6 = 794
    expect(container.style.left).toBe('794px');
  });

  it('centers tooltip horizontally on wide selection in middle', () => {
    const rangeRect = { top: 100, bottom: 120, left: 400, right: 600, width: 200, height: 20 } as DOMRect;
    positionTooltip(container, rangeRect);
    // left = 400 + (200-200)/2 = 400
    expect(container.style.left).toBe('400px');
  });
});

describe('isInReadtoElement (audit v5 P1-A)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns false for an element outside any annotation', () => {
    const p = document.createElement('p');
    p.textContent = 'plain text';
    document.body.appendChild(p);
    expect(isInReadtoElement(p)).toBe(false);
  });

  it('returns true for an element inside a [data-readto] wrapper', () => {
    const wrapper = document.createElement('span');
    wrapper.setAttribute('data-readto', 'cat');
    const inner = document.createElement('em');
    inner.textContent = 'cat';
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);
    // Function walks up from element nodes via .closest(); text nodes are
    // outside its contract (real caller always passes element from range).
    expect(isInReadtoElement(inner)).toBe(true);
  });

  it('returns true for the [data-readto] element itself', () => {
    const wrapper = document.createElement('span');
    wrapper.setAttribute('data-readto', 'cat');
    document.body.appendChild(wrapper);
    expect(isInReadtoElement(wrapper)).toBe(true);
  });

  it('crosses Shadow DOM boundary to detect [data-readto] host', () => {
    const host = document.createElement('span');
    host.setAttribute('data-readto', 'cat');
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    inner.textContent = 'inside shadow';
    shadow.appendChild(inner);
    document.body.appendChild(host);
    // The inner element lives in the shadow root; walker must climb through
    // host to detect data-readto.
    expect(isInReadtoElement(inner)).toBe(true);
  });

  it('returns false when Shadow host has no data-readto', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');
    inner.textContent = 'inside';
    shadow.appendChild(inner);
    document.body.appendChild(host);
    expect(isInReadtoElement(inner)).toBe(false);
  });
});
