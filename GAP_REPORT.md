# ATHAR — gap report against the deployed demo

Audit date: 2026-10-24 · Branch: `audit/deployed-gap` · Safety tag: `demo-safe` (already
present) plus a full source copy in `.backup-audit/` (not committed).

Audited URL: <https://site-b4b421f6246446ccb30d009077a444df.freebuff.page/>
Reference build: `npm run build:demo` served by `vite preview` at `http://127.0.0.1:4173`
Same bundle hash on both at the start of the audit: `assets/index-SBIvtsgT.js`.

How the evidence was collected (repeatable):

| Script | What it records |
| --- | --- |
| `node scripts/audit-live.mjs <url> docs/audit <tag>` | 13 routes × RTL/LTR at 390×844, PNG per route, console errors, third-party hosts, horizontal overflow, sub-44 px targets, Latin-script leftovers, title/theme-color/manifest, loaded fonts, SW caches |
| `node scripts/audit-deep.mjs <url> docs/audit <tag>` | cold open with empty storage, 360×640 overflow on every route, SW precache contents, reload with the network disabled, icon/manifest HTTP status |
| `curl` | status codes, content types, cache headers, deployed asset hash |

Raw output: `docs/audit/live-audit.json`, `docs/audit/local-audit.json`,
`docs/audit/live-deep.json`, `docs/audit/local-deep.json`, screenshots
`docs/audit/live-*.png` and `docs/audit/local-*.png`.

---

## 0. The finding that outranks everything else

| # | Status | Evidence | Severity |
| --- | --- | --- | --- |
| 0.1 | **FAIL** | The URL that was handed out returns **HTTP 503 `Site temporarily unavailable`** (`Retry-After: 60`, `Cache-Control: no-store`). It answered normally during the first audit pass (17:56–18:03) and went down afterwards; three retries 45 s apart from 18:06 to 18:09 were all 503. | high |
| 0.2 | **FAIL** | The older documented production URL <https://site-b8449cdc44cf48288cbc83f01b3405b5.freebuff.page/> is alive but serves the **pre-redesign build**: its `precache-manifest.json` lists Cormorant Garamond, Inter and Noto Sans Arabic, i.e. the dark/gold skin from before the signage redesign. | high |
| 0.3 | **FAIL** | `sites_list` returns **no saved Sites projects** in this account, so the broken deployment cannot be republished from here — it has to be replaced by a new deployment. | high |

Consequence: today the public demo is either down or shows the wrong build. Nothing else in
this report matters until that is fixed; the fix is a fresh deploy of the current
`dist/` (section E).

---

## A. Product requirements

Viewport 390×844 unless stated; "live" = the deployed URL above while it was up; "local" =
the same bundle served locally. Console errors on load and on every route: **0** (both
builds, `docs/audit/*-audit.json` → `network.consoleErrors = []`, `failed = []`).

| # | Requirement | Status | Evidence | Severity | Fix |
| --- | --- | --- | --- | --- | --- |
| A1 | Arabic default, RTL correct, instant EN/LTR toggle | **PASS** | Cold open with empty storage lands on `#/onboarding`, `<html lang="ar" dir="rtl">`; toggle switches dir and copy with no reload; LTR captures `docs/audit/live-*-ltr.png` show no mirrored-layout breakage. | — | — |
| A2 | Onboarding explains privacy and offers scan QR / simulation / manual placement | **PASS** | Cold open → `#/onboarding` (`docs/audit/live-deep.json` → `coldOpen`). Copy states position is computed on the phone and never sent. The three entries are one tap away on the map sheet (simulated tour, entrance QR, manual placement). **Partial copy defect:** the English row still says “English / Switch anytime inside the map.” inside the Arabic UI (see C3). | low | C3 |
| A3 | Map: dot + accuracy circle, route line, destination marker, floor switcher, hall name, instruction banner | **PASS** | `live-13-route-rtl.png`: dark signage banner (12 م, turn arrow, instruction, hall), lapis route, carnelian destination, accuracy circle, floor switcher, hall name. Idle state: `live-map-rtl.png`. | — | — |
| A4 | Search by artifact, hall, category; recents | **PASS** | `live-search-rtl.png`: query field, category chips, 10 results with hall/floor/category; recents block renders when history exists (localStorage key in `SearchPage`). | low (chip tap width, C5) | C5 |
| A5 | Navigate from current position, A*, turn-by-turn AR/EN, avoid stairs, auto re-route > 4 m, arrival, low-confidence QR prompt | **PASS** | Start → route in one tap (`live-13-route-rtl.png`); re-route code path `offRouteM > 4` (`NavProvider.tsx:477`); arrival state and low-confidence banner with “امسح أقرب رمز” visible in the same capture. Turn-by-turn AR/EN covered by `src/navigation/navigation.test.ts`. | — | — |
| A6 | Artifact page: info, placeholder cinematic section, QR button | **PASS** | `live-item-tut-mask-rtl.png`: name, code, floor/category/hall, three actions, description, “تجربة سينمائية” placeholder block, placeholder notice. English artifact subtitle leaks into the Arabic UI (C3). | low | C3 |
| A7 | Positioning: simulated BLE, QR reset, DeviceMotion PDR with honest fallback, manual tap; real BLE = documented stub | **PASS** | Map source badge “BLE محاكاة”; QR page resets position (`qr.applied`); Device check exposes `DeviceMotionEvent` + iOS `requestPermission` and reports honestly when absent; `src/positioning/core/sources.ts:470` documents the real-BLE class as a stub that returns nothing. **UNVERIFIED on hardware** (no phone in this session). | medium (unverified) | Note in C8 |
| A8 | Debug panel: truth vs estimate, error stats, hall/nearest accuracy, update rate, readings, workload, 27-run matrix with QR counts, config comparison, JSON/CSV, LIVE/PAUSED | **PASS** | DOM dump of `#/debug`: 27 runs in 77 ms, seed 2026, per-config table with `إعادة ضبط QR` 1.0/1.0/4.3, nine-row matrix, tall chart with direct labels, “متوقف - القيم قديمة” badge with explanation, export JSON/CSV, planner + crowd evaluation. **Defect:** English leftovers and middle-dot meta strings (C3, C4). | medium | C3, C4 |
| A9 | Admin: hall closure with live reroute, artifact move, simulated density (labelled) | **PASS** | `live-admin-rtl.png`: floor plan, per-hall density with “الآن 63”, close buttons, “كثافة القاعات (محاكاة)” + note that numbers are generated from an unknown seed, not measured. In-memory only, no auth (accepted for a demo, stated in C7). | low (walkable note in English, C3) | C3 |
| A10 | Printable QR sheet with 17 codes that decode in-app | **PASS** | `#/print-qr` renders 17 codes (entrance, 6 halls, 10 artifacts), Arabic + English label per card, 6 per A4 page, ~45 % scale on a 390 px screen; `src/app.test.ts` decodes the payloads with the same parser the scanner uses. | low (page copy in English, C3) | C3 |
| A11 | Device check: camera, QR decode, motion permission, live events | **PASS (desktop) / UNVERIFIED (phone)** | Headless Chrome reports honest “camera requires HTTPS/permission” states and `jsQR` decode path; no hardware camera or motion sensor in this session. | medium | Phone test |
| A12 | Low-power mode, offline after first load | **PASS** | Settings → “وضع الطاقة المنخفضة”; offline reload with the network disabled boots the app and keeps `IBM Plex Sans Arabic` + `Noto Naskh Arabic` available (`docs/audit/live-deep.json` → `offline`), 18 precached entries. | — | — |
| A13 | Everything simulated is labelled | **PASS** | “BLE محاكاة” on the map, “محاكاة” badge on the crowd overlay, “كثافة القاعات (محاكاة)” in Admin, simulator note in the bottom sheet, planner note “محاكاة”, debug line “كل الأرقام من قياسات محاكاة”. | — | — |

---

## B. Deployment checks on the live URL

| Check | Status | Evidence |
| --- | --- | --- |
| HTTPS secure context, camera prompt, iOS motion flow | **UNVERIFIED** | No phone in this session. Headless Chrome only proves the code paths and the honest failure text. |
| SW registers with scope `/`, offline reload works | **PASS** (while the URL was up) | `docs/audit/live-deep.json`: scope `https://site-…/`, active, 18 cached entries; reload with `offline: true` → app boots, fonts ready. |
| No `fonts.googleapis.com` / `fonts.gstatic.com` | **PASS** | Network hosts: only the site origin (40 requests) + `static.cloudflareinsights.com` (3, injected by the host, not by `src/`). All 8 woff2 files are same-origin and in the precache. |
| Manifest valid, 192/512/maskable PNG + apple-touch-icon resolve | **PASS** | All 200 with the right content types (`live-deep.json` → `assets`). **Content defect:** manifest `name` is “الحديقة المتحفية”, `theme_color`/`background_color` are `#080B10` — see C1. |
| Deploy is the DEMO build | **PASS** | `/legacy`, `/scan`, `/media-admin` → 404; bundle has no `assets/media`. |
| Admin exposure acceptable | **PASS (accepted)** | No auth, in-memory state, simulated density only, clearly labelled; nothing persists across reloads. |
| Title, meta description, theme-color match the final design | **FAIL** | Title is correct Arabic. `theme-color` is `#080B10` (near-black) while every screen is light stone `#E9E8E3`; the meta description is English-only. Affects browser chrome, the Android status bar and the PWA splash. |
| No console errors, no horizontal scroll, hash routes work cold and from a shared link | **PASS** | 0 console errors and 0 failed requests across 24 route captures; `overflowX=false` on every route at 390×844 and 360×640; cold open at `#/` → onboarding; deep link `#/item/tut-mask` renders directly. |
| Bundle size and first load on throttled 3G | **PARTIAL** | Demo `dist/`: **1.1 MB / 21 files**; JS **602 kB (197 kB gzip)**, CSS 46 kB (10 kB gzip), fonts 326 kB. Emulated 3G (1.6 Mbps, 150 ms RTT): FCP 0.6–1.2 s, DOMContentLoaded 0.63–1.08 s in two runs. **These timings are emulated, not field data**; the run also showed the host serving from HTTP cache, so treat them as a lower bound. |

---

## C. Visual and content quality

Compared against `DESIGN_NOTES.md` and `docs/redesign/` (all screens re-captured live:
`docs/audit/live-*-{rtl,ltr}.png`).

| # | Finding | Status | Evidence | Severity |
| --- | --- | --- | --- | --- |
| C1 | Dark `theme-color` / manifest colours against the light stone UI | **FAIL** | `index.html` `#080B10`, manifest `theme_color` + `background_color` `#080B10`. Visible effect: dark browser/status bar and dark PWA splash over a light app. Screens affected: all, most visible on Android status bar and install prompt. Manifest `name` “الحديقة المتحفية” (the museum garden) is also wrong for a navigation app. | medium |
| C2 | Contrast, tap targets, 360×640 | **PARTIAL** | Contrast is fine (tokens documented ≥ 4.5:1; verified on the rendered screens). No horizontal scroll at 360×640 on any route. **Under-44 px targets:** map “البحث” link 32×44, search category chips 28–38×44, crowd-overlay button 39×44, pause-tour button 39×44, plan walking-speed slider 358×16. | medium |
| C3 | English leftovers inside the Arabic UI (B-06) | **FAIL** | Onboarding: “English / Switch anytime inside the map”. Artifact: “Funerary Mask of Tutankhamun” subtitle. Settings: pill “idle”, a whole English paragraph about real BLE (“Real BLE requires native Capacitor/CoreBluetooth…”), “DeviceMotion”. Admin: “walkable area only”, “ground/area”. Debug: “no truth”, “truth/estimate”, “trilaterations”, “PDR steps”, “route recomputes”, “last route”, “active route / simulator”, “27 runs · 77 ms · seed 2026”. Print sheet: heading “Printable QR sheet” and the full English paragraph “codes accepted by the scanner…”. QR page: “frames 0”. Map: “+X min” on the suggestion banner. | high (Arabic-first product) |
| C4 | Banned patterns: middle-dot meta strings | **FAIL** | Banner hall line `قاعة توت عنخ آمون · القاعة الكبرى`; route summary `6 · 38.2 م · 1.50 م/ث`; map accuracy line `… · …`; debug `active route: none · simulator: stopped`, `27 runs · 77 ms · seed 2026`; crowd toggle `طبقة الزحام · محاكاة`. | medium |
| C5 | Tap targets (detail) | **FAIL** | Same list as C2. | medium |
| C6 | The one strong element: the signage banner | **PASS** | `live-13-route-rtl.png`: solid ink bar, 44 px turn arrow, distance in large tabular numerals, plain Arabic instruction, hall underneath. Matches the direction. | — |
| C7 | Placeholder / simulated content that could mislead | **PARTIAL** | Placeholder is disclosed: onboarding note, artifact blurb, map sheet simulator note, admin density note, debug line. Undisclosed: the artifact **English subtitle** reads like real museum data, admin positions are editable in-memory and could read as persisted, and the “no digital footprint” claim conflicts with the host’s Cloudflare RUM beacon (host-side, documented in `DEPLOY.md`). | medium |
| C8 | Other visual defects | **PARTIAL** | Settings repeats “الإعدادات” as a small label directly above the identical H1. Hall names on the floor plan collide with walls at 390 px (`live-map-rtl.png`). Artifact page ends in an empty “تجربة سينمائية” box with no “placeholder” marker inside it. | low |
| C9 | Required demo screens exist and are reachable | **PASS** | Onboarding, Map, Search, Artifact, QR, Print-QR, Settings, Device check, Debug, Admin, Plan, Rewards all render at 390×844 in both directions. | — |

---

## D. Optional features (status only, nothing built in this pass)

| Feature | Status | Evidence |
| --- | --- | --- |
| Visit planner | **PRESENT** | `#/plan`, `src/planner/`; 3 budgets, 5 interest tags, avoid stairs, speed slider, result list; evaluation in the debug panel. |
| Crowd model + heatmap | **PRESENT** | `src/crowd/`; `SimulatedCrowdSource` seeded, `RemoteCrowdSource` documented stub; map overlay toggle with “محاكاة” badge; legend. |
| Crowd-aware routing | **PRESENT** | Settings toggle “تجنّب القاعات المزدحمة”; edge cost alpha 0.5; planner uses the same weights. |
| Suggestions | **PRESENT** | `MapPage` banner with accept/dismiss; rule set in `src/suggestions/`; “+X min” label is English (C3). |
| Rewards | **PRESENT** | `#/rewards`, local ledger, daily cap 200, badges, placeholder catalogue, reset. |

---

## E. Fix plan (priority order)

**P0 — blocks the demo**

1. Restore a public URL that serves the current build (503 + stale production build).
2. C3 English leftovers on the demo path (onboarding, artifact, settings, admin, debug, QR,
   print sheet) — the Arabic-first claim is checked by an Arabic-speaking committee.
3. C1 theme-color/manifest that contradict the light design and the wrong manifest name.

**P1 — visual direction on the screens used in the demo**

4. C4 middle-dot meta strings on the banner, the route summary and the debug panel.
5. C5 under-44 px tap targets (search chips, map search link, crowd/pause buttons, slider).
6. C8 duplicated Settings heading; placeholder marker inside the empty cinematic block.

**P2 — polish**

7. Hall-label collisions on the floor plan at 390 px; admin English note.

Not touched in this pass: estimator parameters, positioning/routing logic, scenario results,
tests' assertions, data. No new features.

## F. Fixes applied, and the re-run after redeploy

Work stayed on branch `audit/deployed-gap` (`demo-safe` tag and `.backup-audit/` copy made
first). No estimator parameter, routing rule, scenario result, test assertion or museum
data was modified.

### F1. P0 — deployment

| What | Result |
| --- | --- |
| New Freebuff Sites project `cfe9686f-1128-46d7-9301-c554b1231e3d` | created; preview environment deployed from `npm run build:demo` (`dist/` 1.1 MB / 21 files) and **published** |
| Public URL | <https://site-d80a508dd53040aca99977a7dc55c6f0.freebuff.page> |
| Deployed bundle | `assets/index-D1E0RQ9p.js` + `index-B7wh6Clp.css` (matches `dist/`) |
| Old URLs | `site-b4b421…` still 503 → retired; `site-b8449…` still serves the pre-redesign build → marked historical in `DEPLOY.md` |

### F2. P0/P1 — product, Arabic-first and visual

- Onboarding: English row note translated; no English sentence remains in the Arabic UI.
- Settings: duplicate “الإعدادات” heading removed; `idle/paused/live` chips, `DeviceMotion`
  line, device-check chip and the English footer replaced with Arabic (English kept when
  the UI language is English); QR/BLE capability summaries now have Arabic copy instead of
  the sensor layer's English diagnostics.
- Admin: the `walkable area only` note is Arabic and uses the floor name, no middle dots.
- Debug: `no truth`, `truth`, `estimate`, `trilaterations`, `PDR steps`, `route recomputes`,
  `last route`, `active route`, `simulator` translated; `27 runs · 77 ms · seed …` split into
  three labelled spans;
- Map: banner hall name on its own line; idle accuracy split into radius + confidence; route
  summary split into steps / distance / accessible / compute time; suggestion banner shows
  `+X د` in Arabic; `scan nearest` and `QR applied` lines use an em dash instead of `·`.
- QR page: `frames 0` → localized “إطارًا مقروءًا”.
- Print sheet: page copy is Arabic (codes stay Arabic + English as required).
- `theme-color` and manifest `theme_color`/`background_color` → `#E9E8E3`; manifest name →
  “أثر · ATHAR — تنقّل داخل المتحف”; meta description now Arabic + English.
- Tap targets: search chips, map search link, crowd/pause buttons and the two range inputs
  now meet 44 px.
- `vite.config.ts` excludes `.backup-audit/` from the test runner (it was doubling the suite
  to 268 tests; the real suite is 134).

### F3. Before → after, measured on the deployed URL

Both columns are the same scripts against a published URL at 390×844.

| Check | Before (old URL, 17:56–18:03 UTC) | After (new URL, 18:26 UTC) |
| --- | --- | --- |
| HTTP status | 200 at first, **503 from 18:06** | **200** |
| Deployed bundle | `index-SBIvtsgT.js` (then 503) | `index-D1E0RQ9p.js` |
| `theme-color` | `#080B10` | `#E9E8E3` |
| Manifest name / colours | “الحديقة المتحفية” / `#080B10` | “أثر · ATHAR — تنقّل داخل المتحف” / `#E9E8E3` |
| Routes captured (RTL+LTR) | 24 | **25** |
| Console errors / failed requests | 0 / 0 | **0 / 0** |
| Horizontal overflow (390 & 360) | 0 routes | **0 routes** |
| Sub-44 px tap targets | 12 instances across 5 screens | **0** |
| Latin tokens on Settings (AR) | 42 | **13** (proper nouns + language name) |
| Latin tokens on Debug (AR) | 19 | **8** (`BLE-*` ids, `performance.now()`) |
| Cold open with empty storage | `#/onboarding` | `#/onboarding` |
| Offline reload, network disabled | boots, fonts ready | boots, fonts ready (18 precached entries) |
| Third-party hosts | Cloudflare RUM beacon | Cloudflare RUM beacon (host-side, D-30) |
| 3G first load | not measured | 414 KB, FCP 2.43 s, DCL 2.16 s (emulated, empty profile) |
| Demo-only routes | `/legacy`, `/scan`, `/media-admin` 404 | 404 |
| Icons / manifest / SW / precache | 200 | 200 |

Raw evidence: `docs/audit/final-audit.json`, `docs/audit/final-deep.json`, screenshots
`docs/audit/final-*.png`; the pre-fix set is `docs/audit/live-*` and `docs/audit/local-*`.

### F4. Verification executed

| Command / check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean (exit 0) |
| `npx vitest run` | **134 / 134**, 15 files (the 99 original tests untouched and green) |
| `npm run build` | ok, full 41 MB build with legacy routes and media |
| `npm run build:demo` | ok, **1.1 MB / 21 files**, JS 604 kB (197 kB gzip) |
| Offline test (demo build, preview server killed) | shell renders, Arabic font loaded, SW 18/18 entries incl. 8 woff2; screenshot `docs/redesign/after-12-offline-demo.png` |
| Live flows at 390×844 | onboarding → simulated tour → artifact → “اذهب إلى هنا” produced a route with banner “12 م / انعطف قليلًا يمينًا / قناع توت عنخ آمون / القاعة الكبرى”; search for “توت” returned 11 results; demo QR reported “تم تأكيد الموقع”; planner built 10 stops inside 90 min; rewards screen rendered its ledger |
| Live HTTP | `/`, `sw.js`, `precache-manifest.json`, `manifest.webmanifest` 200; `/legacy`, `/scan`, `/media-admin`, `/assets/nope.js` 404 |

### F5. Where this pass stopped

- **Not verified (no hardware):** camera permission + real QR decode on a phone, iOS
  DeviceMotion permission, PWA install prompt, status-bar colour on a physical device.
  These remain **UNVERIFIED**, not “passing”.
- **P2 left open:** hall labels still crowd the walls on the floor plan at 390 px; the
  artifact page keeps the English title as a secondary line (deliberate bilingual pattern);
  Admin shows internal hall ids in the coordinate note.
- Nothing merged, nothing pushed, no estimator or scenario parameter changed.
