import { floorRank } from './graph';
import type { RouteProgress, RoutePoint, RouteResult } from './types';
import { formatInstruction } from './instructions';

export function verticalDistance(a: RoutePoint, b: RoutePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y) + Math.abs(floorRank(a.floor) - floorRank(b.floor)) * 5;
}

export function cumulativeDistances(points: RoutePoint[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + verticalDistance(points[i - 1], points[i]));
  return out;
}

function pointToSegmentDistance(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Distance from a position to the route on its current floor (Infinity if the route never visits that floor). */
export function distanceToRouteM(route: Pick<RouteResult, 'points'>, position: { x: number; y: number; floor: string }): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1];
    const b = route.points[i];
    if (a.floor !== position.floor || b.floor !== position.floor) continue;
    best = Math.min(best, pointToSegmentDistance(position, a, b));
  }
  return best;
}

/**
 * Progress along the route: nearest polyline vertex, the next maneuver and the
 * remaining distance to it. Used for the banner, rerouting and arrival state.
 */
export function routeProgress(route: RouteResult, position: { x: number; y: number; floor: string }, lang: 'ar' | 'en'): RouteProgress {
  if (!route.ok || route.points.length === 0) {
    return {
      arrived: false,
      nearestPointIndex: 0,
      instruction: null,
      distanceToManeuverM: 0,
      distanceToTargetM: Number.POSITIVE_INFINITY,
      offRouteM: Number.POSITIVE_INFINITY
    };
  }
  const cum = cumulativeDistances(route.points);
  let nearestPointIndex = 0;
  let nearest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < route.points.length; i++) {
    const point = route.points[i];
    if (point.floor !== position.floor) continue;
    const d = Math.hypot(point.x - position.x, point.y - position.y);
    if (d < nearest) {
      nearest = d;
      nearestPointIndex = i;
    }
  }

  // Project onto the nearest segment so "turn right in 8 m" counts from the
  // visitor's actual spot, not from the previous graph vertex.
  let alongM = 0;
  let projectionDistance = Number.POSITIVE_INFINITY;
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1];
    const b = route.points[i];
    if (a.floor !== position.floor || b.floor !== position.floor) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq < 1e-9 ? 0 : Math.min(1, Math.max(0, ((position.x - a.x) * dx + (position.y - a.y) * dy) / lengthSq));
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const d = Math.hypot(position.x - px, position.y - py);
    if (d < projectionDistance) {
      projectionDistance = d;
      alongM = cum[i - 1] + t * Math.hypot(dx, dy);
    }
  }

  const target = route.points[route.points.length - 1];
  const distanceToTargetM = Math.hypot(target.x - position.x, target.y - position.y);
  // 3 m accounts for the demo's honest 95% radius; closer than that is
  // indistinguishable from the artifact pedestal area.
  const arrived = target.floor === position.floor && distanceToTargetM <= 3;
  const offRouteM = distanceToRouteM(route, position);
  const arrivalInstruction = route.instructions.find((i) => i.kind === 'arrive') ?? null;

  if (arrived && arrivalInstruction) {
    return {
      arrived: true,
      nearestPointIndex,
      instruction: arrivalInstruction,
      distanceToManeuverM: 0,
      distanceToTargetM,
      offRouteM
    };
  }

  const next = route.instructions.find(
    (instruction) =>
      instruction.kind !== 'start' &&
      instruction.kind !== 'arrive' &&
      cum[instruction.pathIndex] > alongM + 0.5
  );
  if (next) {
    return {
      arrived: false,
      nearestPointIndex,
      instruction: next,
      distanceToManeuverM: Math.max(0, cum[next.pathIndex] - alongM),
      distanceToTargetM,
      offRouteM
    };
  }
  if (arrivalInstruction) {
    return {
      arrived: false,
      nearestPointIndex,
      instruction: arrivalInstruction,
      distanceToManeuverM: Math.max(0, cum[route.points.length - 1] - alongM),
      distanceToTargetM,
      offRouteM
    };
  }
  return {
    arrived: false,
    nearestPointIndex,
    instruction: null,
    distanceToManeuverM: 0,
    distanceToTargetM,
    offRouteM
  };
}

export function progressText(progress: RouteProgress, lang: 'ar' | 'en'): string | null {
  if (!progress.instruction) return null;
  return formatInstruction(progress.instruction, progress.distanceToManeuverM, lang);
}
