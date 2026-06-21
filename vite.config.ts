import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, readFileSync } from 'fs';

/**
 * Custom Vite plugin to generate Chrome extension loader files and manifest.
 */
function chromeExtensionPlugin() {
  return {
    name: 'chrome-extension',
    enforce: 'post' as const,
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const assetsDir = resolve(distDir, 'assets');

      const assets = existsSync(assetsDir) ? readdirSync(assetsDir) : [];

      const findAsset = (pattern: string) =>
        assets.find((f: string) => f.startsWith(pattern) && f.endsWith('.js')) ?? '';

      const contentIndex = findAsset('index.ts-');
      const youtubeIndex = findAsset('index.ts-youtube-');
      const pageWorldIndex = findAsset('page-world.ts-');
      const storageChunk = findAsset('storage-');
      const levelFilterChunk = findAsset('level-filter-');
      const inlineRendererChunk = findAsset('inline-renderer-');
      const translationsChunk = findAsset('translations-');
      const typesChunk = findAsset('types-');
      const optionsChunk = assets.find((f: string) => f.startsWith('options-') && f.endsWith('.js')) ?? '';

      // Generate content script loaders
      const makeLoader = (targetAsset: string) =>
        `(function(){'use strict';const t=performance.now();(async()=>{const{onExecute}=await import(/* @vite-ignore */chrome.runtime.getURL("assets/${targetAsset}"));onExecute?.({perf:{injectTime:t,loadTime:performance.now()-t}})})().catch(console.error)})();`;

      if (contentIndex) writeFileSync(resolve(distDir, 'assets/index.ts-loader.js'), makeLoader(contentIndex));
      if (youtubeIndex) writeFileSync(resolve(distDir, 'assets/index.ts-youtube-loader.js'), makeLoader(youtubeIndex));

      // Page world loader uses relative import
      if (pageWorldIndex) {
        writeFileSync(resolve(distDir, 'assets/page-world.ts-loader.js'),
          `(function(){'use strict';const t=performance.now();(async()=>{const{onExecute}=await import("./${pageWorldIndex}");onExecute?.({perf:{injectTime:t,loadTime:performance.now()-t}})})().catch(console.error)})();`);
      }

      // Service worker loader
      const swAsset = assets.find((f: string) => f.startsWith('service-worker-') && f.endsWith('.js'));
      if (swAsset) {
        writeFileSync(resolve(distDir, 'service-worker-loader.js'), `import './assets/${swAsset}';\n`);
      }

      // Generate manifest.json
      const loaderContent = contentIndex ? 'assets/index.ts-loader.js' : '';
      const loaderYoutube = youtubeIndex ? 'assets/index.ts-youtube-loader.js' : '';
      const loaderPageWorld = pageWorldIndex ? 'assets/page-world.ts-loader.js' : '';

      const webAccessible = [
        storageChunk, levelFilterChunk, inlineRendererChunk,
        translationsChunk, contentIndex, youtubeIndex, pageWorldIndex,
        typesChunk,
        'level-data-full.json', 'translations-data.json', 'translations-detail.json',
      ].filter(Boolean);

      const manifest = {
        manifest_version: 3,
        name: 'readto',
        version: '0.3.1',
        description: 'Chinese ruby annotations for English words above your CEFR level',
        homepage_url: 'https://readto.ai',
        icons: {
          '16': 'icons/icon-16.png',
          '48': 'icons/icon-48.png',
          '128': 'icons/icon-128.png',
        },
        permissions: ['storage'],
        host_permissions: ['<all_urls>'],
        background: {
          service_worker: 'service-worker-loader.js',
          type: 'module',
        },
        action: {
          default_title: 'readto — configure',
          default_icon: {
            '16': 'icons/icon-16.png',
            '48': 'icons/icon-48.png',
            '128': 'icons/icon-128.png',
          },
        },
        options_page: 'options.html',
        content_scripts: [
          {
            js: [loaderContent],
            matches: ['http://*/*', 'https://*/*'],
            exclude_matches: [
              'https://*.youtube.com/*',
              'https://*.youtube-nocookie.com/*',
            ],
            run_at: 'document_idle',
          },
          {
            js: [loaderYoutube],
            matches: ['https://*.youtube.com/*', 'https://*.youtube-nocookie.com/*'],
            run_at: 'document_start',
            all_frames: true,
          },
          {
            js: [loaderPageWorld],
            matches: ['https://*.youtube.com/*', 'https://*.youtube-nocookie.com/*'],
            run_at: 'document_start',
            all_frames: true,
            world: 'MAIN',
          },
        ],
        web_accessible_resources: [
          {
            matches: ['http://*/*', 'https://*/*'],
            resources: webAccessible.map(f => `assets/${f}`),
            use_dynamic_url: false,
          },
        ],
      };

      writeFileSync(resolve(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // Inject CSS link into built options.html
      const optionsHtml = resolve(distDir, 'options.html');
      if (existsSync(optionsHtml)) {
        let html = readFileSync(optionsHtml, 'utf-8');
        if (!html.includes('options.css')) {
          html = html.replace('</head>', '    <link rel="stylesheet" crossorigin href="./assets/options.css">\n  </head>');
          writeFileSync(optionsHtml, html);
        }
      }

      // Copy icons
      const iconsSrc = resolve(__dirname, 'public/icons');
      const iconsDst = resolve(distDir, 'icons');
      if (!existsSync(iconsDst)) mkdirSync(iconsDst, { recursive: true });
      if (existsSync(iconsSrc)) {
        for (const icon of readdirSync(iconsSrc)) {
          copyFileSync(resolve(iconsSrc, icon), resolve(iconsDst, icon));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), chromeExtensionPlugin()],
  base: './',
  build: {
    modulePreload: true,
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: {
        'index.ts': resolve(__dirname, 'src/content/index.ts'),
        'index.ts-youtube': resolve(__dirname, 'src/content/youtube.ts'),
        'page-world.ts': resolve(__dirname, 'src/content/page-world.ts'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        options: resolve(__dirname, 'options.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
