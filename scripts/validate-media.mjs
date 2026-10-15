// Re-validates every media file declared in src/data/media.ts WITHOUT rebuilding.
// - Checks existence + real bytes on disk
// - Probes audio/video duration with ffprobe (must be > 5s)
// - Checks WebVTT files start with WEBVTT and contain timed cues
// - Rewrites src/data/media-status.json (the UI's honesty gate)
// Exit code 0 = all declared 'ready' files verified. Exit 1 = problems found.
// Run from project root: node scripts/validate-media.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sh = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'pipe', shell: true }).toString().trim();
const pub = (f) => path.join(ROOT, 'public', 'assets', f);

execSync('npx esbuild src/data/media.ts --bundle --platform=node --format=esm --outfile=scripts/work/media.bundle.mjs --log-level=error', { cwd: ROOT, stdio: 'inherit', shell: true });
const { CHAPTER_MEDIA, ARTIFACT_INTRO_AUDIO } = await import('./work/media.bundle.mjs');

let failures = 0;
const status = { files: {} };

function checkFile(rel, kind) {
  const full = pub(rel);
  if (!fs.existsSync(full)) { console.log(`MISSING  ${rel}`); failures++; return; }
  const bytes = fs.statSync(full).size;
  const minBytes = kind === 'vtt' ? 80 : 1000;
  if (bytes < minBytes) { console.log(`TOO SMALL (${bytes}B)  ${rel}`); failures++; return; }
  let durationSec = null;
  if (kind === 'audio' || kind === 'video') {
    try {
      durationSec = Math.round(parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${full}"`)) * 10) / 10;
    } catch { /* ignore */ }
    if (!durationSec || durationSec < 5) { console.log(`BAD DURATION (${durationSec}s)  ${rel}`); failures++; return; }
  } else {
    const body = fs.readFileSync(full, 'utf8');
    if (!body.startsWith('WEBVTT') || !/\d{2}:\d{2}:\d{2}\.\d{3} --> /.test(body)) {
      console.log(`BAD VTT  ${rel}`); failures++; return;
    }
    durationSec = null;
  }
  status.files[rel] = { bytes, durationSec };
  console.log(`OK  ${rel}  ${bytes}B${durationSec ? `  ${durationSec}s` : ''}`);
}

for (const m of CHAPTER_MEDIA) {
  for (const l of ['en', 'ar', 'fr']) {
    if (m.narration[l].file) checkFile(m.narration[l].file, 'audio');
    if (m.subtitles[l].file) checkFile(m.subtitles[l].file, 'vtt');
  }
  if (m.video.file) checkFile(m.video.file, 'video');
}
for (const intro of Object.values(ARTIFACT_INTRO_AUDIO)) {
  if (intro.file) checkFile(intro.file, 'audio');
}

fs.writeFileSync(path.join(ROOT, 'src/data/media-status.json'), JSON.stringify(status, null, 1));
console.log(failures === 0 ? `ALL VERIFIED: ${Object.keys(status.files).length} files` : `${failures} PROBLEMS FOUND`);
process.exit(failures === 0 ? 0 : 1);
