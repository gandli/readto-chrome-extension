import '../../src/content/youtube';

export default defineContentScript({
  matches: ['https://*.youtube.com/*', 'https://*.youtube-nocookie.com/*'],
  runAt: 'document_start',
  allFrames: true,
  main() {},
});
