/*
 * Audit runner (temporary tooling, used for GAP_REPORT.md).
 *
 * Headless Chrome + CDP, because the desktop preview window can be minimised
 * and then the page is not drawn. Drives one page through every route at
 * 390x844 in RTL and LTR, records:
 *   - console errors / failed requests / third-party hosts
 *   - horizontal overflow and tap targets under 44 px
 *   - Latin-script leftovers in the Arabic UI
 *   - title, meta description, theme-color, manifest link
 *   - service worker controller + cache names, fonts actually loaded
 * and writes a PNG per route plus a JSON summary.
 *
 * Usage: node scripts/audit-live.mjs http://127.0.0.1:4173 <outDir> <tag>
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
const OUT = process.argv[3] ?? 'docs/audit';
const TAG = process.argv[4] ?? 'local';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9334;
const PROFILE = path.resolve('.chrome-audit');

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
      } else if (msg.method) {
        this.events.push(msg);
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
await send('Network.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ' ' + JSON.stringify(result.exceptionDetails.exception?.description ?? ''));
  return result.result.value;
};

const shot = async (file) => {
  await sleep(500);
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(path.join(OUT, file), Buffer.from(data, 'base64'));
};

const go = async (hash) => {
  await evaluate(`location.hash = ${JSON.stringify(hash)}; true`);
  await sleep(600);
};

const pageChecks = () =>
  evaluate(`(() => {
    const root = document.documentElement;
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const small = [];
    for (const el of document.querySelectorAll('button, a, [role="button"], input, select, summary')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) {
        small.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) });
      }
    }
    const latin = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || !visible(parent)) continue;
      const text = node.nodeValue || '';
      const found = text.match(/[A-Za-z][A-Za-z'’-]{2,}/g);
      if (found) found.forEach((w) => latin.add(w));
    }
    const fonts = [];
    for (const f of document.fonts) if (f.status === 'loaded') fonts.push(f.family + ' ' + f.weight);
    return {
      path: location.hash || '#/',
      lang: root.lang,
      dir: root.dir,
      overflowX: root.scrollWidth > window.innerWidth + 1,
      scrollWidth: root.scrollWidth,
      innerWidth: window.innerWidth,
      smallTargets: small,
      latin: [...latin].sort(),
      title: document.title,
      themeColor: document.querySelector('meta[name="theme-color"]')?.content ?? null,
      description: document.querySelector('meta[name="description"]')?.content ?? null,
      manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? null,
      bodyFont: getComputedStyle(document.body).fontFamily,
      fontsLoaded: [...new Set(fonts)],
      swController: !!navigator.serviceWorker?.controller,
      heading: document.querySelector('h1, h2')?.textContent?.trim().slice(0, 60) ?? null
    };
  })()`);

await mkdir(OUT, { recursive: true });

const summary = { base: BASE, tag: TAG, capturedAt: new Date().toISOString(), routes: {}, network: {}, boot: {} };

for (const lang of ['ar', 'en']) {
  await send('Page.navigate', { url: `${BASE}/#/onboarding` });
  await sleep(1500);
  await evaluate(`localStorage.setItem('athar-lang', ${JSON.stringify(lang)});
    localStorage.setItem('athar.nav.onboarded', 'true');
    location.reload();`);
  await sleep(2500);
  const suffix = lang === 'ar' ? 'rtl' : 'ltr';

  if (lang === 'ar') {
    summary.boot = await pageChecks();
    const caches = await evaluate(`caches.keys()`);
    summary.boot.caches = caches;
    const regs = await evaluate(`navigator.serviceWorker.getRegistrations().then(r => r.map(x => x.scope))`);
    summary.boot.registrations = regs;
  }

  const routes = ['#/onboarding', '#/map', '#/search', '#/item/tut-mask', '#/qr', '#/settings', '#/device-check', '#/admin', '#/print-qr', '#/plan', '#/rewards', '#/debug'];
  for (const route of routes) {
    await go(route);
    if (route === '#/debug') await sleep(1200);
    if (route === '#/print-qr') await sleep(1400);
    const name = route.replace('#/', '').replace(/\//g, '-') || 'map';
    await shot(`${TAG}-${name}-${suffix}.png`);
    summary.routes[`${name}-${suffix}`] = await pageChecks();
  }

  // a navigation flow, for the live behaviour checks
  if (lang === 'ar') {
    await go('#/item/tut-mask');
    const clicked = await evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find(el => /اذهب|Navigate/i.test(el.textContent || '') && el.getBoundingClientRect().width > 0);
      if (!b) return false;
      b.click();
      return true;
    })()`);
    summary.navStart = clicked;
    await sleep(1500);
    await shot(`${TAG}-13-route-rtl.png`);
    summary.routes['route-rtl'] = await pageChecks();
  }
}

const networkEvents = cdp.events.filter((e) => e.method === 'Network.requestWillBeSent');
const hosts = {};
for (const e of networkEvents) {
  try {
    const h = new URL(e.params.request.url).host;
    hosts[h] = (hosts[h] ?? 0) + 1;
  } catch {
    /* data: urls */
  }
}
const failed = cdp.events.filter((e) => e.method === 'Network.loadingFailed').map((e) => e.params.errorText);
const consoleErrors = cdp.events
  .filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
  .map((e) => e.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
const logErrors = cdp.events.filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error').map((e) => e.params.entry.text.slice(0, 200));
summary.network = { hosts, failed: [...new Set(failed)], consoleErrors: [...new Set(consoleErrors)], logErrors: [...new Set(logErrors)] };

await writeFile(path.join(OUT, `${TAG}-audit.json`), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ tag: TAG, boot: summary.boot, network: summary.network, routes: Object.fromEntries(Object.entries(summary.routes).map(([k, v]) => [k, { overflowX: v.overflowX, small: v.smallTargets.length, latin: v.latin.length, heading: v.heading }])) }, null, 2));

chrome.kill();
await rm(PROFILE, { recursive: true, force: true }).catch(() => {});
process.exit(0);
