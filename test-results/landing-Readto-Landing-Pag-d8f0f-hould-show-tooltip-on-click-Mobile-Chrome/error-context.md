# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Readto Landing Page >> Tooltip >> should show tooltip on click
- Location: tests\landing.spec.ts:244:5

# Error details

```
Error: expect(locator).toHaveClass(expected) failed

Locator: locator('#tooltip')
Expected pattern: /show/
Received string:  "tooltip hidden"
Timeout: 10000ms

Call log:
  - Expect "toHaveClass" with timeout 10000ms
  - waiting for locator('#tooltip')
    23 × locator resolved to <div id="tooltip" class="tooltip hidden">…</div>
       - unexpected value "tooltip hidden"

```

```yaml
- banner:
  - link "readto . ai":
    - /url: /readto-chrome-extension
  - navigation:
    - link "工作原理":
      - /url: /readto-chrome-extension#how
    - link "隐私政策":
      - /url: /readto-chrome-extension/privacy
    - link "安装扩展 →":
      - /url: https://chromewebstore.google.com/detail/readto/hmoifnkckggncdpoplpoiifjafffmkof
- main:
  - paragraph: A CHROME EXTENSION · 浏览器扩展
  - heading "Read to know. 读懂每一个词。" [level=1]
  - paragraph: 在任何英文网页上，readto 会根据你的英语水平，悄悄在生词上方标好中文小注。不划词、不跳窗、不中断阅读。
  - link "安装 Chrome 扩展 →":
    - /url: https://chromewebstore.google.com/detail/readto/hmoifnkckggncdpoplpoiifjafffmkof
  - paragraph: YOUR LEVEL · 你的水平
  - text: 入门 基础 进阶 熟练 精通
  - slider "英语水平"
  - paragraph: 只标大学四六级以上的词。
  - text: /politics/tax-reform-bill.html Politics
  - heading "President Announces Sweeping Tax Reforms" [level=2]
  - paragraph: By Anna Reed · April 22, 2026
  - paragraph: The president announced sweeping reforms to the nation's tax system yesterday, marking the most significant overhaul彻底检修 in a decade.
  - paragraph: Critics denounce公开谴责 the changes as disproportionately不成比例地 benefiting wealthy citizens, accusing the administration of profligate挥霍的 giveaways and austerity经济紧缩 toward middle-class families already burdened by rising costs.
  - paragraph: Proponents支持者 counter that lower taxes will stimulate investment and ameliorate改善 broader inequities.
  - paragraph: The bill faces a difficult path through the fractious易怒的, polarized极化的 legislature, where opposition lawmakers立法者 have vowed发誓 to obstruct阻碍 its passage with vituperative谩骂的 floor speeches.
  - paragraph: Despite a flurry一阵 of grassroots草根的 rhetoric修辞, recent polls indicate voters remain deeply skeptical怀疑的 of what they view as perfunctory敷衍的 concessions让步, leaving negotiations at a fragile impasse僵局.
  - text: 原理 · How it works
  - heading "读你本来就想读的， 生词在阅读中自然沉淀。" [level=2]
  - text: No. 01
  - heading "只标你不会的词" [level=3]
  - paragraph: 根据你选择的英语水平，跳过你已经会的，只在真正超纲的词上方加注。
  - text: He was ostensibly表面上 in charge, but the real power lay elsewhere别处. No. 02
  - heading "不打断你的阅读节奏" [level=3]
  - paragraph: 中文释义以小字标注在单词上方，不需要划词、点击或跳转词典。
  - text: The findings were ambiguous模糊的, leaving room for interpretation解读. No. 03
  - heading "任何英文页面都能用" [level=3]
  - paragraph: 新闻、博客、论文、小说——所有英文网页都支持。
  - text: nytimes.com medium.com arxiv.org wikipedia.org Why read this way
  - blockquote: 背单词的最好方式， 是在真实阅读里反复遇到它。
  - text: — readto 的设计前提
- contentinfo:
  - link "readto.ai":
    - /url: /readto-chrome-extension
  - link "隐私政策":
    - /url: /readto-chrome-extension/privacy
  - text: © 2026 · 读懂
```

# Test source

```ts
  148 |       await slider.focus();
  149 |       
  150 |       // Press right arrow (should go to 熟练)
  151 |       await page.keyboard.press('ArrowRight');
  152 |       await expect(desc).toContainText('雅思托福');
  153 |       
  154 |       // Press right arrow again (should go to 精通)
  155 |       await page.keyboard.press('ArrowRight');
  156 |       await expect(desc).toContainText('最生僻');
  157 |       
  158 |       // Press left arrow twice (should go back to 进阶)
  159 |       await page.keyboard.press('ArrowLeft');
  160 |       await page.keyboard.press('ArrowLeft');
  161 |       await expect(desc).toContainText('大学四六级');
  162 |     });
  163 | 
  164 |     test('should update active label style', async ({ page }) => {
  165 |       const labels = page.locator('.slider-label');
  166 |       
  167 |       // Default: 进阶 should be active
  168 |       await expect(labels.nth(2)).toHaveClass(/active/);
  169 |       await expect(labels.nth(2)).toHaveClass(/text-readto-ink/);
  170 |       
  171 |       // Click 入门
  172 |       await labels.nth(0).click({ force: true });
  173 |       await page.waitForTimeout(300);
  174 |       
  175 |       // 入门 should now be active
  176 |       await expect(labels.nth(0)).toHaveClass(/active/);
  177 |       await expect(labels.nth(0)).toHaveClass(/text-readto-ink/);
  178 |       
  179 |       // 进阶 should not be active
  180 |       await expect(labels.nth(2)).not.toHaveClass(/active/);
  181 |       await expect(labels.nth(2)).toHaveClass(/text-readto-muted-2/);
  182 |     });
  183 | 
  184 |     test('should update track fill width with slider', async ({ page }) => {
  185 |       const trackFill = page.locator('#track-fill');
  186 |       const labels = page.locator('.slider-label');
  187 |       
  188 |       // Default: 进阶 (50%)
  189 |       await expect(trackFill).toHaveAttribute('style', /width:\s*50%/);
  190 |       
  191 |       // Click 入门 (10%)
  192 |       await labels.nth(0).click({ force: true });
  193 |       await page.waitForTimeout(300);
  194 |       await expect(trackFill).toHaveAttribute('style', /width:\s*10%/);
  195 |       
  196 |       // Click 精通 (90%)
  197 |       await labels.nth(4).click({ force: true });
  198 |       await page.waitForTimeout(300);
  199 |       await expect(trackFill).toHaveAttribute('style', /width:\s*90%/);
  200 |       
  201 |       // Click 进阶 (50%)
  202 |       await labels.nth(2).click({ force: true });
  203 |       await page.waitForTimeout(300);
  204 |       await expect(trackFill).toHaveAttribute('style', /width:\s*50%/);
  205 |     });
  206 |   });
  207 | 
  208 |   test.describe('Level-Annotation Linkage', () => {
  209 |     test('入门 should show 53 annotations', async ({ page }) => {
  210 |       await page.locator('.slider-label:has-text("入门")').click();
  211 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(53);
  212 |     });
  213 | 
  214 |     test('基础 should show 36 annotations', async ({ page }) => {
  215 |       await page.locator('.slider-label:has-text("基础")').click();
  216 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(36);
  217 |     });
  218 | 
  219 |     test('进阶 should show 20 annotations', async ({ page }) => {
  220 |       await page.locator('.slider-label:has-text("进阶")').click();
  221 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(20);
  222 |     });
  223 | 
  224 |     test('熟练 should show 6 annotations', async ({ page }) => {
  225 |       await page.locator('.slider-label:has-text("熟练")').click();
  226 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(6);
  227 |     });
  228 | 
  229 |     test('精通 should show 3 annotations', async ({ page }) => {
  230 |       await page.locator('.slider-label:has-text("精通")').click({ force: true });
  231 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(3);
  232 |     });
  233 | 
  234 |     test('should update annotations in real-time', async ({ page }) => {
  235 |       await page.locator('.slider-label:has-text("入门")').click({ force: true });
  236 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(53);
  237 |       
  238 |       await page.locator('.slider-label:has-text("精通")').click({ force: true });
  239 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(3);
  240 |     });
  241 |   });
  242 | 
  243 |   test.describe('Tooltip', () => {
  244 |     test('should show tooltip on click', async ({ page }) => {
  245 |       const tooltip = page.locator('#tooltip');
  246 |       await page.locator('[data-word="sweeping"]').first().click({ force: true });
  247 |       await page.waitForTimeout(500);
> 248 |       await expect(tooltip).toHaveClass(/show/);
      |                             ^ Error: expect(locator).toHaveClass(expected) failed
  249 |     });
  250 | 
  251 |     test('should display phonetic and translation', async ({ page }) => {
  252 |       await page.locator('[data-word="sweeping"]').first().click({ force: true });
  253 |       await page.waitForTimeout(500);
  254 |       
  255 |       const tooltip = page.locator('#tooltip');
  256 |       await expect(tooltip.locator('.ipa')).toContainText('/');
  257 |       await expect(tooltip.locator('.body')).toContainText('彻底');
  258 |     });
  259 | 
  260 |     test('should have speaker button', async ({ page }) => {
  261 |       await page.locator('[data-word="sweeping"]').first().click();
  262 |       await page.waitForTimeout(300);
  263 |       
  264 |       const speaker = page.locator('#tooltip .speaker');
  265 |       await expect(speaker).toBeAttached();
  266 |       await expect(speaker).toHaveAttribute('aria-label', /pronunciation/i);
  267 |     });
  268 | 
  269 |     test('should close on Escape', async ({ page }) => {
  270 |       const tooltip = page.locator('#tooltip');
  271 |       await page.locator('[data-word="sweeping"]').first().click({ force: true });
  272 |       await page.waitForTimeout(500);
  273 |       await expect(tooltip).toHaveClass(/show/);
  274 |       
  275 |       await page.keyboard.press('Escape');
  276 |       await page.waitForTimeout(300);
  277 |       await expect(tooltip).toHaveClass(/hidden/);
  278 |     });
  279 | 
  280 |     test('should toggle on repeated click', async ({ page }) => {
  281 |       const tooltip = page.locator('#tooltip');
  282 |       const word = page.locator('[data-word="sweeping"]').first();
  283 |       
  284 |       await word.click({ force: true });
  285 |       await page.waitForTimeout(500);
  286 |       await expect(tooltip).toHaveClass(/show/);
  287 |       
  288 |       await word.click({ force: true });
  289 |       await page.waitForTimeout(500);
  290 |       await expect(tooltip).toHaveClass(/hidden/);
  291 |     });
  292 |   });
  293 | 
  294 |   test.describe('Responsive', () => {
  295 |     test('should work on mobile', async ({ page }) => {
  296 |       await page.setViewportSize({ width: 375, height: 812 });
  297 |       
  298 |       const labels = page.locator('.slider-label');
  299 |       await expect(labels).toHaveCount(5);
  300 |       
  301 |       await labels.nth(0).click();
  302 |       await expect(page.locator('#level-desc')).toContainText('最基础');
  303 |     });
  304 | 
  305 |     test.skip('should show tooltip on mobile', async ({ page }) => {
  306 |       // Mobile tooltip interaction has compatibility issues with force click
  307 |       await page.setViewportSize({ width: 375, height: 812 });
  308 |       
  309 |       await page.locator('[data-word="sweeping"]').first().click({ force: true });
  310 |       await page.waitForTimeout(1000);
  311 |       await expect(page.locator('#tooltip')).toHaveClass(/show/);
  312 |     });
  313 |   });
  314 | 
  315 |   test.describe('Dark Mode', () => {
  316 |     test('should work in dark mode', async ({ page }) => {
  317 |       await page.emulateMedia({ colorScheme: 'dark' });
  318 |       
  319 |       await page.locator('[data-word="sweeping"]').first().click({ force: true });
  320 |       await page.waitForTimeout(500);
  321 |       
  322 |       const tooltip = page.locator('#tooltip');
  323 |       await expect(tooltip).toHaveClass(/show/);
  324 |     });
  325 |   });
  326 | });
  327 | 
  328 | test.describe('Privacy Page', () => {
  329 |   test.beforeEach(async ({ page }) => {
  330 |     await page.goto(`${BASE_URL}/privacy`);
  331 |     await page.waitForLoadState('domcontentloaded');
  332 |   });
  333 | 
  334 |   test('should have correct title', async ({ page }) => {
  335 |     await expect(page).toHaveTitle(/Privacy/);
  336 |   });
  337 | 
  338 |   test('should have heading about not collecting data', async ({ page }) => {
  339 |     await expect(page.locator('main h1').first()).toContainText("don't collect");
  340 |     await expect(page.locator('main h1').first()).toContainText('reading history');
  341 |   });
  342 | 
  343 |   test('should have last updated date', async ({ page }) => {
  344 |     await expect(page.locator('text=Last updated')).toBeVisible();
  345 |   });
  346 | 
  347 |   test('should have all 7 sections', async ({ page }) => {
  348 |     const sections = [
```