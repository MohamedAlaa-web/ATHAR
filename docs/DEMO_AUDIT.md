# ATHAR — Demo Audit (Phase 1)

Date: 2026-10-23 · Repo: `MohamedAlaa-web/ATHAR` · Audited commit: `d81b6c7`

## 1. Stack and commands (verified)

| Item | Value |
| --- | --- |
| Framework | React 18 + TypeScript 5.6 + Vite 5 |
| Routing | `react-router-dom` v6, **HashRouter** (`#/artifact/...`) — refresh-safe on static hosts |
| Package manager | npm (`package-lock.json` present) |
| State | React context only (`LanguageContext`), no backend, no database |
| Base path | `base: './'` in `vite.config.ts` |
| Scripts | `npm run dev`, `npm run build` (`tsc -b && vite build`), `npm test` (`vitest run`), `npm run preview` |

Commands run during audit:

```
npm test                                  → 16 passed (src/app.test.ts)
npx tsc -b                                → clean
npx vite build                            → success
```

## 2. What already works

- Full visitor flow: Home → Scan → Artifact → Story (video/storyboard) → Facts → Related.
- Trilingual UI (EN/AR/FR) with RTL/LTR switching persisted in `sessionStorage`.
- 3 demo artifacts (`royal-mummy`, `painted-coffin`, `royal-statue`) with chapters, facts,
  known/uncertain split, photo notes, and license credits on disk.
- Real media: 14 narration MP3, 11 chapter MP4 (720p, faststart), 33 WebVTT tracks,
  validated by `scripts/validate-media.mjs` (58/58). Media honesty gate
  (`media-status.json` + `isMediaReady`) prevents claiming missing assets.
- Working QR **generation** (`QRCard` via `qrcode`), printable card sheet at `/#/print`,
  configurable origin via `VITE_DEPLOY_URL`.
- Language, 404, admin and print pages; 16 unit tests covering data, i18n, QR URL building
  and the media manifest.

## 3. What is broken or missing

| # | Severity | Finding |
| --- | --- | --- |
| B1 | **P1 blocker** | `ScannerPage` opens the camera but **never decodes** anything. The “Simulate Scan” button is a timer — the UI even says “Simulated scan”. No QR value parsing, no validation, no routing from a real scan. |
| B2 | **P1 blocker** | No indoor positioning feature at all: no room model, map, providers, fusion, nearest-artifact logic, or tests. |
| B3 | **P2** | Scanner copy labels the camera “experimental” and implies framing-only; no secure-context / permission guidance, no camera-unavailable fallback messaging beyond a single line. |
| B4 | **P2** | No documentation of hardware limits (Wi-Fi RSSI/RTT, BLE RSSI, motion permissions) — a demo risks over-claiming. |
| B5 | **P3** | Presentation demo does not mention the positioning demo. |
| B6 | **P3** | No `docs/` folder, no runbook, no test report. |

## 4. Hardware / credential dependencies (not available in this environment)

- **Real camera QR decoding**: code path is implemented, but no physical camera or phone was
  available to the agent at build time. Verified instead with a synthetic frame fed through the
  same decoder function (see `DEMO_TEST_REPORT.md`).
- **Wi-Fi RSSI / RTT**: no browser API exposes surrounding AP measurements. `WifiPositionProvider`
  reports `unavailable` unless a native/desktop bridge is injected. Not tested on hardware.
- **BLE RSSI**: Web Bluetooth does not expose advertisement RSSI or scan results. Provider reports
  `unavailable`; only device-capability detection is implemented.
- **Motion dead reckoning**: `DeviceMotion`/`DeviceOrientation` implemented; requires HTTPS +
  user permission on iOS. Never executed on a phone during this audit.
- **Deployment**: no hosting credentials were used. No public deployment is claimed.

## 5. Prioritized plan (executed)

1. **P0** Keep build/tests green; never delete media.
2. **P1** Implement real QR decoding (`jsQR` fallback, `BarcodeDetector` when present) + payload
   resolver + manual fallback clearly labelled.
3. **P1** Build `src/positioning/*`: room model, range observation model, multilateration +
   inverse-variance fusion with staleness/bounds/conflict handling, nearest artifact, deterministic
   simulation, evaluation harness, providers with honest capability reporting.
4. **P1/P2** Build `IndoorMap`, `PositioningTestPanel`, `PositioningPage`, route + nav + trilingual copy.
5. **P2** Add tests (positioning + QR + routes/i18n), evaluation report, docs
   (`DEMO_RUNBOOK`, `INDOOR_POSITIONING`, `DEMO_TEST_REPORT`).

## 6. Final status

See `docs/DEMO_TEST_REPORT.md` for the exact commands and measured results, and
`docs/DEMO_RUNBOOK.md` for the professor-facing demo script.
