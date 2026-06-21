# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Readto Landing Page >> Responsive Design >> should have working slider on mobile
- Location: tests\landing.spec.ts:212:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.slider-label')
Expected: 5
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('.slider-label')
    6 × locator resolved to 0 elements
      - unexpected value "0"

```

# Page snapshot

```yaml
- main [ref=e2]:
  - img [ref=e3]
  - 'heading "404: Not found" [level=1] [ref=e7]'
  - paragraph [ref=e8]:
    - text: In your
    - code [ref=e9]: site
    - text: you have your base path set to
    - link "/readto-chrome-extension" [ref=e10] [cursor=pointer]:
      - /url: /readto-chrome-extension
    - text: . Do you want to go there instead?
  - paragraph [ref=e11]:
    - text: Come to our
    - link "Discord" [ref=e12] [cursor=pointer]:
      - /url: https://astro.build/chat
    - text: if you need help.
```

# Test source

```ts
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
> 216 |       await expect(labels).toHaveCount(5);
      |                            ^ Error: expect(locator).toHaveCount(expected) failed
  217 |       
  218 |       // Should be able to click
  219 |       await labels.nth(0).click();
  220 |       const desc = page.locator('#level-desc');
  221 |       await expect(desc).toContainText('最基础');
  222 |     });
  223 |   });
  224 | 
  225 |   test.describe('Dark Mode', () => {
  226 |     test('should support dark mode styles', async ({ page }) => {
  227 |       await page.emulateMedia({ colorScheme: 'dark' });
  228 |       
  229 |       const tooltip = page.locator('#tooltip');
  230 |       await page.locator('#demo-content [data-word="sweeping"]').click();
  231 |       
  232 |       await expect(tooltip).toHaveClass(/show/);
  233 |       // Tooltip should be visible in dark mode
  234 |       await expect(tooltip).toBeVisible();
  235 |     });
  236 |   });
  237 | 
  238 |   test.describe('Accessibility', () => {
  239 |     test('slider should have correct ARIA attributes', async ({ page }) => {
  240 |       const slider = page.locator('#level-slider');
  241 |       await expect(slider).toHaveAttribute('role', 'slider');
  242 |       await expect(slider).toHaveAttribute('aria-label', '英语水平');
  243 |       await expect(slider).toHaveAttribute('aria-valuemin', '1');
  244 |       await expect(slider).toHaveAttribute('aria-valuemax', '5');
  245 |     });
  246 | 
  247 |     test('speaker button should have aria-label', async ({ page }) => {
  248 |       await page.locator('#demo-content [data-word="sweeping"]').click();
  249 |       
  250 |       const speaker = page.locator('#tooltip .speaker');
  251 |       await expect(speaker).toHaveAttribute('aria-label', /pronunciation/i);
  252 |     });
  253 | 
  254 |     test('annotated words should be keyboard focusable', async ({ page }) => {
  255 |       const word = page.locator('#demo-content [data-readto]').first();
  256 |       // Should be clickable (which implies focusable)
  257 |       await expect(word).toBeVisible();
  258 |     });
  259 |   });
  260 | });
  261 | 
```