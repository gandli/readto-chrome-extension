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

      const loader = findFile('index.ts-');
      const contentMain = files.find(f => f.startsWith('index.ts-') && f !== loader && !f.includes('youtube')) ?? null;
      const youtube = findFile('index.ts-youtube-');
      const youtubeLoader = files.find(f => f.startsWith('index.ts-youtube-') && f !== youtube) ?? null;
      const pageWorld = findFile('page-world.ts-');
      const storage = findFile('storage-');
      const levelFilter = findFile('level-filter-');
      const inlineRenderer = findFile('inline-renderer-');
      const translations = files.find(f => f.startsWith('translations-') && !f.includes('detail') && !f.includes('data')) ?? null;
      const types = findFile('types-');

      // Update content_scripts[0] — main content script loader
      if (manifest.content_scripts?.[0] && loader) {
        manifest.content_scripts[0].js = [`assets/${loader}`];
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
            else newResources.push(res); // keep as-is
          }
          group.resources = newResources;
        }
      }

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('[manifest-patch] Updated manifest.json with correct filenames');
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
      include: ['src/lib/**', 'src/background/**'],
    },
  },
});
