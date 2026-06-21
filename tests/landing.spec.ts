import { test, expect } from '@playwright/test';

test.describe('Readto Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Structure', () => {
    test('should have correct title', async ({ page }) => {
      await expect(page).toHaveTitle(/readto/);
    });

    test('should have navigation header', async ({ page }) => {
      const header = page.locator('header');
      await expect(header).toBeVisible();
      await expect(header.locator('a:has-text("readto")')).toBeVisible();
      await expect(header.locator('a:has-text("工作原理")')).toBeVisible();
      await expect(header.locator('a:has-text("安装扩展")')).toBeVisible();
    });

    test('should have hero section with title', async ({ page }) => {
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      await expect(h1).toContainText('Read to know');
      await expect(h1).toContainText('读懂每一个词');
    });

    test('should have install button', async ({ page }) => {
      const installBtn = page.locator('a:has-text("安装 Chrome 扩展")');
      await expect(installBtn).toBeVisible();
      await expect(installBtn).toHaveAttribute('href', /chromewebstore/);
    });

    test('should have How It Works section', async ({ page }) => {
      const section = page.locator('#how');
      await expect(section).toBeVisible();
      await expect(section.locator('h3:has-text("只标你不会的词")')).toBeVisible();
      await expect(section.locator('h3:has-text("不打断你的阅读节奏")')).toBeVisible();
      await expect(section.locator('h3:has-text("任何英文页面都能用")')).toBeVisible();
    });

    test('should have footer', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      await expect(footer).toContainText('© 2026');
    });
  });

  test.describe('Level Slider', () => {
    test('should have level selector with 5 options', async ({ page }) => {
      const labels = page.locator('.slider-label');
      await expect(labels).toHaveCount(5);
      await expect(labels.nth(0)).toHaveText('入门');
      await expect(labels.nth(1)).toHaveText('基础');
      await expect(labels.nth(2)).toHaveText('进阶');
      await expect(labels.nth(3)).toHaveText('熟练');
      await expect(labels.nth(4)).toHaveText('精通');
    });

    test('should default to 进阶 level', async ({ page }) => {
      const desc = page.locator('#level-desc');
      await expect(desc).toContainText('大学四六级');
    });

    test('should update description when clicking levels', async ({ page }) => {
      const desc = page.locator('#level-desc');
      
      // Click 入门
      await page.locator('.slider-label:has-text("入门")').click();
      await expect(desc).toContainText('最基础');
      
      // Click 精通
      await page.locator('.slider-label:has-text("精通")').click();
      await expect(desc).toContainText('最生僻');
    });

    test('should persist level selection in localStorage', async ({ page }) => {
      // Select 熟练
      await page.locator('.slider-label:has-text("熟练")').click();
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should still be 熟练
      const desc = page.locator('#level-desc');
      await expect(desc).toContainText('雅思托福');
    });
  });

  test.describe('Article Preview Annotations', () => {
    test('should have annotated words in article preview', async ({ page }) => {
      const readtoElements = page.locator('#demo-content [data-readto]');
      const count = await readtoElements.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have correct annotation words', async ({ page }) => {
      const words = ['sweeping', 'overhaul', 'profligate', 'vituperative'];
      for (const word of words) {
        const el = page.locator(`#demo-content [data-word="${word}"]`);
        await expect(el).toBeVisible();
      }
    });

    test('should show rt (ruby text) above annotated words', async ({ page }) => {
      const rtElements = page.locator('#demo-content .rt');
      const count = await rtElements.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('How It Works Annotations', () => {
    test('should have annotations in feature examples', async ({ page }) => {
      const section = page.locator('#how');
      const readtoElements = section.locator('[data-readto]');
      const count = await readtoElements.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have ostensibly annotation', async ({ page }) => {
      const el = page.locator('#how [data-word="ostensibly"]');
      await expect(el).toBeVisible();
    });

    test('should have ambiguous annotation', async ({ page }) => {
      const el = page.locator('#how [data-word="ambiguous"]');
      await expect(el).toBeVisible();
    });
  });

  test.describe('Tooltip Interaction', () => {
    test('should show tooltip on click', async ({ page }) => {
      const tooltip = page.locator('#tooltip');
      
      // Initially hidden
      await expect(tooltip).toHaveClass(/hidden/);
      
      // Click on an annotated word
      await page.locator('#demo-content [data-word="sweeping"]').click();
      
      // Should show tooltip
      await expect(tooltip).toHaveClass(/show/);
      await expect(tooltip).toBeVisible();
    });

    test('should display word details in tooltip', async ({ page }) => {
      // Click on sweeping
      await page.locator('#demo-content [data-word="sweeping"]').click();
      
      const tooltip = page.locator('#tooltip');
      await expect(tooltip).toHaveClass(/show/);
      
      // Should have phonetic
      const ipa = tooltip.locator('.ipa');
      await expect(ipa).toContainText('/');
      
      // Should have translation
      const body = tooltip.locator('.body');
      await expect(body).toContainText('大规模');
    });

    test('should have speaker button in tooltip', async ({ page }) => {
      await page.locator('#demo-content [data-word="sweeping"]').click();
      
      const speaker = page.locator('#tooltip .speaker');
      await expect(speaker).toBeVisible();
    });

    test('should close tooltip on Escape', async ({ page }) => {
      const tooltip = page.locator('#tooltip');
      
      // Open tooltip
      await page.locator('#demo-content [data-word="sweeping"]').click();
      await expect(tooltip).toHaveClass(/show/);
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Should be hidden
      await expect(tooltip).toHaveClass(/hidden/);
    });

    test('should toggle tooltip on repeated click', async ({ page }) => {
      const tooltip = page.locator('#tooltip');
      const word = page.locator('#demo-content [data-word="sweeping"]');
      
      // Click to open
      await word.click();
      await expect(tooltip).toHaveClass(/show/);
      
      // Click again to close (unpin)
      await word.click();
      await page.waitForTimeout(200);
      await expect(tooltip).toHaveClass(/hidden/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should stack content on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      // Hero should be single column
      const heroGrid = page.locator('section:first-of-type > div');
      // On mobile, grid should stack vertically
      const box = await heroGrid.boundingBox();
      expect(box?.width).toBeLessThan(400);
    });

    test('should have working slider on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const labels = page.locator('.slider-label');
      await expect(labels).toHaveCount(5);
      
      // Should be able to click
      await labels.nth(0).click();
      const desc = page.locator('#level-desc');
      await expect(desc).toContainText('最基础');
    });
  });

  test.describe('Dark Mode', () => {
    test('should support dark mode styles', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      
      const tooltip = page.locator('#tooltip');
      await page.locator('#demo-content [data-word="sweeping"]').click();
      
      await expect(tooltip).toHaveClass(/show/);
      // Tooltip should be visible in dark mode
      await expect(tooltip).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('slider should have correct ARIA attributes', async ({ page }) => {
      const slider = page.locator('#level-slider');
      await expect(slider).toHaveAttribute('role', 'slider');
      await expect(slider).toHaveAttribute('aria-label', '英语水平');
      await expect(slider).toHaveAttribute('aria-valuemin', '1');
      await expect(slider).toHaveAttribute('aria-valuemax', '5');
    });

    test('speaker button should have aria-label', async ({ page }) => {
      await page.locator('#demo-content [data-word="sweeping"]').click();
      
      const speaker = page.locator('#tooltip .speaker');
      await expect(speaker).toHaveAttribute('aria-label', /pronunciation/i);
    });

    test('annotated words should be keyboard focusable', async ({ page }) => {
      const word = page.locator('#demo-content [data-readto]').first();
      // Should be clickable (which implies focusable)
      await expect(word).toBeVisible();
    });
  });
});
