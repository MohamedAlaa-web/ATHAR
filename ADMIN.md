# ATHAR — Content Administration (local workflow)

There is no backend, no database, and no login. Content lives in typed
TypeScript data files; media lives in `public/assets/media/`. This document
describes the local workflow. Do not expose `/admin` publicly — it is a
read-only dev board (unlinked from the UI) reached directly by URL.

## Files

| Path | Purpose |
|---|---|
| `src/data/artifacts.ts` | Artifact + chapter texts (EN/AR/FR), facts, relations, photo credits |
| `src/data/media.ts` | Per-chapter media states (`planned`…`ready`) + file paths |
| `src/data/media-status.json` | **Generated.** Verified bytes/durations. The UI gate for “exists”. |
| `src/i18n/dictionaries.ts` | All UI strings (EN/AR/FR) |
| `src/i18n/content.ts` | Trilingual content pickers with English fallback |
| `src/config.ts` | `VITE_DEPLOY_URL` build flag for production QR codes |
| `scripts/export-narration.mjs` | Dumps narration texts from the data model |
| `scripts/gen-audio.ps1` | Windows SAPI → English WAVs (synthetic preview voice) |
| `scripts/build-media.mjs` | WAV→MP3, Ken Burns MP4s, WebVTT subs, then validates |
| `scripts/validate-media.mjs` | Re-verifies files ↔ manifest ↔ status JSON (exit 1 on mismatch) |
| `scripts/sync-durations.py` | One-shot: writes measured audio durations into `durationSec` |

## Routine: edit text or replace media

1. Edit `artifacts.ts` / `dictionaries.ts`.
2. If narration text changed: `node scripts/export-narration.mjs`,
   re-run `scripts/gen-audio.ps1`, then `node scripts/build-media.mjs`.
3. If only replacing a photo/video/audio file: drop it in place under
   `public/assets/media/…`, then run `node scripts/validate-media.mjs`.
4. `npm test` (includes manifest↔disk checks), `npm run build`.
5. Open `/#/admin` and confirm green states.

## Audio standard (verified 2026-10-15)

- Current EN tracks: Windows SAPI “Zira”, rate −2, 22.05kHz mono MP3 64kbps.
- Measured integrated loudness: **−20.1…−20.7 LUFS across all 14 files**
  (spread 0.6 LU — uniform, no normalization pass needed).
  Re-check with `node scripts/audit-media.mjs` after any regeneration.

## Importing professional recordings

1. Record per chapter in EN/AR/FR (48kHz WAV mono recommended; dry voice,
   no music — the films carry no music bed by design).
2. Name files EXACTLY per `src/data/media.ts` manifest paths, e.g.
   `public/assets/media/audio/narration-royal-mummy-ch-life-ar.mp3`
   (MP3 64–96kbps mono is enough for voice).
3. In `media.ts`, flip that track’s `state` from `unavailable` →
   `awaiting_review`, then run `node scripts/validate-media.mjs`.
4. After historian + listening review, set `ready`, `npm test`, rebuild.
5. If a pro reading is LONGER than the chapter `durationSec`: do NOT just
   pad — update `durationSec`, re-run `build-media.mjs` (re-times VTT +
   film), re-validate. The video duration must always equal `durationSec`.

## Media states

- `planned` — scripted, no file yet.
- `generating` — pipeline running.
- `awaiting_review` — file exists, needs human (historian) review.
- `ready` — file verified by `validate-media.mjs`. **Only `ready` files play.**
- `unavailable` — intentionally absent (e.g. AR/FR studio audio: no local
  TTS voices). The UI shows an explicitly labeled synthetic-voice preview.
- `failed` — generation/validation failed; UI shows error + retry/fallback.

## What production administration needs (not built)

Real museum deployment needs: a CMS or Git-based editorial flow, audio
recorded by voice actors (AR/EN/FR), professionally produced video, review
sign-off by an Egyptologist, and hosting with a stable public origin for QR
codes (`VITE_DEPLOY_URL=https://… npm run build`).
