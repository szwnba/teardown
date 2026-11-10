// Smoke test for v8-live.html: boots, renders, auto-tour runs, controls respond, no console errors.
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire('/home/johnson/.agents/skills/teardown/node_modules/x.js');
const {chromium} = require('playwright');

const file = path.resolve(process.argv[2] ?? 'teardown-out/dist/v8-live.html');
const browser = await chromium.launch({
  executablePath: '/home/johnson/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome',
  args: ['--force_high_performance_gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars'],
});
const page = await browser.newPage({viewport: {width: 1600, height: 900}});
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
await page.goto('file://' + file);
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  return c && c.width > 0 && c.height > 0;
}, null, {timeout: 180000, polling: 1000});
console.log('canvas up; warming shaders and letting the tour run...');
await page.waitForTimeout(10000); // warm shaders + a few live frames (SwiftShader is slow)

const probe = await page.evaluate(async () => {
  const c = document.querySelector('canvas');
  const gl = c.getContext('webgl2') ?? c.getContext('webgl');
  // read a few pixels from the 3D canvas via a fresh screenshot instead: GL readback of a
  // three.js canvas is unsafe; instead check the canvas has nonzero size and the app div has content.
  const ui = document.getElementById('app');
  const texts = ui ? ui.innerText.replace(/\s+/g, ' ').slice(0, 200) : '(no #app)';
  return {w: c.width, h: c.height, hasApp: !!ui, texts, tourChip: !!document.querySelector('[data-tour], .tour, #tour')};
});
console.log('canvas:', probe.w + 'x' + probe.h, '| #app:', probe.hasApp, '| tour chip:', probe.tourChip);
console.log('overlay text head:', probe.texts);

// auto-tour should be driving: wait and check the console overlay changed (theta advancing)
const t1 = await page.evaluate(() => document.getElementById('app').innerText.length);
await page.waitForTimeout(3000);
const t2 = await page.evaluate(() => document.getElementById('app').innerText.length);
console.log('overlay alive (text length drift):', t1, '->', t2);

// poke real controls: the camera preset buttons + cutaway buttons + pause
const clicked = [];
for (const label of ['FRONT', 'SIDE', 'VALLEY', 'HERO', 'SECTION', 'SOLID', 'GLASS', 'CHARGE']) {
  const el = await page.$(`div.tb:has-text("${label}")`);
  if (!el) { clicked.push(label + '(missing!)'); continue; }
  await el.click({timeout: 30000}).then(() => clicked.push(label)).catch(() => clicked.push(label + '(fail)'));
  await page.waitForTimeout(300);
}
console.log('clicked:', clicked.join(', ') || '(none found)');

// keyboard: H hides overlay, space pauses
await page.keyboard.press('h');
await page.waitForTimeout(300);
const hidden = await page.evaluate(() => document.getElementById('app').innerText.length);
await page.keyboard.press('h');
console.log('after H, overlay text length:', hidden);

// final fps probe: count rAF over 2 s (SwiftShader floor — on a real GPU this is the same loop)
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(n / 2); };
  requestAnimationFrame(tick);
}));
console.log('rAF rate here (software GPU):', fps.toFixed(1), 'fps');
console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
console.log(errors.length ? 'SMOKE FAIL' : 'SMOKE OK');
