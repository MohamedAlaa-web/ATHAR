/*
 * Offline verification for the demo build (temporary tooling).
 *
 *   node scripts/offline-check.mjs warm    # server up: installs the service worker
 *   <kill the preview server>
 *   node scripts/offline-check.mjs verify  # server down: must render from cache
 *
 * Uses a fixed Chrome profile so the Cache Storage survives between the two
 * runs — that is the whole point of the check.
 */
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const phase = process.argv[2] ?? 'warm';
const BASE = process.argv[3] ?? 'http://localhost:4173';
const PORT = 9444;
const PROFILE = path.resolve('.chrome-offline');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--window-size=390,844',
  'about:blank'
]);

let wsUrl = null;
for (let i = 0; i < 80 && !wsUrl; i += 1) {
  await sleep(250);
  try {
    wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl;
  } catch {
    /* not up yet */
  }
}
if (!wsUrl) throw new Error('chrome did not start');

const socket = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let seq = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
});
const raw = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });

const { targetId } = await raw('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true });
const send = (method, params) => raw(method, params, sessionId);
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

const evaluate = async (expression) => {
  const out = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (out.exceptionDetails) throw new Error(out.exceptionDetails.text);
  return out.result.value;
};

if (phase === 'warm') {
  await send('Page.navigate', { url: `${BASE}/#/map` });
  await sleep(3000);
  const registration = await evaluate(`navigator.serviceWorker.ready.then((r) => r.active.state)`);
  /* One reload: the first document is not controlled, the reload is. */
  await evaluate('location.reload()');
  await sleep(3500);
  const report = await evaluate(`(async () => {
    const keys = await caches.keys();
    const shell = await caches.open(keys.find((k) => k.includes('shell')));
    const entries = (await shell.keys()).map((r) => new URL(r.url).pathname);
    return {
      registration: ${JSON.stringify(registration)},
      controlled: Boolean(navigator.serviceWorker.controller),
      keys,
      entries: entries.length,
      fonts: entries.filter((p) => p.endsWith('.woff2')).length,
      hasIndex: entries.includes('/index.html'),
      hasCss: entries.some((p) => p.endsWith('.css')),
      hasJs: entries.some((p) => p.endsWith('.js'))
    };
  })()`);
  console.log(JSON.stringify(report, null, 2));
} else {
  await send('Page.navigate', { url: `${BASE}/#/map` });
  await sleep(3500);
  const report = await evaluate(`(async () => {
    const faces = [...document.fonts];
    await document.fonts.ready;
    const shown = [...document.querySelectorAll('h1, p, span, button')].filter((el) => el.getBoundingClientRect().height > 0);
    return {
      url: location.href,
      controlled: Boolean(navigator.serviceWorker.controller),
      bodyFont: getComputedStyle(document.body).fontFamily,
      faces: faces.map((f) => ({ family: f.family, status: f.status })),
      allLoaded: faces.every((f) => f.status === 'loaded'),
      plexArabic: document.fonts.check('16px "IBM Plex Sans Arabic"'),
      plexLatin: document.fonts.check('16px "IBM Plex Sans"'),
      naskh: document.fonts.check('16px "Noto Naskh Arabic"'),
      visibleTextNodes: shown.length,
      headline: (document.querySelector('h1') || {}).textContent || null
    };
  })()`);
  console.log(JSON.stringify(report, null, 2));
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile('docs/redesign/after-12-offline-demo.png', Buffer.from(data, 'base64'));
  console.log('wrote docs/redesign/after-12-offline-demo.png');
}

chrome.kill();
process.exit(0);
