import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const tooltipSource = path.join(root, 'src', 'styles', 'tooltip.css');
const tooltipTarget = path.join(root, 'public', 'assets', 'tooltip-css.css');

if (!fs.existsSync(tooltipSource)) {
  console.error(`[readto:wxt] Missing tooltip stylesheet: ${tooltipSource}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(tooltipTarget), { recursive: true });
fs.copyFileSync(tooltipSource, tooltipTarget);
console.log(`[readto:wxt] Prepared ${path.relative(root, tooltipTarget).replaceAll('\\\\', '/')}`);
