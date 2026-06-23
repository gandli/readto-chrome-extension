import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const defaultChromePath = 'C:/Users/user/scoop/apps/googlechrome/current/chrome.exe';
const chromePath = process.env.CHROME_PATH || process.env.LIGHTHOUSE_CHROMIUM_PATH || defaultChromePath;

if (!fs.existsSync(chromePath)) {
  console.error(`[readto:wxt] Chrome executable not found: ${chromePath}`);
  console.error('[readto:wxt] Set CHROME_PATH to your Chrome/Chromium executable and rerun bun run dev.');
  process.exit(1);
}

const args = process.argv.slice(2);
const child = spawn(
  process.execPath,
  [path.join(projectRoot, 'node_modules/wxt/bin/wxt.mjs'), ...args],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      CHROME_PATH: chromePath,
    },
  },
);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
