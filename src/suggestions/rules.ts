import type { CrowdLevels } from '../crowd/types';

/**
 * Suggestion rules — plain conditions, no scoring model.
 *
 * A suggestion is offered only when ALL of these hold:
 *  1. the next hall on the route is tier 2 (crowded);
 *  2. an alternative artifact sharing a tag sits in a tier 0 hall;
 *  3. the detour costs under 3 minutes (the exact number is shown);
 *  4. at least 10 minutes have passed since the last suggestion;
 *  5. the visitor has not dismissed a suggestion for that hall before.
 *
 * Nothing is ever blocked or auto-applied: the banner appears, the visitor
 * accepts or dismisses.
 */
export const SUGGESTION_RULES = {
  crowdedTier: 2 as const,
  quietTier: 0 as const,
  maxExtraMinutes: 3,
  cooldownMinutes: 10
} as const;

export interface AlternativeArtifact {
  artifactId: string;
  hallId: string;
  tags: string[];
  /** Measured walking detour in minutes (never estimated by hand). */
  extraMinutes: number;
}

export interface SuggestionInput {
  nextHallId: string | null;
  targetTags: string[];
  levels: CrowdLevels;
  alternatives: AlternativeArtifact[];
  nowMs: number;
  lastSuggestionAt: number | null;
  dismissedHalls: string[];
}

export interface Suggestion {
  artifactId: string;
  hallId: string;
  extraMinutes: number;
}

export function evaluateSuggestion(input: SuggestionInput): Suggestion | null {
  const { nextHallId, levels } = input;
  if (!nextHallId) return null;
  if ((levels[nextHallId] ?? 0) !== SUGGESTION_RULES.crowdedTier) return null;
  if (input.dismissedHalls.includes(nextHallId)) return null;

  if (input.lastSuggestionAt != null) {
    const elapsedMinutes = (input.nowMs - input.lastSuggestionAt) / 60000;
    if (elapsedMinutes < SUGGESTION_RULES.cooldownMinutes) return null;
  }

  const tags = new Set(input.targetTags);
  const quiet = input.alternatives
    .filter((alt) => alt.hallId !== nextHallId)
    .filter((alt) => (levels[alt.hallId] ?? 0) === SUGGESTION_RULES.quietTier)
    .filter((alt) => alt.tags.some((tag) => tags.has(tag)))
    .filter((alt) => alt.extraMinutes >= 0 && alt.extraMinutes < SUGGESTION_RULES.maxExtraMinutes)
    .sort((a, b) => a.extraMinutes - b.extraMinutes || a.artifactId.localeCompare(b.artifactId));

  const best = quiet[0];
  if (!best) return null;
  return {
    artifactId: best.artifactId,
    hallId: best.hallId,
    extraMinutes: Math.round(best.extraMinutes * 100) / 100
  };
}
