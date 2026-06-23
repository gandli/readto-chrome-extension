import '../../src/content/bilibili';

export default defineContentScript({
  matches: ['https://*.bilibili.com/*'],
  runAt: 'document_idle',
  allFrames: true,
  main() {},
});
