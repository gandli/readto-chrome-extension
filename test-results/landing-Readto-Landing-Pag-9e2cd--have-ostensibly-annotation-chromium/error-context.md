# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Readto Landing Page >> How It Works Annotations >> should have ostensibly annotation
- Location: tests\landing.spec.ts:123:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#how [data-word="ostensibly"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#how [data-word="ostensibly"]')

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
  25  |       await expect(h1).toBeVisible();
  26  |       await expect(h1).toContainText('Read to know');
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
> 125 |       await expect(el).toBeVisible();
      |                        ^ Error: expect(locator).toBeVisible() failed
  126 |     });
  127 | 
  128 |     test('should have ambiguous annotation', async ({ page }) => {
  129 |       const el = page.locator('#how [data-word="ambiguous"]');
  130 |       await expect(el).toBeVisible();
  131 |     });
  132 |   });
  133 | 
  134 |   test.describe('Tooltip Interaction', () => {
  135 |     test('should show tooltip on click', async ({ page }) => {
  136 |       const tooltip = page.locator('#tooltip');
  137 |       
  138 |       // Initially hidden
  139 |       await expect(tooltip).toHaveClass(/hidden/);
  140 |       
  141 |       // Click on an annotated word
  142 |       await page.locator('#demo-content [data-word="sweeping"]').click();
  143 |       
  144 |       // Should show tooltip
  145 |       await expect(tooltip).toHaveClass(/show/);
  146 |       await expect(tooltip).toBeVisible();
  147 |     });
  148 | 
  149 |     test('should display word details in tooltip', async ({ page }) => {
  150 |       // Click on sweeping
  151 |       await page.locator('#demo-content [data-word="sweeping"]').click();
  152 |       
  153 |       const tooltip = page.locator('#tooltip');
  154 |       await expect(tooltip).toHaveClass(/show/);
  155 |       
  156 |       // Should have phonetic
  157 |       const ipa = tooltip.locator('.ipa');
  158 |       await expect(ipa).toContainText('/');
  159 |       
  160 |       // Should have translation
  161 |       const body = tooltip.locator('.body');
  162 |       await expect(body).toContainText('大规模');
  163 |     });
  164 | 
  165 |     test('should have speaker button in tooltip', async ({ page }) => {
  166 |       await page.locator('#demo-content [data-word="sweeping"]').click();
  167 |       
  168 |       const speaker = page.locator('#tooltip .speaker');
  169 |       await expect(speaker).toBeVisible();
  170 |     });
  171 | 
  172 |     test('should close tooltip on Escape', async ({ page }) => {
  173 |       const tooltip = page.locator('#tooltip');
  174 |       
  175 |       // Open tooltip
  176 |       await page.locator('#demo-content [data-word="sweeping"]').click();
  177 |       await expect(tooltip).toHaveClass(/show/);
  178 |       
  179 |       // Press Escape
  180 |       await page.keyboard.press('Escape');
  181 |       
  182 |       // Should be hidden
  183 |       await expect(tooltip).toHaveClass(/hidden/);
  184 |     });
  185 | 
  186 |     test('should toggle tooltip on repeated click', async ({ page }) => {
  187 |       const tooltip = page.locator('#tooltip');
  188 |       const word = page.locator('#demo-content [data-word="sweeping"]');
  189 |       
  190 |       // Click to open
  191 |       await word.click();
  192 |       await expect(tooltip).toHaveClass(/show/);
  193 |       
  194 |       // Click again to close (unpin)
  195 |       await word.click();
  196 |       await page.waitForTimeout(200);
  197 |       await expect(tooltip).toHaveClass(/hidden/);
  198 |     });
  199 |   });
  200 | 
  201 |   test.describe('Responsive Design', () => {
  202 |     test('should stack content on mobile', async ({ page }) => {
  203 |       await page.setViewportSize({ width: 375, height: 812 });
  204 |       
  205 |       // Hero should be single column
  206 |       const heroGrid = page.locator('section:first-of-type > div');
  207 |       // On mobile, grid should stack vertically
  208 |       const box = await heroGrid.boundingBox();
  209 |       expect(box?.width).toBeLessThan(400);
  210 |     });
  211 | 
  212 |     test('should have working slider on mobile', async ({ page }) => {
  213 |       await page.setViewportSize({ width: 375, height: 812 });
  214 |       
  215 |       const labels = page.locator('.slider-label');
  216 |       await expect(labels).toHaveCount(5);
  217 |       
  218 |       // Should be able to click
  219 |       await labels.nth(0).click();
  220 |       const desc = page.locator('#level-desc');
  221 |       await expect(desc).toContainText('最基础');
  222 |     });
  223 |   });
  224 | 
  225 |   test.describe('Dark Mode', () => {
```