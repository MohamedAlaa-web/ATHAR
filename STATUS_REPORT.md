# ATHAR (أثر) — Status Report

Indoor navigation prototype for the Grand Egyptian Museum demo.
Build date: 2026-10-24 · Stack: React 18 + Vite 5 + TypeScript + Tailwind · HashRouter · PWA.
Everything below was run in this workspace unless explicitly marked **UNVERIFIED**.

## 0.1 What changed on 2026-10-24

1. **The virtual walker follows the active route.** A new `walkRoute()` starts or
   re-aims the simulated visitor at a freshly computed route from its current
   position; re-routes no longer teleport it back to the route start. The map has
   a **Walk the route / Free walk** switch and a 0.3–2.0 m/s speed slider. Choosing
   a destination while the tour runs now switches the walker to the route; **Free
   walk** remains an explicit option and suppresses deviation re-routes.
2. **Fonts are self-hosted** via `@fontsource-variable` packages (Inter, Cormorant
   Garamond, Noto Sans Arabic, Noto Naskh Arabic; 7 woff2 subsets, ~427 KB). There
   are no requests to `fonts.googleapis.com` or `fonts.gstatic.com`.
3. **The service worker precaches the whole build.** A Vite plugin emits
   `precache-manifest.json` from the real bundle and stamps a per-build hash into
   the worker's cache version. Shell, icons, JS, CSS and every font file are cached
   on install; the 2026-10-24 offline test cold-started the app (including the new
   Device check page and the QR self-test) with the origin server down.
4. **PNG PWA icons:** 192, 512, 512 maskable (80 % safe zone) and a 180 px
   apple-touch-icon, generated from the ATHAR eye mark; the manifest and
   `index.html` now point at them. Install prompts themselves remain **UNVERIFIED**.
5. **Device check screen** (Settings → Device check, `#/device-check`): camera
   permission and real frame reads, an in-page jsQR decode of the demo code, a real
   camera decode if a code is shown, DeviceMotion availability plus the iOS
   permission result, and a live accelerometer / orientation / step / heading
   readout. It cannot pass a sensor row without events actually received.
6. **Deployed and live (demo build):**
   <https://site-d80a508dd53040aca99977a7dc55c6f0.freebuff.page> — the 1.1 MB
   demo bundle on Freebuff Sites (Cloudflare Workers static assets), HTTPS, 0
   console errors, service worker active with scope `/`. Because no
   Vercel/Netlify account or CLI was connected, this host was used instead;
   `vercel.json` and `netlify.toml` both build `npm run build:demo` into `dist`
   with the same cache headers, so moving the demo to those accounts needs no
   code change. Caveat: the host injects Cloudflare Web Analytics
   (`static.cloudflareinsights.com` + `/cdn-cgi/rum`) at the edge — platform
   code, not the app, which still makes no network calls (D-30).
7. **No estimator parameters were changed.** The scenario matrix still measures
   **94.6 %** hall accuracy at low crowd and is reported as a miss of the 95 % target.
8. **The debug panel says when its numbers are stale** (B-01 fixed): with tracking
   paused, stopped or never started, the live-metrics card shows a **"PAUSED -
   values are stale"** badge plus an explanatory line and dims all three metric
   blocks; while the simulator or motion source runs it shows "● LIVE" undimmed.
   Both states were observed in-browser.
9. **The scenario runner reports QR resets.** Every run records each QR fix with
   its time (`qrResets`, `qrResetCount`, `qrArtifactResetCount`); the per-run
   table, the config comparison, the JSON and the CSV (26 columns) all show them.
   Which configs include QR and how events are scheduled is stated explicitly in
   §2.1.
10. **Printable QR sheet at `#/print-qr`:** real QR codes for every payload the
    scanner accepts — entrance + 6 halls + 10 artifacts (17 codes) — each labelled
    Arabic and English, 6 per A4 page (3 pages), with a print button that hides
    the on-screen chrome. All 17 codes were decoded back with the app's own jsQR
    build.
11. **Demo build (`VITE_DEMO_BUILD=1`, `npm run build:demo`):** compiles the
    legacy routes out of `App.tsx`, hides the legacy links in Settings, and skips
    `public/assets/` (40 MB, incl. the 33 MB legacy media) when copying into
    `dist/` — **1.08 MB in 20 files instead of 41 MB**. `--mode demo` alone is
    enough to enable the whole flag, so a CI checkout without `.env.demo` cannot
    fall back to the 41 MB bundle (both runs produce the same JS hash). This is
    the bundle `vercel.json` and `netlify.toml` build. Documented in
    `DEPLOY.md`; the offline test passes on both builds. The default
    `npm run build` is unchanged.

## 0.2 Visual redesign pass — museum signage (2026-10-24)

A skin-only pass over the navigation app, done the day before the demo with the tree tagged
`demo-safe` first. Positioning, routing, scenario code, tests and data were not touched.
Full plan, tokens and the banned-list review: [`DESIGN_NOTES.md`](DESIGN_NOTES.md).

- **Tokens.** Stone `#E9E8E3`, surface `#FFFFFF`, ink `#1C2128`, lapis `#2A4BA0`,
  carnelian `#B4382B`, ochre `#8F5A10`, malachite `#2C7A58`; scale 13/15/17/22/30 px at
  400/500/600; radii 6/12/full; one shadow token used only by the banner and the sheet;
  Lucide at 1.5 px. Every text/background pair measures ≥ 4.5:1 (ink on stone 13.19:1).
- **Type.** IBM Plex Sans Arabic + IBM Plex Sans, self-hosted through `@fontsource` and
  precached; Noto Naskh Arabic for long-form artifact copy (17 px / 1.8, 66-character
  measure). Cormorant Garamond no longer appears in the navigation UI. Eight woff2 files,
  **326 KB total** (budget 450 KB).
- **Map.** Full-bleed floor plan; the one loud element is the instruction banner — ink bar,
  large turn glyph, distance in tabular numerals, instruction, hall underneath. One bottom
  sheet with peek / half / full holds search, destination, route summary and nearby
  artifacts. No floating card stacks.
- **Debug panel** is an instrument report: dense aligned tables with units (m, %, Hz, ms),
  a single-colour chart with direct labels instead of a legend (`ScenarioChart`), seven
  columns on a 390 px screen so nothing scrolls sideways, and the LIVE /
  **PAUSED - values are stale** badge kept (B-01).
- **Fixed on the way:** the legacy 404 (dark gradient, gold button) that a stray legacy URL
  could still open inside the nav shell is now a plain navigation page
  (`src/nav/pages/NotFoundNavPage.tsx`); the print-QR sheet no longer overflows a phone
  screen sideways (it renders at ~45 % scale, still A4 at 100 % when printed).
- **Evidence.** `docs/redesign/` — 390×844 captures of every redesigned screen in RTL and
  LTR, a tall debug capture, and the demo build running offline with the server killed
  (`after-12-offline-demo.png`: 8/8 fonts loaded). Honest gap: a *before* frame exists only
  for map, QR and debug, because the old shell was never committed.

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | **99 passed** / 10 files (unchanged) |
| `npm run build` | ok |
| `npm run build:demo` | ok — `dist/` **1.1 MB**, 20 files |
| Fonts | 8 woff2, **326 KB**, all in the service-worker precache |
| Offline (demo build, origin killed) | boots from cache; IBM Plex Sans Arabic + Noto Naskh `loaded` |
| Layout at 390×844 and 360×640 | no horizontal scroll; no sub-44 px targets outside the switch knob |

## 0.3 Deployed-site audit and fixes (2026-10-24, evening)

Trigger: the URL that had been handed out for the demo,
`site-b4b421f6246446ccb30d009077a444df`, started returning **HTTP 503
`Site temporarily unavailable`**, and the older production URL was found serving the
pre-redesign (dark/gold) build. The full audit — every requirement with PASS / PARTIAL /
FAIL / UNVERIFIED, evidence and severity — is in [`GAP_REPORT.md`](GAP_REPORT.md); this is
the short version.

| Area | Before the pass | After the pass |
| --- | --- | --- |
| Public demo URL | 503 (the old production URL served the pre-redesign build) | <https://site-d80a508dd53040aca99977a7dc55c6f0.freebuff.page> — current demo build, published, `index-D1E0RQ9p.js` |
| `theme-color` / manifest colours | `#080B10` (near-black) over a light stone UI; manifest name “الحديقة المتحفية” | `#E9E8E3` in `index.html` and the manifest; name “أثر · ATHAR — تنقّل داخل المتحف” |
| English leftovers in the Arabic UI | 42 Latin tokens on Settings alone; debug operator labels in English; English footer, QR `frames`, suggestion `min`, print-sheet paragraph | Arabic copy for all of them; remaining Latin tokens are proper nouns (BLE, PSSR, jsQR, iOS, DeviceMotion, GEM codes), the bilingual artifact title, and the print sheet's deliberate Arabic+English labels |
| Banned middle-dot meta strings | banner hall line, route summary `6 · 38.2 م · 1.50 م/ث`, debug `active route… · simulator…`, `27 runs · 77 ms · seed 2026`, map accuracy, crowd title | split into labelled lines/spans with no middle dots |
| Tap targets < 44 px | 1–4 per screen (map search link 32 px, search chips 28–38 px, crowd/pause buttons 39 px, range inputs 16 px) | **0** across 25 route captures at 390×844 and 360×640 |
| Settings duplicate heading | “الإعدادات” small label above the identical H1 | single H1 |
| Console errors / failed requests | 0 | 0 on the live URL (25 route captures) |
| Cold open | onboarding | onboarding (`#/onboarding`, empty storage) |
| Offline (network disabled) | worked | works — 18 precached entries, Arabic font ready, shell renders |
| First load, throttled 3G (1.6 Mbps, 150 ms) | not measured | **414 KB transferred**, FCP 2.43 s, DOMContentLoaded 2.16 s (emulated, empty profile — a lower bound, not field data) |

**Deployment.** The old Sites project is not listable from this account (`sites_list` is
empty), so the broken URL could not be republished; a fresh Freebuff Sites project
`cfe9686f-1128-46d7-9301-c554b1231e3d` was created, deployed from `npm run build:demo`
(`dist/` 1.1 MB / 21 files) and published on the preview environment. Live checks after
deploy: `/`, `sw.js`, `precache-manifest.json`, `manifest.webmanifest` and all icons 200;
`/legacy`, `/scan`, `/media-admin`, `/assets/nope.js` 404; service worker active with 18
cached entries; navigation, search, demo QR (`تم تأكيد الموقع`), visit planner (10 stops
of 90 min) and rewards all exercised in the browser at 390×844.

**Still UNVERIFIED:** camera permission and QR decoding on a phone, iOS DeviceMotion
permission, the PWA install prompt, and the visual behaviour of the Android/iOS status
bar with the new light `theme-color`. **Still open (P2, cosmetic):** hall names crowd the
walls on the floor plan at 390 px; the artifact page keeps its English title as a
secondary line (bilingual museum convention, Arabic is primary); Admin shows internal
hall ids in the coordinate note.

**Safety:** work is on branch `audit/deployed-gap`, tag `demo-safe` plus a source copy in
`.backup-audit/`. No estimator parameter, routing rule, scenario result, test assertion or
museum data was changed in this pass.

## 0. How to run and verify

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 15 files / 134 tests
npm run build      # tsc -b && vite build → dist/ (static)
npm run build:demo # demo build: legacy routes + 40 MB legacy media out of dist/
npm run preview    # serves dist/, e.g. http://localhost:4173
npx vite-node scripts/run-scenarios.ts   # rewrites docs/scenario-results.json + prints tables
```

The new app is at `/` (Arabic default). Debug panel: `http://localhost:4173/?debug=1`
(also `#/debug`). Printable QR sheet: `#/print-qr` (17 codes, 6 per A4 page).
Legacy prototype pages remain at `/legacy`, `/scan`, `/positioning`, `/print` in the
default build (see D-11 in `DEVIATIONS.md`); a demo build compiles them out (D-27).

### Verification log (actually executed)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit -p tsconfig.json` | exit 0, no diagnostics (2026-10-24, after all changes) |
| `npx vitest run` | 10 files, **99/99 tests passed** (rssi 5, trilateration 4, Kalman 6, map matching 7, navigation 14, route-following 5, scenario 6, export 2, legacy positioning 34, app/data 16) |
| `npm run build` | success. JS 663.56 kB (218.96 kB gzip), CSS 47.73 kB (10.50 kB gzip), plus 7 self-hosted fonts (~427 KB) precached. `dist/` also contains the 33 MB legacy media library, unused by the nav app. |
| `npm run build:demo` | success. `dist/` **1.2 MB** (vs 41 MB): no `assets/media`, **zero** legacy route/page strings in the JS bundle, JS 567.93 kB (192.41 kB gzip); SW stamped, precache manifest 9 entries. Default build unaffected. |
| Scenario script | 27 runs in **66 ms** on regeneration (125–131 ms on earlier runs, Node 24, win32); same 94.6 % / 1.73 m / 1.83 m numbers — the estimator was not retuned; the JSON now also carries per-run `qrResets` |
| Browser flow (Chrome desktop, 390×844) | onboarding → simulated tour → map → route → **Walk the route / Free walk / speed slider** → artifact → QR → Settings → **Device check** → debug → admin |
| Device check | QR self-test **PASS** (`320×320 · ATHAR:GEM-ENTRANCE`, in-page jsQR); camera row stayed **waiting** for a permission prompt this environment never answers (no pass claimed); DeviceMotion row **FAIL** with 0 accelerometer events and heading "no events" — never a fake pass |
| Fonts | Network log on a fresh production load shows only `/assets/*.woff2`; **no Google Fonts request**. `document.fonts` reports Inter, Cormorant Garamond and Noto Sans Arabic loaded |
| Icons | `athar-192.png` 192×192, `athar-512.png` 512×512, `athar-maskable-512.png` 512×512, `apple-touch-icon.png` 180×180; all served 200 and visually checked |
| Offline test (2026-10-24) | origin killed (PID confirmed), page reloaded: shell, CSS, JS, fonts, icons and the Device check QR self-test all ran from the service-worker cache with the server down |
| Offline test, demo build (2026-10-24) | `build:demo` → preview :4180, SW installed 17 entries, server killed (PID 8936, curl 000): `#/print-qr` hard-reloaded from cache — 3 pages / 17 QR images, fonts 200 |
| Offline test, full build (2026-10-24) | preview :4181, SW installed, server killed (PID 21076, no listener): `location.reload()` re-rendered fully from the service-worker cache |
| Print QR sheet (`#/print-qr`) | 17 codes (entrance + 6 halls + 10 artifacts), 3 A4 pages (6/6/5), AR+EN labels; **17/17 decoded back** with the app's jsQR build, payload matched the label exactly |
| Debug stale badge (B-01) | stopped → "PAUSED - values are stale" + all 3 metric blocks dimmed; simulator running → "● LIVE" undimmed (LIVE observed with a temporary `visibilityState` override because the preview tab is hidden, then restored) |
| Static deployment (local) | `npm run build` + `vite preview` from `/` (no subpath); `DEPLOY.md` added |
| **Live deployment** (2026-10-24, re-deployed after the audit) | <https://site-d80a508dd53040aca99977a7dc55c6f0.freebuff.page> — `/`, `sw.js`, `precache-manifest.json`, `manifest.webmanifest`, both hashed assets and 5 icons all 200 with correct types; `/assets/nope.js`, `/legacy`, `/scan`, `/media-admin` → 404; app boots AR/RTL, SW active (scope `/`, **18/18** cached entries), simulator runs on `#/map`, `#/print-qr` **17/17** codes, 0 console errors on 25 route captures, 0 horizontal scroll and 0 sub-44 px targets. Retired: `site-b4b421f6246446ccb30d009077a444df` (HTTP 503 since 18:06 UTC) and `site-b8449cdc44cf48288cbc83f01b3405b5` (still 200 but the pre-redesign build). |
| Demo deploy config (2026-10-24) | `vercel.json` + `netlify.toml` set `npm run build:demo` → `dist`; that command rebuilt from a clean `dist/` to **1.08 MB / 20 files**, no `assets/media`, no legacy strings; served from `vite preview` :4182 with 9/9 precached assets, 0 console errors, `#/print-qr` 17/17 codes, `#/print` → not found |
| Privacy | no `fetch` / `XMLHttpRequest` / `sendBeacon` anywhere in `src/`; no backend; no third-party font/CDN request at runtime |

## 1. Feature table

### Positioning (`src/positioning/core/`, pure TypeScript)

| Feature | Status | Evidence |
| --- | --- | --- |
| RSSI → distance (log-distance, per-beacon txPower/pathLoss) + moving-average smoothing | **Done** | `rssi.test.ts` (5) |
| Weighted least-squares trilateration from the strongest 4 beacons, robust residual trimming | **Done** | `trilateration.test.ts` (4) |
| PDR: step detection + heading → displacement | **Partial** | Code and tests run; real-device step/heading behaviour **UNVERIFIED** (no phone sensor in the build environment). The simulator injects synthetic steps through the same API. |
| Kalman fusion (constant velocity, per-source model noise) | **Done** | `kalman.test.ts` (6) + scenario matrix |
| Map matching to walkable rectangles (no walking through walls) | **Done** | `mapMatching.test.ts` (7) |
| QR reset (position set, uncertainty collapsed) | **Done** | UI verified: radius **1.0 m**, confidence **88 %**, source "QR confirmed" after applying `ATHAR:GEM-A-01`. Runner-level behaviour covered by `scenario.test.ts` (2 tests); engine-level `confirmQr` still untested directly (D-23). |
| Output `{x, y, floor, hall, confidence, accuracyRadiusMeters, source}` every update | **Done** | `engine.ts`, live debug panel |
| SimulatedSource: noisy BLE from virtual beacons, Gaussian noise, dropouts, crowd low/medium/high | **Done** | 27-run deterministic matrix, seed 2026 |
| Simulated walker follows a route, a fresh route after rerouting, and an optional free-walk loop; 0.3–2.0 m/s speed | **Done** | `followPath.test.ts` (5) plus in-browser movement and arrival; no teleport on reroute (D-20 closed) |
| QrSource: real camera decode (jsQR, ~3.8 fps while the sheet is open, stream stopped on decode/close) | **Partial** | Code path and error states implemented; **UNVERIFIED on a physical camera**. The labelled demo-code path is verified end to end. |
| MotionSource: DeviceMotion/DeviceOrientation, iOS permission prompt, honest fallback | **Partial** | Permission code + no-sensor fallback verified on desktop (explicit "no accelerometer data" message, no fake "live"). **UNVERIFIED on a phone.** |
| ManualSource: tap the map to place the visitor | **Done** | Tapped map → hall "Ceremonial Corridor", radius 2.2 m, confidence 72 %, source "Manually placed" |
| BleSource stub + documented `NativeBleBridge` interface | **Done (stub, by design)** | Reports `native-only`; never fabricates a position |

### Navigation (`src/navigation/`)

| Feature | Status | Evidence |
| --- | --- | --- |
| A* from nearest graph node to target, weighted edges, multi-floor | **Done** | 14 navigation tests; cross-floor route with stairs instruction |
| "Avoid stairs" accessible option | **Done** | Test rejects stairs-only and reports unreachable instead of inventing an elevator (D-15) |
| Turn-by-turn instructions in AR/EN, distances included | **Done** | Tests + live banner ("turn back now", next maneuver, remaining metres) |
| Automatic re-route when >4 m off route | **Done** | Implemented with 2.5 s throttle; the walker re-joins the new route from its own truth. Suppressed in Free walk, where being off-route is intentional |
| Arrival detection + "you have arrived" state | **Done** | Observed: arrival card at Hatshepsut, tracking stopped |
| Low-confidence prompt to scan the nearest QR | **Done** | Observed at 54 % confidence / 4.9 m radius: "Position uncertain… scan Narmer Palette" |

### UI (`src/nav/`)

| Screen / feature | Status | Evidence |
| --- | --- | --- |
| Onboarding: language, privacy/permission explanation, entrance QR, simulated tour, manual fallback | **Done** | Walked all three paths |
| Map: blue dot, accuracy circle, route polyline, target marker, floor switcher, current hall, instruction banner, pause/resume tour, **walker mode switch + speed slider** | **Done** | Visual + DOM verification at 390×844; speed slider persisted `walkSpeedMps: 2` and moved the dot faster |
| Search by name, hall, category; recent items; distance from current estimate | **Done** | Recents section appeared after opening an artifact; 10 results with distances |
| Artifact page: info, placeholder content label, placeholder "cinematic experience" panel, QR scan link, "go here" | **Done** | Visited Hatshepsut page; routing started from it |
| Settings: language, accessible route, low-power, source switching, crowd level, privacy, BLE honesty note, reset, **Device check link** | **Done** | Link resolves to `#/device-check`; low-power → scan interval 2000 ms |
| Device check: camera permission, in-page demo QR decode, real camera decode, DeviceMotion + iOS permission, live step/heading readout | **Done** (hardware unverified) | QR self-test passes; camera stayed waiting for an unanswered prompt; motion row fails honestly with 0 events; see §3 B-12 |
| Arabic default with instant English toggle (RTL ↔ LTR) | **Done** | `dir` switched `rtl`→`ltr`, `lang` `ar`→`en`, UI translated |
| QR screen: real camera button, permission/secure-context errors, generated demo codes | **Done** (camera hardware unverified) | Demo code applied and labelled "demo code" |
| Printable QR sheet `#/print-qr`: 17 real codes (entrance + 6 halls + 10 artifacts), AR/EN labels, 6 per A4 page, scoped `@page A4` print CSS | **Done** | 17/17 jsQR round-trip in-browser; 3 pages rendered (6/6/5); URL-addressed only (no nav link) |
| PWA: manifest, standalone display, PNG + maskable + apple-touch icons, precached offline shell and fonts | **Partial** | Offline cold start verified with the server down; icons served and visually checked; actual Android/iOS install still **UNVERIFIED** |

### Debug / evaluation panel (most important for the presentation)

| Feature | Status | Evidence |
| --- | --- | --- |
| Open with `?debug=1` (no hidden gesture, D-01) | **Done** | URL honoured on hash routes |
| Ground truth (simulator) vs estimate, live error in metres, floor map with beacons + route | **Done** | Live: truth (17.4, 17.6) vs estimate (17.4, 21.5), error 3.93 m |
| Mean / median / p95 error, hall accuracy, nearest-artifact accuracy, update rate, readings used, scan interval | **Done** | Live session values in §2.3 |
| Battery proxy: sensor activations/min, estimator ops/min, scan interval | **Done** | Labelled as a workload proxy, not a battery percentage |
| Scenario runner: 3 paths × 3 crowds × 3 configs = 27 runs, table + bar chart, **QR-reset count and event times per run** | **Done** | In-browser: 27 runs / **125 ms**, deterministic seed 2026; summary shows QR avg 1 / 1 / 4.33, per-run rows list count + times |
| Export JSON and CSV | **Done** | JSON 27 runs incl. `qrResets`; CSV 28 lines × **26** columns (`qr_reset_count`, `qr_artifact_reset_count`, `qr_reset_times_sec`, `qr_reset_events`) |
| Compare configs: BLE only / BLE+PDR / full fusion + QR | **Done** | Config summary table below |
| Stale-metrics badge (B-01): "PAUSED - values are stale" + dimmed metrics when tracking is stopped | **Done** | Both states observed in-browser: stopped → badge + 3 blocks at 40 % opacity; running → "● LIVE" undimmed |

### Admin (P2)

| Feature | Status | Evidence |
| --- | --- | --- |
| Aggregated anonymous hall density (simulated) | **Done** | Seeded counts per hall with capacity percentages |
| Toggle "hall closed", graph updates, live re-route | **Done** | Closed the corridor: route recomputed to 12.9 m / 4 points / 0.10 ms with a "corridor closed" notice; reopen restored it |
| Move an artifact's coordinates (walkable-area validation) | **Done** | Applied (12, 10) to Narmer Palette → "Saved locally for this demo." |

### Not done (and not claimed)

- Real BLE scanning (browser-impossible; stub only, as specified).
- Deployment on a Vercel or Netlify account of our own (configs are committed and
  untested against those services), and a custom domain: the live demo uses the
  Freebuff-issued `*.freebuff.page` URL. Public-origin **install to home screen**
  on Android/iOS and the phone camera test are still unverified on the live URL.
  See D-29/D-30 for the host choice and its analytics beacon.
- Native app, AR, accounts, video generation (explicitly out of scope).
- Hardware validation of camera QR, PDR and iOS permission flows (Device check now gives
  the reviewer a screen to record this, but it has not been run on a phone).
- Automated UI/e2e tests, service-worker tests and camera-lifecycle tests.

## 2. Measured results

All numbers below are produced by the code in this repository. Source artifact:
[`docs/scenario-results.json`](docs/scenario-results.json) (regenerated 2026-10-23T23:05:45Z,
seed 2026, Node v24.18.0, 27 runs). No estimator parameter changed on 2026-10-24: the
error metrics are the same measurement as the previous run — the only new content is the
per-run `qrResets` fields (counts and event times).

### 2.1 Scenario matrix (3 fixed paths × 3 crowd levels × 3 configurations)

Mean error by configuration and crowd (metres):

| Config | Crowd | Mean | Median | p95 | Hall acc. | Nearest artifact | Update Hz | Readings used | Act./min | CPU ops/min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BLE only | low | 3.27 | 2.94 | 6.23 | 93.3 % | 86.4 % | 0.87 | 3.47 | 60.0 | 52.1 |
| BLE only | medium | 6.01 | 5.59 | 12.05 | 86.2 % | 61.7 % | 0.87 | 3.47 | 60.0 | 52.1 |
| BLE only | high | 8.44 | 8.45 | 15.26 | 71.3 % | 48.8 % | 0.87 | 3.45 | 60.0 | 52.1 |
| BLE + PDR | low | 2.82 | 2.54 | 6.68 | 93.4 % | 87.4 % | 2.81 | 3.47 | 176.2 | 168.3 |
| BLE + PDR | medium | 4.89 | 4.76 | 8.75 | 75.0 % | 76.2 % | 2.81 | 3.47 | 176.2 | 168.3 |
| BLE + PDR | high | 4.79 | 4.03 | 10.38 | 79.7 % | 75.8 % | 2.81 | 3.45 | 176.2 | 168.3 |
| **Full fusion + QR** | **low** | **1.73** | **1.61** | **4.02** | **94.6 %** | **91.6 %** | **2.86** | **3.47** | **176.2** | **168.3** |
| Full fusion + QR | medium | 1.78 | 1.68 | 3.26 | 92.0 % | 93.9 % | 2.86 | 3.47 | 176.2 | 168.3 |
| Full fusion + QR | high | 1.97 | 1.25 | 6.04 | 94.8 % | 87.5 % | 2.86 | 3.45 | 176.2 | 168.3 |

Aggregated over all three paths (9 runs per configuration):

| Config | Mean | Median | p95 | Hall accuracy | QR resets / run |
| --- | --- | --- | --- | --- | --- |
| BLE only | 5.91 m | 5.66 m | 11.18 m | 83.6 % | 1 |
| BLE + PDR | 4.17 m | 3.78 m | 8.61 m | 82.7 % | 1 |
| Full fusion + QR | **1.83 m** | **1.51 m** | **4.44 m** | **93.8 %** | **4.33** |

**Which configs include QR, and how QR events are scheduled.** All 27 runs — every
configuration — begin with the same **entrance QR fix at t = 0 s** (the engine is
initialised at the entrance before the walk starts), so `beacons` and `beacons-pdr`
each record exactly **1 reset**: that entrance fix, and no QR during the walk
(`useQr: false`; their descriptions say "no QR after the start"). Only **Full fusion
+ QR** (`useQr: true`) schedules further QR events: at each 1 s simulation step, if
the walker's ground truth is within **1.25 m** of an as-yet-unvisited artifact on the
same floor, that artifact's QR fix is applied (uncertainty collapsed to the pedestal)
and recorded with its elapsed time. Each artifact fires **at most once per run**, so
full-fusion runs record **3–6 resets** (entrance + 2–5 artifact fixes; mean 4.33;
e.g. one run: entrance at 0 s, artifacts at 6 s, 20 s and 43 s). Counts and per-run
event times appear in the debug table, in `qrResets` / `qrResetCount` in the JSON,
and in four CSV columns (`qr_reset_count`, `qr_artifact_reset_count`,
`qr_reset_times_sec`, `qr_reset_events`).

Per-path detail for the full configuration (mean / p95 / hall accuracy):

| Path | Low crowd | Medium crowd | High crowd |
| --- | --- | --- | --- |
| Grand Hall highlights | 1.36 / 3.47 / 100 % | 0.96 / 1.45 / 100 % | 2.66 / 8.85 / 100 % |
| Across three halls | 1.86 / 4.32 / 89.5 % | 1.37 / 2.94 / 85.5 % | 1.82 / 7.11 / 88.2 % |
| Stair + upper gallery | 1.98 / 4.28 / 94.3 % | 3.01 / 5.39 / 90.6 % | 1.44 / 2.17 / 96.2 % |

Worst single run: **3.01 m** mean, **8.85 m** p95 (upper-gallery / medium and
grand-highlights / high respectively). Hall accuracy drops where a position sits near
a hall boundary or a doorway — the estimator is right, the discrete label is ambiguous.

### 2.2 Targets (targets, not claims)

| Target | Measured | Verdict |
| --- | --- | --- |
| Mean position error < 2.5 m at low crowd | **1.73 m** (full fusion, 3 paths, 177 samples) | **met** |
| Hall detection > 95 % | **94.6 %** (low crowd), 93.8 % over all crowds | **missed by 0.4 pp** — reported as missed, not rounded up |
| Route recomputation < 100 ms | p95 **0.13 ms** (Node, 120 samples, max 1.55 ms, regenerated run); in-browser p95 **0.20 ms**, max **1.50 ms** (2026-10-23 run) | **met by ~2 orders of magnitude** |

In-browser route benchmark (debug panel, `performance.now()`): 120 recomputations,
p50 0.10 ms, p95 0.20 ms, max 1.50 ms. Routes: entrance→Khafre 56.0 m / 5 instructions,
entrance→Hatshepsut 64.1 m / 7 instructions (stairs), Tutankhamun Hall→Narmer 42.3 m /
8 instructions.

### 2.3 Route-following walker (new, 2026-10-24)

- `followPath.test.ts` (5 tests) checks that the path starts at the walker's truth,
  never goes back to earlier route vertices, ends at the target, stays within 1 m of
  the route for every 0.5 m of sampled walking, joins the free-walk loop without a
  teleport, and degrades to a single point for a failed route.
- In Chrome at 390×844, choosing **Khafre on his throne** (46.0 m route) switched the
  running tour to the route; five 1 s samples showed the blue dot advancing along the
  drawn polyline at roughly the 1.1 m/s default. Moving the slider to **2.0** persisted
  `walkSpeedMps: 2` and increased the advance per sample. **Free walk** kept animating
  independently while the route stayed on the map, and its misleading "recalculating"
  label is suppressed. Choosing **Walk the route** again recomputes from the current
  estimate before re-aiming the walker.
- This browser tab is hidden behind the preview panel, and Chromium throttles timers in
  hidden tabs, so the pass was recorded from samples taken while it was running rather
  than as a long unattended walk. The controlled numbers remain §2.1.

## 3. Known bugs and errors

Reproduction steps assume `npm run preview` and a phone-width viewport.

| # | Severity | Issue | Reproduction | Impact |
| --- | --- | --- | --- | --- |
| B-01 | fixed 2026-10-24 | ~~Debug metrics freeze when tracking is paused; the "live metrics" heading stays.~~ When no tracking source is running the card shows a **"PAUSED - values are stale"** badge, an explanatory line, and dims all three metric blocks; while the simulator or motion source runs it shows "● LIVE" undimmed. | Start the tour → pause or stop → `#/debug`: badge + dimmed blocks; resume → LIVE. Both states verified in-browser (the preview tab is hidden, so LIVE was read with a temporary `visibilityState` override that was then restored). | A presenter can no longer read stale numbers as live. |
| B-02 | fixed 2026-10-24 | ~~Walker ignored the active route and re-routed every ~2.5 s.~~ The walker now follows a freshly computed route from its truth, with Free walk as an explicit alternative. | Start tour → choose Khafre → the dot advances along the polyline; Free walk turns deviation re-routes off. | Fixed; see `followPath.ts` + 5 tests. |
| B-03 | fixed 2026-10-24 | ~~PWA icons are SVG only.~~ 192/512 PNG, a 512 maskable icon and a 180 apple-touch-icon are in the manifest and precached. | Inspect `public/icons/`, manifest. | Install prompts still **UNVERIFIED** on real devices. |
| B-04 | fixed 2026-10-24 | ~~`index.html` used root-absolute manifest/icon paths while Vite `base` is `./`.~~ All shell URLs are relative. | Serve `dist/` from `/`. | Root verified; a sub-path would need a fresh scope check. |
| B-05 | low | Single 664 kB JS chunk (219 kB gzip) + 48 kB CSS (demo build: 568 kB / 192 kB). | `npm run build` warning; slow first load on poor Wi-Fi. | Repeat loads are offline/instant; first load only. Fonts add ~427 KB to the install precache, not to the JS parse. |
| B-06 | low, partly fixed 2026-10-24 | English-only operator labels inside the Arabic debug/admin UI ("truth", "distance", "compute"). The redesign translated the Admin eyebrow and hall controls and rebuilt the debug tables, but a residue remains: the debug map legend ("truth", "estimate", "Error"), the battery block and the per-run table headers still carry English words. | Switch to Arabic, open debug/admin. | Mixed-language chrome for the presenter, not for visitors; nobody demoing in Arabic alone will see Admin. |
| B-07 | fixed 2026-10-24 | ~~Google Fonts is a third-party request on first load.~~ Fonts are self-hosted and precached; network log shows no Google request. | DevTools network on a fresh profile. | Fixed (D-10). |
| B-08 | medium | Camera QR, real PDR and iOS permission flows were never run on hardware. | — | Cannot claim real scanning or step tracking until a phone test is recorded (D-17). The new Device check is the screen to record it with. |
| B-09 | low | No automated coverage for the engine's `confirmQr`, MotionSource watchdog, camera lifecycle or the service worker. Scenario-level QR scheduling and the CSV/JSON export shape now have tests (`scenario.test.ts`, `export.test.ts`). | `npm test`. | Regressions in those four areas would not fail CI; route-following, scenario QR events and export shape are covered. |
| B-10 | low | Starting PDR on a device without usable accelerometer data waits 1.5 s before reporting the fallback. | Desktop Chrome → Settings → Phone sensors → Start. | Intentional honesty delay; on phones the first sample normally arrives immediately. |
| B-11 | low | Arrival stops the simulator/motion source; the dot stays frozen until a source is resumed. | Navigate to any artifact, wait for the arrival card. | Intended battery behaviour (D-13); press **Walk the route** or resume to continue. |
| B-12 | low | The camera permission row can stay **Waiting** indefinitely when the browser never answers the permission prompt (observed in the preview environment). | Device check → Open camera, no prompt appears. | Honest by design: no pass is claimed and the QR camera row stays "Not tested". A phone with a real prompt resolves or fails visibly. |
| B-13 | low | Device check's camera result remembers that a stream was opened; it does not retain a frame count after closing. | Open camera → close → row stays Pass with the last note. | Past-tense text is accurate; the live frame counter is gone. |

No crashes, console errors or failed network requests were observed during the
verified flows. The only console noise is the Vite chunk-size warning at build time.

## 4. Deviations from the spec

Full log with reasons and severity: [`DEVIATIONS.md`](DEVIATIONS.md). The ones that
affect how the demo should be presented:

1. **Debug is `?debug=1` only** (D-01) — no hidden gesture.
2. **Legacy prototype pages still exist** (D-11, medium) — don't wander into them on stage.
3. **The corridor and staircase are modelled as hall-like spaces** (D-02) — hall accuracy is therefore stricter than a halls-only metric.
4. **Battery numbers are workload proxies** (D-06), not mAh.
5. **Walker modes are explicit** (D-26): "Walk the route" follows the active route, "Free walk" is the old highlights loop. Choosing a destination while the tour runs switches to route mode.
6. **Accessible mode honestly refuses the upper floor** (D-15) — no invented lift.
7. **Hardware paths are unverified** (D-17) — Device check reports waiting/fail rather than inventing a pass.
8. **Public hosting is unverified** (D-16); icons and fonts are now production-ready (D-09, D-10 fixed).
9. **The demo build drops the legacy prototype** (D-27): `npm run build:demo` compiles
   out the legacy routes and omits the 40 MB `public/assets` (33 MB media) → a 1.2 MB
   `dist/`. The default `npm run build` still ships everything.
10. **Print the QR sheet before the demo** (D-28): `#/print-qr` holds all 17 codes
    (entrance, halls, artifacts), 6 per A4 page, AR + EN labels; it is URL-addressed,
    not in the bottom nav.
11. **The UI redesign is presentation-only** (D-31): tokens, type and layout changed; the
    estimator, router, scenario runner and exporters did not. Pre-redesign screenshots exist
    for map, QR and debug only, because the old shell was never committed.
12. **Smart Visit lives on an unmerged branch** (D-32…D-36): visit planner,
    crowd-aware routing, suggestions and rewards are on `feature/smart-visit`. The
    crowd is simulated (badge shown), planner inputs are placeholders, and a QR
    reward can be photographed — it is not anti-cheating. Say that on stage.

Not deviations, but explicit choices allowed by the spec: Kalman rather than particle
filter, robust WLS trilateration over 4 beacons, jsQR, SVG map redrawn at 1–3 Hz, BLE
stub, Arabic default with an English toggle.

## 5. What is simulated vs what is real

| Simulated (clearly labelled in the UI) | Real (computed/executed on device) |
| --- | --- |
| The virtual walker on the highlights path | RSSI smoothing, trilateration, Kalman filtering, map matching |
| Beacon RSSI values, noise, dropouts, crowd levels | A*, graph construction, accessible routing, instruction generation |
| Ground truth used for live error and scenario metrics | Re-route decision (>4 m), arrival detection, route progress |
| The 27-run evaluation results | The scenario runner itself, its table, chart and JSON/CSV exports |
| Hall density in the admin page (seeded, anonymous) | Hall-close graph updates and live re-routing |
| Museum floor plan, coordinates, artifact names/texts (placeholder) | Arabic/English UI, RTL/LTR switching, QR payload parsing |
| Placeholder tags, importance, dwell times and hall capacities; simulated hall occupancy | Planner greedy/2-opt ordering, replan drop order, crowd edge weights, measured detour minutes, rewards ledger arithmetic, smart-visit evaluation rows |
| — | QR decoding with jsQR (code path; camera hardware **UNVERIFIED**) |
| — | Service worker caching and offline reload (verified with the server down) |
| — | DeviceMotion/DeviceOrientation step + heading pipeline (code path; **UNVERIFIED** on a phone) |

Not implemented at all: real BLE scanning (browser APIs cannot expose advertisements or
RSSI; iOS Safari cannot scan BLE), native shell, backend, accounts, GPS, AR.

**Privacy:** there is no `fetch`, `XMLHttpRequest` or `sendBeacon` in `src/`; no backend;
no accounts; position, route and settings stay in memory/`localStorage`. Fonts, icons
and all runtime assets are same-origin; a production load makes **no third-party request
at all**. The service worker talks only to its own origin.

## 6. Next steps

### Next 48 hours (demo hardening, in order)

1. **Record a phone test with Device check**: printed QR → camera decode → QR reset; PDR
   steps + heading for 30 m; iOS permission prompts. Attach results here. Until then D-17
   stands. The camera row staying "waiting" is not a pass.
2. **Deploy to a static host** using [`DEPLOY.md`](DEPLOY.md), re-run the offline test on
   the deployed HTTPS origin, and verify the PNG icons / install prompt on Android and iOS.
3. **Demo pacing pass**: walk a full route with the new walker, switch to Free walk and
   back, and check the speed slider on stage hardware. B-01 and B-02 are fixed; B-06
   (mixed-language operator labels) remains.
4. **Coverage**: unit tests for engine `confirmQr` and MotionSource fallback, and a
   Playwright smoke test of onboarding → search → route → device check; add a service
   worker precache test so a broken manifest fails CI. (CSV/JSON export shape and
   scenario QR scheduling are now covered by `export.test.ts` / `scenario.test.ts`.)
5. **Code-split** the legacy media/player roads out of the main chunk (B-05) and consider
   lazy-loading the debug/scenario panel.
6. **Map polish only if time remains**: auto-switch floor when the route crosses floors,
   clearer hall-closed feedback, a stronger target marker.

### Real-BLE native phase

1. Wrap the app in Capacitor (iOS/Android); implement `NativeBleBridge.scan()` with
   CoreBluetooth / Android BLE, returning beacon id + RSSI + timestamp into the existing
   `applyBeaconScan` pipeline unchanged.
2. Deploy beacons and **calibrate** `txPower` and `pathLoss` per hall; the demo values are
   placeholders. Collect a fingerprint/ground-truth walk per hall.
3. Measure real PDR drift (phone in hand vs pocket), tune the step detector and stride,
   and add a magnetometer-quality signal to the heading error model.
4. Add a lift/elevator node so accessible routing works for the upper floor.
5. Battery profiling on device (scan interval, PDR duty cycle, screen-on map rate),
   background/foreground transitions, iOS motion permission UX.
6. Field evaluation: repeat the scenario methodology with real beacons and a measured
   ground truth; publish mean/median/p95 and failure cases, not best runs.
7. Privacy review for the native build (no analytics, no location upload, permission copy).

## 7. Demo script (3 minutes) and fallback plan

**Before going on stage:** charge both phones, **print the QR sheet from `#/print-qr`**
(17 codes, 6 per A4 page), open the app once online so the service
worker precaches the shell and fonts, then test a reload in airplane mode. Set Arabic,
crowd = low, low-power off, and keep `docs/scenario-results.json` open on a laptop as
evidence. On the demo phone, open **Device check** once to record the real camera/motion
result before the audience arrives.

| Time | Action | Say |
| --- | --- | --- |
| 0:00 | Open the installed app (airplane mode if you want to prove offline) | "ATHAR works without a network. Position is computed on this phone; nothing is sent anywhere." |
| 0:15 | Onboarding → **Start simulated tour** | "For this demo a virtual visitor walks with simulated BLE beacons — the simulation is labelled everywhere." |
| 0:30 | Map: blue dot + accuracy circle, hall name; switch floors and back | "The circle is the 95 % uncertainty, not decoration." |
| 0:45 | Search → "Tutankhamun" → open the funerary mask → "Go here" | "Turn-by-turn from where I actually stand, not from the entrance." |
| 1:05 | Point at the banner, remaining distance, compute time, and the walker holding the line | "The virtual visitor now walks this exact route, from its own position; recomputed in about a millisecond." |
| 1:30 | Drag the speed slider, then press **Free walk**, then **Walk the route** | "Two modes: follow the route for the demo, or wander freely. The speed control is presentation-only — it never changes a real PDR stride." |
| 1:45 | Wait for arrival card (or tap Manual placement and walk the dot to the target) | "Arrival is a state, and sensors stop here to save battery." |
| 2:00 | QR tab → pick `GEM-B-01` → **Use code** (say it is the labelled demo code, or scan the card printed from `#/print-qr` if the camera works) | "A real scan resets position: radius drops from metres to one metre." |
| 2:08 | Settings → **Device check** (optional if hardware is present) | "This screen passes only on real events. On this laptop it says no accelerometer instead of pretending; on a phone it shows steps and heading." |
| 2:15 | Open `?debug=1` | "Ground truth versus estimate, live error, and the same numbers the scenario runner produced." |
| 2:30 | Run 27 scenarios (~0.2 s), show table + config comparison; export CSV | "BLE alone: 5.9 m mean. Full fusion: 1.8 m. Low crowd: 1.73 m, 94.6 % hall accuracy — we missed our 95 % target, and we say so." |
| 2:45 | Route benchmark; Settings → low power; Admin → close a hall | "Sub-millisecond routing, a real battery lever, and live rerouting when a hall closes." |
| 3:00 | Close on privacy | "No GPS, no account, no upload. Real BLE needs a native shell; we did not fake it." |

### If something fails live

- **Camera denied/unavailable:** open **Settings → Device check** to show the honest
  "denied/unavailable" row, then use the labelled "Use code" button. Never call it a real scan.
- **Motion sensors unavailable (or a laptop):** Device check shows the failing row with
  zero events; the app stays in manual mode. Switch to the simulated tour or tap-to-place.
  The demo is designed around the simulator for exactly this reason.
- **No network on the demo phone:** the app was loaded once beforehand; do **not** clear
  site data. If it is a fresh phone, use the laptop with `npm run preview` as the screen.
- **A page throws or a route fails:** fall back to `#/debug` (independent of routing) and
  show the measured table, then the static `docs/scenario-results.json` / CSV export.
- **Target unreachable (stairs closed, accessible mode, closed hall):** this is honest
  behaviour; explain the no-route state, reopen the hall in Admin, and show the reroute.
- **Battery/phone overheating:** low-power mode doubles the scan interval; stop the tour
  between segments.

**One-sentence honest summary:** the positioning, routing, QR reset, offline shell and
evaluation panel all run and were measured; real BLE, real camera scanning and real phone
motion are implemented but not yet verified on hardware, and are labelled as such.

## 8. Smart Visit (visit planner, crowd-aware routing, suggestions, rewards)

Built on the separate branch `feature/smart-visit`. Safety net: `git tag demo-safe` was
already in place, and a snapshot tag `smart-visit-base` holds the exact pre-change state
of the working tree, so the whole feature can be discarded without losing anything.
Nothing has been merged. These are **rule-based features, not machine learning** — the UI
and the docs call them *visit planner*, *crowd-aware routing*, *suggestions* and *rewards*.
No network calls were added: `src/` still contains no `fetch`, `XHR` or `sendBeacon`, and
every piece of new state lives in `localStorage` or memory.

### What was added (priority order)

- **P0 Visit planner** — `src/planner/` (`types`, `legs`, `planner`) and the screen
  `#/plan`: time budget (45/90/150 min), interest tags, avoid-stairs, walking speed
  (1.0 m/s default, 0.6–1.6 slider). Algorithm: greedy by value-per-minute from the
  current position → 2-opt pass that only accepts a swap when travel time falls and the
  budget still holds → a value-only greedy baseline computed with the same legs, so the
  comparison is real. Pairwise A* legs are cached per plan. Output: ordered stops with
  ETA, dwell, cumulative minutes, total, and skipped artifacts with a reason
  (`budget` / `stairs` / `closed` / `unreachable`). `replan()` drops the lowest-value
  remaining stop and recomputes when the visitor is behind or adds a stop. "ابدأ الجولة"
  feeds stop 1 into the existing `navigateTo` and advances on arrival.
- **P1 Crowd model** — `src/crowd/`: `CrowdSource { getLevels() }`, a seeded
  time-varying `SimulatedCrowdSource` fed by hall capacities in the JSON, and a
  `RemoteCrowdSource` **stub** that reports "not implemented" and returns nothing.
  Thresholds are constants (low < 0.4, medium 0.4–0.75, high > 0.75). Heatmap: an
  overlay toggle on the map tints halls with a legend. Crowd-aware routing:
  `edge cost = length × (1 + alpha × tier)` with alpha = 0.5, used by A* (`astar`'s new
  optional `edgeCostM`), by `computeRoute` (only when the crowd option is passed) and by
  the planner. Settings toggle: "تجنّب الزحام". Privacy rules for a future real feed are
  documented in `src/crowd/remote.ts`: opt-in only, hall id only, no identity, no path,
  aggregated counts, suppress counts below 5.
- **P2 Suggestions** — `src/suggestions/`: a pure evaluator holding all five conditions
  (next hall tier 2, same-tag alternative in a tier-0 hall, detour under 3 minutes shown
  exactly, ≥10 minutes since the last suggestion, no dismissal for that hall) plus an
  engine that measures the detour with the same leg cache. Banner on the map sheet,
  never blocking; accept replans with the alternative, dismiss is remembered per hall.
- **P3 Rewards** — `src/rewards/`: local ledger (+10 per artifact QR once per artifact,
  +50 for a completed plan, +15 for a quiet-hall suggestion that then gets a QR scan in
  that hall, 200/day cap resetting at local midnight), derived badges, editable
  placeholder `catalogue.json`, screen `#/rewards` with points, badges, history and
  reset. No accounts.
- **Evaluation** — `src/evaluation/smartVisit.ts`, shown in the debug panel: 9 planner
  rows (3 interest profiles × 45/90/150 min) with planned time, stops, value vs the
  value-only baseline and compute ms; 10 seeded start/target pairs with average route
  length and average crowd exposure with and without weighting. JSON and CSV export.

### ASSUMPTIONS — assumptions, not measurements

| Assumption | Value | Where it lives |
| --- | --- | --- |
| Dwell time per artifact | 4–7 min (7 for the Tut mask, 4 for steles) | `museum.json`, `placeholder: true` |
| Artifact importance | 6–10 | `museum.json`, `placeholder: true` |
| Interest tags | royal, funerary, sculpture, writing | `museum.json` / `planner/types.ts` |
| Value formula | importance × (1.0 matching tag, 0.3 otherwise) | `planner/types.ts` |
| Walking speed (planner) | 1.0 m/s default, 0.6–1.6 configurable | `planner/types.ts`, `#/plan` |
| Walker speed (simulation) | 0.3–2.0 m/s, default 1.1 (pre-existing) | `NavProvider` |
| Crowd alpha | 0.5 | `crowd/types.ts` (`DEFAULT_CROWD_ALPHA`) |
| Crowd thresholds | low < 0.4, medium 0.4–0.75, high > 0.75 | `crowd/types.ts` (`CROWD_THRESHOLDS`) |
| Hall capacities | stair 40, corridor 80, hall-a 120, hall-c 100, upper 90, hall-b 150 | `museum.json` `capacity` |
| Suggestion detour limit | < 3 minutes (exact number shown) | `suggestions/rules.ts` |
| Suggestion cooldown | 10 minutes per shown suggestion, dismissal is per hall | `suggestions/rules.ts`, `PlanContext` |
| Rewards | +10 / +50 / +15, daily cap 200 | `rewards/ledger.ts` |
| Evaluation clock and seeds | fixed clock `1_760_000_000_000 ms`, crowd seed 2026, pair seed 4242 | `evaluation/smartVisit.ts` |
| Crowd refresh in the UI | every 20 s (plus the plan start) | `NavProvider` |

### Simulated vs real (smart visit)

| Simulated or placeholder (labelled in the UI) | Real, computed on this device |
| --- | --- |
| Hall occupancy and tiers (`SimulatedCrowdSource`, seeded wave + jitter) | The 0.4/0.75 threshold mapping itself |
| Hall capacities, artifact tags, importance, dwell minutes (placeholder JSON) | Greedy → 2-opt planning, the cached pairwise A* matrix, `replan()` drop order |
| `RemoteCrowdSource` — documented stub, returns no levels | Crowd-aware edge weights, measured route length and exposure along real geometry |
| The suggestion's "which artifact qualifies" inputs | The detour minutes (two A* legs subtracted) and each blocking rule |
| The reward catalogue text (museum decides) | Ledger arithmetic: once-per-artifact, once-per-route, daily cap, badge counts |
| — | All evaluation rows: 9 planner runs (all inside budget, mean 2.53 ms) and 10 crowd route pairs |

There is **no real crowd data** anywhere in the app: the only source that can feed real
numbers is the remote stub, and it deliberately reports "not implemented".

### Verification (actually executed, 2026-10-24)

- `npx tsc --noEmit` — clean.
- `npx vitest run` — **134 tests / 15 files** (99 pre-existing unchanged + 35 new:
  planner 13, suggestions 8, rewards 6, crowd 6, evaluation 2). Positioning and
  scenario tests untouched and still green; `docs/scenario-results.json` unchanged.
- Both builds: `npm run build` → 41 MB (unchanged full build); `npm run build:demo` →
  **1,063,859 bytes in 21 files**, no legacy routes, no legacy media.
- Bundle-size change, measured against the pre-change snapshot (tag
  `smart-visit-base`, same machine, same demo mode, built side by side): main JS
  **561,819 → 617,475 bytes (+55.7 KB, +10 %)**, gzip 197.8 KB; whole `dist/`
  1,007,238 → 1,063,859 bytes (+56.6 KB); file count 21 → 21.
- Offline test on the demo build with the server killed: warm run registered and
  activated the service worker (cache `athar-0d2ce232-shell/runtime`, 18 precache
  entries including all 8 font files), preview server killed (PID verified terminated),
  then `verify` rendered from cache with the origin down — 21 visible text nodes,
  headline "اختر لغتك", IBM Plex Sans Arabic `loaded`. Screenshot:
  `docs/redesign/after-12-offline-demo.png`.
- Screenshots at 390×844 in RTL and LTR for every new surface: `docs/smart-visit/`
  (12 files — plan inputs, plan result, rewards, map with crowd overlay, settings
  toggle, debug evaluation after a real run).
- Crowd probe (temporary test, then removed): 0 of 90 artifact pairs change route under
  crowd weighting on this floor plan, while the weighted cost does rise
  (entrance→c4: 54.97 → 102.7). Reported honestly in the panel as
  `0 / 10 · alpha 0.5`; the mechanism is covered by a synthetic-graph test that does
  change route.

### Where this stops (time box)

Everything P0–P3 landed, plus the evaluation. Not done, and not claimed: the suggestion
banner is unit-tested for every rule but has not been observed on a phone (it only
appears mid-tour when a tier-2 hall has a same-tag alternative under 3 minutes away); the
new screens were screenshotted from the demo build, not from hardware; and nothing has
been merged into `main`.
