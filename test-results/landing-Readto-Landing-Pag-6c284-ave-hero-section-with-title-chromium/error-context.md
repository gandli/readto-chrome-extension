# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Readto Landing Page >> Page Structure >> should have hero section with title
- Location: tests\landing.spec.ts:23:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Read to know"
Received string:    "404:  Not found"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    6 × locator resolved to <h1>…</h1>
      - unexpected value "404:  Not found"

```

```yaml
- 'heading "404: Not found" [level=1]'
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Readto Landing Page', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/');
  6   |     // Wait for page to be fully loaded
  7   |     await page.waitForLoadState('networkidle');
  8   |   });
  9   | 
  10  |   test.describe('Page Structure', () => {
  11  |     test('should have correct title', async ({ page }) => {
  12  |       await expect(page).toHaveTitle(/readto/);
  13  |     });
  14  | 
  15  |     test('should have navigation header', async ({ page }) => {
  16  |       const header = page.locator('header');
  17  |       await expect(header).toBeVisible();
  18  |       await expect(header.locator('a:has-text("readto")')).toBeVisible();
  19  |       await expect(header.locator('a:has-text("工作原理")')).toBeVisible();
  20  |       await expect(header.locator('a:has-text("安装扩展")')).toBeVisible();
  21  |     });
  22  | 
  23  |     test('should have hero section with title', async ({ page }) => {
  24  |       const h1 = page.locator('h1');
  25  |       await expect(h1).toBeVisible();
> 26  |       await expect(h1).toContainText('Read to know');
      |                        ^ Error: expect(locator).toContainText(expected) failed
  27  |       await expect(h1).toContainText('读懂每一个词');
  28  |     });
  29  | 
  30  |     test('should have install button', async ({ page }) => {
  31  |       const installBtn = page.locator('a:has-text("安装 Chrome 扩展")');
  32  |       await expect(installBtn).toBeVisible();
  33  |       await expect(installBtn).toHaveAttribute('href', /chromewebstore/);
  34  |     });
  35  | 
  36  |     test('should have How It Works section', async ({ page }) => {
  37  |       const section = page.locator('#how');
  38  |       await expect(section).toBeVisible();
  39  |       await expect(section.locator('h3:has-text("只标你不会的词")')).toBeVisible();
  40  |       await expect(section.locator('h3:has-text("不打断你的阅读节奏")')).toBeVisible();
  41  |       await expect(section.locator('h3:has-text("任何英文页面都能用")')).toBeVisible();
  42  |     });
  43  | 
  44  |     test('should have footer', async ({ page }) => {
  45  |       const footer = page.locator('footer');
  46  |       await expect(footer).toBeVisible();
  47  |       await expect(footer).toContainText('© 2026');
  48  |     });
  49  |   });
  50  | 
  51  |   test.describe('Level Slider', () => {
  52  |     test('should have level selector with 5 options', async ({ page }) => {
  53  |       const labels = page.locator('.slider-label');
  54  |       await expect(labels).toHaveCount(5);
  55  |       await expect(labels.nth(0)).toHaveText('入门');
  56  |       await expect(labels.nth(1)).toHaveText('基础');
  57  |       await expect(labels.nth(2)).toHaveText('进阶');
  58  |       await expect(labels.nth(3)).toHaveText('熟练');
  59  |       await expect(labels.nth(4)).toHaveText('精通');
  60  |     });
  61  | 
  62  |     test('should default to 进阶 level', async ({ page }) => {
  63  |       const desc = page.locator('#level-desc');
  64  |       await expect(desc).toContainText('大学四六级');
  65  |     });
  66  | 
  67  |     test('should update description when clicking levels', async ({ page }) => {
  68  |       const desc = page.locator('#level-desc');
  69  |       
  70  |       // Click 入门
  71  |       await page.locator('.slider-label:has-text("入门")').click();
  72  |       await expect(desc).toContainText('最基础');
  73  |       
  74  |       // Click 精通
  75  |       await page.locator('.slider-label:has-text("精通")').click();
  76  |       await expect(desc).toContainText('最生僻');
  77  |     });
  78  | 
  79  |     test('should persist level selection in localStorage', async ({ page }) => {
  80  |       // Select 熟练
  81  |       await page.locator('.slider-label:has-text("熟练")').click();
  82  |       
  83  |       // Reload page
  84  |       await page.reload();
  85  |       await page.waitForLoadState('networkidle');
  86  |       
  87  |       // Should still be 熟练
  88  |       const desc = page.locator('#level-desc');
  89  |       await expect(desc).toContainText('雅思托福');
  90  |     });
  91  |   });
  92  | 
  93  |   test.describe('Article Preview Annotations', () => {
  94  |     test('should have annotated words in article preview', async ({ page }) => {
  95  |       const readtoElements = page.locator('#demo-content [data-readto]');
  96  |       const count = await readtoElements.count();
  97  |       expect(count).toBeGreaterThan(0);
  98  |     });
  99  | 
  100 |     test('should have correct annotation words', async ({ page }) => {
  101 |       const words = ['sweeping', 'overhaul', 'profligate', 'vituperative'];
  102 |       for (const word of words) {
  103 |         const el = page.locator(`#demo-content [data-word="${word}"]`);
  104 |         await expect(el).toBeVisible();
  105 |       }
  106 |     });
  107 | 
  108 |     test('should show rt (ruby text) above annotated words', async ({ page }) => {
  109 |       const rtElements = page.locator('#demo-content .rt');
  110 |       const count = await rtElements.count();
  111 |       expect(count).toBeGreaterThan(0);
  112 |     });
  113 |   });
  114 | 
  115 |   test.describe('How It Works Annotations', () => {
  116 |     test('should have annotations in feature examples', async ({ page }) => {
  117 |       const section = page.locator('#how');
  118 |       const readtoElements = section.locator('[data-readto]');
  119 |       const count = await readtoElements.count();
  120 |       expect(count).toBeGreaterThan(0);
  121 |     });
  122 | 
  123 |     test('should have ostensibly annotation', async ({ page }) => {
  124 |       const el = page.locator('#how [data-word="ostensibly"]');
  125 |       await expect(el).toBeVisible();
  126 |     });
```