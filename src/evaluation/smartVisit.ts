import { MUSEUM, hallAt, type MuseumPathPoint } from '../data/museum';
import { computeRoute } from '../navigation/route';
import { planVisit } from '../planner/planner';
import { INTEREST_TAGS, type InterestTag } from '../planner/types';
import { SimulatedCrowdSource } from '../crowd/simulated';
import { DEFAULT_CROWD_ALPHA, type CrowdLevels } from '../crowd/types';

/** Fixed clock so the evaluation is reproducible; the crowd is still simulated. */
export const EVAL_CLOCK_MS = 1_760_000_000_000;

export interface PlannerEvalProfile {
  id: string;
  label: { ar: string; en: string };
  interests: InterestTag[];
}

export const PLANNER_PROFILES: PlannerEvalProfile[] = [
  { id: 'royal', label: { ar: 'ملكي', en: 'Royal' }, interests: ['royal'] },
  { id: 'funerary', label: { ar: 'جنائزي', en: 'Funerary' }, interests: ['funerary'] },
  {
    id: 'mixed',
    label: { ar: 'متنوّع', en: 'Mixed' },
    interests: [...INTEREST_TAGS] as InterestTag[]
  }
];

export const PLANNER_BUDGETS = [45, 90, 150] as const;

export interface PlannerEvalRow {
  profile: string;
  profileLabel: { ar: string; en: string };
  budgetMinutes: number;
  plannedMinutes: number;
  withinBudget: boolean;
  stops: number;
  value: number;
  baselineValue: number;
  computeMs: number;
}

export interface PlannerEvalResult {
  rows: PlannerEvalRow[];
  allWithinBudget: boolean;
  meanComputeMs: number;
  runs: number;
}

export function runPlannerEvaluation(): PlannerEvalResult {
  const rows: PlannerEvalRow[] = [];
  for (const profile of PLANNER_PROFILES) {
    for (const budget of PLANNER_BUDGETS) {
      const plan = planVisit({
        start: { x: MUSEUM.entrance.x, y: MUSEUM.entrance.y, floor: MUSEUM.entrance.floor },
        budgetMinutes: budget,
        interests: profile.interests,
        avoidStairs: false,
        speedMps: 1.0
      });
      rows.push({
        profile: profile.id,
        profileLabel: profile.label,
        budgetMinutes: budget,
        plannedMinutes: plan.totalMinutes,
        withinBudget: plan.totalMinutes <= budget + 0.01,
        stops: plan.stops.length,
        value: plan.value,
        baselineValue: plan.baselineValue,
        computeMs: plan.computeMs
      });
    }
  }
  return {
    rows,
    allWithinBudget: rows.every((row) => row.withinBudget),
    meanComputeMs: rows.reduce((sum, row) => sum + row.computeMs, 0) / Math.max(1, rows.length),
    runs: rows.length
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance-weighted average crowd tier along a route, measured from the graph. */
export function routeCrowdExposure(points: MuseumPathPoint[], levels: CrowdLevels): number {
  let exposed = 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const d = Math.hypot(a.x - b.x, a.y - b.y) + (a.floor !== b.floor ? 3 : 0);
    const hall = hallAt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, a.floor) ?? hallAt(b, b.floor);
    const tier = hall ? (levels[hall.id] ?? 0) : 0;
    exposed += tier * d;
    total += d;
  }
  return total > 0 ? exposed / total : 0;
}

export interface CrowdRouteRow {
  from: string;
  to: string;
  plainLengthM: number;
  crowdLengthM: number;
  plainExposure: number;
  crowdExposure: number;
  changed: boolean;
}

export interface CrowdEvalResult {
  rows: CrowdRouteRow[];
  averagePlainLengthM: number;
  averageCrowdLengthM: number;
  averagePlainExposure: number;
  averageCrowdExposure: number;
  changedRoutes: number;
  runs: number;
  clockMs: number;
  alpha: number;
}

/**
 * Ten seeded start/target pairs. Each route is computed twice: once with the
 * plain shortest path and once with crowd weighting. Both length and crowd
 * exposure are measured on the returned geometry, not assumed.
 */
export function runCrowdRoutingEvaluation(): CrowdEvalResult {
  const source = new SimulatedCrowdSource({ seed: 2026 });
  const levels = source.getLevels(EVAL_CLOCK_MS);
  const random = mulberry32(4242);
  const artifacts = MUSEUM.artifacts;
  const rows: CrowdRouteRow[] = [];

  for (let i = 0; i < 10; i++) {
    const startArtifact = artifacts[Math.floor(random() * artifacts.length)];
    let targetArtifact = artifacts[Math.floor(random() * artifacts.length)];
    let guard = 0;
    while (targetArtifact.id === startArtifact.id && guard < 12) {
      targetArtifact = artifacts[Math.floor(random() * artifacts.length)];
      guard += 1;
    }
    const from = { x: startArtifact.x, y: startArtifact.y, floor: startArtifact.floor };
    const to = { x: targetArtifact.x, y: targetArtifact.y, floor: targetArtifact.floor };
    const plain = computeRoute(from, to);
    const crowd = computeRoute(from, to, { crowd: { levels, alpha: DEFAULT_CROWD_ALPHA } });
    if (!plain.ok || !crowd.ok) continue;
    rows.push({
      from: startArtifact.id,
      to: targetArtifact.id,
      plainLengthM: plain.totalDistanceM,
      crowdLengthM: crowd.totalDistanceM,
      plainExposure: routeCrowdExposure(plain.points, levels),
      crowdExposure: routeCrowdExposure(crowd.points, levels),
      changed: Math.abs(plain.totalDistanceM - crowd.totalDistanceM) > 0.05
    });
  }

  const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  return {
    rows,
    averagePlainLengthM: mean(rows.map((row) => row.plainLengthM)),
    averageCrowdLengthM: mean(rows.map((row) => row.crowdLengthM)),
    averagePlainExposure: mean(rows.map((row) => row.plainExposure)),
    averageCrowdExposure: mean(rows.map((row) => row.crowdExposure)),
    changedRoutes: rows.filter((row) => row.changed).length,
    runs: rows.length,
    clockMs: EVAL_CLOCK_MS,
    alpha: DEFAULT_CROWD_ALPHA
  };
}

export interface SmartVisitEvaluation {
  planner: PlannerEvalResult;
  crowd: CrowdEvalResult;
}

export function runSmartVisitEvaluation(): SmartVisitEvaluation {
  return { planner: runPlannerEvaluation(), crowd: runCrowdRoutingEvaluation() };
}

export function smartVisitToJson(evaluation: SmartVisitEvaluation): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: 'Planner weights are placeholders; the crowd is simulated, not measured.',
      planner: evaluation.planner,
      crowd: evaluation.crowd
    },
    null,
    2
  );
}

export function smartVisitToCsv(evaluation: SmartVisitEvaluation): string {
  const lines: string[] = [];
  lines.push('kind,profile,budget_min,planned_min,within_budget,stops,value,baseline_value,compute_ms');
  for (const row of evaluation.planner.rows) {
    lines.push(
      [
        'planner',
        row.profile,
        row.budgetMinutes,
        row.plannedMinutes.toFixed(2),
        row.withinBudget ? 'yes' : 'no',
        row.stops,
        row.value.toFixed(2),
        row.baselineValue.toFixed(2),
        row.computeMs.toFixed(2)
      ].join(',')
    );
  }
  lines.push('');
  lines.push('kind,from,to,plain_length_m,crowd_length_m,plain_exposure,crowd_exposure,changed');
  for (const row of evaluation.crowd.rows) {
    lines.push(
      [
        'crowd-route',
        row.from,
        row.to,
        row.plainLengthM.toFixed(2),
        row.crowdLengthM.toFixed(2),
        row.plainExposure.toFixed(2),
        row.crowdExposure.toFixed(2),
        row.changed ? 'yes' : 'no'
      ].join(',')
    );
  }
  return lines.join('\n');
}
