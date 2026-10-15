export function assetUrl(name: string): string {
  // Assets live in /assets (copied from src/assets at build via public dir).
  // Fall back gracefully if a file is missing: callers use onError handlers.
  return `${import.meta.env.BASE_URL}assets/${name}`;
}

/** Format seconds as m:ss */
export function fmtTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Given chapter durations, find chapter index + offset for an elapsed time. */
export function locateChapter(durations: number[], elapsed: number): { index: number; into: number; start: number } {
  let acc = 0;
  for (let i = 0; i < durations.length; i++) {
    const d = durations[i];
    if (elapsed < acc + d) return { index: i, into: elapsed - acc, start: acc };
    acc += d;
  }
  const last = durations.length - 1;
  const start = acc - (durations[last] ?? 0);
  return { index: Math.max(0, last), into: durations[last] ?? 0, start: Math.max(0, start) };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
