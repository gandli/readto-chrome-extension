# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Readto Landing Page >> Page Structure >> should have correct title
- Location: tests\landing.spec.ts:10:5

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /readto/
Received string:  "404: Not Found"
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    14 × unexpected value "404: Not Found"

```

```yaml
- main:
  - img
  - 'heading "404: Not found" [level=1]'
  - paragraph:
    - text: In your
    - code: site
    - text: you have your base path set to
    - link "/readto-chrome-extension":
      - /url: /readto-chrome-extension
    - text: . Do you want to go there instead?
  - paragraph:
    - text: Come to our
    - link "Discord":
      - /url: https://astro.build/chat
    - text: if you need help.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Readto Landing Page', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/');
  6   |     await page.waitForLoadState('networkidle');
  7   |   });
  8   | 
  9   |   test.describe('Page Structure', () => {
  10  |     test('should have correct title', async ({ page }) => {
> 11  |       await expect(page).toHaveTitle(/readto/);
      |                          ^ Error: expect(page).toHaveTitle(expected) failed
  12  |     });
  13  | 
  14  |     test('should have navigation header', async ({ page }) => {
  15  |       const header = page.locator('header');
  16  |       await expect(header).toBeVisible();
  17  |       await expect(header.locator('a:has-text("readto")')).toBeVisible();
  18  |       await expect(header.locator('a:has-text("工作原理")')).toBeVisible();
  19  |       await expect(header.locator('a:has-text("安装扩展")')).toBeVisible();
  20  |     });
  21  | 
  22  |     test('should have hero section with title', async ({ page }) => {
  23  |       const h1 = page.locator('h1');
  24  |       await expect(h1).toBeVisible();
  25  |       await expect(h1).toContainText('Read to know');
  26  |       await expect(h1).toContainText('读懂每一个词');
  27  |     });
  28  | 
  29  |     test('should have install button linking to Chrome Web Store', async ({ page }) => {
  30  |       const installBtn = page.locator('a:has-text("安装 Chrome 扩展")');
  31  |       await expect(installBtn).toBeVisible();
  32  |       await expect(installBtn).toHaveAttribute('href', /chromewebstore/);
  33  |     });
  34  | 
  35  |     test('should have How It Works section with 3 features', async ({ page }) => {
  36  |       const section = page.locator('#how');
  37  |       await expect(section).toBeVisible();
  38  |       await expect(section.locator('h3:has-text("只标你不会的词")')).toBeVisible();
  39  |       await expect(section.locator('h3:has-text("不打断你的阅读节奏")')).toBeVisible();
  40  |       await expect(section.locator('h3:has-text("任何英文页面都能用")')).toBeVisible();
  41  |     });
  42  | 
  43  |     test('should have Why Read This Way section', async ({ page }) => {
  44  |       const quote = page.locator('blockquote');
  45  |       await expect(quote).toBeVisible();
  46  |       await expect(quote).toContainText('背单词的最好方式');
  47  |     });
  48  | 
  49  |     test('should have footer with privacy link', async ({ page }) => {
  50  |       const footer = page.locator('footer');
  51  |       await expect(footer).toBeVisible();
  52  |       await expect(footer).toContainText('© 2026');
  53  |       const privacyLink = footer.locator('a:has-text("隐私政策")');
  54  |       await expect(privacyLink).toHaveAttribute('href', /privacy/);
  55  |     });
  56  |   });
  57  | 
  58  |   test.describe('Level Slider', () => {
  59  |     test('should have level selector with 5 options', async ({ page }) => {
  60  |       const labels = page.locator('.slider-label');
  61  |       await expect(labels).toHaveCount(5);
  62  |       await expect(labels.nth(0)).toHaveText('入门');
  63  |       await expect(labels.nth(1)).toHaveText('基础');
  64  |       await expect(labels.nth(2)).toHaveText('进阶');
  65  |       await expect(labels.nth(3)).toHaveText('熟练');
  66  |       await expect(labels.nth(4)).toHaveText('精通');
  67  |     });
  68  | 
  69  |     test('should default to 进阶 level', async ({ page }) => {
  70  |       const desc = page.locator('#level-desc');
  71  |       await expect(desc).toContainText('大学四六级');
  72  |     });
  73  | 
  74  |     test('should update description when clicking levels', async ({ page }) => {
  75  |       const desc = page.locator('#level-desc');
  76  |       
  77  |       await page.locator('.slider-label:has-text("入门")').click();
  78  |       await expect(desc).toContainText('最基础');
  79  |       
  80  |       await page.locator('.slider-label:has-text("基础")').click();
  81  |       await expect(desc).toContainText('高考');
  82  |       
  83  |       await page.locator('.slider-label:has-text("进阶")').click();
  84  |       await expect(desc).toContainText('大学四六级');
  85  |       
  86  |       await page.locator('.slider-label:has-text("熟练")').click();
  87  |       await expect(desc).toContainText('雅思托福');
  88  |       
  89  |       await page.locator('.slider-label:has-text("精通")').click();
  90  |       await expect(desc).toContainText('最生僻');
  91  |     });
  92  | 
  93  |     test('should persist level selection in localStorage', async ({ page }) => {
  94  |       await page.locator('.slider-label:has-text("熟练")').click();
  95  |       await page.reload();
  96  |       await page.waitForLoadState('networkidle');
  97  |       
  98  |       const desc = page.locator('#level-desc');
  99  |       await expect(desc).toContainText('雅思托福');
  100 |     });
  101 | 
  102 |     test('should have correct ARIA attributes', async ({ page }) => {
  103 |       const slider = page.locator('#level-slider');
  104 |       await expect(slider).toHaveAttribute('role', 'slider');
  105 |       await expect(slider).toHaveAttribute('aria-label', '英语水平');
  106 |       await expect(slider).toHaveAttribute('aria-valuemin', '1');
  107 |       await expect(slider).toHaveAttribute('aria-valuemax', '5');
  108 |     });
  109 |   });
  110 | 
  111 |   test.describe('Level-Annotation Linkage', () => {
```