// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages: gandli.github.io/readto-chrome-extension
  // 自定义域名时改为 '/'
  site: 'https://gandli.github.io',

  base: '/readto-chrome-extension',

  vite: {
    plugins: [tailwindcss()],
    server: {
      host: '0.0.0.0',  // 局域网可访问
    },
  },

  server: {
    host: '0.0.0.0',  // 局域网可访问
  },
});
