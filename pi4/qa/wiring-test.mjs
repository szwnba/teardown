// Wiring test for pi4-live.html: the boot model is the one source — feed the live page boot times through
// window.LIVE, then read the panel DOM (data-qa hooks) and compare against boot(t) computed locally from
// the same source file. Also checks the teardown detent readouts and the phase strip highlight.
// Usage: node wiring-test.mjs [page.html]
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire('/home/johnson/.agents/skills/teardown/node_modules/x.js');
const {chromium} = require('playwright');

const here = '/home/johnson/.agents/skills/teardown/sims/pi4-shared';
const {boot, DETENTS} = await import(`file://${here}/boot.js`);
const file = path.resolve(process.argv[2] ?? '/home/johnson/.agents/skills/teardown/teardown-out/dist/pi4-live.html');
const browser = await chromium.launch({
  executablePath: '/home/johnson/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome',
  args: ['--force_high_performance_gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars'],
});
const page = await browser.newPage({viewport: {width: 1600, height: 900}});
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
await page.goto('file://' + file);
await page.waitForFunction(() => window.LIVE && document.querySelector('canvas'), null, {timeout: 180000});
await page.waitForTimeout(1500); // let the live loop tick and the console redraw

const fails = [];
const approx = (a, b, tol) => Math.abs(a - b) <= tol;

for (const t of [0.1, 0.5, 2, 4.5, 10, 12.5, 16.5, 19.5]) {
  await page.evaluate((tt) => {
    window.LIVE.takeOver();
    window.LIVE.setPlaying(false); // freeze the clock so the DOM and the model compare the same instant
    window.LIVE.setBoot(tt);
  }, t);
  await page.waitForTimeout(300); // a couple of frames so update() has redrawn
  const dom = await page.evaluate(() => {
    const q = (k) => document.querySelector(`[data-qa="${k}"]`)?.textContent ?? '';
    return {
      clock: q('clock'),
      phase: q('phase'),
      temp: q('temp'),
      amps: q('amps'),
      watts: q('watts'),
      phaseOn: [...document.querySelectorAll('.ph')].findIndex((p) => p.style.borderColor && p.style.borderColor !== 'rgb(225, 227, 230)'),
    };
  });
  const b = boot(t);
  const checks = [
    ['boot clock', approx(parseFloat(dom.clock), t, 0.15), `"${dom.clock}" want ${t.toFixed(1)} s`],
    ['phase name', dom.phase === b.phase.zh, `"${dom.phase}" want "${b.phase.zh}"`],
    ['phase strip', dom.phaseOn === b.phaseI, `dom=${dom.phaseOn} want ${b.phaseI}`],
    ['temperature', approx(parseFloat(dom.temp), Math.round(b.temp), 1), `${dom.temp} want ${Math.round(b.temp)}°`],
    ['amps', approx(parseFloat(dom.amps), b.amps, 0.03), `${dom.amps} want ${b.amps.toFixed(2)}`],
    ['watts', approx(parseFloat(dom.watts), b.watts, 0.3), `${dom.watts} want ${b.watts.toFixed(1)}`],
  ];
  for (const [name, ok, why] of checks) if (!ok) fails.push(`t=${t} ${name}: ${why}`);
  console.log(`t=${t} ${b.phase.zh} clock="${dom.clock}" temp=${dom.temp} ${dom.amps}/${dom.watts} ${checks.every((c) => c[1]) ? 'OK' : 'FAIL'}`);
}

// teardown detents: set u at each detent, read the slider value label
for (const d of DETENTS) {
  await page.evaluate((v) => {
    window.LIVE.takeOver();
    window.LIVE.setU(v);
  }, d.k);
  await page.waitForTimeout(250);
  const label = await page.evaluate(() => document.querySelector('[data-qa="detent"]')?.textContent ?? '');
  if (label !== d.zh) fails.push(`u=${d.k} detent: "${label}" want "${d.zh}"`);
  else console.log(`u=${d.k} → ${label} OK`);
}

console.log('page errors:', errors.length ? errors.slice(0, 4) : 'none');
await browser.close();
if (fails.length) {
  console.log('WIRING FAIL');
  for (const f of fails) console.log('  ✗', f);
  process.exit(1);
}
console.log('WIRING OK');
