# Deploying ATHAR (static)

ATHAR is a static Vite/React app. It has **no server code, no database and no
environment variables**. The build output is a plain `dist/` folder; routing is
hash-based (`#/map`), so no SPA rewrite rules are required.

**Two builds exist, and hosting ships the demo one.** `npm run build:demo`
(`vite build --mode demo`) compiles the retired prototype routes out and leaves
the 33 MB legacy media library behind: **~1.1 MB in 20 files instead of 41 MB**.
The repository carries ready-made host configs that use exactly that command and
`dist` as the output directory — [vercel.json](vercel.json) and
[netlify.toml](netlify.toml) — so importing the repo needs no build settings.
Both configs also send `Cache-Control: must-revalidate` for `sw.js`,
`index.html`, `manifest.webmanifest` and `precache-manifest.json`, and mark the
hashed `/assets/*` files immutable.

The build is verified from a **subpath-free root** (`/`): `npm run build` →
`vite preview`, then an offline reload from the installed service worker. The
demo bundle was verified the same way on 2026-10-24.

## Build once, locally

```bash
npm ci
npm run build
npx vite preview --port 4173   # http://127.0.0.1:4173/
```

`dist/` contains `index.html`, hashed `assets/` (JS, CSS and the self-hosted
font files), `icons/`, `manifest.webmanifest`, `sw.js` and the generated
`precache-manifest.json`. Do not edit files inside `dist/`; rebuild instead.

Vite is configured with `base: './'`, so `dist/` also works when served from a
domain root. Keep the output at the root (`/`) for the checked deployment; if
you later move it under a subpath, the hashed assets keep working, but verify the
service-worker scope and the manifest `start_url` again.

## Demo build (kiosk size) — `VITE_DEMO_BUILD=1`

The default build copies the whole `public/` directory, including the 33 MB
legacy media library (`public/assets/media`) that only the retired prototype
pages use. For a demo kiosk or a small hosting plan, build with the demo flag:

```bash
npm run build:demo          # tsc -b && vite build --mode demo
# or: VITE_DEMO_BUILD=1 npm run build
```

The mode is enough on its own: `vite.config.ts` treats `--mode demo` as the demo
build and defines `import.meta.env.VITE_DEMO_BUILD` for the route guard, so a CI
checkout where `.env.demo` was never committed still builds the 1.1 MB bundle
instead of silently shipping the 41 MB one. `.env.demo` (which sets
`VITE_DEMO_BUILD=1`) is only needed for the shell-flag form
`VITE_DEMO_BUILD=1 npm run build`.

What the flag changes:

- **Legacy routes are compiled out.** `src/App.tsx` guards the whole legacy
  route table (`/legacy`, `/scan`, `/artifact/:id`, `/positioning`, `/print`,
  `/media-admin`, …) behind the flag; because `import.meta.env.VITE_DEMO_BUILD`
  is replaced at build time, Rollup drops those routes **and** every legacy page
  import from the bundle. In the demo build those URLs fall through to the app's
  normal "page not found" screen.
- **`public/assets/` (40 MB: the 33 MB media library + legacy photos) is not
  copied into `dist/`.** A Vite plugin copies back only `icons/`,
  `manifest.webmanifest` and `sw.js`.

Verified on 2026-10-24: `dist/` is **1.08 MB in 20 files** instead of 41 MB
(JS 568 kB / 192 kB gzip + CSS + 7 fonts + icons + manifest + service worker),
no `dist/assets/media`, no legacy route strings (`media-admin`, `legacy`) in the
JS bundle, and the offline test still passes — service worker installs, origin
killed, `#/print-qr` reloads fully from the cache. Two runs were compared:
`npm run build:demo` **with** and **without** `.env.demo` present produce the
same `index-*.js` hash and the same 1.08 MB `dist/`, which is what makes the
hosted configs safe. `npm run build` without the demo mode still produces the
full 41 MB bundle, media included. Served from `vite preview`, the demo bundle
loads with 9/9 precached assets, 0 console errors, `#/print-qr` shows all 17
codes, and the retired `#/print` URL falls through to the app's not-found screen.

Both builds share the same service-worker code and precache mechanism; the
manifest is always generated from the real bundle, so the demo build precaches
only the assets it actually ships.

## Smart Visit preview (2026-10-24, redeployed after the audit)

The `feature/smart-visit` build (visit planner, crowd overlay, suggestions, rewards,
evaluation) plus the audit fixes is deployed from the demo `dist/` through
`sites.manifest.json` + `sites.worker.js`:

- **Live, public:** <https://site-d80a508dd53040aca99977a7dc55c6f0.freebuff.page>
  (Freebuff Sites site `cfe9686f-1128-46d7-9301-c554b1231e3d`, preview environment,
  published 2026-10-24 18:21 UTC; redeployed 18:26 UTC with `index-D1E0RQ9p.js`).
- Source of truth: `npm run build:demo` output (`dist/`, ~1.1 MB, 21 files, no legacy
  routes and no 33 MB legacy media).
- **Retired URLs:** `site-b4b421f6246446ccb30d009077a444df` returned
  `HTTP 503 Site temporarily unavailable` from 18:06 UTC on 2026-10-24 and belongs to an
  account this workspace can no longer list; `site-b8449cdc44cf48288cbc83f01b3405b5`
  still answers 200 but serves the **pre-redesign** build (Cormorant Garamond in its
  precache manifest) and is therefore not a valid demo link either. Use the URL above.
- The worker serves the shell and assets with cache headers the PWA needs; `sw.js` and
  the precache manifest revalidate, `/assets/*` is immutable.
- Re-deploy after every `npm run build:demo` — the hosting never runs the build itself.
- Edge analytics (D-30) is still injected by the zone for browser navigations; the app
  itself makes no third-party request.

## Live demo — Freebuff Sites (deployed 2026-10-24)

| | URL |
|---|---|
| **Live demo (current build)** | <https://site-d80a508dd53040aca99977a7dc55c6f0.freebuff.page> |
| Historical (stale build) | <https://site-b8449cdc44cf48288cbc83f01b3405b5.freebuff.page> |
| Historical (HTTP 503 since 2026-10-24 18:06 UTC) | `site-b4b421f6246446ccb30d009077a444df.freebuff.page` |

The current deployment runs on **Freebuff Sites** (Cloudflare Workers static
assets), because no Vercel/Netlify account or CLI was connected at the time. It
ships exactly this demo bundle: `dist/` is **1.1 MB / 21 files**, no
`assets/media`, no legacy routes. The Vercel and Netlify configs below stay in
the repository and work unchanged if you move the demo to your own account.

Pieces of the deployment (all in the repo root):

- `sites.manifest.json` — entrypoint `sites.worker.js`, `assetsDirectory: ./dist`.
- `sites.worker.js` — serves `dist/` and sets the cache headers a PWA needs:
  `sw.js`, `index.html`, `precache-manifest.json`, `manifest.webmanifest` →
  `max-age=0, must-revalidate`; `/assets/*` → `immutable, max-age=31536000`;
  unknown HTML navigations fall back to the shell; missing files stay 404.
- Rebuild with `npm run build:demo` **before** every deploy; the service worker
  cache version is stamped from the bundle hash, so each deploy gets a new one.

Verified on 2026-10-24 against the current URL: `/`, `sw.js`,
`precache-manifest.json`, `manifest.webmanifest`, both hashed assets and all five
icons return 200 with the right content type; `/assets/nope.js`, `/legacy`, `/scan`
and `/media-admin` return 404; the app boots in Arabic/RTL, the service worker
activates with scope `/` and caches **18/18** entries (including all 8 woff2 files),
the simulator runs on `#/map`, and `#/print-qr` renders **17/17** codes. Zero console
errors on 25 route captures; no horizontal scroll at 390×844 or 360×640; 0 sub-44 px
tap targets. Background REST checks: cold open lands on `#/onboarding`, offline reload
with the network disabled renders the shell and the Arabic font. Exact before/after
numbers: `GAP_REPORT.md` §F.

**One caveat, host-side:** this host sits on a Cloudflare zone with Web
Analytics on, so a page load in a real browser also pulls
`static.cloudflareinsights.com/beacon.min.js` and posts to `/cdn-cgi/rum`. Those
requests come from the platform, not from `src/` (the app itself still makes no
network calls), and they cannot be switched off from this project. Vercel and
Netlify inject no such script — pick one of those if the "no digital footprint"
story has to be literally true on the public demo.

## Vercel — exact steps

[vercel.json](vercel.json) already sets `buildCommand: npm run build:demo`,
`outputDirectory: dist`, `installCommand: npm ci`, `framework: vite` and the
cache headers. Values in `vercel.json` override both the Vite preset and the
Project Settings, so the dashboard needs no hand-editing.

Dashboard:

1. **Add New → Project**, import the repository.
2. Leave the detected framework at **Vite** and the build/output fields at their
defaults — `vercel.json` supplies them.
3. No environment variables (the demo flag comes from `--mode demo`), no
   rewrites or redirects (hash routing).
4. **Deploy**, then open the production URL at the domain root. The first build
   log must show `vite build --mode demo`; if it shows a plain `npm run build`,
   the project was created before this config existed — redeploy from the
   committed `vercel.json` or set the Build Command to `npm run build:demo`.

CLI (alternative):

```bash
npx vercel login
npx vercel --prod      # uses vercel.json: build:demo → dist
```

## Netlify — exact steps

[netlify.toml](netlify.toml) sets the build command (`npm run build:demo`), the
publish directory (`dist`), `NODE_VERSION=20`, `VITE_DEMO_BUILD=1` and the same
cache headers.

Dashboard:

1. **Add new site → Import an existing project**, pick the repository.
2. Netlify reads `netlify.toml`, so the build command and publish directory are
   already filled in. Do not override them in Site configuration → Build &
   deploy unless you also change the file.
3. No other environment variables, no redirect rules (hash routing).
4. **Deploy site**, then confirm the deploy log runs `npm run build:demo` and
   reports a `dist` of about 1.1 MB, not 41 MB.

CLI (alternative):

```bash
npx netlify login
npx netlify deploy --build --prod   # netlify.toml supplies command + dist
```

If you ever replace the hash router with a history router, add this Netlify
rule (and the Vercel equivalent) — not needed today:

```
/*  /index.html  200
```

## Any static host

Serve the contents of `dist/` from the domain root over HTTPS (camera and
motion sensors require a secure context; `http://localhost` is the only
exception). Do not cache `sw.js` aggressively at the CDN — the browser must be
able to see updates.

## After deploying — verify

- [ ] The root URL renders the onboarding screen (Arabic, RTL).
- [ ] DevTools → Network shows **no** `fonts.googleapis.com` or
      `fonts.gstatic.com` requests; fonts load from `/assets/*.woff2`.
- [ ] Application → Manifest: 192, 512 and maskable 512 PNG icons resolve;
      "Install" is offered where supported.
- [ ] Application → Service Workers: `sw.js` is active with scope `/`.
- [ ] Load the app once online, then switch DevTools to **Offline** and reload:
      the shell, map and fonts still render.
- [ ] On a phone over HTTPS: Settings → **Device check** reports the real
      camera permission, decodes the demo QR, and shows live accelerometer /
      heading events (or an honest failure if the device has no sensors).
- [ ] QR and motion still fail honestly outside HTTPS; they must not claim
      working sensors.

## Updating a deployment

Rebuild and redeploy. Vite fingerprints assets, `sw.js` bumps its cache version,
and the old caches are removed on activation. A visitor keeps working offline
on the previous build until the new service worker activates on their next
online load.
