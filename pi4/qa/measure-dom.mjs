// Measures every text-bearing element in the film page at given times against the 1600x900 CSS viewport.
// Usage: node measure-dom.mjs [page.html] [t] [t2 ...]
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire('/home/johnson/.agents/skills/teardown/node_modules/x.js');
const {chromium} = require('playwright');

const file = path.resolve(process.argv[2] ?? '/home/johnson/.agents/skills/teardown/teardown-out/dist/pi4-film.html');
const times = process.argv.slice(3).map(Number).length ? process.argv.slice(3).map(Number) : [0, 4.5, 8.9, 12.7, 16.5, 18.9, 21.9, 25.2];

const browser = await chromium.launch({
  executablePath: '/home/johnson/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome',
  args: ['--force_high_performance_gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars'],
});
const page = await browser.newPage({viewport: {width: 1600, height: 900}});
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto('file://' + file + '?capture');
await page.waitForFunction(() => window.SIM && document.fonts.ready.then(() => true), null, {timeout: 60000});
await page.evaluate(() => document.fonts.ready);

let bad = 0;
for (const t of times) {
  await page.evaluate((tt) => window.SIM.render(tt), t);
  const issues = await page.evaluate(() => {
    const out = [];
    const vw = 1600;
    const vh = 900;
    for (const el of document.querySelectorAll('#app *')) {
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const txt = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 44);
      if (r.right > vw + 0.5 || r.bottom > vh + 0.5 || r.left < -0.5 || r.top < -0.5) {
        out.push({txt, box: [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v))});
      }
    }
    return out;
  });
  console.log(`t=${t}: ${issues.length ? 'CLIPPED ' + issues.length : 'all text inside 1600x900'}`);
  for (const i of issues) {
    console.log('  ', JSON.stringify(i));
    bad++;
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
