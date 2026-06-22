# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Readto Landing Page >> Tooltip >> should close on Escape
- Location: tests\landing.spec.ts:159:5

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
  63  |       await expect(labels.nth(0)).toHaveText('入门');
  64  |       await expect(labels.nth(4)).toHaveText('精通');
  65  |     });
  66  | 
  67  |     test('should default to 进阶 level', async ({ page }) => {
  68  |       const desc = page.locator('#level-desc');
  69  |       await expect(desc).toContainText('大学四六级');
  70  |     });
  71  | 
  72  |     test('should update description when clicking levels', async ({ page }) => {
  73  |       const desc = page.locator('#level-desc');
  74  |       
  75  |       await page.locator('.slider-label:has-text("入门")').click();
  76  |       await expect(desc).toContainText('最基础');
  77  |       
  78  |       await page.locator('.slider-label:has-text("精通")').click();
  79  |       await expect(desc).toContainText('最生僻');
  80  |     });
  81  | 
  82  |     test('should persist level in localStorage', async ({ page }) => {
  83  |       await page.locator('.slider-label:has-text("熟练")').click();
  84  |       await page.reload();
  85  |       await page.waitForLoadState('domcontentloaded');
  86  |       
  87  |       const desc = page.locator('#level-desc');
  88  |       await expect(desc).toContainText('雅思托福');
  89  |     });
  90  | 
  91  |     test('should have correct ARIA attributes', async ({ page }) => {
  92  |       const slider = page.locator('#level-slider');
  93  |       await expect(slider).toHaveAttribute('role', 'slider');
  94  |       await expect(slider).toHaveAttribute('aria-label', '英语水平');
  95  |     });
  96  |   });
  97  | 
  98  |   test.describe('Level-Annotation Linkage', () => {
  99  |     test('入门 should show 13 annotations', async ({ page }) => {
  100 |       await page.locator('.slider-label:has-text("入门")').click();
  101 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(13);
  102 |     });
  103 | 
  104 |     test('基础 should show 13 annotations', async ({ page }) => {
  105 |       await page.locator('.slider-label:has-text("基础")').click();
  106 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(13);
  107 |     });
  108 | 
  109 |     test('进阶 should show 10 annotations', async ({ page }) => {
  110 |       await page.locator('.slider-label:has-text("进阶")').click();
  111 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(10);
  112 |     });
  113 | 
  114 |     test('熟练 should show 6 annotations', async ({ page }) => {
  115 |       await page.locator('.slider-label:has-text("熟练")').click();
  116 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(6);
  117 |     });
  118 | 
  119 |     test('精通 should show 3 annotations', async ({ page }) => {
  120 |       await page.locator('.slider-label:has-text("精通")').click();
  121 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(3);
  122 |     });
  123 | 
  124 |     test('should update annotations in real-time', async ({ page }) => {
  125 |       await page.locator('.slider-label:has-text("入门")').click();
  126 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(13);
  127 |       
  128 |       await page.locator('.slider-label:has-text("精通")').click();
  129 |       await expect(page.locator('#demo-content .rt:visible')).toHaveCount(3);
  130 |     });
  131 |   });
  132 | 
  133 |   test.describe('Tooltip', () => {
  134 |     test('should show tooltip on click', async ({ page }) => {
  135 |       const tooltip = page.locator('#tooltip');
  136 |       await page.locator('[data-word="sweeping"]').first().click({ force: true });
  137 |       await page.waitForTimeout(500);
  138 |       await expect(tooltip).toHaveClass(/show/);
  139 |     });
  140 | 
  141 |     test('should display phonetic and translation', async ({ page }) => {
  142 |       await page.locator('[data-word="sweeping"]').first().click({ force: true });
  143 |       await page.waitForTimeout(500);
  144 |       
  145 |       const tooltip = page.locator('#tooltip');
  146 |       await expect(tooltip.locator('.ipa')).toContainText('/');
  147 |       await expect(tooltip.locator('.body')).toContainText('彻底');
  148 |     });
  149 | 
  150 |     test('should have speaker button', async ({ page }) => {
  151 |       await page.locator('[data-word="sweeping"]').first().click();
  152 |       await page.waitForTimeout(300);
  153 |       
  154 |       const speaker = page.locator('#tooltip .speaker');
  155 |       await expect(speaker).toBeAttached();
  156 |       await expect(speaker).toHaveAttribute('aria-label', /pronunciation/i);
  157 |     });
  158 | 
  159 |     test('should close on Escape', async ({ page }) => {
  160 |       const tooltip = page.locator('#tooltip');
  161 |       await page.locator('[data-word="sweeping"]').first().click({ force: true });
  162 |       await page.waitForTimeout(500);
> 163 |       await expect(tooltip).toHaveClass(/show/);
      |                             ^ Error: expect(locator).toHaveClass(expected) failed
  164 |       
  165 |       await page.keyboard.press('Escape');
  166 |       await page.waitForTimeout(300);
  167 |       await expect(tooltip).toHaveClass(/hidden/);
  168 |     });
  169 | 
  170 |     test('should toggle on repeated click', async ({ page }) => {
  171 |       const tooltip = page.locator('#tooltip');
  172 |       const word = page.locator('[data-word="sweeping"]').first();
  173 |       
  174 |       await word.click({ force: true });
  175 |       await page.waitForTimeout(500);
  176 |       await expect(tooltip).toHaveClass(/show/);
  177 |       
  178 |       await word.click({ force: true });
  179 |       await page.waitForTimeout(500);
  180 |       await expect(tooltip).toHaveClass(/hidden/);
  181 |     });
  182 |   });
  183 | 
  184 |   test.describe('Responsive', () => {
  185 |     test('should work on mobile', async ({ page }) => {
  186 |       await page.setViewportSize({ width: 375, height: 812 });
  187 |       
  188 |       const labels = page.locator('.slider-label');
  189 |       await expect(labels).toHaveCount(5);
  190 |       
  191 |       await labels.nth(0).click();
  192 |       await expect(page.locator('#level-desc')).toContainText('最基础');
  193 |     });
  194 | 
  195 |     test.skip('should show tooltip on mobile', async ({ page }) => {
  196 |       // Mobile tooltip interaction has compatibility issues with force click
  197 |       await page.setViewportSize({ width: 375, height: 812 });
  198 |       
  199 |       await page.locator('[data-word="sweeping"]').first().click({ force: true });
  200 |       await page.waitForTimeout(1000);
  201 |       await expect(page.locator('#tooltip')).toHaveClass(/show/);
  202 |     });
  203 |   });
  204 | 
  205 |   test.describe('Dark Mode', () => {
  206 |     test('should work in dark mode', async ({ page }) => {
  207 |       await page.emulateMedia({ colorScheme: 'dark' });
  208 |       
  209 |       await page.locator('[data-word="sweeping"]').first().click({ force: true });
  210 |       await page.waitForTimeout(500);
  211 |       
  212 |       const tooltip = page.locator('#tooltip');
  213 |       await expect(tooltip).toHaveClass(/show/);
  214 |     });
  215 |   });
  216 | });
  217 | 
  218 | test.describe('Privacy Page', () => {
  219 |   test.beforeEach(async ({ page }) => {
  220 |     await page.goto(`${BASE_URL}/privacy`);
  221 |     await page.waitForLoadState('domcontentloaded');
  222 |   });
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
```