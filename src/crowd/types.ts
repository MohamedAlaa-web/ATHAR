/**
 * Crowd model — a rules-based occupancy estimate per hall.
 *
 * This is NOT machine learning and must never be described as AI. The demo
 * source simulates occupancy; the remote source is a documented stub that
 * reports "not implemented" instead of inventing numbers.
 */
export type CrowdTier = 0 | 1 | 2;

export type CrowdLevels = Record<string, CrowdTier>;

/** Occupancy / capacity thresholds. Configurable, not tuned per run. */
export const CROWD_THRESHOLDS = {
  lowBelow: 0.4,
  mediumBelow: 0.75
} as const;

/** Edge-cost weight for routing: length * (1 + alpha * tier). */
export const DEFAULT_CROWD_ALPHA = 0.5;

export interface CrowdSource {
  /** Tier per hall id. Deterministic for a given clock value. */
  getLevels(nowMs?: number): CrowdLevels;
  /** Human-readable source label shown next to every crowd number. */
  readonly status: {
    kind: 'simulated' | 'remote';
    implemented: boolean;
    detail: { ar: string; en: string };
  };
}

export function tierForRatio(ratio: number): CrowdTier {
  if (!Number.isFinite(ratio) || ratio < CROWD_THRESHOLDS.lowBelow) return 0;
  if (ratio < CROWD_THRESHOLDS.mediumBelow) return 1;
  return 2;
}

export const TIER_LABEL: Record<CrowdTier, { ar: string; en: string }> = {
  0: { ar: 'هادئ', en: 'Quiet' },
  1: { ar: 'متوسط', en: 'Busy' },
  2: { ar: 'مزدحم', en: 'Crowded' }
};
