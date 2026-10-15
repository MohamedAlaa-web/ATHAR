# ATHAR — Cinematic Footage Production Specification (Phase 3)

Status: **SPECIFICATION ONLY — no AI footage has been generated.** Current
films are honest Ken Burns assemblies (real photos + drift + narration).
This document defines exactly what a production team must deliver to replace
them, chapter by chapter, without touching the app's media contract.

## Replacement contract (must hold for a drop-in swap)

- One MP4 per chapter, same filename under `public/assets/media/video/`.
- H.264, 1280×720, ≤30fps, AAC audio, `+faststart`.
- Duration MUST equal the chapter's `durationSec` in `src/data/artifacts.ts`
  (players, timelines, and subtitles are timed to it).
- Must contain an English narration mix OR no baked narration (then set the
  chapter's `narration.en.state` to `unavailable` so the app plays the MP3).
- After swapping: run `node scripts/validate-media.mjs` (exit 0 required),
  then `npm test && npm run build`.

## Per-chapter shot briefs (all reconstructions labeled in-app already)

Visual grammar for every film: open on the REAL artifact photo (2s),
dissolve into reconstruction, return to the real artifact for the final 2s.
Slow push-ins only; no fast cuts; muted gold/navy grade matching the app.

- **royal-mummy/ch-life (27s):** Nile felucca at dawn → market/fields daily
  life → scribes and builders → priests at festival. No identifiable person.
- **royal-mummy/ch-royal (29s):** Temple pylons → hypostyle columns →
  festival procession → royal regalia close-ups. Generalized kingship only.
- **royal-mummy/ch-death (25s):** Lamplight interior → mourning family
  (no faces in grief close-up) → offering table → prayers at dusk.
- **royal-mummy/ch-mummification (28s):** Workshop tools → natron/oils/linen
  macro → wrapping hands (respectful, no body horror) → amulets.
- **royal-mummy/ch-journey (27s):** Barque on Nile → western cliffs →
  tomb sealing → stars. Ends on Valley of the Kings photo.
- **painted-coffin/cf-outer (19s):** Coffin rotation → collar/eye macro →
  sunrise over east bank.
- **painted-coffin/cf-sky (23s):** Lid interior → Nut arching with stars →
  slow star-field drift (matches Senenmut ceiling reference).
- **painted-coffin/cf-words (21s):** Hieroglyph columns macro → priest
  reciting (voice) → offering items.
- **royal-statue/st-stone (25s):** Aswan quarry → splitting/transport →
  sculptor's mallet macro.
- **royal-statue/st-pose (28s):** Full statue reveal → foot/fist/gaze
  macro sequence → insignia details.
- **royal-statue/st-memory (24s):** Temple court → offerings placed →
  festival crowd → name cartouche macro.

## Audio deliverables per chapter

- Studio narration WAV 48kHz/24-bit mono in EN (+ AR/FR when cast).
  Drop EN MP3 at the manifest path, or supply WAV and re-run
  `node scripts/build-media.mjs` to re-mux (keeps durations honest).
- If a pro reading runs LONGER than `durationSec`, the pipeline pads —
  instead, re-time: update `durationSec`, re-run VTT + validate.

## Acceptance (human)

Egyptologist review of scripts (facts vs. reconstruction labels intact),
voice-director sign-off, and `validate-media.mjs` exit 0. Nothing here is
generated until those files land in `public/assets/media/`.
