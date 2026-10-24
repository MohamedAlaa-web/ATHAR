import { MUSEUM } from '../data/museum';
import { tierForRatio, type CrowdLevels, type CrowdSource, type CrowdTier } from './types';

/** Small deterministic PRNG (mulberry32) so every run reproduces the same hall. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export interface SimulatedCrowdOptions {
  seed?: number;
  /** Simulation minutes per real minute; 1 keeps the clock honest. */
  timeScale?: number;
  /** Override the museum capacities (tests use tiny halls). */
  halls?: Array<{ id: string; capacity?: number }>;
  clock?: () => number;
}

/**
 * Seeded, time-varying fan-out around the museum. Occupancy moves on a slow
 * wave plus a per-minute jitter so a hall can cross a threshold while the
 * visitor watches. Nothing here is measured from people: every surface that
 * shows it must carry the "simulated" badge.
 */
export class SimulatedCrowdSource implements CrowdSource {
  readonly status = {
    kind: 'simulated' as const,
    implemented: true,
    detail: {
      ar: 'محاكاة — ليست قياسات زوار حقيقية.',
      en: 'Simulated — not real visitor measurements.'
    }
  };

  private readonly seed: number;
  private readonly timeScale: number;
  private readonly halls: Array<{ id: string; capacity: number }>;
  private readonly clock: () => number;

  constructor(options: SimulatedCrowdOptions = {}) {
    this.seed = options.seed ?? 2026;
    this.timeScale = options.timeScale ?? 1;
    this.clock = options.clock ?? (() => Date.now());
    this.halls = (options.halls ?? MUSEUM.halls).map((hall) => ({
      id: hall.id,
      capacity: hall.capacity ?? 60
    }));
  }

  /** Occupancy ratio per hall (0–~1.1) at a given instant. */
  occupancy(nowMs: number = this.clock()): Record<string, number> {
    const minutes = (nowMs / 60000) * this.timeScale;
    const minuteBucket = Math.floor(minutes);
    const out: Record<string, number> = {};
    for (const hall of this.halls) {
      const hash = hashString(hall.id);
      const phase = (hash % 1000) / 1000 * Math.PI * 2;
      const wave = 0.5 + 0.34 * Math.sin(minutes / 9 + phase);
      const jitter = (mulberry32(hash ^ minuteBucket)() - 0.5) * 0.14;
      const ratio = Math.max(0.05, Math.min(1.05, wave + jitter));
      out[hall.id] = ratio;
    }
    return out;
  }

  getLevels(nowMs: number = this.clock()): CrowdLevels {
    const ratios = this.occupancy(nowMs);
    const levels: CrowdLevels = {};
    for (const [hallId, ratio] of Object.entries(ratios)) levels[hallId] = tierForRatio(ratio);
    return levels;
  }

  levelOf(hallId: string, nowMs: number = this.clock()): CrowdTier {
    return this.getLevels(nowMs)[hallId] ?? 0;
  }
}
