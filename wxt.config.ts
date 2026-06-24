import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: '.',
  outDir: '.output',
  modules: [],
  manifestVersion: 3,
  vite: () => ({
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        preserveEntrySignatures: 'strict',
      },
    },
  }),
  manifest: {
    update_url: 'https://clients2.google.com/service/update2/crx',
    name: 'readto',
    version: '0.3.1',
    description: 'Chinese ruby annotations for English words above your CEFR level 为超出你CEFR等级的英文单词标注中文注音（Ruby注释）',
    homepage_url: 'https://readto.ai',
    icons: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    permissions: ['storage', 'tts'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'readto — configure',
      default_icon: {
        16: 'icons/icon-16.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
    options_page: 'options.html',
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    web_accessible_resources: [
      {
        matches: ['http://*/*', 'https://*/*', 'chrome-extension://*/*'],
        resources: [
          'assets/*.js',
          'assets/*.css',
          'assets/*.json',
          'assets/detail/*.json',
          'assets/*.woff2',
          'icons/*.png',
        ],
        use_dynamic_url: false,
      },
      {
        matches: ['https://*.youtube.com/*', 'https://*.youtube-nocookie.com/*'],
        resources: [
          'assets/*.js',
          'assets/*.css',
          'assets/*.json',
          'assets/detail/*.json',
        ],
        use_dynamic_url: false,
      },
      {
        matches: ['https://*.bilibili.com/*'],
        resources: [
          'assets/*.js',
          'assets/*.css',
          'assets/*.json',
          'assets/detail/*.json',
        ],
        use_dynamic_url: false,
      },
    ],
  },
});
