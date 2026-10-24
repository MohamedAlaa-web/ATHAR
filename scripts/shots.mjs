/*
 * Redesign screenshot runner (temporary tooling).
 *
 * Headless Chrome + CDP because the desktop preview window can be minimised,
 * which stops the page from being drawn. Drives one page through every
 * redesigned screen in RTL and LTR at 390x844 and writes PNGs to docs/redesign.
 *
 * Usage: node scripts/shots.mjs http://localhost:4173 [outDir]
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const OUT = process.argv[3] ?? 'docs/redesign';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const PROFILE = path.resolve('.chrome-cdp');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
}

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--window-size=390,844',
  'about:blank'
]);

let wsUrl = null;
for (let i = 0; i < 60 && !wsUrl; i += 1) {
  await sleep(250);
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    wsUrl = (await res.json()).webSocketDebuggerUrl;
  } catch {
    /* not up yet */
  }
}
if (!wsUrl) throw new Error('chrome did not expose a debugging target');

const socket = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
const cdp = new Cdp(socket);

const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
const send = (method, params) => cdp.send(method, params, sessionId);

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
});

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

const shot = async (file) => {
  await sleep(450);
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(path.join(OUT, file), Buffer.from(data, 'base64'));
  console.log('wrote', file);
};

/** Clicks the first button/link whose text matches, ignoring hidden ones. */
const click = async (pattern) =>
  evaluate(`(() => {
    const re = ${pattern};
    const nodes = [...document.querySelectorAll('button, a, summary')];
    const hit = nodes.find((el) => re.test((el.textContent || '').trim()) && el.getBoundingClientRect().width > 0);
    if (!hit) return false;
    hit.click();
    return (hit.textContent || '').trim().slice(0, 40);
  })()`);

await mkdir(OUT, { recursive: true });

for (const lang of ['ar', 'en']) {
  await send('Page.navigate', { url: `${BASE}/#/onboarding` });
  await sleep(1200);
  await evaluate(
    `localStorage.setItem('athar-lang', ${JSON.stringify(lang)});
     localStorage.setItem('athar.nav.onboarded', 'true');
     location.reload();`
  );
  await sleep(1800);
  await evaluate('document.fonts.ready.then(() => true)');
  const suffix = lang === 'ar' ? 'rtl' : 'ltr';
  const go = async (hash) => {
    await evaluate(`location.hash = ${JSON.stringify(hash)}; true`);
    await sleep(700);
  };

  await go('#/onboarding');
  await shot(`after-01-onboarding-${suffix}.png`);

  await go('#/map');
  await shot(`after-02-map-idle-${suffix}.png`);

  const started = await click('/ابدأ الجولة|Start simulated tour/i');
  console.log('start tour:', started);
  await sleep(2200);
  await go('#/item/tut-mask');
  await shot(`after-03-artifact-${suffix}.png`);

  await click('/اذهب إلى هنا|Navigate here/i');
  await sleep(1400);
  await shot(`after-04-map-navigating-${suffix}.png`);

  await go('#/search');
  await shot(`after-05-search-${suffix}.png`);

  await go('#/qr');
  await shot(`after-06-qr-${suffix}.png`);

  await go('#/settings');
  await shot(`after-07-settings-${suffix}.png`);

  await go('#/device-check');
  await sleep(300);
  await shot(`after-08-device-check-${suffix}.png`);

  await go('#/debug');
  await sleep(400);
  await click('/٢٧|27 scenarios|سيناريو/i');
  await sleep(2600);
  await shot(`after-09-debug-${suffix}.png`);

  await go('#/admin');
  await shot(`after-10-admin-${suffix}.png`);

  await go('#/print-qr');
  await sleep(1200);
  await shot(`after-11-print-qr-${suffix}.png`);

  /* One tall capture of the evaluation panel so the whole report — chart,
   * per-run table, benchmark — can be reviewed in a single image. */
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 2400, deviceScaleFactor: 1, mobile: true });
  await go('#/debug');
  await sleep(400);
  await evaluate("const b=[...document.querySelectorAll('button')].find(el=>/٢٧|27/.test(el.textContent)); b&&b.click(); true");
  await sleep(2600);
  await shot(`after-09b-debug-full-${suffix}.png`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
}

chrome.kill();
await rm(PROFILE, { recursive: true, force: true }).catch(() => {});
process.exit(0);
