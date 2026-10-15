// Exports EN narration texts + photo mapping for the media pipeline.
// Run: node scripts/export-narration.mjs   (from project root)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WORK = path.join(ROOT, 'scripts', 'work');
fs.mkdirSync(WORK, { recursive: true });

execSync('npx esbuild src/data/artifacts.ts --bundle --platform=node --format=esm --outfile=scripts/work/artifacts.bundle.mjs --log-level=error', { cwd: ROOT, stdio: 'inherit', shell: true });
const { ARTIFACTS } = await import('./work/artifacts.bundle.mjs');

const chapters = [];
for (const a of ARTIFACTS) {
  for (const c of a.chapters) {
    chapters.push({
      key: `${a.id}/${c.id}`,
      artifactId: a.id,
      chapterId: c.id,
      photo: `public/assets/${c.image.src}`,
      en: c.narrationEn,
      ar: c.narrationAr,
      fr: c.narrationFr,
      targetSec: c.durationSec
    });
  }
}
const intros = ARTIFACTS.map((a) => ({
  key: `${a.id}/intro`,
  artifactId: a.id,
  en: a.descriptionEn,
  targetSec: null
}));

fs.writeFileSync(path.join(WORK, 'narration.json'), JSON.stringify({ chapters, intros }, null, 1));
console.log(`exported ${chapters.length} chapters + ${intros.length} intros`);
