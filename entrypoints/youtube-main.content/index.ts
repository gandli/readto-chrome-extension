import '../../src/content/page-world';

export default defineContentScript({
  matches: ['https://*.youtube.com/*', 'https://*.youtube-nocookie.com/*'],
  runAt: 'document_start',
  allFrames: true,
  world: 'MAIN',
  main() {},
});
