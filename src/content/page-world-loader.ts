/**
 * YouTube MAIN world loader — injected at document_start into MAIN world.
 */
(function () {
  'use strict';
  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL('assets/page-world.ts-BGmjBmlP.js')
    );
  })().catch(console.error);
})();
