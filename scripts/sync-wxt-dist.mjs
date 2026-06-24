import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, '.output', 'chrome-mv3');
const target = path.join(root, 'dist');

if (!fs.existsSync(source)) {
  throw new Error(`WXT output not found: ${source}`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

// WXT only copies public/ files. Keep the Shadow DOM tooltip stylesheet as a
// stable web-accessible asset because runtime code looks up tooltip-css-* first
// and falls back to assets/tooltip-css.css.
const tooltipSource = path.join(root, 'src', 'styles', 'tooltip.css');
const tooltipTarget = path.join(target, 'assets', 'tooltip-css.css');
if (fs.existsSync(tooltipSource)) {
  fs.mkdirSync(path.dirname(tooltipTarget), { recursive: true });
  fs.copyFileSync(tooltipSource, tooltipTarget);
}

const manifestPath = path.join(target, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// WXT names option pages as entrypoints/options.html by default. Keep the
// legacy dist/options.html path so existing Playwright tests and users can
// load the same options_page as before.
const wxtOptions = path.join(target, 'entrypoints', 'options.html');
const rootOptions = path.join(target, 'options.html');
if (fs.existsSync(wxtOptions)) {
  fs.copyFileSync(wxtOptions, rootOptions);
  manifest.options_page = 'options.html';
  manifest.options_ui = {
    page: 'options.html',
    open_in_tab: true,
  };
}

const resourcesFor = (matches) => ({
  matches,
  resources: [
    'assets/*.js',
    'assets/*.css',
    'assets/*.json',
    'assets/*.woff2',
    'assets/detail/*.json',
    'content-scripts/*.js',
    'chunks/*.js',
    'icons/*.png',
  ],
  use_dynamic_url: false,
});

manifest.web_accessible_resources = [
  resourcesFor(['http://*/*', 'https://*/*', 'chrome-extension://*/*']),
  resourcesFor(['https://*.youtube-nocookie.com/*', 'https://*.youtube.com/*']),
  resourcesFor(['https://*.bilibili.com/*']),
];

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[readto:wxt] Synced ${source} -> ${target}`);
