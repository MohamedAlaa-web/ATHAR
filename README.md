# ATHAR (أثر) — Interactive Museum Experience Prototype

Concept prototype for academic evaluation. **Not affiliated with or approved by the Grand Egyptian Museum.**

## What is built

- **Home** (`/`) — wordmark, hero, "Every artifact has a story / وراء كل أثر حكاية", Start Exploring + Try a Demo Scan, how-it-works, featured artifacts.
- **Scanner demo** (`/scan`) — camera-style frame, demo QR, scanning animation, **Simulate Scan** → success state → artifact page; manual fallback list; optional experimental device-camera preview (never mandatory, never faked as a real scan).
- **Artifact pages** (`/artifact/:id`) — 3 distinct demo records (royal mummy, painted coffin, royal statue), period, significance, QR/demo code, related artifacts.
- **Cinematic story player** (`/artifact/:id/story`) — storyboard prototype (local SVG scenes + timed chapters): play/pause, timeline scrub, restart, mute/volume (speech narration), captions toggle, fullscreen, chapter navigation, known-vs-reconstruction labelling.
- **Historical facts** (`/artifact/:id/facts`) — facts, context, significance, known vs. uncertain, source notes.
- **Explore** (`/explore`) — illustrative stylized map (labelled illustrative, no real floor plan) + curated stops.
- **Bilingual AR/EN** with RTL/LTR switch, persisted in `sessionStorage`; full dictionaries in `src/i18n/dictionaries.ts`.
- **Presentation Demo** — floating gold button, 6-step ~2-minute guided overlay (home → scan → artifact → story → facts → explore) with disclosure.

## Run locally

Requirements: Node 18+, Windows PowerShell (for SAPI narration), ffmpeg for video.

```powershell
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview the build
npm test         # vitest: 16 tests (data, i18n EN/AR/FR, QR, media honesty)
```

Or double-click `run-athar.bat` (serves `dist/` + opens the browser).

## Languages, audio, video, QR

- **AR/EN/FR** with RTL/LTR, persisted in `sessionStorage`. Facts/known-vs-uncertain
  show English with a visible badge where FR translation is pending.
- **Listen button** on every artifact page: real English studio-preview MP3
  (Windows SAPI voice, honestly labeled “synthetic preview”); AR/FR use an
  explicitly labeled in-browser voice preview. No autoplay, no overlap.
- **Story player**: genuine HTML-video chapters (Ken Burns films over real
  photos + EN narration) with seek/volume/fullscreen and selectable
  EN/AR/FR WebVTT subtitles. Falls back to the labeled storyboard player
  only if a film file is missing.
- **QR**: `/#/artifact/MUMMY-001` (codes or slugs resolve; unknown codes get a
  helpful page). `/#/print` renders genuinely encoded, printable QR cards for
  the current server address. Set `VITE_DEPLOY_URL=https://…` at build time
  for production codes. `/#/admin` is a read-only dev media board (see ADMIN.md).

## Media pipeline (all local, no API keys)

```powershell
node scripts/export-narration.mjs   # dump texts from the data model
powershell -ExecutionPolicy Bypass -File scripts/gen-audio.ps1  # SAPI EN WAVs
node scripts/build-media.mjs        # MP3 + MP4 + WebVTT + validation
node scripts/validate-media.mjs     # re-verify manifest vs disk (exit 1 on lie)
```

Output: 14 MP3 narrations, 11 MP4 chapter films (~2:16 mummy total),
33 WebVTT subtitle tracks. `src/data/media-status.json` is the UI’s honesty
gate — players only claim media that is listed there with real bytes.

Works offline after install: all 15 photographs are bundled locally in `public/assets/`; fonts degrade gracefully offline. No API keys, no backend, no auth.

## Photo credits (all freely licensed)

| File | Source / license |
|---|---|
| photo-hero-museum.jpg (Tutankhamun mask, GEM) | Wikimedia Commons · CC BY-SA 4.0 · Egyptiankeng |
| photo-art-mummy.jpg (mummy of Ramesses II) | Wikimedia Commons · Public domain (1912 photo by G. Elliot Smith) |
| photo-art-coffin.jpg | Wikimedia Commons · CC0 · Gary Todd |
| photo-art-statue.jpg (Ramesses II, **Karnak — NOT the Grand Egyptian Museum**) | Wikimedia Commons · CC BY-SA 4.0 · MusikAnimal |
| photo-scene-nile.jpg (Nile sunset, Luxor) | Wikimedia Commons · CC BY 4.0 · Vyacheslav Argenberg |
| photo-scene-temple.jpg (Karnak hypostyle) | Wikimedia Commons · CC BY 3.0 · Tim Adams |
| photo-scene-rite.jpg (weighing of the heart) | Wellcome Collection via Commons · CC BY 4.0 |
| photo-scene-embalm.jpg (canopic jars KV55) | Wikimedia Commons · CC BY-SA 4.0 · Merytat3n |
| photo-scene-journey.jpg (Valley of the Kings) | Wikimedia Commons · CC BY 4.0 · Vyacheslav Argenberg |
| photo-scene-coffin-outer.jpg (Lahun coffin lid) | Wikimedia Commons · CC BY-SA 4.0 · SpeakingArch |
| photo-scene-coffin-sky.jpg (Senenmut ceiling) | MET Open Access via Commons · CC0 (facsimile by Charles Wilkinson) |
| photo-scene-coffin-text.jpg (Medinet Habu) | Wikimedia Commons · CC BY 4.0 · Vyacheslav Argenberg |
| photo-scene-quarry.jpg (Aswan unfinished obelisk) | Wikimedia Commons · CC BY-SA 3.0 · Kriplozoik |
| photo-scene-sculptor.jpg (Pendua statue, Museo Egizio) | Museo Egizio Turin via Commons · CC0 |
| photo-scene-offering.jpg (Nespekashuty relief) | MET Open Access via Commons · CC0 |

The lead mummy photograph shows the mummy of Ramesses II as an illustrative example; the story remains a generalized educational reconstruction (noted in-app under the photo).

## Open questions for human (Egyptologist) review

1. Mummy story: verify the “~70 days” framing and natron/oil generalities hold for a *generalized* New Kingdom account (no individual claims are made — by design).
2. Coffin story: the Lahun lid photo is Third Intermediate Period style; confirm the “coffin as cosmos” summary is appropriate at demo generality.
3. Statue story: quarry-to-temple logistics summarized in ~25s — flag any overstatement.
4. French translations of chapter narrations have not been reviewed by a native speaker.
5. AR/FR studio narration and cinematic live footage are pending (see PRODUCTION-SPEC.md) — current synthetic voice + Ken Burns films are honestly labeled in-app.

Hash routing (`HashRouter`) is used so the build also runs from `file://` / static preview without server rewrites.

## Demo journeys (professor checklist, ~2 min each)

1. **Journey 1:** Home → Try a Demo Scan → pick `MUMMY-001` → Simulate Scan → Open artifact → Watch the Cinematic Story → Open historical facts.
2. **Journey 2:** Home → Start Exploring → open Painted Coffin → Watch story → jump chapters → open a related artifact.
3. **Journey 3:** Switch EN → عربي → layout flips to RTL → play the mummy story with Arabic narration/captions.
4. **Journey 4:** Mummy story → chapter list → select chapter 4 → back to full story → facts → related artifacts.
5. **Guided:** press ▶ Presentation Demo (bottom corner) and follow the 6 steps.

## Simulated vs. real

- QR scanning is **simulated** (animation + explicit labels); camera preview is optional framing only.
- Story "video" is a **storyboard prototype** (timed scenes + optional speech-synthesis narration), labelled in-player.
- All artifact records are **demo records** — no invented inventory numbers, provenance, or gallery positions; map labelled illustrative.
- Interpretive scenes carry a **"cinematic reconstruction"** note; facts page separates known vs. uncertain; no fabricated citations.

## Structure

```
src/
  config.ts                    # DEPLOY_BASE_URL + QR URL builder (never localhost by accident)
  data/artifacts.ts        # artifact model + 3 demo records (EN/AR/FR content)
  data/media.ts            # per-chapter media states (planned…ready) + isMediaReady gate
  data/media-status.json   # GENERATED: verified bytes/durations (written by scripts)
  i18n/dictionaries.ts     # EN/AR/FR UI strings
  i18n/content.ts          # trilingual content pickers with English fallback
  i18n/LanguageContext.tsx # RTL/LTR + session persistence
  components/              # AppLayout, ArtifactCard, NarrationPlayer, CinematicPlayer,
                           # CinematicVideoPlayer, QRCard, DemoQR, PresentationDemo
  pages/                   # Home, Scanner, ArtifactDetail, StoryPlayer, Facts,
                           # Explore, PrintPage, AdminPage, NotFoundPage
  utils/helpers.ts         # asset URLs, timeline math
  styles.css               # design system (#101820, #17191C, #C6A15B, #F4EFE6, #A9ADB3)
public/assets/*.jpg        # 15 local real photos (offline-safe)
public/assets/media/       # GENERATED: audio/*.mp3, video/*.mp4, subs/*.vtt
scripts/                   # export-narration, gen-audio, build-media, validate-media
ADMIN.md                   # local content-admin workflow
```
