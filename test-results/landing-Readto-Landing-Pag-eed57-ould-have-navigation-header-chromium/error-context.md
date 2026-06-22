# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Readto Landing Page >> Page Structure >> should have navigation header
- Location: tests\landing.spec.ts:16:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('header')
Expected: visible
Error: strict mode violation: locator('header') resolved to 7 elements:
    1) <header class="sticky top-0 z-50 bg-readto-bg/95 backdrop-blur-sm border-b border-readto-rule">…</header> aka getByRole('banner')
    2) <header>…</header> aka getByText('6.4.8 Copy debug info')
    3) <header>…</header> aka getByText('Featured integrationsView all')
    4) <header>…</header> aka locator('header').filter({ hasText: 'No islands detected.' })
    5) <header>…</header> aka locator('header').filter({ hasText: 'Audit 0' })
    6) <header>…</header> aka locator('header').filter({ hasText: 'No accessibility or' })
    7) <header>…</header> aka locator('header').filter({ hasText: 'Settings' })

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('header')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - link "readto . ai" [ref=e5] [cursor=pointer]:
          - /url: /readto-chrome-extension
          - text: readto
          - generic [ref=e6]: .
          - generic [ref=e7]: ai
        - generic [ref=e8]: 读懂每一个词 · Read to know
      - navigation [ref=e9]:
        - link "工作原理" [ref=e10] [cursor=pointer]:
          - /url: "#how"
        - link "安装" [ref=e11] [cursor=pointer]:
          - /url: /readto-chrome-extension
        - link "安装扩展 →" [ref=e12] [cursor=pointer]:
          - /url: https://chromewebstore.google.com/detail/readto/hmoifnkckggncdpoplpoiifjafffmkof
  - main [ref=e13]:
    - generic [ref=e15]:
      - generic [ref=e16]:
        - paragraph [ref=e17]: A CHROME EXTENSION · 浏览器扩展
        - heading "Read to know. 读懂每一个词。" [level=1] [ref=e18]:
          - text: Read to know.
          - text: 读懂每一个词。
        - paragraph [ref=e19]: 在任何英文网页上，readto 会根据你的英语水平，悄悄在生词上方标好中文小注。不划词、不跳窗、不中断阅读。
        - link "安装 Chrome 扩展 →" [ref=e20] [cursor=pointer]:
          - /url: https://chromewebstore.google.com/detail/readto/hmoifnkckggncdpoplpoiifjafffmkof
        - generic [ref=e21]:
          - paragraph [ref=e22]: YOUR LEVEL · 你的水平
          - generic [ref=e23]:
            - generic [ref=e24]: 入门
            - generic [ref=e25]: 基础
            - generic [ref=e26]: 进阶
            - generic [ref=e27]: 熟练
            - generic [ref=e28]: 精通
          - slider "英语水平" [ref=e29] [cursor=pointer]
          - paragraph [ref=e33]: 只标大学四六级以上的词。
      - generic [ref=e34]:
        - generic [ref=e39]: /politics/tax-reform-bill.html
        - generic [ref=e40]:
          - generic [ref=e41]: News
          - heading "President Announces Sweeping Tax Reforms" [level=2] [ref=e42]
          - paragraph [ref=e43]:
            - text: The president announced
            - generic [ref=e44]: sweeping
            - text: reforms to the nation's tax system yesterday, marking the most significant
            - generic [ref=e45]: overhaul大修
            - text: in a decade.
          - paragraph [ref=e46]:
            - text: Critics denounce the changes as
            - generic [ref=e47]: disproportionately不成比例地
            - text: benefiting wealthy citizens, accusing the administration of
            - generic [ref=e48]: profligate挥霍的
            - text: giveaways and
            - generic [ref=e49]: austerity紧缩
            - text: toward middle-class families already
            - generic [ref=e50]: burdened
            - text: by rising costs.
          - paragraph [ref=e51]:
            - text: Proponents counter that lower taxes will
            - generic [ref=e52]: stimulate
            - text: investment and
            - generic [ref=e53]: ameliorate改善
            - text: broader inequities.
          - paragraph [ref=e54]:
            - text: The bill faces a difficult path through the
            - generic [ref=e55]: fractious易怒的
            - text: ","
            - generic [ref=e56]: polarized极化的
            - text: legislature, where opposition lawmakers have vowed to
            - generic [ref=e57]: obstruct阻碍
            - text: its passage with
            - generic [ref=e58]: vituperative谩骂的
            - text: floor speeches.
          - paragraph [ref=e59]:
            - text: Despite a flurry of grassroots rhetoric, recent polls indicate voters remain deeply skeptical of what they view as
            - generic [ref=e60]: perfunctory敷衍的
            - text: concessions, leaving negotiations at a fragile impasse.
    - generic [ref=e62]:
      - generic [ref=e63]:
        - generic [ref=e64]: 原理 · How it works
        - heading "读你本来就想读的， 生词在阅读中自然沉淀。" [level=2] [ref=e66]:
          - text: 读你本来就想读的，
          - text: 生词在阅读中自然沉淀。
      - generic [ref=e67]:
        - generic [ref=e68]:
          - generic [ref=e69]: No. 01
          - heading "只标你不会的词" [level=3] [ref=e70]
          - paragraph [ref=e71]: 根据你选择的英语水平，跳过你已经会的，只在真正超纲的词上方加注。
          - generic [ref=e72]:
            - text: He was
            - generic [ref=e73]: ostensibly表面上
            - text: in charge, but the real power lay
            - generic [ref=e74]: elsewhere别处
            - text: .
        - generic [ref=e75]:
          - generic [ref=e76]: No. 02
          - heading "不打断你的阅读节奏" [level=3] [ref=e77]
          - paragraph [ref=e78]: 中文释义以小字标注在单词上方，不需要划词、点击或跳转词典。
          - generic [ref=e79]:
            - text: The findings were
            - generic [ref=e80]: ambiguous模糊的
            - text: ", leaving room for"
            - generic [ref=e81]: interpretation解读
            - text: .
        - generic [ref=e82]:
          - generic [ref=e83]: No. 03
          - heading "任何英文页面都能用" [level=3] [ref=e84]
          - paragraph [ref=e85]: 新闻、博客、论文、小说——所有英文网页都支持。
          - generic [ref=e86]:
            - generic [ref=e87]: nytimes.com
            - generic [ref=e88]: medium.com
            - generic [ref=e89]: arxiv.org
            - generic [ref=e90]: wikipedia.org
    - generic [ref=e92]:
      - generic [ref=e93]: Why read this way
      - generic [ref=e94]:
        - blockquote [ref=e95]:
          - text: 背单词的最好方式，
          - text: 是在真实阅读里反复遇到它。
        - generic [ref=e96]: — readto 的设计前提
  - contentinfo [ref=e97]:
    - generic [ref=e98]:
      - link "readto.ai" [ref=e99] [cursor=pointer]:
        - /url: /readto-chrome-extension
      - generic [ref=e100]:
        - link "隐私政策" [ref=e101] [cursor=pointer]:
          - /url: /readto-chrome-extension/privacy
        - generic [ref=e102]: © 2026 · 读懂
  - generic [ref=e105]:
    - button "Menu" [ref=e106]:
      - img [ref=e108]
      - generic: Menu
    - button "Inspect" [ref=e112]:
      - img [ref=e114]
      - generic: Inspect
    - button "Audit" [ref=e116]:
      - img [ref=e118]
      - generic: Audit
    - button "Settings" [ref=e121]:
      - img [ref=e123]
      - generic: Settings
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const BASE_URL = 'http://localhost:4321/readto-chrome-extension';
  4   | 
  5   | test.describe('Readto Landing Page', () => {
  6   |   test.beforeEach(async ({ page }) => {
  7   |     await page.goto(BASE_URL);
  8   |     await page.waitForLoadState('domcontentloaded');
  9   |   });
  10  | 
  11  |   test.describe('Page Structure', () => {
  12  |     test('should have correct title', async ({ page }) => {
  13  |       await expect(page).toHaveTitle(/readto/);
  14  |     });
  15  | 
  16  |     test('should have navigation header', async ({ page }) => {
  17  |       const header = page.locator('header');
> 18  |       await expect(header).toBeVisible();
      |                            ^ Error: expect(locator).toBeVisible() failed
  19  |       await expect(header.locator('a:has-text("readto")')).toBeVisible();
  20  |       await expect(header.locator('a:has-text("工作原理")')).toBeVisible();
  21  |       await expect(header.locator('a:has-text("安装扩展")')).toBeVisible();
  22  |     });
  23  | 
  24  |     test('should have hero section with title', async ({ page }) => {
  25  |       const h1 = page.locator('main h1').first();
  26  |       await expect(h1).toBeVisible();
  27  |       await expect(h1).toContainText('Read to know');
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
```