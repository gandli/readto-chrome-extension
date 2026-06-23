/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Production extension builds are handled by WXT (wxt.config.ts).
  // Keep this Vite config focused on Vitest transforms only, so tests do not
  // mutate dist/manifest.json with the legacy Vite manifest patcher.
  plugins: [react(), tailwindcss()],
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
