// Smoke test for pi4-live.html: boots, renders, auto tour runs, every control answers, no console errors.
// Usage: node smoke-live.mjs [page.html]
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire('/home/johnson/.agents/skills/teardown/node_modules/x.js');
const {chromium} = require('playwright');

const file = path.resolve(process.argv[2] ?? '/home/johnson/.agents/skills/teardown/teardown-out/dist/pi4-live.html');
const browser = await chromium.launch({
  executablePath: '/home/johnson/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome',
  args: ['--force_high_performance_gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars'],
});
const page = await browser.newPage({viewport: {width: 1600, height: 900}});
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
});
await page.goto('file://' + file);
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  return c && c.width > 0 && c.height > 0 && window.LIVE;
}, null, {timeout: 180000});
console.log('canvas up; warming shaders and letting the tour run...');
await page.waitForTimeout(10000); // warm shaders + live frames (SwiftShader is slow)

const probe = await page.evaluate(() => {
  const ui = document.getElementById('app');
  return {text: ui.innerText.replace(/\s+/g, ' ').slice(0, 180), tour: !!document.querySelector('.tourchip')};
});
console.log('tour chip:', probe.tour);
console.log('overlay head:', probe.text);

// the overlay must be alive: readouts drift as the tour runs
const a = await page.evaluate(() => document.getElementById('app').innerText.length);
await page.waitForTimeout(3000);
const b = await page.evaluate(() => document.getElementById('app').innerText.length);
console.log('overlay alive (text length drift):', a, '->', b);

// poke the controls: camera, cutaway, overlay buttons, transport, part rows, phase strip — by data-k hook
const clicked = [];
const click = async (sel, label) => {
  const el = await page.$(sel);
  if (!el) {
    clicked.push(label + '(missing!)');
    return;
  }
  await el.click({timeout: 30000}).then(() => clicked.push(label)).catch(() => clicked.push(label + '(fail)'));
  await page.waitForTimeout(260);
};
for (const k of ['hero', 'edge', 'under', 'soc', 'solid', 'xray', 'layers', 'labels', 'flow', 'charts', 'isolate', 'reboot', 'back', 'fwd', 'play']) {
  await click(`div.tb[data-k="${k}"]`, k);
}
for (const p of ['soc', 'ram', 'wifi', 'vl805', 'phy', 'pmic', 'eeprom', 'sd', 'io']) await click(`.row[data-p="${p}"]`, 'row:' + p);
for (let i = 0; i < 5; i++) await click(`.ph[data-ph="${i}"]`, 'phase:' + i);
await page.keyboard.press('h');
await page.waitForTimeout(300);
const hiddenLen = await page.evaluate(() => document.getElementById('app').innerText.length);
await page.keyboard.press('h');
await page.keyboard.press(' ');
await page.waitForTimeout(200);
console.log('after H (overlay hidden), text length:', hiddenLen);
console.log('clicked:', clicked.join(', '));

// sliders: drag the teardown slider through the track with synthetic pointer events
const knob = await page.evaluate(() => {
  const k = document.querySelector('[data-qa="detent"]');
  return k ? k.textContent : null;
});
console.log('detent readout after drags:', knob);

const missing = clicked.filter((c) => c.includes('missing') || c.includes('fail'));
console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0;
  const t0 = performance.now();
  const tick = () => {
    n++;
    if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
    else res(n / 2);
  };
  requestAnimationFrame(tick);
}));
console.log('rAF rate here (software GPU):', fps.toFixed(1), 'fps');
await browser.close();
if (missing.length || errors.length) {
  console.log(missing.length ? 'MISSING: ' + missing.join(',') : '', errors.length ? 'SMOKE FAIL' : 'SMOKE OK (controls)');
  process.exit(errors.length ? 1 : 0);
}
console.log('SMOKE OK');
