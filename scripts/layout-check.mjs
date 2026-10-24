/*
 * Layout audit (temporary tooling): for every navigation route, at 390x844 and
 * 360x640, report horizontal overflow and any interactive target under 44 px.
 *
 *   node scripts/layout-check.mjs http://localhost:4173
 */
import { spawn } from 'node:child_process';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const PORT = 9555;
const PROFILE = path.resolve('.chrome-layout');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--disable-extensions',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
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

const evaluate = async (expression) => {
  const out = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (out.exceptionDetails) throw new Error(out.exceptionDetails.text);
  return out.result.value;
};

const ROUTES = [
  '#/onboarding',
  '#/map',
  '#/search',
  '#/item/tut-mask',
  '#/qr',
  '#/settings',
  '#/device-check',
  '#/debug',
  '#/admin',
  '#/print-qr',
  '#/nope'
];

const audit = `(() => {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const offenders = [...document.querySelectorAll('*')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > vw + 1 || r.left < -1);
    })
    .slice(0, 4)
    .map((el) => el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ').slice(0, 2).join('.'));
  const smallTargets = [...document.querySelectorAll('button, a, input, [role="switch"]')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.height < 44;
    })
    .map((el) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 28) + ' h=' + Math.round(el.getBoundingClientRect().height));
  return { vw, scrollWidth: doc.scrollWidth, hScroll: doc.scrollWidth > vw + 1, offenders, smallTargets: smallTargets.slice(0, 6), smallCount: smallTargets.length };
})()`;

for (const [w, h] of [
  [390, 844],
  [360, 640]
]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true });
  console.log(`\n=== ${w}x${h} ===`);
  for (const route of ROUTES) {
    await send('Page.navigate', { url: `${BASE}/#/onboarding` });
    await sleep(600);
    await evaluate(`localStorage.setItem('athar.nav.onboarded', 'true'); location.hash = ${JSON.stringify(route)}; true`);
    await sleep(900);
    const result = await evaluate(audit);
    const flag = result.hScroll ? 'H-SCROLL' : 'ok      ';
    console.log(`${flag} ${route.padEnd(16)} sw=${result.scrollWidth} small=${result.smallCount}`);
    if (result.hScroll) console.log('   offenders:', result.offenders.join(' | '));
    if (result.smallCount) console.log('   under 44px:', result.smallTargets.join(' | '));
  }
}

chrome.kill();
process.exit(0);
