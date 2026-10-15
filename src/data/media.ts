/**
 * Media production model for ATHAR cinematic stories.
 *
 * Every narration / subtitle / video asset carries an explicit state.
 * An asset is only 'ready' when its file has been generated AND verified
 * (see scripts/validate-media.mjs, which writes media-status.json).
 * The UI never claims a recording exists unless status is 'ready'.
 */
export type MediaState =
  | 'planned'
  | 'generating'
  | 'awaiting_review'
  | 'ready'
  | 'unavailable'
  | 'failed';

export type Lang3 = 'en' | 'ar' | 'fr';

export interface ChapterMedia {
  /** e.g. "royal-mummy/ch-life" */
  key: string;
  narration: Record<Lang3, { state: MediaState; file: string | null }>;
  subtitles: Record<Lang3, { state: MediaState; file: string | null }>;
  video: { state: MediaState; file: string | null; durationSec: number | null };
}

/** Hand-maintained manifest. Statuses must match scripts output. */
export const CHAPTER_MEDIA: ChapterMedia[] = [
  // Royal mummy (5 chapters)
  ...['ch-life', 'ch-royal', 'ch-death', 'ch-mummification', 'ch-journey'].map((c) => ({
    key: `royal-mummy/${c}`,
    narration: {
      en: { state: 'ready' as MediaState, file: `media/audio/narration-royal-mummy-${c}-en.mp3` },
      ar: { state: 'unavailable' as MediaState, file: null },
      fr: { state: 'unavailable' as MediaState, file: null }
    },
    subtitles: {
      en: { state: 'ready' as MediaState, file: `media/subs/royal-mummy-${c}.en.vtt` },
      ar: { state: 'ready' as MediaState, file: `media/subs/royal-mummy-${c}.ar.vtt` },
      fr: { state: 'ready' as MediaState, file: `media/subs/royal-mummy-${c}.fr.vtt` }
    },
    video: { state: 'ready' as MediaState, file: `media/video/chapter-royal-mummy-${c}.mp4`, durationSec: null as number | null }
  })),
  // Painted coffin (3 chapters)
  ...['cf-outer', 'cf-sky', 'cf-words'].map((c) => ({
    key: `painted-coffin/${c}`,
    narration: {
      en: { state: 'ready' as MediaState, file: `media/audio/narration-painted-coffin-${c}-en.mp3` },
      ar: { state: 'unavailable' as MediaState, file: null },
      fr: { state: 'unavailable' as MediaState, file: null }
    },
    subtitles: {
      en: { state: 'ready' as MediaState, file: `media/subs/painted-coffin-${c}.en.vtt` },
      ar: { state: 'ready' as MediaState, file: `media/subs/painted-coffin-${c}.ar.vtt` },
      fr: { state: 'ready' as MediaState, file: `media/subs/painted-coffin-${c}.fr.vtt` }
    },
    video: { state: 'ready' as MediaState, file: `media/video/chapter-painted-coffin-${c}.mp4`, durationSec: null as number | null }
  })),
  // Royal statue (3 chapters)
  ...['st-stone', 'st-pose', 'st-memory'].map((c) => ({
    key: `royal-statue/${c}`,
    narration: {
      en: { state: 'ready' as MediaState, file: `media/audio/narration-royal-statue-${c}-en.mp3` },
      ar: { state: 'unavailable' as MediaState, file: null },
      fr: { state: 'unavailable' as MediaState, file: null }
    },
    subtitles: {
      en: { state: 'ready' as MediaState, file: `media/subs/royal-statue-${c}.en.vtt` },
      ar: { state: 'ready' as MediaState, file: `media/subs/royal-statue-${c}.ar.vtt` },
      fr: { state: 'ready' as MediaState, file: `media/subs/royal-statue-${c}.fr.vtt` }
    },
    video: { state: 'ready' as MediaState, file: `media/video/chapter-royal-statue-${c}.mp4`, durationSec: null as number | null }
  }))
];

export function chapterMedia(artifactId: string, chapterId: string): ChapterMedia | undefined {
  return CHAPTER_MEDIA.find((m) => m.key === `${artifactId}/${chapterId}`);
}

export function mediaUrl(file: string): string {
  return `${import.meta.env.BASE_URL}assets/${file}`;
}

import STATUS_JSON from './media-status.json';

interface StatusFile { bytes: number; durationSec: number | null }
const STATUS_FILES: Record<string, StatusFile> =
  ((STATUS_JSON as { files?: Record<string, StatusFile> }).files ?? {});

/** True only when the file was generated AND verified.
 *  Binary media needs substantial bytes; text subtitles need real cues
 *  (validate-media.mjs already checked WEBVTT structure).
 *  This is the single gate the UI uses before claiming media exists. */
export function isMediaReady(file: string | null | undefined): file is string {
  if (!file) return false;
  const rec = STATUS_FILES[file];
  if (!rec) return false;
  const minBytes = file.endsWith('.vtt') ? 80 : 1000;
  return rec.bytes > minBytes;
}

export function mediaDuration(file: string | null | undefined): number | null {
  if (!file) return null;
  return STATUS_FILES[file]?.durationSec ?? null;
}

/** Intro (description) narration per artifact — English studio track. */
export const ARTIFACT_INTRO_AUDIO: Record<string, { state: MediaState; file: string }> = {
  'royal-mummy': { state: 'generating', file: 'media/audio/narration-royal-mummy-intro-en.mp3' },
  'painted-coffin': { state: 'generating', file: 'media/audio/narration-painted-coffin-intro-en.mp3' },
  'royal-statue': { state: 'generating', file: 'media/audio/narration-royal-statue-intro-en.mp3' }
};
