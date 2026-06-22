# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Readto Landing Page >> Level-Annotation Linkage >> should update annotations in real-time
- Location: tests\landing.spec.ts:124:5

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.slider-label:has-text("精通")')
    - locator resolved to <span data-index="4" class="text-[13px] text-readto-muted-2 slider-label">精通</span>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span data-index="3" class="text-[13px] text-readto-muted-2 slider-label">熟练</span> intercepts pointer events
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="flex justify-between mb-1 px-[8%]">…</div> intercepts pointer events
  - retrying click action
    - waiting 100ms
    - waiting for element to be visible, enabled and stable
    - element is not stable
  - retrying click action
    - waiting 100ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <p class="text-[15px] text-readto-fg-2 leading-[1.7] mb-8 max-w-[400px]">↵在任何英文网页上，readto↵            会根据你的英语水平，悄悄在生词上方标好中…</p> intercepts pointer events
    - retrying click action
      - waiting 500ms
    4 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="flex justify-between mb-1 px-[8%]">…</div> intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <p class="text-[15px] text-readto-fg-2 leading-[1.7] mb-8 max-w-[400px]">↵在任何英文网页上，readto↵            会根据你的英语水平，悄悄在生词上方标好中…</p> intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="max-w-[1180px] mx-auto flex items-center justify-between gap-6 py-4 px-6">…</div> from <header class="sticky top-0 z-50 bg-readto-bg/95 backdrop-blur-sm border-b border-readto-rule">…</header> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="max-w-[1180px] mx-auto flex items-center justify-between gap-6 py-4 px-6">…</div> from <header class="sticky top-0 z-50 bg-readto-bg/95 backdrop-blur-sm border-b border-readto-rule">…</header> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="flex justify-between mb-1 px-[8%]">…</div> intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "readto . ai" [ref=e5] [cursor=pointer]:
        - /url: /readto-chrome-extension
        - text: readto
        - generic [ref=e6]: .
        - generic [ref=e7]: ai
      - navigation [ref=e8]:
        - link "工作原理" [ref=e9] [cursor=pointer]:
          - /url: "#how"
        - link "安装" [ref=e10] [cursor=pointer]:
          - /url: /readto-chrome-extension
        - link "安装扩展 →" [ref=e11] [cursor=pointer]:
          - /url: https://chromewebstore.google.com/detail/readto/hmoifnkckggncdpoplpoiifjafffmkof
  - main [ref=e12]:
    - generic [ref=e14]:
      - generic [ref=e15]:
        - paragraph [ref=e16]: A CHROME EXTENSION · 浏览器扩展
        - heading "Read to know. 读懂每一个词。" [level=1] [ref=e17]:
          - text: Read to know.
          - text: 读懂每一个词。
        - paragraph [ref=e18]: 在任何英文网页上，readto 会根据你的英语水平，悄悄在生词上方标好中文小注。不划词、不跳窗、不中断阅读。
        - link "安装 Chrome 扩展 →" [ref=e19] [cursor=pointer]:
          - /url: https://chromewebstore.google.com/detail/readto/hmoifnkckggncdpoplpoiifjafffmkof
        - generic [ref=e20]:
          - paragraph [ref=e21]: YOUR LEVEL · 你的水平
          - generic [ref=e22]:
            - generic [ref=e23]: 入门
            - generic [ref=e24]: 基础
            - generic [ref=e25]: 进阶
            - generic [ref=e26]: 熟练
            - generic [ref=e27]: 精通
          - slider "英语水平" [ref=e28] [cursor=pointer]
          - paragraph [ref=e32]: 只标最基础的词。
      - generic [ref=e33]:
        - generic [ref=e38]: /politics/tax-reform-bill.html
        - generic [ref=e39]:
          - generic [ref=e40]: News
          - heading "President Announces Sweeping Tax Reforms" [level=2] [ref=e41]
          - paragraph [ref=e42]:
            - text: The president announced
            - generic [ref=e43]: sweeping影响广泛的
            - text: reforms to the nation's tax system yesterday, marking the most significant
            - generic [ref=e44]: overhaul大修
            - text: in a decade.
          - paragraph [ref=e45]:
            - text: Critics denounce the changes as
            - generic [ref=e46]: disproportionately不成比例地
            - text: benefiting wealthy citizens, accusing the administration of
            - generic [ref=e47]: profligate挥霍的
            - text: giveaways and
            - generic [ref=e48]: austerity紧缩
            - text: toward middle-class families already
            - generic [ref=e49]: burdened负担沉重的
            - text: by rising costs.
          - paragraph [ref=e50]:
            - text: Proponents counter that lower taxes will
            - generic [ref=e51]: stimulate刺激
            - text: investment and
            - generic [ref=e52]: ameliorate改善
            - text: broader inequities.
          - paragraph [ref=e53]:
            - text: The bill faces a difficult path through the
            - generic [ref=e54]: fractious易怒的
            - text: ","
            - generic [ref=e55]: polarized极化的
            - text: legislature, where opposition lawmakers have vowed to
            - generic [ref=e56]: obstruct阻碍
            - text: its passage with
            - generic [ref=e57]: vituperative谩骂的
            - text: floor speeches.
          - paragraph [ref=e58]:
            - text: Despite a flurry of grassroots rhetoric, recent polls indicate voters remain deeply skeptical of what they view as
            - generic [ref=e59]: perfunctory敷衍的
            - text: concessions, leaving negotiations at a fragile impasse.
    - generic [ref=e61]:
      - generic [ref=e62]:
        - generic [ref=e63]: 原理 · How it works
        - heading "读你本来就想读的， 生词在阅读中自然沉淀。" [level=2] [ref=e65]:
          - text: 读你本来就想读的，
          - text: 生词在阅读中自然沉淀。
      - generic [ref=e66]:
        - generic [ref=e67]:
          - generic [ref=e68]: No. 01
          - heading "只标你不会的词" [level=3] [ref=e69]
          - paragraph [ref=e70]: 根据你选择的英语水平，跳过你已经会的，只在真正超纲的词上方加注。
          - generic [ref=e71]:
            - text: He was
            - generic [ref=e72]: ostensibly表面上
            - text: in charge, but the real power lay
            - generic [ref=e73]: elsewhere别处
            - text: .
        - generic [ref=e74]:
          - generic [ref=e75]: No. 02
          - heading "不打断你的阅读节奏" [level=3] [ref=e76]
          - paragraph [ref=e77]: 中文释义以小字标注在单词上方，不需要划词、点击或跳转词典。
          - generic [ref=e78]:
            - text: The findings were
            - generic [ref=e79]: ambiguous模糊的
            - text: ", leaving room for"
            - generic [ref=e80]: interpretation解读
            - text: .
        - generic [ref=e81]:
          - generic [ref=e82]: No. 03
          - heading "任何英文页面都能用" [level=3] [ref=e83]
          - paragraph [ref=e84]: 新闻、博客、论文、小说——所有英文网页都支持。
          - generic [ref=e85]:
            - generic [ref=e86]: nytimes.com
            - generic [ref=e87]: medium.com
            - generic [ref=e88]: arxiv.org
            - generic [ref=e89]: wikipedia.org
    - generic [ref=e91]:
      - generic [ref=e92]: Why read this way
      - generic [ref=e93]:
        - blockquote [ref=e94]:
          - text: 背单词的最好方式，
          - text: 是在真实阅读里反复遇到它。
        - generic [ref=e95]: — readto 的设计前提
  - contentinfo [ref=e96]:
    - generic [ref=e97]:
      - link "readto.ai" [ref=e98] [cursor=pointer]:
        - /url: /readto-chrome-extension
      - generic [ref=e99]:
        - link "隐私政策" [ref=e100] [cursor=pointer]:
          - /url: /readto-chrome-extension/privacy
        - generic [ref=e101]: © 2026 · 读懂
  - generic [ref=e104]:
    - button "Menu" [ref=e105]:
      - img [ref=e107]
      - generic: Menu
    - button "Inspect" [ref=e111]:
      - img [ref=e113]
      - generic: Inspect
    - button "Audit" [ref=e115]:
      - img [ref=e117]
      - generic: Audit
    - button "Settings" [ref=e120]:
      - img [ref=e122]
      - generic: Settings
```

# Test source

```ts
  28  |     });
  29  | 
  30  |     test('should have install button linking to Chrome Web Store', async ({ page }) => {
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
  44  |     test('should have Why Read This Way section', async ({ page }) => {
  45  |       const quote = page.locator('blockquote');
  46  |       await expect(quote).toBeVisible();
  47  |       await expect(quote).toContainText('背单词的最好方式');
  48  |     });
  49  | 
  50  |     test('should have footer with privacy link', async ({ page }) => {
  51  |       const footer = page.locator('footer');
  52  |       await expect(footer).toBeVisible();
  53  |       await expect(footer).toContainText('© 2026');
  54  |       const privacyLink = footer.locator('a:has-text("隐私政策")');
  55  |       await expect(privacyLink).toHaveAttribute('href', /\/privacy/);
  56  |     });
  57  |   });
  58  | 
  59  |   test.describe('Level Slider', () => {
  60  |     test('should have 5 level options', async ({ page }) => {
  61  |       const labels = page.locator('.slider-label');
  62  |       await expect(labels).toHaveCount(5);
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
> 128 |       await page.locator('.slider-label:has-text("精通")').click();
      |                                                          ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
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
  163 |       await expect(tooltip).toHaveClass(/show/);
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
```