/**
 * YouTube content script loader — injected at document_start with all_frames: true.
 */
(function () {
  'use strict';
  const injectTime = performance.now();
  (async () => {
    const { default: init } = await import(
      /* @vite-ignore */
      chrome.runtime.getURL('assets/index.ts-D_6H5iX4.js')
    );
    init?.();
  })().catch(console.error);
})();
