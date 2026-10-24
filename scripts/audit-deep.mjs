/*
 * Deep deployment checks (temporary tooling, used for GAP_REPORT.md).
 *
 * 1. Cold open with no storage: which route does "/" land on?
 * 2. 3G first load: transfer size, DOMContentLoaded, load, FCP, LCP.
 * 3. 360x640: horizontal overflow on every route.
 * 4. Service worker: precache contents, then reload with the network disabled
 *    and confirm the app still boots with fonts available.
 * 5. Manifest icons and apple-touch-icon resolve.
 *
 * Usage: node scripts/audit-deep.mjs http://127.0.0.1:4173 docs/audit local
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
const OUT = process.argv[3] ?? 'docs/audit';
const TAG = process.argv[4] ?? 'local';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9335;
const PROFILE = path.resolve('.chrome-deep');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) this.events.push(msg);
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
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--no-default-browser-check', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`, '--window-size=390,844', 'about:blank'
]);

let wsUrl = null;
for (let i = 0; i < 60 && !wsUrl; i += 1) {
  await sleep(250);
  try {
    wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl;
  } catch { /* not up yet */ }
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
const send = (m, p) => cdp.send(m, p, sessionId);

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};

await mkdir(OUT, { recursive: true });
const report = { base: BASE, tag: TAG, at: new Date().toISOString() };

/* 2. 3G timing --------------------------------------------------------- */
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Network.emulateNetworkConditions', {
  offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8
});
const before = cdp.events.length;
await send('Page.navigate', { url: `${BASE}/#/map` });
await sleep(9000);
const navEvents = cdp.events.slice(before);
const bytes = navEvents
  .filter((e) => e.method === 'Network.loadingFinished')
  .reduce((sum, e) => sum + (e.params.encodedDataLength ?? 0), 0);
const requests = navEvents.filter((e) => e.method === 'Network.requestWillBeSent').length;
report.threeG = {
  requests,
  transferredBytes: bytes,
  transferredKB: Math.round(bytes / 1024),
  timing: await evaluate(`(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map(p => [p.name, Math.round(p.startTime)]));
    const lcp = performance.getEntriesByType('largest-contentful-paint').slice(-1)[0];
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      load: Math.round(nav.loadEventEnd || 0),
      firstPaint: paints['first-paint'] ?? null,
      firstContentfulPaint: paints['first-contentful-paint'] ?? null,
      largestContentfulPaint: lcp ? Math.round(lcp.startTime) : null,
      hash: location.hash,
      transferKB: Math.round((performance.getEntriesByType('resource').reduce((sum, r) => sum + (r.transferSize || 0), 0) + (nav.transferSize || 0)) / 1024)
    };
  })()`)
};

/* 1. cold open ---------------------------------------------------------- */
await send('Page.navigate', { url: `${BASE}/` });
await sleep(2500);
await evaluate('localStorage.clear(); sessionStorage.clear(); true');
await send('Page.navigate', { url: 'about:blank' });
await sleep(300);
await send('Page.navigate', { url: `${BASE}/` });
await sleep(3000);
report.coldOpen = await evaluate(`({ hash: location.hash, heading: document.querySelector('h1,h2')?.textContent?.trim().slice(0,80), onboarded: localStorage.getItem('athar.nav.onboarded') })`);

/* 3. 360x640 ----------------------------------------------------------- */
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 1, mobile: true });
report.narrow = {};
for (const route of ['#/onboarding', '#/map', '#/search', '#/item/tut-mask', '#/qr', '#/settings', '#/device-check', '#/admin', '#/print-qr', '#/plan', '#/rewards', '#/debug']) {
  await evaluate(`location.hash = ${JSON.stringify(route)}; true`);
  await sleep(700);
  report.narrow[route] = await evaluate(`(() => {
    const r = document.documentElement;
    return { overflowX: r.scrollWidth > innerWidth + 1, scrollWidth: r.scrollWidth, innerWidth };
  })()`);
}

/* 4. service worker + offline ------------------------------------------ */
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: `${BASE}/#/map` });
await sleep(4000);
report.sw = await evaluate(`(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const keys = await caches.keys();
  const shell = keys.find(k => k.endsWith('-shell'));
  const cache = shell ? await caches.open(shell) : null;
  const urls = cache ? (await cache.keys()).map(r => new URL(r.url).pathname) : [];
  return { scope: reg?.scope ?? null, active: !!reg?.active, keys, cached: urls.sort() };
})()`);

await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await send('Page.reload', { ignoreCache: false });
await sleep(4000);
report.offline = await evaluate(`(async () => {
  await document.fonts.ready;
  const families = [...new Set([...document.fonts].map(f => f.family))];
  const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);
  return {
    booted: !!document.querySelector('main, header, h1'),
    heading: document.querySelector('h1,h2')?.textContent?.trim().slice(0,80) ?? null,
    hash: location.hash,
    fonts: families,
    fontsLoaded: [...new Set(loaded)],
    bodyFont: getComputedStyle(document.body).fontFamily,
    ibmPlexReady: document.fonts.check('16px "IBM Plex Sans Arabic"'),
    naskhReady: document.fonts.check('16px "Noto Naskh Arabic"')
  };
})()`);
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

/* 5. icons ------------------------------------------------------------- */
report.assets = {};
for (const p of ['/manifest.webmanifest', '/icons/athar-192.png', '/icons/athar-512.png', '/icons/athar-maskable-512.png', '/icons/apple-touch-icon.png', '/icons/athar.svg', '/sw.js', '/precache-manifest.json']) {
  const res = await fetch(BASE + p, { redirect: 'follow' });
  report.assets[p] = { status: res.status, type: res.headers.get('content-type') };
}

await writeFile(path.join(OUT, `${TAG}-deep.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

chrome.kill();
await rm(PROFILE, { recursive: true, force: true }).catch(() => {});
process.exit(0);
