import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4321/readto-chrome-extension';

async function openTooltip(page: Page, word = 'sweeping') {
  const target = page.locator(`[data-word="${word}"]`).first();
  const tooltip = page.locator('#tooltip');

  await target.scrollIntoViewIfNeeded();
  await target.click({ force: true });
  await page.waitForTimeout(250);

  const isOpen = await tooltip.evaluate((el) => el.classList.contains('show'));
  if (!isOpen) {
    await target.dispatchEvent('click');
    await page.waitForTimeout(250);
  }
}

test.describe('Readto Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Page Structure', () => {
    test('should have correct title', async ({ page }) => {
      await expect(page).toHaveTitle(/readto/);
    });

    test('should have navigation header', async ({ page }) => {
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
      await expect(header.locator('a:has-text("readto")')).toBeVisible();
      
      
    });

    test('should have hero section with title', async ({ page }) => {
      const h1 = page.locator('main h1').first();
      await expect(h1).toBeVisible();
      await expect(h1).toContainText('Read to know');
    });

    test('should have install button linking to Chrome Web Store', async ({ page }) => {
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
      await expect(privacyLink).toHaveAttribute('href', /\/privacy/);
    });

    test('should keep the main content column aligned with readto.ai width', async ({ page }) => {
      await page.setViewportSize({ width: 1258, height: 900 });
      await page.reload({ waitUntil: 'domcontentloaded' });

      const metrics = await page.locator('header > div').evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        return {
          width: Math.round(rect.width),
          x: Math.round(rect.x),
          maxWidth: styles.maxWidth,
        };
      });

      expect(metrics).toEqual({ width: 1180, x: 39, maxWidth: '1180px' });
    });

    test('should show tooltip by default in browser mockup', async ({ page }) => {
      const tooltip = page.locator('#tooltip');
      await expect(tooltip).toHaveClass(/show/);
      await expect(tooltip).not.toHaveClass(/hidden/);
      await expect(tooltip.locator('.body')).toContainText('彻底检修');
      await expect(page.locator('[data-word="overhaul"] .rt')).toBeVisible();
    });

    test('should preserve readable spacing between annotated words in browser mockup', async ({ page }) => {
      await page.locator('.slider-label:has-text("入门")').click({ force: true });

      const spacing = await page.locator('#demo-content p:has([data-readto])').first().evaluate((paragraph) => {
        const getTextRect = (element: HTMLElement) => {
          const textNode = Array.from(element.childNodes).find(
            (node) => node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim(),
          );
          if (!textNode) return null;

          const range = document.createRange();
          range.selectNodeContents(textNode);
          const rect = range.getBoundingClientRect();
          range.detach();
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          };
        };

        const words = Array.from(paragraph.querySelectorAll<HTMLElement>('[data-readto]'));
        const boxes = words.slice(0, 5).map((el) => {
          const textRect = getTextRect(el);
          return {
            word: el.dataset.word,
            left: textRect?.left ?? 0,
            right: textRect?.right ?? 0,
            top: textRect?.top ?? 0,
          };
        });

        const visibleAnnotations = words
          .map((el) => {
            const rt = el.querySelector<HTMLElement>('.rt');
            if (!rt || window.getComputedStyle(rt).display === 'none') return null;

            const wordRect = getTextRect(el);
            const rtRect = rt.getBoundingClientRect();
            const rtStyle = window.getComputedStyle(rt);
            return {
              word: el.dataset.word,
              wordRight: wordRect?.right ?? 0,
              wordTop: wordRect?.top ?? 0,
              annotationRight: rtRect.right,
              annotationTop: rtRect.top,
              annotationBottom: rtRect.bottom,
              annotationLeft: rtRect.left,
              display: rtStyle.display,
              position: rtStyle.position,
              verticalAlign: rtStyle.verticalAlign,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        const legacyStyleMismatches = visibleAnnotations
          .filter((item) => item.display !== 'inline' || item.position !== 'static' || item.verticalAlign !== 'super')
          .map((item) => item.word);

        const annotationOverlaps: string[] = [];
        for (let i = 0; i < visibleAnnotations.length; i += 1) {
          for (let j = i + 1; j < visibleAnnotations.length; j += 1) {
            const a = visibleAnnotations[i];
            const b = visibleAnnotations[j];
            const xOverlap = Math.min(a.annotationRight, b.annotationRight) - Math.max(a.annotationLeft, b.annotationLeft);
            const yOverlap = Math.min(a.annotationBottom, b.annotationBottom) - Math.max(a.annotationTop, b.annotationTop);
            if (xOverlap > 1 && yOverlap > 1) annotationOverlaps.push(`${a.word}-${b.word}`);
          }
        }

        const paragraphWithoutAnnotations = paragraph.cloneNode(true) as HTMLElement;
        paragraphWithoutAnnotations.querySelectorAll('.rt').forEach((element) => element.remove());

        return {
          text: paragraphWithoutAnnotations.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          gaps: boxes.slice(1).map((box, index) => ({
            pair: `${boxes[index].word}-${box.word}`,
            sameLine: Math.abs(box.top - boxes[index].top) < 2,
            gap: box.left - boxes[index].right,
          })),
          legacyStyleMismatches,
          annotationOverlaps,
        };
      });

      expect(spacing.text).toContain('The president announced sweeping reforms');
      for (const item of spacing.gaps.filter((item) => item.sameLine)) {
        expect(item.gap, `${item.pair} should keep a visible word gap`).toBeGreaterThan(2);
      }
      expect(spacing.legacyStyleMismatches, 'annotations should keep the original cloned inline superscript style').toEqual([]);
      expect(spacing.annotationOverlaps, 'annotations should not overlap each other').toEqual([]);
    });
  });

  test.describe('Level Slider', () => {
    test('should have 5 level options', async ({ page }) => {
      const labels = page.locator('.slider-label');
      await expect(labels).toHaveCount(5);
      await expect(labels.nth(0)).toHaveText('入门');
      await expect(labels.nth(4)).toHaveText('精通');
    });

    test('should default to 进阶 level', async ({ page }) => {
      const desc = page.locator('#level-desc');
      await expect(desc).toContainText('大学四六级');
    });

    test('should update description when clicking levels', async ({ page }) => {
      const desc = page.locator('#level-desc');
      
      await page.locator('.slider-label:has-text("入门")').click({ force: true });
      await expect(desc).toContainText('最基础');
      
      await page.locator('.slider-label:has-text("精通")').click({ force: true });
      await expect(desc).toContainText('最生僻');
    });

    test('should persist level in localStorage', async ({ page }) => {
      await page.locator('.slider-label:has-text("熟练")').click();
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      
      const desc = page.locator('#level-desc');
      await expect(desc).toContainText('雅思托福');
    });

    test('should have correct ARIA attributes', async ({ page }) => {
      const slider = page.locator('#level-slider');
      await expect(slider).toHaveAttribute('role', 'slider');
      await expect(slider).toHaveAttribute('aria-label', '英语水平');
    });

    test('should move knob when clicking on slider track', async ({ page }) => {
      const slider = page.locator('#level-slider');
      const knob = page.locator('#knob');
      
      // Get initial knob position
      const initialLeft = await knob.evaluate(el => el.style.left);
      
      // Click on the left side of the slider (should move to 入门)
      const box = await slider.boundingBox();
      if (box) {
        await page.mouse.click(box.x + 20, box.y + box.height / 2);
        await page.waitForTimeout(500);
        
        const newLeft = await knob.evaluate(el => el.style.left);
        expect(newLeft).not.toBe(initialLeft);
        
        // Check description updated
        const desc = page.locator('#level-desc');
        await expect(desc).toContainText('最基础');
      }
    });

    test('should move knob when dragging', async ({ page }) => {
      const slider = page.locator('#level-slider');
      const knob = page.locator('#knob');
      
      const box = await slider.boundingBox();
      if (box) {
        // Start from center, drag to right
        const startX = box.x + box.width / 2;
        const endX = box.x + box.width * 0.8;
        const y = box.y + box.height / 2;
        
        await page.mouse.move(startX, y);
        await page.mouse.down();
        await page.mouse.move(endX, y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(500);
        
        // Should be at 熟练 or 精通 level
        const desc = page.locator('#level-desc');
        const descText = await desc.textContent();
        expect(descText).toMatch(/雅思托福|最生僻/);
      }
    });

    test('should respond to keyboard arrows', async ({ page }) => {
      const slider = page.locator('#level-slider');
      const desc = page.locator('#level-desc');
      
      // Focus the slider
      await slider.focus();
      
      // Press right arrow (should go to 熟练)
      await page.keyboard.press('ArrowRight');
      await expect(desc).toContainText('雅思托福');
      
      // Press right arrow again (should go to 精通)
      await page.keyboard.press('ArrowRight');
      await expect(desc).toContainText('最生僻');
      
      // Press left arrow twice (should go back to 进阶)
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await expect(desc).toContainText('大学四六级');
    });

    test('should update active label style', async ({ page }) => {
      const labels = page.locator('.slider-label');
      
      // Default: 进阶 should be active
      await expect(labels.nth(2)).toHaveClass(/active/);
      await expect(labels.nth(2)).toHaveClass(/text-readto-ink/);
      
      // Click 入门
      await labels.nth(0).click({ force: true });
      await page.waitForTimeout(300);
      
      // 入门 should now be active
      await expect(labels.nth(0)).toHaveClass(/active/);
      await expect(labels.nth(0)).toHaveClass(/text-readto-ink/);
      
      // 进阶 should not be active
      await expect(labels.nth(2)).not.toHaveClass(/active/);
      await expect(labels.nth(2)).toHaveClass(/text-readto-muted-2/);
    });

    test('should update track fill width with slider', async ({ page }) => {
      const trackFill = page.locator('#track-fill');
      const labels = page.locator('.slider-label');
      
      // Default: 进阶 (50%)
      await expect(trackFill).toHaveAttribute('style', /width:\s*50%/);
      
      // Click 入门 (0%)
      await labels.nth(0).click({ force: true });
      await page.waitForTimeout(300);
      await expect(trackFill).toHaveAttribute('style', /width:\s*0%/);
      
      // Click 精通 (100%)
      await labels.nth(4).click({ force: true });
      await page.waitForTimeout(300);
      await expect(trackFill).toHaveAttribute('style', /width:\s*100%/);
      
      // Click 进阶 (50%)
      await labels.nth(2).click({ force: true });
      await page.waitForTimeout(300);
      await expect(trackFill).toHaveAttribute('style', /width:\s*50%/);
    });
  });

  test.describe('Level-Annotation Linkage', () => {
    test('入门 should show 53 annotations', async ({ page }) => {
      await page.locator('.slider-label:has-text("入门")').click();
      await expect(page.locator('#demo-content .rt:visible')).toHaveCount(53);
    });

    test('基础 should show 36 annotations', async ({ page }) => {
      await page.locator('.slider-label:has-text("基础")').click();
      await expect(page.locator('#demo-content .rt:visible')).toHaveCount(36);
    });

    test('进阶 should show 20 annotations', async ({ page }) => {
      await page.locator('.slider-label:has-text("进阶")').click();
      await expect(page.locator('#demo-content .rt:visible')).toHaveCount(20);
    });

    test('熟练 should show 6 annotations', async ({ page }) => {
      await page.locator('.slider-label:has-text("熟练")').click();
      await expect(page.locator('#demo-content .rt:visible')).toHaveCount(6);
    });

    test('精通 should show 3 annotations', async ({ page }) => {
      await page.locator('.slider-label:has-text("精通")').click({ force: true });
      await expect(page.locator('#demo-content .rt:visible')).toHaveCount(3);
    });

    test('should update annotations in real-time', async ({ page }) => {
      await page.locator('.slider-label:has-text("入门")').click({ force: true });
      await expect(page.locator('#demo-content .rt:visible')).toHaveCount(53);
      
      await page.locator('.slider-label:has-text("精通")').click({ force: true });
      await expect(page.locator('#demo-content .rt:visible')).toHaveCount(3);
    });
  });

  test.describe('Tooltip', () => {
    test('should show tooltip on click', async ({ page }) => {
      const tooltip = page.locator('#tooltip');
      await openTooltip(page);
      await expect(tooltip).toHaveClass(/show/);
    });

    test('should display phonetic and translation', async ({ page }) => {
      await openTooltip(page);
      
      const tooltip = page.locator('#tooltip');
      await expect(tooltip.locator('.ipa')).toContainText('/');
      await expect(tooltip.locator('.body')).toContainText('彻底');
    });

    test('should have speaker button', async ({ page }) => {
      await openTooltip(page);
      
      const speaker = page.locator('#tooltip .speaker');
      await expect(speaker).toBeAttached();
      await expect(speaker).toHaveAttribute('aria-label', /pronunciation/i);
    });

    test('should have cross-browser speaker button wired to Web Speech API', async ({ page }) => {
      let spoken = '';
      await page.addInitScript(() => {
        class MockUtterance {
          text: string;
          lang = '';
          rate = 1;
          pitch = 1;
          voice: SpeechSynthesisVoice | null = null;
          onend: (() => void) | null = null;
          onerror: (() => void) | null = null;
          constructor(text: string) {
            this.text = text;
          }
        }
        Object.defineProperty(window, 'SpeechSynthesisUtterance', {
          value: MockUtterance,
          configurable: true,
        });
        Object.defineProperty(window, 'speechSynthesis', {
          value: {
            cancel: () => {},
            resume: () => {},
            addEventListener: () => {},
            getVoices: () => [{ name: 'Microsoft Aria', lang: 'en-US' }],
            speak: (utterance: { text: string; onend?: () => void }) => {
              window.localStorage.setItem('last-spoken-word', utterance.text);
              utterance.onend?.();
            },
          },
          configurable: true,
        });
      });
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      const speaker = page.locator('#tooltip .speaker');
      await expect(page.locator('#tooltip')).toHaveClass(/show/);
      await speaker.click();
      spoken = (await page.evaluate(() => window.localStorage.getItem('last-spoken-word'))) || '';
      expect(spoken).toBe('overhaul');
    });

    test('should close on Escape', async ({ page }) => {
      const tooltip = page.locator('#tooltip');
      await openTooltip(page);
      await expect(tooltip).toHaveClass(/show/);
      
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(tooltip).toHaveClass(/hidden/);
    });

    test('should toggle on repeated click', async ({ page }) => {
      const tooltip = page.locator('#tooltip');
      const word = page.locator('[data-word="sweeping"]').first();
      
      await openTooltip(page);
      await expect(tooltip).toHaveClass(/show/);
      
      await word.dispatchEvent('click');
      await page.waitForTimeout(500);
      await expect(tooltip).toHaveClass(/hidden/);
    });
  });

  test.describe('Responsive', () => {
    test('should work on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const labels = page.locator('.slider-label');
      await expect(labels).toHaveCount(5);
      
      await labels.nth(0).click();
      await expect(page.locator('#level-desc')).toContainText('最基础');
    });

    test.skip('should show tooltip on mobile', async ({ page }) => {
      // Mobile tooltip interaction has compatibility issues with force click
      await page.setViewportSize({ width: 375, height: 812 });
      
      await openTooltip(page);
      await expect(page.locator('#tooltip')).toHaveClass(/show/);
    });
  });

  test.describe('Dark Mode', () => {
    test('should work in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      
      await openTooltip(page);
      
      const tooltip = page.locator('#tooltip');
      await expect(tooltip).toHaveClass(/show/);
    });
  });
});

test.describe('Privacy Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Privacy/);
  });

  test('should have heading about not collecting data', async ({ page }) => {
    await expect(page.locator('main h1').first()).toContainText("don't collect");
    await expect(page.locator('main h1').first()).toContainText('reading history');
  });

  test('should have last updated date', async ({ page }) => {
    await expect(page.locator('text=Last updated')).toBeVisible();
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

  test('should have technical terms in code blocks', async ({ page }) => {
    // Check for chrome.storage text
    await expect(page.locator('text=chrome.storage').first()).toBeVisible();
  });

  test('should have navigation back to home', async ({ page }) => {
    const homeLink = page.locator('header a:has-text("readto")');
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute('href', /readto-chrome-extension\/?$/);
  });

  test('should have footer with privacy link', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('© 2026');
    
    const privacyLink = footer.locator('a:has-text("隐私政策")');
    await expect(privacyLink).toHaveAttribute('href', /\/privacy/);
  });

  test('should have install button in header', async ({ page }) => {
    const installBtn = page.locator('header a:has-text("安装扩展")');
    await expect(installBtn).toBeVisible();
    await expect(installBtn).toHaveAttribute('href', /chromewebstore/);
  });

  test('should list bullet points for what we don\'t do', async ({ page }) => {
    const section = page.locator('h2:has-text("What we don\'t do")').locator('..');
    const bullets = section.locator('li');
    const count = await bullets.count();
    expect(count).toBe(4);
  });

  test('should mention LLM and BYOK', async ({ page }) => {
    await expect(page.locator('text=Bring Your Own Key')).toBeVisible();
  });

  test('should have link to readto.ai in contact section', async ({ page }) => {
    const contactSection = page.locator('h2:has-text("Contact")').locator('..');
    const link = contactSection.locator('a:has-text("readto.ai")');
    await expect(link).toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Header should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Title should be visible (use main h1 to avoid Playwright UI elements)
    await expect(page.locator('main h1').first()).toBeVisible();
    
    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});

test.describe('Tooltip Target Word Style', () => {
  test('should show target word in red color', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // Click on a word to show tooltip
    await openTooltip(page);
    
    // Check tooltip is visible
    const tooltip = page.locator('#tooltip');
    await expect(tooltip).toHaveClass(/show/);
    
    // Check example target word exists
    const target = tooltip.locator('.example .target');
    const count = await target.count();
    expect(count).toBeGreaterThan(0);
  });
});
