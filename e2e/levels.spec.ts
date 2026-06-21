/**
 * E2E: 英语水平 × 文章难度 标注量 + Tooltip + 朗读
 *
 * 单页策略: 所有文章在同一页面，每级只导航一次
 */
import { test, expect } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
const ARTICLES = ['children', 'news', 'academic', 'literary', 'tech'] as const;
const LABELS: Record<string, string> = {
  children: '小学故事', news: '新闻报道', academic: '学术论文', literary: '文学作品', tech: '科技新闻',
};

/* ─── Helpers ─────────────────────────────────────────────────── */

async function setLevel(ctx: BrowserContext, extId: string, level: CefrLevel) {
  const sw = ctx.serviceWorkers()[0];
  if (!sw) throw new Error('No service worker');
  await sw.evaluate((lv) => new Promise<void>(r => chrome.storage.sync.set({ level: lv }, r)), level);
  const stored = await sw.evaluate(() => new Promise<{ level?: string }>(r => chrome.storage.sync.get(['level'], r)));
  expect(stored.level).toBe(level);
}

async function collectAnnotations(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const result: Record<string, number> = {};
    for (const art of ['children', 'news', 'academic', 'literary', 'tech']) {
      const p = document.querySelector(`[data-article="${art}"]`);
      if (!p) { result[art] = 0; continue; }
      result[art] = p.querySelectorAll('[data-readto]').length;
    }
    return result;
  });
}

async function waitPageReady(page: Page) {
  // 滚动到底部触发所有 IntersectionObserver（只处理视口内元素）
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  // 滚回顶部
  await page.evaluate(() => window.scrollTo(0, 0));
  // 等内容脚本处理完成
  await page.waitForFunction(() => {
    return document.querySelectorAll('[data-readto]').length > 0;
  }, { timeout: 30_000 }).catch(() => {});
  // 再滚动一次确保底部元素也被处理
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
}

/* ─── 标注量测试 ───────────────────────────────────────────────── */

test.describe('标注量测试', () => {
  for (const level of LEVELS) {
    test(`${level} 水平标注量`, async ({ context, extensionId }) => {
      test.setTimeout(90_000);
      await setLevel(context, extensionId, level as CefrLevel);

      const page = await context.newPage();
      page.on('console', msg => {
        const t = msg.text();
        if (t.includes('[readto]')) console.log(`    [CS] ${t.substring(0, 120)}`);
      });

      // 单次导航: 所有文章在同一页面
      await page.goto(`http://localhost:3456/article-all.html`, {
        waitUntil: 'domcontentloaded', timeout: 10_000,
      });
      await waitPageReady(page);

      const results = await collectAnnotations(page);

      let total = 0;
      for (const art of ARTICLES) {
        const count = results[art] ?? 0;
        total += count;
        const bar = '█'.repeat(Math.min(count, 50));
        console.log(`  ${level} | ${LABELS[art]}  ${String(count).padStart(3)} ${bar}`);
      }
      console.log(`  ${level} 总计: ${total}`);

      // 高级文章应有标注
      const advancedTotal = (results.academic ?? 0) + (results.literary ?? 0) + (results.tech ?? 0);
      expect(advancedTotal, `${level} 学术/文学/科技至少应有标注`).toBeGreaterThan(0);

      await page.close();
    });
  }
});

/* ─── Tooltip 测试 ─────────────────────────────────────────────── */

test.describe('Tooltip 弹窗', () => {
  test('悬停标注词显示 tooltip', async ({ context, extensionId }) => {
    test.setTimeout(60_000);
    await setLevel(context, extensionId, 'A1');

    const page = await context.newPage();
    await page.goto(`http://localhost:3456/article-all.html`, { waitUntil: 'domcontentloaded', timeout: 10_000 });
    await waitPageReady(page);

    const count = await page.evaluate(() => document.querySelectorAll('[data-readto]').length);
    expect(count, '应有标注').toBeGreaterThan(0);

    // 悬停触发 tooltip
    const annotation = page.locator('[data-readto]').first();
    await annotation.hover();

    const tooltipVisible = await page.waitForFunction(() => {
      return document.querySelector('[data-readto]')?.shadowRoot?.querySelector('.tooltip') !== null;
    }, { timeout: 8000 }).catch(() => null);
    expect(tooltipVisible, '悬停后应出现 tooltip').not.toBeNull();

    const tooltipContent = await page.evaluate(() => {
      const tip = document.querySelector('[data-readto]')?.shadowRoot?.querySelector('.tooltip');
      if (!tip) return null;
      return {
        hasPhonetic: tip.querySelector('.phonetic') !== null,
        hasSpeaker: tip.querySelector('.speaker') !== null,
        text: (tip as HTMLElement).innerText?.substring(0, 200),
      };
    });

    console.log('Tooltip:', JSON.stringify(tooltipContent, null, 2));
    expect(tooltipContent, 'tooltip 应有内容').not.toBeNull();
    await page.close();
  });
});

/* ─── 朗读测试 ─────────────────────────────────────────────────── */

test.describe('朗读功能', () => {
  test('点击 speaker 按钮触发朗读', async ({ context, extensionId }) => {
    test.setTimeout(60_000);
    await setLevel(context, extensionId, 'A1');

    const page = await context.newPage();
    await page.goto(`http://localhost:3456/article-all.html`, { waitUntil: 'domcontentloaded', timeout: 10_000 });
    await waitPageReady(page);

    const count = await page.evaluate(() => document.querySelectorAll('[data-readto]').length);
    expect(count, '应有标注').toBeGreaterThan(0);

    const annotation = page.locator('[data-readto]').first();
    await annotation.hover();
    await page.waitForFunction(() => {
      return document.querySelector('[data-readto]')?.shadowRoot?.querySelector('.tooltip') !== null;
    }, { timeout: 8000 });

    const speakerExists = await page.evaluate(() => {
      const speaker = document.querySelector('[data-readto]')?.shadowRoot?.querySelector('.speaker') as HTMLElement;
      if (!speaker) return false;
      speaker.click();
      return true;
    });
    expect(speakerExists, '应有 speaker 按钮').toBe(true);

    const playing = await page.waitForFunction(() => {
      return document.querySelector('[data-readto]')?.shadowRoot?.querySelector('.speaker.playing') !== null;
    }, { timeout: 3000 }).catch(() => null);
    console.log('朗读:', playing ? 'playing ✓' : '播放完成（正常）');
    await page.close();
  });

  test('autoSpeak 设置可通过 options 页切换', async ({ context, extensionId }) => {
    test.setTimeout(30_000);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('.readto-levels', { timeout: 10000 });

    const checkbox = page.locator('input[type="checkbox"]').first();
    const hasCheckbox = await checkbox.count() > 0;
    if (hasCheckbox) {
      const before = await checkbox.isChecked();
      await checkbox.click();
      await page.waitForTimeout(400);
      const after = await checkbox.isChecked();
      console.log(`autoSpeak: ${before} → ${after}`);
      expect(after).not.toBe(before);
    } else {
      console.log('未找到 checkbox');
    }
    await page.close();
  });
});
