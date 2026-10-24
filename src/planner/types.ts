import type { FloorId } from '../data/museum';
import type { CrowdLevels } from '../crowd/types';

/**
 * Visit planner — rules only.
 *
 * The planner orders artifacts with a greedy value/time ratio and a 2-opt pass.
 * There is no learning, no model and no network call: the same input always
 * produces the same plan. All artifact weights are placeholders (see
 * `placeholder: true` in `src/data/museum.json`).
 */
export const INTEREST_TAGS = ['royal', 'funerary', 'sculpture', 'writing'] as const;
export type InterestTag = (typeof INTEREST_TAGS)[number];

/** Default walking speed from the brief; the UI exposes it as a setting. */
export const DEFAULT_WALK_SPEED_MPS = 1.0;

export const INTEREST_LABEL: Record<InterestTag, { ar: string; en: string }> = {
  royal: { ar: 'ملكي', en: 'Royal' },
  funerary: { ar: 'جنائزي', en: 'Funerary' },
  sculpture: { ar: 'نحت', en: 'Sculpture' },
  writing: { ar: 'كتابة ونقوش', en: 'Writing' }
};

export interface PlanStart {
  x: number;
  y: number;
  floor: FloorId;
}

export interface PlanInput {
  start: PlanStart;
  budgetMinutes: number;
  interests: InterestTag[];
  avoidStairs: boolean;
  /** Metres per second; defaults to 1.0. */
  speedMps?: number;
  /** Simulated (or remote) hall tiers; omitted means "no crowd". */
  crowd?: CrowdLevels;
  /** Edge weight per crowd tier; 0.5 by default. */
  alpha?: number;
  closedHalls?: string[];
}

export type SkipReason = 'budget' | 'stairs' | 'closed' | 'unreachable';

export interface PlannedStop {
  artifactId: string;
  hallId: string;
  floor: FloorId;
  /** Minutes since the visit starts, at arrival. */
  etaMinutes: number;
  walkMinutes: number;
  walkM: number;
  dwellMinutes: number;
  cumulativeMinutes: number;
  value: number;
  importance: number;
  interestMatch: boolean;
}

export interface SkippedArtifact {
  artifactId: string;
  reason: SkipReason;
}

export interface VisitPlan {
  stops: PlannedStop[];
  skipped: SkippedArtifact[];
  totalMinutes: number;
  walkMinutes: number;
  dwellMinutes: number;
  value: number;
  budgetMinutes: number;
  /** Value of the greedy-by-value-only plan under the same budget. */
  baselineValue: number;
  baselineStops: number;
  /** Wall-clock milliseconds the algorithm took (measured, not estimated). */
  computeMs: number;
  /** Plan key so the UI can tell two plans apart. */
  key: string;
}

export interface ReplanState {
  completed: string[];
  /** Minutes already spent on the visit. */
  elapsedMinutes: number;
  /** Optional extra artifact the visitor asked to add. */
  addStop?: string;
  /** Where the visitor stands now; the plan is rebuilt from here. */
  current?: PlanStart;
  reason: 'behind' | 'added-stop' | 'manual';
}

export const INTEREST_MATCH_VALUE = 1.0;
export const INTEREST_MISS_VALUE = 0.3;
