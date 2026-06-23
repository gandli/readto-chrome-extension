import { onExecute } from '../../src/content/index';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  excludeMatches: [
    'https://*.youtube.com/*',
    'https://*.youtube-nocookie.com/*',
    'https://*.bilibili.com/*',
  ],
  runAt: 'document_idle',
  main(ctx) {
    onExecute({ injectTime: performance.now(), loadTime: 0 }).catch(console.error);
    ctx.onInvalidated(() => {
      try { speechSynthesis.cancel(); } catch {}
    });
  },
});
