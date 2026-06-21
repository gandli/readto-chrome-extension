/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

/**
 * Plugin to patch manifest.json after build with correct hashed filenames.
 */
function manifestPatchPlugin() {
  return {
    name: 'manifest-patch',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const manifestPath = resolve(distDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) return;

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      // Scan dist/assets/ for JS files
      const assetsDir = resolve(distDir, 'assets');
      const files = fs.readdirSync(assetsDir);

      // Build a map: base pattern → actual filename
      const findFile = (prefix: string) =>
        files.find(f => f.startsWith(prefix) && f.endsWith('.js')) ?? null;

      // Find the main content script module (not youtube, not loader)
      const contentMain = files.find(f => f.startsWith('index.ts-') && f.endsWith('.js') && !f.includes('youtube') && !f.includes('bilibili')) ?? null;
      const youtube = findFile('index.ts-youtube-');
      const bilibili = findFile('index.ts-bilibili-');
      const pageWorld = findFile('page-world.ts-');
      const bilibiliWorld = findFile('bilibili-world.ts-');
      const storage = findFile('storage-');
      const levelFilter = findFile('level-filter-');
      const inlineRenderer = findFile('inline-renderer-');
      const translations = files.find(f => f.startsWith('translations-') && !f.includes('detail') && !f.includes('data')) ?? null;
      const types = findFile('types-');

      // Update ALL content_scripts entries
      if (manifest.content_scripts) {
        for (const cs of manifest.content_scripts) {
          const isYouTube = cs.matches?.some((m: string) => m.includes('youtube'));
          const isBilibili = cs.matches?.some((m: string) => m.includes('bilibili'));
          const isMainWorld = cs.world === 'MAIN';

          const newJs: string[] = [];
          for (const jsFile of cs.js) {
            if (jsFile.includes('page-world.ts') && jsFile.includes('loader')) {
              // Page world loader (MAIN world for YouTube)
              if (pageWorld) {
                const loaderName = `page-world-loader.js`;
                if (!fs.existsSync(resolve(distDir, loaderName))) {
                  fs.writeFileSync(resolve(distDir, loaderName), `import './assets/${pageWorld}';`);
                }
                newJs.push(loaderName);
              }
            } else if (isYouTube && !isMainWorld && jsFile.includes('-loader')) {
              // YouTube content script loader
              if (youtube) {
                const loaderName = `index.ts-youtube-loader.js`;
                if (!fs.existsSync(resolve(distDir, loaderName))) {
                  fs.writeFileSync(resolve(distDir, loaderName), `import './assets/${youtube}';`);
                  console.log(`[manifest-patch] Generated ${loaderName} → assets/${youtube}`);
                }
                newJs.push(loaderName);
              }
            } else if (isBilibili && !isMainWorld && jsFile.includes('-loader')) {
              // Bilibili content script loader
              if (bilibili) {
                const loaderName = `index.ts-bilibili-loader.js`;
                if (!fs.existsSync(resolve(distDir, loaderName))) {
                  fs.writeFileSync(resolve(distDir, loaderName), `import './assets/${bilibili}';`);
                  console.log(`[manifest-patch] Generated ${loaderName} → assets/${bilibili}`);
                }
                newJs.push(loaderName);
              }
            } else if (isBilibili && isMainWorld && jsFile.includes('-loader')) {
              // Bilibili MAIN world loader
              if (bilibiliWorld) {
                const loaderName = `bilibili-world-loader.js`;
                if (!fs.existsSync(resolve(distDir, loaderName))) {
                  fs.writeFileSync(resolve(distDir, loaderName), `import './assets/${bilibiliWorld}';`);
                  console.log(`[manifest-patch] Generated ${loaderName} → assets/${bilibiliWorld}`);
                }
                newJs.push(loaderName);
              }
            } else if (jsFile.includes('-loader') && jsFile.includes('index.ts')) {
              if (contentMain) {
                const loaderName = `index.ts-loader.js`;
                if (!fs.existsSync(resolve(distDir, loaderName))) {
                  const loaderCode = `(function(){'use strict';const t=performance.now();(async()=>{const{onExecute}=await import(chrome.runtime.getURL(\"assets/${contentMain}\"));onExecute?.({perf:{injectTime:t,loadTime:performance.now()-t}})})().catch(console.error)})();`;
                  fs.writeFileSync(resolve(distDir, loaderName), loaderCode);
                  console.log(`[manifest-patch] Generated ${loaderName} → assets/${contentMain}`);
                }
                newJs.push(loaderName);
              }
            } else if (jsFile.startsWith('assets/index.ts-') && !jsFile.includes('-loader')) {
              // Main content script (ES module) — need to create a loader
              if (contentMain) {
                const loaderName = `index.ts-loader.js`;
                if (!fs.existsSync(resolve(distDir, loaderName))) {
                  // Create a classic script loader that dynamically imports the ES module
                  const loaderCode = `(function(){'use strict';const t=performance.now();(async()=>{const{onExecute}=await import(chrome.runtime.getURL("assets/${contentMain}"));onExecute?.({perf:{injectTime:t,loadTime:performance.now()-t}})})().catch(console.error)})();`;
                  fs.writeFileSync(resolve(distDir, loaderName), loaderCode);
                  console.log(`[manifest-patch] Generated ${loaderName} → assets/${contentMain}`);
                }
                newJs.push(loaderName);
              }
            } else {
              newJs.push(jsFile);
            }
          }
          cs.js = newJs;
        }
      }

      // Update web_accessible_resources
      if (manifest.web_accessible_resources) {
        for (const group of manifest.web_accessible_resources) {
          const newResources: string[] = [];
          for (const res of group.resources) {
            if (res.includes('storage-')) { if (storage) newResources.push(`assets/${storage}`); }
            else if (res.includes('level-filter-')) { if (levelFilter) newResources.push(`assets/${levelFilter}`); }
            else if (res.includes('inline-renderer-')) { if (inlineRenderer) newResources.push(`assets/${inlineRenderer}`); }
            else if (res.includes('translations-') && !res.includes('detail') && !res.includes('data')) { if (translations) newResources.push(`assets/${translations}`); }
            else if (res.includes('index.ts-') && !res.includes('youtube') && !res.includes('loader')) { if (contentMain) newResources.push(`assets/${contentMain}`); }
            else if (res.includes('types-')) { if (types) newResources.push(`assets/${types}`); }
            else if (res.includes('page-world.ts-')) { if (pageWorld) newResources.push(`assets/${pageWorld}`); }
            else if (res === 'assets/level-data-full.json') newResources.push('assets/level-data-full.json');
            else newResources.push(res); // keep as-is
          }
          group.resources = newResources;
        }
      }

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('[manifest-patch] Updated manifest.json with correct filenames');

      // Generate service-worker-loader.js
      const swFile = findFile('service-worker-');
      if (swFile) {
        const swLoader = `import './assets/${swFile}';`;
        fs.writeFileSync(resolve(distDir, 'service-worker-loader.js'), swLoader);
        console.log(`[manifest-patch] Generated service-worker-loader.js → assets/${swFile}`);
      }

      // Generate YouTube content script loader (page-world uses MAIN world)
      const pwFile = findFile('page-world.ts-');
      if (pwFile) {
        const pwLoader = `import './assets/${pwFile}';`;
        fs.writeFileSync(resolve(distDir, 'page-world-loader.js'), pwLoader);
        console.log(`[manifest-patch] Generated page-world-loader.js → assets/${pwFile}`);
      }

      // Fix options_page path: Vite outputs to src/options/index.html
      if (manifest.options_page === 'options.html') {
        const optionsPath = resolve(distDir, 'src/options/index.html');
        if (fs.existsSync(optionsPath)) {
          // Copy to root level for manifest compatibility
          fs.copyFileSync(optionsPath, resolve(distDir, 'options.html'));
          console.log('[manifest-patch] Copied options.html to dist root');
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), manifestPatchPlugin()],
  build: {
    rollupOptions: {
      input: {
        'index.ts': resolve(__dirname, 'src/content/index.ts'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'options': resolve(__dirname, 'src/options/index.html'),
        'index.ts-youtube': resolve(__dirname, 'src/content/youtube.ts'),
        'page-world.ts': resolve(__dirname, 'src/content/page-world.ts'),
        'index.ts-bilibili': resolve(__dirname, 'src/content/bilibili.ts'),
        'bilibili-world.ts': resolve(__dirname, 'src/content/bilibili-world.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'options') return 'assets/options-[hash].js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        preserveModules: false,
      },
      preserveEntrySignatures: 'strict',
    },
    outDir: 'dist',
    emptyDirFirst: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/*.ts', 'src/background/*.ts'],
      exclude: ['**/*.json', '**/*.test.ts', '**/*.spec.ts', '**/*.js'],
      reporter: ['text', 'text-summary'],
      reportsDirectory: 'coverage',
      all: false,
      clean: true,
    },
  },
});
