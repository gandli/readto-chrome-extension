import '../../src/content/bilibili-world';

export default defineContentScript({
  matches: ['https://*.bilibili.com/*'],
  runAt: 'document_start',
  allFrames: true,
  world: 'MAIN',
  main() {},
});
