# ATHAR — design notes for the signage redesign

Date: 2026-10-24 · Scope: **skin only** · Safety tag: `demo-safe` (tagged before the first
edit; nothing in this pass touches positioning, routing, scenario code, tests' logic or data).

## 1. The idea in one line

The app should read like the signage system of a serious museum — quiet, legible,
Arabic-first — with exactly one loud element: the instruction banner at the top of the map,
built like a museum/airport sign (dark ink bar, large turn arrow, distance in big numerals,
the instruction in plain Arabic, the hall underneath).

## 2. Tokens

Written to `tailwind.config.js` (colours, type, radii, shadow) and `src/tailwind.css`
(`.ui-*`, `.sign`, `.sheet`, `.reading`, focus ring). Nothing is hard-coded per page except
the floor-plan SVG fills, which mirror the same hexes.

### Colour

| Token | Hex | Used for | Contrast measured |
| --- | --- | --- | --- |
| `stone` | `#E9E8E3` | app background — cool grey, not cream | — |
| `stone-100/200/300` | `#F2F1EC` / `#DFDED8` / `#D5D3CB` | inset fields, floor-plan hall fills, rules | — |
| `surface` | `#FFFFFF` | sheets, inputs, print pages | — |
| `ink` | `#1C2128` | body text, the banner, floor-plan walls | 13.19:1 on stone · 16.18:1 on white |
| `ink-soft` | `#4A5058` | secondary text | 6.64:1 on stone |
| `ink-muted` | `#5E646B` | labels, units, captions | 4.87:1 on stone · 5.98:1 on white |
| `rule` | `#D5D3CB` | hairline dividers, 1.5 px walls on the plan | — |
| `lapis` | `#2A4BA0` | route line, you-are-here dot, primary actions | 8.04:1 on white · 6.55:1 on stone |
| `carnelian` | `#B4382B` | destination marker only (plus route-error text) | 5.93:1 on white |
| `ochre` | `#8F5A10` | warnings, closed hall, low confidence | 5.77:1 on white |
| `malachite` | `#2C7A58` | arrival / success only | 5.21:1 on white |

White on `ink` is 16.18:1; the banner's secondary line (`white/70`) computes to 8.24:1 on
ink. Every text/background pair in the shipped UI is ≥ 4.5:1 (AA for normal text); no gold,
no gradients, no glow anywhere in `src/nav/`.

### Type

One family for the whole UI: **IBM Plex Sans Arabic** (Arabic subsets) with **IBM Plex
Sans** (Latin, self-hosted variable), both via `@fontsource`, declared in `src/fonts.css`
with `unicode-range` splits so the browser only fetches the script it needs. Long-form
artifact copy uses **Noto Naskh Arabic**, 17 px / 1.8 with a 66-character measure
(`.reading`). Cormorant Garamond is gone from the interface.

Scale: **13 / 15 / 17 / 22 / 30 px** (`xs / sm / base / lg / xl`), weights **400 / 500 /
600**. One step below the scale, **11 px (`micro`)**, exists only for units and captions
inside the dense debug tables. Distances, percentages and rates are tabular (`.num`).

### Radii, shadow, spacing

- Radius: **6 px** inputs/buttons/inset blocks, **12 px** sheets and the banner, **full** for
  status dots, chips and the toggle track.
- Shadow: one token (`sign`) — `0 1px 0 rgba(28,33,40,.10), 0 18px 36px -28px rgba(28,33,40,.55)`.
  Only floating layers use it: the banner, the map sheet, the print page on screen.
- Spacing: the 4 px grid; sections separated by a hairline `rule` rather than by a card.

### Icons

A single Lucide outline set at **1.5 px** stroke, one size per context (16 in dense rows,
17 in buttons, 44 in the banner glyph). No emoji in the navigation UI.

## 3. Review against the banned list, and what changed because of it

Reviewed the token plan before writing screens, then reviewed the rendered screens against
the same list. Changes made as a result:

| Banned pattern | Found in the first pass | Change |
| --- | --- | --- |
| Tracked ALL-CAPS eyebrow above headings | `label` kickers above Settings / Device check / Admin titles, and `P2 · operations` on Admin | eyebrows removed; Admin's is now a plain 13 px label, translated (`تشغيل المتحف` / Museum operations) |
| “WORD — fragment” and middot meta strings (`A · B · C`) | banner meta line, debug map meta line, print cards (`HALL · قاعة`), settings source lines | split into separate labelled spans; print cards use “قاعة / Hall” with no tracking; banner puts the hall on its own line |
| Accenting one word of a headline | none | — |
| Identical rounded cards chopping every screen into boxes | Settings, Device check, Admin (3–4 white `rounded-2xl` cards per screen) | sections are now flat: hairline `rule` separators, insets only where a control needs a well |
| Gradient washes, glassmorphism, glowing dots, blobs | legacy 404 page (dark gradient + blur ghosts) reachable inside the nav shell | replaced with a plain stone page and three plain links (`NotFoundNavPage`) |
| Hieroglyph / eye / pharaoh decoration | eye mark on onboarding | kept — it is the logo mark, onboarding only |
| Fade-and-slide entrances, hover on everything | none | — |
| “→” appended to buttons, 01/02/03 markers | none | — |
| Monospace for small labels | debug panel (`font-mono`, `text-[8px]`, `text-[9.5px]`) | tabular figures in the inherited sans; sizes back on the scale |
| Gold / gradients inside the app | Admin density bar used `#D4B878` gold for crowded halls | `ochre` |
| One radius on everything | `rounded-full` / `rounded-3xl` mixed on Admin and Settings controls | 6 px for controls, full only for dots, chips and tracks |
| Tap targets under 44 px | Admin floor + close-hall buttons, Debug floor toggle, Settings crowd buttons + reset, map sheet handle, map “Search” link, print sheet back link | all `min-h-11` / 44 px (`scripts/layout-check.mjs` now reports zero under-44 targets except the visual switch knob inside a full-row button) |

## 4. Screens touched this pass (in priority order)

- **P0** Onboarding, Map (banner + one bottom sheet with peek/half/full), Search, Artifact,
  QR scan sheet — these were already on the token system; this pass finished the banner
  meta line, sheet snap behaviour, and the scan sheet's copy.
- **P1** Settings (three card stacks → flat ruled sections), Device check (same, plus the
  camera panel and readout table), bottom navigation (4 items, icon + label, 44 px).
- **P2** Debug panel rebuilt as an **instrument report**: one dense aligned table with units
  (m, %, Hz, ms), one single-colour chart with direct labels and no legend
  (`ScenarioChart`), the LIVE / “PAUSED - values are stale” badge kept, and a horizontal-scroll-free
  seven-column summary at 390 px (nearest-artifact accuracy and beacon readings remain in the
  CSV/JSON export). Admin and the print-QR sheet restyled to the same rules; the A4 sheet now
  fits a 360–390 px screen at ~45 % scale instead of overflowing sideways.

## 5. Motion

Only answers a user action: sheet height (220 ms ease), the route polyline drawing once,
the dot advancing with each estimate, the banner re-rendering a new instruction. All of it
is disabled under `prefers-reduced-motion: reduce` (`.sheet` transition and `scroll-behavior`).

## 6. Screenshots

`docs/redesign/` holds 390×844 captures of every redesigned screen in both directions:
`after-01…after-11-{rtl,ltr}.png`, plus `after-09b-debug-full-{rtl,ltr}.png` (the whole debug
report in one tall capture) and `after-12-offline-demo.png` (demo build with the server killed).

**Honest limitation:** the pre-redesign shell was never committed, so a *before* frame exists
only for the three screens that were captured during the earlier audit —
`before-02-map-rtl.png`, `before-06-qr-rtl.png`, `before-09-debug-rtl.png` (dark navy + gold).
Those three are the ones where the change is visible most clearly; for the other screens the
before/after record is this document plus the git tag `demo-safe`.

## 7. Verification (run in this workspace)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 99 passed / 10 files |
| `npm run build` | ok (full build, legacy retained) |
| `npm run build:demo` | ok — `dist/` 1.1 MB |
| Font payload | 8 woff2 files, **326 KB** total (limit 450 KB) |
| Offline on demo build with the origin killed | app boots, 8/8 fonts `loaded`, IBM Plex Sans Arabic + Noto Naskh available (`after-12-offline-demo.png`) |
| Layout audit at 390×844 and 360×640 (`scripts/layout-check.mjs`) | no horizontal scroll on any route; no sub-44 px targets outside the switch knob |
