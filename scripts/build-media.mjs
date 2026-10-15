// Builds real chapter media: MP3 narration, MP4 Ken Burns films, WebVTT subtitles.
// Then validates everything and writes src/data/media-status.json (the UI's
// single gate for claiming media exists).
// Run from project root: node scripts/build-media.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sh = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'pipe', shell: true }).toString();

const OUT_A = 'public/assets/media/audio';
const OUT_V = 'public/assets/media/video';
const OUT_S = 'public/assets/media/subs';
for (const d of [OUT_A, OUT_V, OUT_S]) fs.mkdirSync(path.join(ROOT, d), { recursive: true });

// Refresh texts + durations from the data model (source of truth).
sh('node scripts/export-narration.mjs');
const { chapters, intros } = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/work/narration.json'), 'utf8'));

const status = { files: {} };
const ff = (f) => `"${path.join(ROOT, f)}"`;

function probeDur(f) {
  const out = sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${ff(f)}`).trim();
  return parseFloat(out);
}

// 1. MP3s (chapters + intros): 22kHz mono, small files.
for (const c of [...chapters, ...intros]) {
  const wav = `scripts/work/wav/${c.key.replace('/', '-')}.wav`;
  const mp3 = c.key.endsWith('/intro')
    ? `${OUT_A}/narration-${c.key.replace('/', '-')}-en.mp3`
    : `${OUT_A}/narration-${c.key.replace('/', '-')}-en.mp3`;
  sh(`ffmpeg -y -v error -i ${ff(wav)} -ac 1 -ar 22050 -b:a 64k ${ff(mp3)}`);
  const bytes = fs.statSync(path.join(ROOT, mp3)).size;
  status.files[mp3.replace('public/assets/', '')] = { bytes, durationSec: Math.round(probeDur(mp3) * 10) / 10 };
  console.log('mp3', mp3, status.files[mp3.replace('public/assets/', '')].durationSec + 's');
}

// 2. MP4s: Ken Burns drift over the real photo + narration padded to durationSec.
chapters.forEach((c, i) => {
  const D = c.targetSec;
  const frames = Math.round(D * 30);
  const zoom = i % 2 === 0
    ? `z='min(1.0+0.10*on/${frames},1.10)'`
    : `z='max(1.10-0.10*on/${frames},1.0)'`;
  const mp3 = `${OUT_A}/narration-${c.key.replace('/', '-')}-en.mp3`;
  const mp4 = `${OUT_V}/chapter-${c.key.replace('/', '-')}.mp4`;
  const vf = `[0:v]scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440,zoompan=${zoom}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720:fps=30[v];[1:a]apad=whole_dur=${D}[a]`;
  sh(`ffmpeg -y -v error -loop 1 -framerate 30 -i ${ff(c.photo)} -i ${ff(mp3)} -filter_complex "${vf}" -map "[v]" -map "[a]" -t ${D} -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart ${ff(mp4)}`);
  const bytes = fs.statSync(path.join(ROOT, mp4)).size;
  status.files[mp4.replace('public/assets/', '')] = { bytes, durationSec: Math.round(probeDur(mp4) * 10) / 10 };
  console.log('mp4', mp4, (bytes / 1048576).toFixed(1) + 'MB');
});

// 3. WebVTT subtitles: sentences distributed proportionally across the duration.
function sentences(text) {
  const m = text.match(/[^.!?؟…\n]+[.!?؟…]+["»”]?/g);
  const parts = (m && m.length ? m : [text]).map((s) => s.trim()).filter(Boolean);
  return parts;
}
function ts(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(h)}:${p(m)}:${p(Math.floor(s))}.${String(Math.floor((s % 1) * 1000)).padStart(3, '0')}`;
}
for (const c of chapters) {
  const D = c.targetSec;
  for (const lang of ['en', 'ar', 'fr']) {
    const sents = sentences(c[lang]);
    const total = sents.join(' ').length || 1;
    let t = 0;
    let vtt = 'WEBVTT\n\n';
    sents.forEach((s, k) => {
      const share = k === sents.length - 1 ? D - t : Math.max(1.2, (D * s.length) / total);
      const end = k === sents.length - 1 ? D : Math.min(D, t + share);
      vtt += `${ts(t)} --> ${ts(end)}\n${s}\n\n`;
      t = end;
    });
    const rel = `${OUT_S}/${c.key.replace('/', '-')}.${lang}.vtt`;
    fs.writeFileSync(path.join(ROOT, rel), vtt, 'utf8');
    status.files[rel.replace('public/assets/', '')] = { bytes: Buffer.byteLength(vtt), durationSec: D };
  }
  console.log('vtt', c.key);
}

fs.writeFileSync(path.join(ROOT, 'src/data/media-status.json'), JSON.stringify(status, null, 1));
const n = Object.keys(status.files).length;
console.log(`STATUS WRITTEN: ${n} files`);
