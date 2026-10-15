import type { Artifact, Lang, StoryChapter } from '../data/artifacts';

/** Trilingual content picker with English fallback. */
export function tx(lang: Lang, en: string, ar: string, fr: string): string {
  if (lang === 'ar') return ar;
  if (lang === 'fr') return fr;
  return en;
}

export const artName = (a: Artifact, lang: Lang): string => tx(lang, a.nameEn, a.nameAr, a.nameFr);
export const artTagline = (a: Artifact, lang: Lang): string => tx(lang, a.taglineEn, a.taglineAr, a.taglineFr);
export const artDescription = (a: Artifact, lang: Lang): string => tx(lang, a.descriptionEn, a.descriptionAr, a.descriptionFr);
export const artSignificance = (a: Artifact, lang: Lang): string => tx(lang, a.significanceEn, a.significanceAr, a.significanceFr);
export const artContext = (a: Artifact, lang: Lang): string => tx(lang, a.contextEn, a.contextAr, a.contextFr);
export const artPhotoNote = (a: Artifact, lang: Lang): string | undefined =>
  lang === 'ar' ? a.photoNoteAr : lang === 'fr' ? (a.photoNoteFr ?? a.photoNoteEn) : a.photoNoteEn;
export const chapTitle = (c: StoryChapter, lang: Lang): string => tx(lang, c.titleEn, c.titleAr, c.titleFr);
export const chapNarration = (c: StoryChapter, lang: Lang): string => tx(lang, c.narrationEn, c.narrationAr, c.narrationFr);
export const imgAlt = (img: { altEn: string; altAr: string }, lang: Lang): string =>
  lang === 'ar' ? img.altAr : img.altEn;

/** Speech-synthesis locale for preview narration. */
export function ttsLocale(lang: Lang): string {
  return lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : 'en-US';
}
