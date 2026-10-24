/*
 * Smart Visit screenshot runner (temporary tooling).
 *
 * Same headless-Chrome + CDP approach as scripts/shots.mjs so the desktop
 * preview being minimised cannot block the capture. Drives the demo build
 * through the new screens (plan, rewards, crowd overlay, settings toggle,
 * evaluation panel) at 390x844 in RTL and LTR.
 *
 * Usage: node scripts/shots-smart.mjs http://localhost:4173 [outDir]
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const OUT = process.argv[3] ?? 'docs/smart-visit';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9334;
const PROFILE = path.resolve('.chrome-cdp-smart');

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

const click = async (pattern) =>
  evaluate(`(() => {
    const re = ${pattern};
    const nodes = [...document.querySelectorAll('button, a, summary')];
    const hit = nodes.find((el) => re.test((el.textContent || '').trim()) && el.getBoundingClientRect().width > 0);
    if (!hit) return false;
    hit.click();
    return (hit.textContent || '').trim().slice(0, 40);
  })()`);

const clickAria = async (label) =>
  evaluate(`(() => {
    const hit = [...document.querySelectorAll('button')].find(
      (el) => (el.getAttribute('aria-label') || '') === ${JSON.stringify(label)} && el.getBoundingClientRect().width > 0
    );
    if (!hit) return false;
    hit.click();
    return true;
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
    await sleep(800);
  };

  await go('#/plan');
  await shot(`smart-01-plan-input-${suffix}.png`);

  const built = await click('/ابنِ الخطة|Build the plan/i');
  console.log('build plan:', built);
  await sleep(700);
  await shot(`smart-02-plan-result-${suffix}.png`);

  await go('#/rewards');
  await shot(`smart-03-rewards-${suffix}.png`);

  await go('#/map');
  await sleep(600);
  const toggled = await clickAria(lang === 'ar' ? 'طبقة الزحام' : 'Crowd overlay');
  console.log('crowd overlay:', toggled);
  await sleep(500);
  await shot(`smart-04-map-crowd-${suffix}.png`);

  await go('#/settings');
  await sleep(400);
  await evaluate('window.scrollTo(0, document.body.scrollHeight * 0.25); true');
  await sleep(300);
  await shot(`smart-05-settings-${suffix}.png`);

  /* Tall capture of the evaluation section after a real run. */
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 2400, deviceScaleFactor: 1, mobile: true });
  await go('#/debug');
  await sleep(500);
  await evaluate(
    `const b = [...document.querySelectorAll('button')].find((el) => /شغّل التقييم|Run evaluation/.test(el.textContent));
     if (b) b.click();
     true;`
  );
  await sleep(1600);
  await shot(`smart-06-debug-eval-${suffix}.png`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
}

chrome.kill();
await rm(PROFILE, { recursive: true, force: true }).catch(() => {});
process.exit(0);
