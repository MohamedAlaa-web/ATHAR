// Phase-2 media audit: durations, streams, loudness, subtitle integrity.
// Run from project root: node scripts/audit-media.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sh = (cmd) => { try { return execSync(cmd, { cwd: ROOT, stdio: 'pipe', shell: true }).toString(); } catch (e) { return (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? ''); } };
const A = 'public/assets/media/audio';
const V = 'public/assets/media/video';
const S = 'public/assets/media/subs';

console.log('=== VIDEO ===');
for (const f of fs.readdirSync(path.join(ROOT, V)).filter((x) => x.endsWith('.mp4')).sort()) {
  const full = path.join(ROOT, V, f);
  const dur = parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${full}"`).trim());
  const vstream = sh(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name,avg_frame_rate -of csv=p=0 "${full}"`).trim().replace(/\n/g, '|');
  const astream = sh(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate -of csv=p=0 "${full}"`).trim().replace(/\n/g, '|');
  const trace = sh(`ffprobe -v trace -i "${full}" 2>&1`);
  const fast = trace.indexOf("type:'moov'") !== -1 && trace.indexOf("type:'moov'") < trace.indexOf("type:'mdat'") ? 'faststart' : 'MOOV-LAST';
  const bytes = fs.statSync(full).size;
  console.log(`${f} | ${dur.toFixed(1)}s | ${vstream} | a:${astream} | ${(bytes / 1048576).toFixed(1)}MB | ${fast}`);
}
console.log('=== AUDIO LOUDNESS (integrated LUFS) ===');
for (const f of fs.readdirSync(path.join(ROOT, A)).filter((x) => x.endsWith('.mp3')).sort()) {
  const full = path.join(ROOT, A, f);
  const out = sh(`ffmpeg -hide_banner -i "${full}" -af ebur128 -f null - 2>&1`);
  const all = [...out.matchAll(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/g)].map((x) => parseFloat(x[1]));
  const m = all.length ? all[all.length - 1].toFixed(1) : null;
  const dur = parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${full}"`).trim());
  console.log(`${f} | ${dur.toFixed(1)}s | ${m !== null ? m + ' LUFS' : 'LOUDNESS-UNKNOWN'}`);
}
console.log('=== SUBTITLES ===');
let cues = 0;
for (const f of fs.readdirSync(path.join(ROOT, S)).filter((x) => x.endsWith('.vtt')).sort()) {
  const body = fs.readFileSync(path.join(ROOT, S, f), 'utf8');
  const times = [...body.matchAll(/(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})/g)];
  const toS = (m, o) => (+m[o]) * 3600 + (+m[o + 1]) * 60 + (+m[o + 2]) + (+m[o + 3]) / 1000;
  let overlap = 0, order = 0;
  for (let i = 0; i < times.length; i++) {
    const s = toS(times[i], 1), e = toS(times[i], 5);
    if (e <= s) order++;
    if (i > 0 && s < toS(times[i - 1], 5)) overlap++;
  }
  cues += times.length;
  const head = body.startsWith('WEBVTT') ? 'ok' : 'BAD-HEADER';
  console.log(`${f} | cues=${times.length} overlap=${overlap} backwards=${order} header=${head}`);
}
console.log(`TOTAL CUES: ${cues}`);
