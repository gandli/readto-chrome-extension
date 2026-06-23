import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const manifestPath = path.join(distDir, 'manifest.json');

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

type Manifest = {
  manifest_version: number;
  name: string;
  version: string;
  background?: { service_worker?: string; type?: string };
  options_page?: string;
  content_scripts?: Array<{
    js?: string[];
    matches?: string[];
    exclude_matches?: string[];
    run_at?: string;
    all_frames?: boolean;
    world?: string;
  }>;
  web_accessible_resources?: Array<{ matches?: string[]; resources?: string[]; use_dynamic_url?: boolean }>;
};

function expectDistFile(relativePath: string): void {
  expect(fs.existsSync(path.join(distDir, relativePath)), `${relativePath} should exist in dist`).toBe(true);
}

function allResources(manifest: Manifest): string[] {
  return manifest.web_accessible_resources?.flatMap(group => group.resources ?? []) ?? [];
}

function resourceAllows(resources: string[], expected: string): boolean {
  if (resources.includes(expected)) return true;
  return resources.some(resource => {
    if (!resource.includes('*')) return false;
    const [prefix, suffix] = resource.split('*');
    const middle = expected.slice(prefix.length, expected.length - suffix.length);
    return expected.startsWith(prefix) && expected.endsWith(suffix) && !middle.includes('/');
  });
}

describe('WXT Chrome MV3 build output contract', () => {
  it('emits a manifest with readto metadata, background, options page and content scripts', () => {
    expect(fs.existsSync(manifestPath), 'dist/manifest.json should exist; run bun run build first').toBe(true);
    const manifest = readJson<Manifest>(manifestPath);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('readto');
    expect(manifest.version).toBe('0.3.1');
    expect(manifest.background?.service_worker).toBeTruthy();
    expect(manifest.options_page).toBe('options.html');
    expect(manifest.content_scripts?.length).toBeGreaterThanOrEqual(5);

    for (const script of manifest.content_scripts ?? []) {
      expect(script.js?.length, `content script for ${script.matches?.join(',')} should have JS`).toBeGreaterThan(0);
      for (const js of script.js ?? []) expectDistFile(js);
    }
  });

  it('keeps separate injection rules for regular pages, YouTube and Bilibili including MAIN world scripts', () => {
    const manifest = readJson<Manifest>(manifestPath);
    const scripts = manifest.content_scripts ?? [];

    const regular = scripts.find(s => s.matches?.includes('http://*/*') && s.matches?.includes('https://*/*'));
    expect(regular, 'regular page content script should exist').toBeTruthy();
    expect(regular?.run_at).toBe('document_idle');
    expect(regular?.exclude_matches).toEqual(expect.arrayContaining([
      'https://*.youtube.com/*',
      'https://*.youtube-nocookie.com/*',
      'https://*.bilibili.com/*',
    ]));

    const youtubeIsolated = scripts.find(s => s.matches?.some(m => m.includes('youtube.com')) && s.world !== 'MAIN');
    const youtubeMain = scripts.find(s => s.matches?.some(m => m.includes('youtube.com')) && s.world === 'MAIN');
    expect(youtubeIsolated?.run_at).toBe('document_start');
    expect(youtubeIsolated?.all_frames).toBe(true);
    expect(youtubeMain?.run_at).toBe('document_start');
    expect(youtubeMain?.all_frames).toBe(true);

    const bilibiliIsolated = scripts.find(s => s.matches?.some(m => m.includes('bilibili.com')) && s.world !== 'MAIN');
    const bilibiliMain = scripts.find(s => s.matches?.some(m => m.includes('bilibili.com')) && s.world === 'MAIN');
    expect(bilibiliIsolated?.run_at).toBe('document_idle');
    expect(bilibiliMain?.world).toBe('MAIN');
    expect(bilibiliMain?.run_at).toBe('document_start');
  });

  it('exposes runtime JSON/CSS/assets needed by content scripts and options page', () => {
    const manifest = readJson<Manifest>(manifestPath);
    const resources = allResources(manifest);

    expect(resourceAllows(resources, 'assets/translations-data.json')).toBe(true);
    expect(resourceAllows(resources, 'assets/level-data-full.json')).toBe(true);
    expect(resourceAllows(resources, 'assets/detail/a.json')).toBe(true);
    expect(resourceAllows(resources, 'assets/detail/z.json')).toBe(true);
    expect(resourceAllows(resources, 'assets/tooltip-css.css'), 'tooltip CSS should be web-accessible').toBe(true);

    const allPagesGroup = manifest.web_accessible_resources?.find(group => group.matches?.includes('chrome-extension://*/*'));
    expect(allPagesGroup, 'options page assets need chrome-extension://*/* web_accessible_resources').toBeTruthy();
  });
});
