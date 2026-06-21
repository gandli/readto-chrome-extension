import { test, expect } from '@playwright/test';

test.describe('Readto Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

    test('should have install button linking to Chrome Web Store', async ({ page }) => {
      const installBtn = page.locator('a:has-text("安装 Chrome 扩展")');
      await expect(installBtn).toBeVisible();
      await expect(installBtn).toHaveAttribute('href', /chromewebstore/);
    });

    test('should have How It Works section with 3 features', async ({ page }) => {
      const section = page.locator('#how');
      await expect(section).toBeVisible();
      await expect(section.locator('h3:has-text("只标你不会的词")')).toBeVisible();
      await expect(section.locator('h3:has-text("不打断你的阅读节奏")')).toBeVisible();
      await expect(section.locator('h3:has-text("任何英文页面都能用")')).toBeVisible();
    });

    test('should have Why Read This Way section', async ({ page }) => {
      const quote = page.locator('blockquote');
      await expect(quote).toBeVisible();
      await expect(quote).toContainText('背单词的最好方式');
    });

    test('should have footer with privacy link', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      await expect(footer).toContainText('© 2026');
      const privacyLink = footer.locator('a:has-text("隐私政策")');
      await expect(privacyLink).toHaveAttribute('href', /privacy/);
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
      
      await page.locator('.slider-label:has-text("入门")').click();
      await expect(desc).toContainText('最基础');
      
      await page.locator('.slider-label:has-text("基础")').click();
      await expect(desc).toContainText('高考');
      
      await page.locator('.slider-label:has-text("进阶")').click();
      await expect(desc).toContainText('大学四六级');
      
      await page.locator('.slider-label:has-text("熟练")').click();
      await expect(desc).toContainText('雅思托福');
      
      await page.locator('.slider-label:has-text("精通")').click();
      await expect(desc).toContainText('最生僻');
    });

    test('should persist level selection in localStorage', async ({ page }) => {
      await page.locator('.slider-label:has-text("熟练")').click();
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const desc = page.locator('#level-desc');
      await expect(desc).toContainText('雅思托福');
    });

    test('should have correct ARIA attributes', async ({ page }) => {
      const slider = page.locator('#level-slider');
      await expect(slider).toHaveAttribute('role', 'slider');
      await expect(slider).toHaveAttribute('aria-label', '英语水平');
      await expect(slider).toHaveAttribute('aria-valuemin', '1');
      await expect(slider).toHaveAttribute('aria-valuemax', '5');
    });
  });

  test.describe('Level-Annotation Linkage', () => {
    test('入门 should show all 13 annotations', async ({ page }) => {
      await page.locator('.slider-label:has-text("入门")').click();
      const rtElements = page.locator('#demo-content .rt:visible');
      await expect(rtElements).toHaveCount(13);
    });

    test('基础 should show 10 annotations', async ({ page }) => {
      await page.locator('.slider-label:has-text("基础")').click();
      const rtElements = page.locator('#demo-content .rt:visible');
      await expect(rtElements).toHaveCount(10);
    });

    test('进阶 should show 5 annotations', async ({ page }) => {
      await page.locator('.slider-label:has-text("进阶")').click();
      const rtElements = page.locator('#demo-content .rt:visible');
      await expect(rtElements).toHaveCount(5);
    });

    test('熟练 should show 3 annotations', async ({ page }) => {
      await page.locator('.slider-label:has-text("熟练")').click();
      const rtElements = page.locator('#demo-content .rt:visible');
      await expect(rtElements).toHaveCount(3);
    });

    test('精通 should show 1 annotation', async ({ page }) => {
      await page.locator('.slider-label:has-text("精通")').click();
      const rtElements = page.locator('#demo-content .rt:visible');
      await expect(rtElements).toHaveCount(1);
    });

    test('should update annotations in real-time', async ({ page }) => {
      await page.locator('.slider-label:has-text("入门")').click();
      await expect(page.locator('#demo-content .rt:visible')).toHaveCount(13);
      
      await page.locator('.slider-label:has-text("精通")').click();
      await expect(page.locator('#demo-content .rt:visible')).toHaveCount(1);
      
      await page.locator('.slider-label:has-text("进阶")').click();
      await expect(page.locator('#demo-content .rt:visible')).toHaveCount(5);
    });
  });

  test.describe('Article Preview Annotations', () => {
    test('should have annotated words with data-readto attribute', async ({ page }) => {
      const readtoElements = page.locator('#demo-content [data-readto]');
      const count = await readtoElements.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have correct annotation words', async ({ page }) => {
      const words = ['sweeping', 'overhaul', 'profligate', 'vituperative'];
      for (const word of words) {
        const el = page.locator(`#demo-content [data-word="${word}"]`);
        await expect(el).toBeAttached();
      }
    });

    test('should have rt elements with translations', async ({ page }) => {
      const rtElements = page.locator('#demo-content .rt');
      const count = await rtElements.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Tooltip Interaction', () => {
    test('should show tooltip on click', async ({ page }) => {
      const tooltip = page.locator('#tooltip');
      await expect(tooltip).toHaveClass(/hidden/);
      
      await page.locator('#demo-content [data-word="sweeping"]').click();
      
      await expect(tooltip).toHaveClass(/show/);
      await expect(tooltip).toBeVisible();
    });

    test('should display word details in tooltip', async ({ page }) => {
      await page.locator('#demo-content [data-word="sweeping"]').click();
      
      const tooltip = page.locator('#tooltip');
      await expect(tooltip).toHaveClass(/show/);
      
      const ipa = tooltip.locator('.ipa');
      await expect(ipa).toContainText('/');
      
      const body = tooltip.locator('.body');
      await expect(body).toContainText('大规模');
    });

    test('should have speaker button in tooltip', async ({ page }) => {
      await page.locator('#demo-content [data-word="sweeping"]').click();
      
      const speaker = page.locator('#tooltip .speaker');
      await expect(speaker).toBeVisible();
      await expect(speaker).toHaveAttribute('aria-label', /pronunciation/i);
    });

    test('should have examples in tooltip', async ({ page }) => {
      await page.locator('#demo-content [data-word="sweeping"]').click();
      
      const examples = page.locator('#tooltip .examples');
      await expect(examples).toBeVisible();
      
      const exampleItems = page.locator('#tooltip .example');
      const count = await exampleItems.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should close tooltip on Escape', async ({ page }) => {
      const tooltip = page.locator('#tooltip');
      
      await page.locator('#demo-content [data-word="sweeping"]').click();
      await expect(tooltip).toHaveClass(/show/);
      
      await page.keyboard.press('Escape');
      await expect(tooltip).toHaveClass(/hidden/);
    });

    test('should toggle tooltip on repeated click (pin/unpin)', async ({ page }) => {
      const tooltip = page.locator('#tooltip');
      const word = page.locator('#demo-content [data-word="sweeping"]');
      
      await word.click();
      await expect(tooltip).toHaveClass(/show/);
      
      await word.click();
      await page.waitForTimeout(200);
      await expect(tooltip).toHaveClass(/hidden/);
    });

    test('should show tooltip for different words', async ({ page }) => {
      const tooltip = page.locator('#tooltip');
      
      // Click on vituperative
      await page.locator('#demo-content [data-word="vituperative"]').click();
      await expect(tooltip).toHaveClass(/show/);
      await expect(tooltip.locator('.body')).toContainText('辱骂');
      
      // Click on profligate
      await page.locator('#demo-content [data-word="profligate"]').click();
      await expect(tooltip.locator('.body')).toContainText('挥霍');
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
      await expect(el).toBeAttached();
    });

    test('should have ambiguous annotation', async ({ page }) => {
      const el = page.locator('#how [data-word="ambiguous"]');
      await expect(el).toBeAttached();
    });
  });

  test.describe('Responsive Design', () => {
    test('should stack content on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const heroGrid = page.locator('section:first-of-type > div');
      const box = await heroGrid.boundingBox();
      expect(box?.width).toBeLessThan(400);
    });

    test('should have working slider on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const labels = page.locator('.slider-label');
      await expect(labels).toHaveCount(5);
      
      await labels.nth(0).click();
      const desc = page.locator('#level-desc');
      await expect(desc).toContainText('最基础');
    });

    test('should have visible tooltip on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const tooltip = page.locator('#tooltip');
      await page.locator('#demo-content [data-word="sweeping"]').click();
      
      await expect(tooltip).toHaveClass(/show/);
      await expect(tooltip).toBeVisible();
    });
  });

  test.describe('Dark Mode', () => {
    test('should support dark mode styles', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      
      const tooltip = page.locator('#tooltip');
      await page.locator('#demo-content [data-word="sweeping"]').click();
      
      await expect(tooltip).toHaveClass(/show/);
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

    test('annotated words should be clickable', async ({ page }) => {
      const word = page.locator('#demo-content [data-readto]').first();
      await expect(word).toBeVisible();
    });
  });
});

test.describe('Privacy Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
  });

  test('should have correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Privacy/);
  });

  test('should have privacy policy heading', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toContainText("don't collect");
    await expect(h1).toContainText('reading history');
  });

  test('should have all 7 sections', async ({ page }) => {
    const sections = [
      'What readto is',
      'What we don\'t do',
      'What the extension stores',
      'Third parties',
      'Permissions',
      'Deleting your data',
      'Contact',
    ];
    
    for (const section of sections) {
      await expect(page.locator(`h2:has-text("${section}")`)).toBeVisible();
    }
  });

  test('should have navigation back to home', async ({ page }) => {
    const homeLink = page.locator('header a:has-text("readto")');
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute('href', /readto-chrome-extension\/?$/);
  });

  test('should have footer', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('© 2026');
  });

  test('should have code blocks for technical terms', async ({ page }) => {
    const codeBlocks = page.locator('code');
    const count = await codeBlocks.count();
    expect(count).toBeGreaterThan(0);
  });
});
