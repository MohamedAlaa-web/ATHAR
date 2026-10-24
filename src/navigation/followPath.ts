import type { DemoPath, MuseumPathPoint } from '../data/museum';
import type { FloorPosition } from '../positioning/core/types';
import type { RouteResult } from './types';

/**
 * The simulated walker needs a plain list of points to walk, starting exactly
 * where its ground truth currently is. Re-sending a whole route would make the
 * walker jump back to the route's first vertex (the *estimated* position), which
 * is what made reroutes look erratic in the demo.
 *
 * This keeps the current truth as the first point and then continues at the
 * nearest vertex of the path, in order. It never walks backwards to reach the
 * path it is already near. `loop` closes the path back to the start (used by the
 * free-walk demo loop).
 */
export function followPathFrom(
  from: FloorPosition,
  points: MuseumPathPoint[],
  loop = false
): MuseumPathPoint[] {
  const start: MuseumPathPoint = { x: from.x, y: from.y, floor: from.floor };
  if (points.length === 0) return [start];

  let nearest = -1;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i += 1) {
    if (points[i].floor !== from.floor) continue;
    const distance = Math.hypot(points[i].x - from.x, points[i].y - from.y);
    if (distance < best) {
      best = distance;
      nearest = i;
    }
  }

  const path: MuseumPathPoint[] = [start];
  const push = (point: MuseumPathPoint) => {
    const last = path[path.length - 1];
    if (last.floor === point.floor && Math.hypot(last.x - point.x, last.y - point.y) < 0.05) return;
    path.push({ x: point.x, y: point.y, floor: point.floor });
  };

  /* A position on a floor the path never visits (or an empty match) falls back
   * to the path itself; the walker then takes the stairs as modelled. */
  if (nearest < 0) {
    for (const point of points) push(point);
    return path;
  }

  for (let i = nearest + 1; i < points.length; i += 1) push(points[i]);
  if (loop) {
    for (let i = 0; i <= nearest; i += 1) push(points[i]);
  }
  if (path.length === 1) {
    /* Already at the last vertex: give the walker the remaining segment (or a
     * duplicate, which pathLengthM treats as a finished walk). */
    push(points[nearest]);
  }
  return path;
}

/** Walk the active route from wherever the virtual visitor really is. */
export function routeFollowPath(from: FloorPosition, route: RouteResult | null): MuseumPathPoint[] {
  if (!route?.ok || route.points.length === 0) {
    return [{ x: from.x, y: from.y, floor: from.floor }];
  }
  return followPathFrom(from, route.points, false);
}

/** Join the free-walk demo loop at its nearest point and keep looping. */
export function freeWalkPath(from: FloorPosition, path: DemoPath): MuseumPathPoint[] {
  return followPathFrom(from, path.points, true);
}
