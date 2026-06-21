/**
 * Content script loader — injected into web pages at document_idle.
 * Uses dynamic import to load the real ESM module from the extension bundle.
 */
(function () {
  'use strict';

  const injectTime = performance.now();

  (async () => {
    const { onExecute } = await import(
      /* @vite-ignore */
      chrome.runtime.getURL('assets/index.ts-Bi-u9n9y.js')
    );
    onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } });
  })().catch(console.error);
})();
