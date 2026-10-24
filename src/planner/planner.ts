import { MUSEUM } from '../data/museum';
import { LegCache, artifactPoints, visitMeta, type ArtifactPoint } from './legs';
import {
  DEFAULT_WALK_SPEED_MPS,
  INTEREST_MATCH_VALUE,
  INTEREST_MISS_VALUE,
  type PlanInput,
  type PlannedStop,
  type ReplanState,
  type SkipReason,
  type SkippedArtifact,
  type VisitPlan
} from './types';

const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();

const round = (n: number): number => Math.round(n * 100) / 100;
const EPS = 1e-9;

interface Candidate {
  point: ArtifactPoint;
  importance: number;
  dwellMinutes: number;
  value: number;
  interestMatch: boolean;
}

interface Context {
  input: PlanInput;
  cache: LegCache;
  speed: number;
  closed: Set<string>;
  candidates: Candidate[];
}

function makeContext(input: PlanInput): Context {
  const closed = new Set(input.closedHalls ?? []);
  const interests = new Set(input.interests);
  const candidates: Candidate[] = artifactPoints()
    .filter((point) => !closed.has(point.hallId))
    .map((point) => {
      const meta = visitMeta(point.artifactId);
      const interestMatch = meta.tags.some((tag) => interests.has(tag as never));
      return {
        point,
        importance: meta.importance,
        dwellMinutes: meta.dwellMinutes,
        value: meta.importance * (interestMatch ? INTEREST_MATCH_VALUE : INTEREST_MISS_VALUE),
        interestMatch
      };
    });
  return {
    input,
    cache: new LegCache({
      avoidStairs: input.avoidStairs,
      speedMps: input.speedMps ?? DEFAULT_WALK_SPEED_MPS,
      crowd: input.crowd,
      alpha: input.alpha,
      closedHalls: input.closedHalls
    }),
    speed: input.speedMps ?? DEFAULT_WALK_SPEED_MPS,
    closed,
    candidates
  };
}

function skipReason(ctx: Context, from: ArtifactPoint | PlanInput['start'], candidate: Candidate): SkipReason {
  const leg = ctx.cache.get(from, candidate.point);
  if (!leg) return 'unreachable';
  if (leg.stairsOnly && ctx.input.avoidStairs) return 'stairs';
  return 'budget';
}

function stopFrom(
  candidate: Candidate,
  walkMinutes: number,
  walkM: number,
  etaMinutes: number
): PlannedStop {
  return {
    artifactId: candidate.point.artifactId,
    hallId: candidate.point.hallId,
    floor: candidate.point.floor,
    etaMinutes: round(etaMinutes),
    walkMinutes: round(walkMinutes),
    walkM: round(walkM),
    dwellMinutes: candidate.dwellMinutes,
    cumulativeMinutes: round(etaMinutes + candidate.dwellMinutes),
    value: round(candidate.value),
    importance: candidate.importance,
    interestMatch: candidate.interestMatch
  };
}

interface Sequence {
  stops: PlannedStop[];
  total: number;
  walkMinutes: number;
}

/** Walk the given order from `start`, refusing to exceed `budgetMinutes`. */
function walkOrder(ctx: Context, order: Candidate[], start: PlanInput['start'], budgetMinutes: number): Sequence {
  const stops: PlannedStop[] = [];
  let current: ArtifactPoint | PlanInput['start'] = start;
  let total = 0;
  let walkTotal = 0;
  for (const candidate of order) {
    const leg = ctx.cache.get(current, candidate.point);
    if (!leg || leg.stairsOnly) break;
    const next = total + leg.walkMinutes + candidate.dwellMinutes;
    if (next > budgetMinutes + EPS) break;
    stops.push(stopFrom(candidate, leg.walkMinutes, leg.walkM, total + leg.walkMinutes));
    total = next;
    walkTotal += leg.walkMinutes;
    current = candidate.point;
  }
  return { stops, total, walkMinutes: walkTotal };
}

function travelMinutes(ctx: Context, order: Candidate[], start: PlanInput['start']): number | null {
  let current: ArtifactPoint | PlanInput['start'] = start;
  let total = 0;
  for (const candidate of order) {
    const leg = ctx.cache.get(current, candidate.point);
    if (!leg || leg.stairsOnly) return null;
    total += leg.walkMinutes;
    current = candidate.point;
  }
  return total;
}

/** Greedy: highest value per (walk + dwell) minute that still fits. */
function greedyByRatio(ctx: Context, start: PlanInput['start'], budgetMinutes: number): Candidate[] {
  const remaining = [...ctx.candidates];
  const order: Candidate[] = [];
  let current: ArtifactPoint | PlanInput['start'] = start;
  let spent = 0;

  for (;;) {
    let best: { candidate: Candidate; score: number; legMinutes: number; legM: number } | null = null;
    for (const candidate of remaining) {
      const leg = ctx.cache.get(current, candidate.point);
      if (!leg || leg.stairsOnly) continue;
      const cost = leg.walkMinutes + candidate.dwellMinutes;
      if (spent + cost > budgetMinutes + EPS) continue;
      const score = candidate.value / Math.max(cost, 0.01);
      if (
        !best ||
        score > best.score + 1e-12 ||
        (Math.abs(score - best.score) <= 1e-12 &&
          (candidate.importance > best.candidate.importance ||
            (candidate.importance === best.candidate.importance &&
              candidate.point.artifactId.localeCompare(best.candidate.point.artifactId) < 0)))
      ) {
        best = { candidate, score, legMinutes: leg.walkMinutes, legM: leg.walkM };
      }
    }
    if (!best) break;
    order.push(best.candidate);
    spent += best.legMinutes + best.candidate.dwellMinutes;
    current = best.candidate.point;
    remaining.splice(remaining.indexOf(best.candidate), 1);
  }
  return order;
}

/** Baseline: highest value first, no ratio, same budget. */
function greedyByValue(ctx: Context, start: PlanInput['start'], budgetMinutes: number): Candidate[] {
  const remaining = [...ctx.candidates].sort(
    (a, b) =>
      b.value - a.value ||
      b.importance - a.importance ||
      a.point.artifactId.localeCompare(b.point.artifactId)
  );
  const order: Candidate[] = [];
  let current: ArtifactPoint | PlanInput['start'] = start;
  let spent = 0;
  for (const candidate of remaining) {
    const leg = ctx.cache.get(current, candidate.point);
    if (!leg || leg.stairsOnly) continue;
    const cost = leg.walkMinutes + candidate.dwellMinutes;
    if (spent + cost > budgetMinutes + EPS) continue;
    order.push(candidate);
    spent += cost;
    current = candidate.point;
  }
  return order;
}

/** 2-opt on the stop order, keeping the budget and the start fixed. */
function twoOpt(ctx: Context, order: Candidate[], start: PlanInput['start'], budgetMinutes: number): Candidate[] {
  if (order.length < 2) return order;
  const dwellTotal = order.reduce((sum, c) => sum + c.dwellMinutes, 0);
  const budgetForWalk = budgetMinutes - dwellTotal;
  let best = [...order];
  let bestTravel = travelMinutes(ctx, best, start) ?? Number.POSITIVE_INFINITY;
  let improved = true;
  let guard = 0;

  while (improved && guard < 24) {
    improved = false;
    guard += 1;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        const travel = travelMinutes(ctx, candidate, start);
        if (travel == null || travel > budgetForWalk + EPS) continue;
        if (travel < bestTravel - 1e-9) {
          best = candidate;
          bestTravel = travel;
          improved = true;
        }
      }
    }
  }
  return best;
}

function planKey(input: PlanInput, orderIds: string[]): string {
  return [
    input.start.x,
    input.start.y,
    input.start.floor,
    input.budgetMinutes,
    input.avoidStairs ? 'no-stairs' : 'stairs',
    input.speedMps ?? DEFAULT_WALK_SPEED_MPS,
    [...input.interests].sort().join('+'),
    [...(input.closedHalls ?? [])].sort().join('+'),
    orderIds.join('>')
  ].join('|');
}

function finishPlan(
  ctx: Context,
  order: Candidate[],
  start: PlanInput['start'],
  budgetMinutes: number,
  baseline: Candidate[],
  startedAt: number
): VisitPlan {
  const sequence = walkOrder(ctx, order, start, budgetMinutes);
  const plannedIds = new Set(sequence.stops.map((stop) => stop.artifactId));
  const skipped: SkippedArtifact[] = [];
  for (const candidate of ctx.candidates) {
    if (plannedIds.has(candidate.point.artifactId)) continue;
    const reason = skipReason(ctx, start, candidate);
    skipped.push({ artifactId: candidate.point.artifactId, reason });
  }
  for (const hallId of ctx.closed) {
    for (const artifact of MUSEUM.artifacts.filter((a) => a.hallId === hallId)) {
      skipped.push({ artifactId: artifact.id, reason: 'closed' });
    }
  }

  const baselineSequence = walkOrder(ctx, baseline, start, budgetMinutes);
  const dwell = sequence.stops.reduce((sum, stop) => sum + stop.dwellMinutes, 0);

  return {
    stops: sequence.stops,
    skipped,
    totalMinutes: round(sequence.total),
    walkMinutes: round(sequence.walkMinutes),
    dwellMinutes: round(dwell),
    value: round(sequence.stops.reduce((sum, stop) => sum + stop.value, 0)),
    budgetMinutes,
    baselineValue: round(baselineSequence.stops.reduce((sum, stop) => sum + stop.value, 0)),
    baselineStops: baselineSequence.stops.length,
    computeMs: round(nowMs() - startedAt),
    key: planKey(ctx.input, sequence.stops.map((stop) => stop.artifactId))
  };
}

/**
 * Order a visit inside a time budget.
 *
 * 1. Greedy by value per (walk + dwell) minute from the current position.
 * 2. 2-opt pass that only accepts a swap when travel time falls and the budget
 *    still holds.
 * 3. A value-only greedy baseline is computed with the same legs and budget,
 *    so the UI can compare the two without a second code path.
 */
export function planVisit(input: PlanInput): VisitPlan {
  const startedAt = nowMs();
  const ctx = makeContext(input);
  const budget = Math.max(0, input.budgetMinutes);
  const ratio = greedyByRatio(ctx, input.start, budget);
  const order = twoOpt(ctx, ratio, input.start, budget);
  const baseline = greedyByValue(ctx, input.start, budget);
  return finishPlan(ctx, order, input.start, budget, baseline, startedAt);
}

/** Convenience for tests and the UI: the plan with value only, no 2-opt. */
export function planVisitBaseline(input: PlanInput): VisitPlan {
  const startedAt = nowMs();
  const ctx = makeContext(input);
  const budget = Math.max(0, input.budgetMinutes);
  const baseline = greedyByValue(ctx, input.start, budget);
  return finishPlan(ctx, baseline, input.start, budget, baseline, startedAt);
}

/**
 * Rebuild a plan after the visitor falls behind or adds a stop.
 *
 * Stops already completed are dropped, the remaining budget is what is left of
 * the original budget, and the lowest-value remaining stop is removed until the
 * plan fits. Walking times are recomputed from `current` (or the original
 * start), so the result is a real plan, not a subtraction of minutes.
 */
export function replan(previous: VisitPlan, input: PlanInput, state: ReplanState): VisitPlan {
  const startedAt = nowMs();
  const remainingBudget = Math.max(0, input.budgetMinutes - Math.max(0, state.elapsedMinutes));
  const start = state.current ?? input.start;
  const ctx = makeContext(input);
  const byId = new Map(ctx.candidates.map((candidate) => [candidate.point.artifactId, candidate]));

  const order: Candidate[] = [];
  for (const stop of previous.stops) {
    if (state.completed.includes(stop.artifactId)) continue;
    const candidate = byId.get(stop.artifactId);
    if (candidate) order.push(candidate);
  }
  if (state.addStop && !order.some((c) => c.point.artifactId === state.addStop)) {
    const candidate = byId.get(state.addStop);
    if (candidate) order.push(candidate);
  }

  /* Drop the lowest-value remaining stop until the walk fits the budget. */
  let guard = 0;
  while (order.length > 0 && guard < 40) {
    guard += 1;
    const travel = travelMinutes(ctx, order, start);
    const dwell = order.reduce((sum, c) => sum + c.dwellMinutes, 0);
    if (travel != null && travel + dwell <= remainingBudget + EPS) break;
    let worstIndex = 0;
    for (let i = 1; i < order.length; i++) {
      if (order[i].value < order[worstIndex].value - 1e-12) worstIndex = i;
    }
    order.splice(worstIndex, 1);
  }

  const improved = twoOpt(ctx, order, start, remainingBudget);
  const baseline = greedyByValue(ctx, start, remainingBudget);
  return finishPlan(ctx, improved, start, remainingBudget, baseline, startedAt);
}

/** Planned artifact ids in order — used by the tour runner. */
export function planOrder(plan: VisitPlan): string[] {
  return plan.stops.map((stop) => stop.artifactId);
}
