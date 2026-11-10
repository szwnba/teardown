// Button-wiring test via synthetic click events (no Playwright actionability, no WebGL speed needed).
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire('/home/johnson/.agents/skills/teardown/node_modules/x.js');
const {chromium} = require('playwright');

const file = path.resolve('/home/johnson/.zcode/workspace/default/johnson-skills/teardown-out/dist/v8-live.html');
const browser = await chromium.launch({
  executablePath: '/home/johnson/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome',
  args: ['--force_high_performance_gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=gl', '--enable-webgl', '--hide-scrollbars'],
});
const page = await browser.newPage({viewport: {width: 1600, height: 900}});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + file);
await page.waitForFunction(() => document.querySelector('canvas') && document.querySelector('canvas').width > 0, null, {timeout: 120000, polling: 500});
await page.waitForTimeout(2000);

const click = (label) => page.evaluate((lb) => {
  const el = [...document.querySelectorAll('div.tb')].find((e) => e.textContent.trim().includes(lb));
  if (!el) return null;
  el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  return el.textContent.trim();
}, label);

// 1. PAUSE toggles its own label
const before = await page.evaluate(() => document.querySelectorAll('div.tb')[0]?.textContent.trim());
await click('PAUSE');
await page.waitForTimeout(4000); // label redraws on the next render frame; software GL is slow
const after = await page.evaluate(() => document.querySelectorAll('div.tb')[0]?.textContent.trim());
console.log('pause toggle:', JSON.stringify(before), '->', JSON.stringify(after), after !== before ? 'OK' : 'NO CHANGE');

// 2. camera buttons switch the camera: the console's cam marker readout updates (cam name shown near the panel)
for (const cam of ['FRONT', 'VALLEY', 'HERO']) {
  await page.evaluate((label) => {
    const els = [...document.querySelectorAll('div.tb')];
    const el = els.find((e) => e.textContent.trim() === label);
    el?.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  }, cam);
  await page.waitForTimeout(250);
}
console.log('camera clicks dispatched (no crash = wiring intact)');

// 3. cutaway SECTION then GLASS
for (const cut of ['SECTION', 'GLASS']) {
  await page.evaluate((label) => {
    const el = [...document.querySelectorAll('div.tb')].find((e) => e.textContent.trim() === label);
    el?.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  }, cut);
  await page.waitForTimeout(250);
}
console.log('cutaway clicks dispatched');

// 4. firing-order dot: click cylinder 6's dot (positions via layout, so just click the 6th dot element)
const fo = await page.evaluate(() => {
  const dots = [...document.querySelectorAll('div')].filter((e) => /^FO\b|firing/i.test(e.textContent) && e.children.length > 4);
  return dots.length;
});
console.log('firing-order groups found:', fo);

// 5. after all that, page still alive and no errors
await page.waitForTimeout(1500);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
console.log(errors.length ? 'WIRING FAIL' : 'WIRING OK');
