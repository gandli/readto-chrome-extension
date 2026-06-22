# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Tooltip Target Word Style >> should show target word in red color
- Location: tests\landing.spec.ts:313:3

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
      - /url: "#how"
    - link "安装":
      - /url: /readto-chrome-extension
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
  - text: /politics/tax-reform-bill.html News
  - heading "President Announces Sweeping Tax Reforms" [level=2]
  - paragraph: The president announced sweeping reforms to the nation's tax system yesterday, marking the most significant overhaul大修 in a decade.
  - paragraph: Critics denounce the changes as disproportionately不成比例地 benefiting wealthy citizens, accusing the administration of profligate挥霍的 giveaways and austerity紧缩 toward middle-class families already burdened by rising costs.
  - paragraph: Proponents counter that lower taxes will stimulate investment and ameliorate改善 broader inequities.
  - paragraph: The bill faces a difficult path through the fractious易怒的, polarized极化的 legislature, where opposition lawmakers have vowed to obstruct阻碍 its passage with vituperative谩骂的 floor speeches.
  - paragraph: Despite a flurry of grassroots rhetoric, recent polls indicate voters remain deeply skeptical of what they view as perfunctory敷衍的 concessions, leaving negotiations at a fragile impasse.
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
  223 | 
  224 |   test('should have correct title', async ({ page }) => {
  225 |     await expect(page).toHaveTitle(/Privacy/);
  226 |   });
  227 | 
  228 |   test('should have heading about not collecting data', async ({ page }) => {
  229 |     await expect(page.locator('main h1').first()).toContainText("don't collect");
  230 |     await expect(page.locator('main h1').first()).toContainText('reading history');
  231 |   });
  232 | 
  233 |   test('should have last updated date', async ({ page }) => {
  234 |     await expect(page.locator('text=Last updated')).toBeVisible();
  235 |   });
  236 | 
  237 |   test('should have all 7 sections', async ({ page }) => {
  238 |     const sections = [
  239 |       'What readto is',
  240 |       'What we don\'t do',
  241 |       'What the extension stores',
  242 |       'Third parties',
  243 |       'Permissions',
  244 |       'Deleting your data',
  245 |       'Contact',
  246 |     ];
  247 |     
  248 |     for (const section of sections) {
  249 |       await expect(page.locator(`h2:has-text("${section}")`)).toBeVisible();
  250 |     }
  251 |   });
  252 | 
  253 |   test('should have technical terms in code blocks', async ({ page }) => {
  254 |     // Check for chrome.storage text
  255 |     await expect(page.locator('text=chrome.storage').first()).toBeVisible();
  256 |   });
  257 | 
  258 |   test('should have navigation back to home', async ({ page }) => {
  259 |     const homeLink = page.locator('header a:has-text("readto")');
  260 |     await expect(homeLink).toBeVisible();
  261 |     await expect(homeLink).toHaveAttribute('href', /readto-chrome-extension\/?$/);
  262 |   });
  263 | 
  264 |   test('should have footer with privacy link', async ({ page }) => {
  265 |     const footer = page.locator('footer');
  266 |     await expect(footer).toBeVisible();
  267 |     await expect(footer).toContainText('© 2026');
  268 |     
  269 |     const privacyLink = footer.locator('a:has-text("隐私政策")');
  270 |     await expect(privacyLink).toHaveAttribute('href', /\/privacy/);
  271 |   });
  272 | 
  273 |   test('should have install button in header', async ({ page }) => {
  274 |     const installBtn = page.locator('header a:has-text("安装扩展")');
  275 |     await expect(installBtn).toBeVisible();
  276 |     await expect(installBtn).toHaveAttribute('href', /chromewebstore/);
  277 |   });
  278 | 
  279 |   test('should list bullet points for what we don\'t do', async ({ page }) => {
  280 |     const section = page.locator('h2:has-text("What we don\'t do")').locator('..');
  281 |     const bullets = section.locator('li');
  282 |     const count = await bullets.count();
  283 |     expect(count).toBe(4);
  284 |   });
  285 | 
  286 |   test('should mention LLM and BYOK', async ({ page }) => {
  287 |     await expect(page.locator('text=Bring Your Own Key')).toBeVisible();
  288 |   });
  289 | 
  290 |   test('should have link to readto.ai in contact section', async ({ page }) => {
  291 |     const contactSection = page.locator('h2:has-text("Contact")').locator('..');
  292 |     const link = contactSection.locator('a:has-text("readto.ai")');
  293 |     await expect(link).toBeVisible();
  294 |   });
  295 | 
  296 |   test('should be mobile responsive', async ({ page }) => {
  297 |     await page.setViewportSize({ width: 375, height: 812 });
  298 |     
  299 |     // Header should be visible
  300 |     const header = page.locator('header');
  301 |     await expect(header).toBeVisible();
  302 |     
  303 |     // Title should be visible (use main h1 to avoid Playwright UI elements)
  304 |     await expect(page.locator('main h1').first()).toBeVisible();
  305 |     
  306 |     // Footer should be visible
  307 |     const footer = page.locator('footer');
  308 |     await expect(footer).toBeVisible();
  309 |   });
  310 | });
  311 | 
  312 | test.describe('Tooltip Target Word Style', () => {
  313 |   test('should show target word in red color', async ({ page }) => {
  314 |     await page.goto(BASE_URL);
  315 |     await page.waitForLoadState('domcontentloaded');
  316 |     
  317 |     // Click on a word to show tooltip
  318 |     await page.locator('[data-word="sweeping"]').first().click({ force: true });
  319 |     await page.waitForTimeout(500);
  320 |     
  321 |     // Check tooltip is visible
  322 |     const tooltip = page.locator('#tooltip');
> 323 |     await expect(tooltip).toHaveClass(/show/);
      |                           ^ Error: expect(locator).toHaveClass(expected) failed
  324 |     
  325 |     // Check example target word exists
  326 |     const target = tooltip.locator('.example .target');
  327 |     const count = await target.count();
  328 |     expect(count).toBeGreaterThan(0);
  329 |   });
  330 | });
  331 | 
```