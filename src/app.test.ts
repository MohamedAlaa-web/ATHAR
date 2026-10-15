import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ARTIFACTS, getArtifact, getArtifactByCode, PHOTO_CREDITS, totalStoryDuration } from './data/artifacts';
import { ARTIFACT_INTRO_AUDIO, CHAPTER_MEDIA, isMediaReady } from './data/media';
import { artifactUrl } from './config';
import { STRINGS } from './i18n/dictionaries';
import { fmtTime, locateChapter } from './utils/helpers';

describe('artifact data model', () => {
  it('has at least three fully navigable artifacts with distinct content', () => {
    expect(ARTIFACTS.length).toBeGreaterThanOrEqual(3);
    const ids = new Set(ARTIFACTS.map((a) => a.id));
    expect(ids.size).toBe(ARTIFACTS.length);
    const names = new Set(ARTIFACTS.map((a) => a.nameEn));
    expect(names.size).toBe(ARTIFACTS.length);
  });

  it('every artifact has chapters, facts, related links and demo codes', () => {
    for (const a of ARTIFACTS) {
      expect(a.id).toBeTruthy();
      expect(a.qrCode).toBeTruthy();
      expect(a.demoCode).toBeTruthy();
      expect(a.chapters.length).toBeGreaterThanOrEqual(3);
      expect(a.facts.length).toBeGreaterThanOrEqual(3);
      expect(a.relatedIds.length).toBeGreaterThanOrEqual(1);
      // bilingual completeness
      expect(a.nameAr).toBeTruthy();
      expect(a.descriptionAr).toBeTruthy();
      for (const c of a.chapters) {
        expect(c.titleAr).toBeTruthy();
        expect(c.narrationAr).toBeTruthy();
        expect(c.durationSec).toBeGreaterThan(0);
      }
    }
  });

  it('related ids resolve to real artifacts (no dead cards)', () => {
    for (const a of ARTIFACTS) {
      for (const r of a.relatedIds) {
        expect(getArtifact(r), `${a.id} -> ${r}`).toBeDefined();
      }
    }
  });

  it('demo scanner codes resolve to the correct artifact', () => {
    expect(getArtifactByCode('MUMMY-001')?.id).toBe('royal-mummy');
    expect(getArtifactByCode('athar-coffin-002')?.id).toBe('painted-coffin');
    expect(getArtifactByCode('STATUE-003')?.id).toBe('royal-statue');
    expect(getArtifactByCode('ATHAR-MUMMY-001')?.id).toBe('royal-mummy');
    expect(getArtifactByCode('nope-000')).toBeUndefined();
  });

  it('royal mummy story has the five required chapters in order', () => {
    const mummy = getArtifact('royal-mummy');
    expect(mummy).toBeDefined();
    expect(mummy!.chapters.length).toBe(5);
    expect(totalStoryDuration(mummy!)).toBeGreaterThan(60);
  });

  it('every photo used in data has a license credit entry', () => {
    const used = new Set<string>();
    for (const a of ARTIFACTS) {
      used.add(a.image.src);
      for (const c of a.chapters) used.add(c.image.src);
    }
    expect(used.size).toBeGreaterThanOrEqual(10);
    for (const src of used) {
      expect(PHOTO_CREDITS[src], `missing credit: ${src}`).toBeTruthy();
      expect(src.endsWith('.jpg')).toBe(true);
    }
  });
});

describe('i18n dictionaries', () => {
  const keys = Object.keys(STRINGS.en);
  it('arabic covers every english key (no half-translated UI)', () => {
    expect(keys.length).toBeGreaterThan(30);
    for (const k of keys) {
      expect(STRINGS.ar[k], `missing ar: ${k}`).toBeTruthy();
    }
  });
  it('french covers every english key', () => {
    for (const k of keys) {
      expect(STRINGS.fr[k], `missing fr: ${k}`).toBeTruthy();
    }
  });
  it('every artifact and chapter has full french content', () => {
    for (const a of ARTIFACTS) {
      expect(a.nameFr, a.id).toBeTruthy();
      expect(a.taglineFr, a.id).toBeTruthy();
      expect(a.descriptionFr, a.id).toBeTruthy();
      expect(a.significanceFr, a.id).toBeTruthy();
      expect(a.contextFr, a.id).toBeTruthy();
      for (const c of a.chapters) {
        expect(c.titleFr, c.id).toBeTruthy();
        expect(c.narrationFr, c.id).toBeTruthy();
      }
    }
  });
});

describe('qr destinations', () => {
  it('demo codes and qr codes resolve to the correct artifact pages', () => {
    expect(getArtifactByCode('MUMMY-001')?.id).toBe('royal-mummy');
    expect(getArtifactByCode('COFFIN-002')?.id).toBe('painted-coffin');
    expect(getArtifactByCode('STATUE-003')?.id).toBe('royal-statue');
    expect(getArtifactByCode('ATHAR-MUMMY-001')?.id).toBe('royal-mummy');
  });
  it('invalid codes resolve to nothing (not-found page handles them)', () => {
    expect(getArtifact('NOPE')).toBeUndefined();
    expect(getArtifactByCode('QR-404')).toBeUndefined();
  });
  it('artifact urls encode the configured base, never localhost by accident', () => {
    expect(artifactUrl('https://museum.example.org', 'MUMMY-001')).toBe(
      'https://museum.example.org/#/artifact/MUMMY-001'
    );
    expect(artifactUrl('https://museum.example.org/', 'COFFIN-002')).toBe(
      'https://museum.example.org/#/artifact/COFFIN-002'
    );
  });
});

describe('media manifest honesty', () => {
  const pub = (f: string) => path.join(process.cwd(), 'public', 'assets', f);
  it('every asset marked ready exists on disk with real bytes', () => {
    let ready = 0;
    for (const m of CHAPTER_MEDIA) {
      const files = [
        m.narration.en.file, m.subtitles.en.file, m.subtitles.ar.file,
        m.subtitles.fr.file, m.video.file
      ];
      for (const f of files) {
        if (!f) continue;
        const st = fs.statSync(pub(f), { throwIfNoEntry: false } as never) as unknown as { size: number } | undefined;
        expect(st, `missing: ${f}`).toBeDefined();
        // Binary media must be substantial; text subtitles just need real cues.
        expect(st!.size).toBeGreaterThan(f.endsWith('.vtt') ? 80 : 1000);
        if (f.endsWith('.vtt')) {
          const body = fs.readFileSync(pub(f), 'utf8');
          expect(body.startsWith('WEBVTT')).toBe(true);
          expect(body).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3} --> /);
        }
        ready++;
      }
    }
    expect(ready).toBeGreaterThanOrEqual(11 * 5 - 5);
    for (const [id, intro] of Object.entries(ARTIFACT_INTRO_AUDIO)) {
      const st = fs.statSync(pub(intro.file), { throwIfNoEntry: false } as never) as unknown as { size: number } | undefined;
      expect(st, `missing intro: ${id}`).toBeDefined();
      expect(st!.size).toBeGreaterThan(1000);
    }
  });
  it('isMediaReady agrees with the manifest for chapter videos', () => {
    for (const m of CHAPTER_MEDIA) {
      if (m.video.state === 'ready') {
        expect(isMediaReady(m.video.file), m.key).toBe(true);
      }
    }
  });
  it('unavailable tracks stay unavailable (ar/fr studio audio)', () => {
    for (const m of CHAPTER_MEDIA) {
      expect(m.narration.ar.state).toBe('unavailable');
      expect(m.narration.fr.state).toBe('unavailable');
      expect(m.narration.ar.file).toBeNull();
    }
  });
});

describe('story timeline helpers', () => {
  it('formats time and locates chapters', () => {
    expect(fmtTime(65)).toBe('1:05');
    expect(fmtTime(0)).toBe('0:00');
    const loc = locateChapter([24, 26, 24], 30);
    expect(loc.index).toBe(1);
    const last = locateChapter([10, 10], 25);
    expect(last.index).toBe(1);
  });
});
