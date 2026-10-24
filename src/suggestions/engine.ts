import { MUSEUM, museumArtifactById } from '../data/museum';
import type { CrowdLevels } from '../crowd/types';
import { DEFAULT_CROWD_ALPHA } from '../crowd/types';
import { LegCache } from '../planner/legs';
import { evaluateSuggestion, type AlternativeArtifact, type Suggestion } from './rules';

export interface SuggestionContext {
  /** Where the visitor is now. */
  from: { x: number; y: number; floor: 'ground' | 'upper' };
  nextArtifactId: string;
  levels: CrowdLevels;
  nowMs: number;
  lastSuggestionAt: number | null;
  dismissedHalls: string[];
  avoidStairs: boolean;
  speedMps: number;
  alpha?: number;
}

/**
 * Build the alternatives with real walking times, then let the rules decide.
 * The detour is `walk(from → alternative) - walk(from → next)`; a negative
 * value means the alternative is simply closer, which is still reported as 0.
 */
export function buildSuggestion(ctx: SuggestionContext): Suggestion | null {
  const next = museumArtifactById(ctx.nextArtifactId);
  if (!next) return null;
  const cache = new LegCache({
    avoidStairs: ctx.avoidStairs,
    speedMps: ctx.speedMps,
    crowd: undefined,
    alpha: ctx.alpha ?? DEFAULT_CROWD_ALPHA
  });
  const direct = cache.get(ctx.from, { x: next.x, y: next.y, floor: next.floor });
  if (!direct) return null;

  const alternatives: AlternativeArtifact[] = [];
  for (const artifact of MUSEUM.artifacts) {
    if (artifact.id === next.id) continue;
    if (artifact.hallId === next.hallId) continue;
    const sharesTag = artifact.tags?.some((tag) => next.tags?.includes(tag));
    if (!sharesTag) continue;
    const leg = cache.get(ctx.from, { x: artifact.x, y: artifact.y, floor: artifact.floor });
    if (!leg) continue;
    alternatives.push({
      artifactId: artifact.id,
      hallId: artifact.hallId,
      tags: artifact.tags ?? [],
      extraMinutes: Math.max(0, leg.walkMinutes - direct.walkMinutes)
    });
  }

  return evaluateSuggestion({
    nextHallId: next.hallId,
    targetTags: next.tags ?? [],
    levels: ctx.levels,
    alternatives,
    nowMs: ctx.nowMs,
    lastSuggestionAt: ctx.lastSuggestionAt,
    dismissedHalls: ctx.dismissedHalls
  });
}
