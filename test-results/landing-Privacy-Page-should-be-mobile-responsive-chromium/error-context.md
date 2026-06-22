# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Privacy Page >> should be mobile responsive
- Location: tests\landing.spec.ts:406:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('header')
Expected: visible
Error: strict mode violation: locator('header') resolved to 7 elements:
    1) <header data-astro-cid-fb3qbcs3="" class="sticky top-0 z-50 bg-[#f5f2eb]/95 backdrop-blur-sm border-b border-[#e3dfd8]">…</header> aka getByRole('banner')
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
      - link "readto . ai" [ref=e5] [cursor=pointer]:
        - /url: /readto-chrome-extension
        - text: readto
        - generic [ref=e6]: .
        - generic [ref=e7]: ai
      - navigation [ref=e8]:
        - link "工作原理" [ref=e9] [cursor=pointer]:
          - /url: /readto-chrome-extension#how
        - link "安装" [ref=e10] [cursor=pointer]:
          - /url: /readto-chrome-extension
        - link "安装扩展 →" [ref=e11] [cursor=pointer]:
          - /url: https://chromewebstore.google.com/detail/readto/hmoifnkckggncdpoplpoiifjafffmkof
  - main [ref=e12]:
    - paragraph [ref=e13]: Privacy Policy
    - heading "We don't collect your reading history." [level=1] [ref=e14]:
      - text: We don't collect
      - text: your reading history.
    - paragraph [ref=e15]: "Last updated: 2026-04-24"
    - generic [ref=e16]:
      - heading "1. What readto is" [level=2] [ref=e17]
      - paragraph [ref=e18]: readto is a Chrome extension that annotates English words above your CEFR level with a Chinese gloss while you browse. All annotation happens inside your own browser. No server of ours is involved in this process.
    - generic [ref=e19]:
      - heading "2. What we don't do" [level=2] [ref=e20]
      - list [ref=e21]:
        - listitem [ref=e22]:
          - generic [ref=e23]: •
          - generic [ref=e24]: We don't collect the URLs, body text, or any content of pages you read.
        - listitem [ref=e25]:
          - generic [ref=e26]: •
          - generic [ref=e27]: We don't upload your reading history, click stream, or usage statistics.
        - listitem [ref=e28]:
          - generic [ref=e29]: •
          - generic [ref=e30]: We don't embed any analytics, tracking, or advertising SDKs.
        - listitem [ref=e31]:
          - generic [ref=e32]: •
          - generic [ref=e33]: readto has no account system — we don't know who you are.
    - generic [ref=e34]:
      - heading "3. What the extension stores on your device" [level=2] [ref=e35]
      - paragraph [ref=e36]:
        - text: The extension uses Chrome's native storage API
        - code [ref=e37]: chrome.storage
        - text: to keep the following settings on your own device only (
        - code [ref=e38]: sync
        - text: means it travels with your Chrome account across devices;
        - code [ref=e39]: local
        - text: "means it stays on this machine):"
      - list [ref=e40]:
        - listitem [ref=e41]:
          - generic [ref=e42]: •
          - generic [ref=e43]:
            - strong [ref=e44]: CEFR level and gloss mode
            - text: (
            - code [ref=e45]: sync
            - text: ) — the 1–5 level you pick on the options page and your gloss preferences.
        - listitem [ref=e46]:
          - generic [ref=e47]: •
          - generic [ref=e48]:
            - strong [ref=e49]: LLM configuration
            - text: (
            - code [ref=e50]: local
            - text: ) — the API endpoint, API key, and model name you provide. These credentials are used only for the extension to talk directly to the LLM service you specify, and
            - emphasis [ref=e51]: never leave your device to reach us
            - text: .
    - generic [ref=e52]:
      - heading "4. Third parties the extension talks to" [level=2] [ref=e53]
      - paragraph [ref=e54]: "readto is Bring Your Own Key: LLM calls go directly from your browser to the endpoint you configured, with no readto server in between. Outbound requests are limited to:"
      - list [ref=e55]:
        - listitem [ref=e56]:
          - generic [ref=e57]: •
          - generic [ref=e58]:
            - strong [ref=e59]: The LLM service you configure
            - text: (for example OpenAI, Anthropic, or your own OpenAI-compatible backend). Context snippets around unknown words are sent there to fetch a translation; those requests are governed by your agreement with the LLM provider.
        - listitem [ref=e60]:
          - generic [ref=e61]: •
          - generic [ref=e62]:
            - strong [ref=e63]: dictionaryapi.dev
            - text: — when you open a word card to hear its pronunciation, the extension queries this public API for an audio URL. Only the word itself is sent.
        - listitem [ref=e64]:
          - generic [ref=e65]: •
          - generic [ref=e66]:
            - strong [ref=e67]: YouTube
            - text: — only when you open a YouTube video page, the extension reads the video's caption track in order to annotate it. Those requests go to YouTube directly; nothing passes through us.
    - generic [ref=e68]:
      - heading "5. Permissions" [level=2] [ref=e69]
      - paragraph [ref=e70]: "The extension manifest declares the following permissions:"
      - list [ref=e71]:
        - listitem [ref=e72]:
          - generic [ref=e73]: •
          - generic [ref=e74]:
            - code [ref=e75]: storage
            - text: — to persist the settings above to
            - code [ref=e76]: chrome.storage
            - text: .
        - listitem [ref=e77]:
          - generic [ref=e78]: •
          - generic [ref=e79]:
            - code [ref=e80]: <all_urls>
            - text: host permission — to inject the annotation script into any English web page. Annotation runs entirely on your device; page contents are never sent out without your action.
    - generic [ref=e81]:
      - heading "6. Deleting your data" [level=2] [ref=e82]
      - paragraph [ref=e83]: Uninstalling the extension clears all local storage. You can also clear the API key field on the options page to remove the credentials. Because we run no servers, there is no data of yours for us to delete.
    - generic [ref=e84]:
      - heading "7. Contact" [level=2] [ref=e85]
      - paragraph [ref=e86]:
        - text: For questions about this policy, the latest version is always published at
        - link "readto.ai" [ref=e87] [cursor=pointer]:
          - /url: /readto-chrome-extension
        - text: .
  - contentinfo [ref=e88]:
    - generic [ref=e89]:
      - link "readto.ai" [ref=e90] [cursor=pointer]:
        - /url: /readto-chrome-extension
      - generic [ref=e91]:
        - link "隐私政策" [ref=e92] [cursor=pointer]:
          - /url: /readto-chrome-extension/privacy
        - generic [ref=e93]: © 2026 · 读懂
  - generic [ref=e96]:
    - button "Menu" [ref=e97]:
      - img [ref=e99]
      - generic: Menu
    - button "Inspect" [ref=e103]:
      - img [ref=e105]
      - generic: Inspect
    - button "Audit" [ref=e107]:
      - img [ref=e109]
      - generic: Audit
    - button "Settings" [ref=e112]:
      - img [ref=e114]
      - generic: Settings
```

# Test source

```ts
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
  349 |       'What readto is',
  350 |       'What we don\'t do',
  351 |       'What the extension stores',
  352 |       'Third parties',
  353 |       'Permissions',
  354 |       'Deleting your data',
  355 |       'Contact',
  356 |     ];
  357 |     
  358 |     for (const section of sections) {
  359 |       await expect(page.locator(`h2:has-text("${section}")`)).toBeVisible();
  360 |     }
  361 |   });
  362 | 
  363 |   test('should have technical terms in code blocks', async ({ page }) => {
  364 |     // Check for chrome.storage text
  365 |     await expect(page.locator('text=chrome.storage').first()).toBeVisible();
  366 |   });
  367 | 
  368 |   test('should have navigation back to home', async ({ page }) => {
  369 |     const homeLink = page.locator('header a:has-text("readto")');
  370 |     await expect(homeLink).toBeVisible();
  371 |     await expect(homeLink).toHaveAttribute('href', /readto-chrome-extension\/?$/);
  372 |   });
  373 | 
  374 |   test('should have footer with privacy link', async ({ page }) => {
  375 |     const footer = page.locator('footer');
  376 |     await expect(footer).toBeVisible();
  377 |     await expect(footer).toContainText('© 2026');
  378 |     
  379 |     const privacyLink = footer.locator('a:has-text("隐私政策")');
  380 |     await expect(privacyLink).toHaveAttribute('href', /\/privacy/);
  381 |   });
  382 | 
  383 |   test('should have install button in header', async ({ page }) => {
  384 |     const installBtn = page.locator('header a:has-text("安装扩展")');
  385 |     await expect(installBtn).toBeVisible();
  386 |     await expect(installBtn).toHaveAttribute('href', /chromewebstore/);
  387 |   });
  388 | 
  389 |   test('should list bullet points for what we don\'t do', async ({ page }) => {
  390 |     const section = page.locator('h2:has-text("What we don\'t do")').locator('..');
  391 |     const bullets = section.locator('li');
  392 |     const count = await bullets.count();
  393 |     expect(count).toBe(4);
  394 |   });
  395 | 
  396 |   test('should mention LLM and BYOK', async ({ page }) => {
  397 |     await expect(page.locator('text=Bring Your Own Key')).toBeVisible();
  398 |   });
  399 | 
  400 |   test('should have link to readto.ai in contact section', async ({ page }) => {
  401 |     const contactSection = page.locator('h2:has-text("Contact")').locator('..');
  402 |     const link = contactSection.locator('a:has-text("readto.ai")');
  403 |     await expect(link).toBeVisible();
  404 |   });
  405 | 
  406 |   test('should be mobile responsive', async ({ page }) => {
  407 |     await page.setViewportSize({ width: 375, height: 812 });
  408 |     
  409 |     // Header should be visible
  410 |     const header = page.locator('header');
> 411 |     await expect(header).toBeVisible();
      |                          ^ Error: expect(locator).toBeVisible() failed
  412 |     
  413 |     // Title should be visible (use main h1 to avoid Playwright UI elements)
  414 |     await expect(page.locator('main h1').first()).toBeVisible();
  415 |     
  416 |     // Footer should be visible
  417 |     const footer = page.locator('footer');
  418 |     await expect(footer).toBeVisible();
  419 |   });
  420 | });
  421 | 
  422 | test.describe('Tooltip Target Word Style', () => {
  423 |   test('should show target word in red color', async ({ page }) => {
  424 |     await page.goto(BASE_URL);
  425 |     await page.waitForLoadState('domcontentloaded');
  426 |     
  427 |     // Click on a word to show tooltip
  428 |     await page.locator('[data-word="sweeping"]').first().click({ force: true });
  429 |     await page.waitForTimeout(500);
  430 |     
  431 |     // Check tooltip is visible
  432 |     const tooltip = page.locator('#tooltip');
  433 |     await expect(tooltip).toHaveClass(/show/);
  434 |     
  435 |     // Check example target word exists
  436 |     const target = tooltip.locator('.example .target');
  437 |     const count = await target.count();
  438 |     expect(count).toBeGreaterThan(0);
  439 |   });
  440 | });
  441 | 
```