import { describe, expect, it } from 'vitest';
import { MUSEUM } from '../data/museum';
import { pointAlongPath, pathLengthM } from '../positioning/core/simulation';
import { followPathFrom, freeWalkPath, routeFollowPath } from './followPath';
import { computeRoute } from './route';
import type { MuseumPathPoint } from '../data/museum';

/** Horizontal distance to a polyline, ignoring floors (stairs interpolate). */
function distanceToLine(points: MuseumPathPoint[], p: { x: number; y: number }): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq < 1e-9 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

const entrance = { x: 11, y: 3, floor: 'ground' as const };
const hatshepsut = { x: 40, y: 18, floor: 'upper' as const };

describe('virtual walker path following', () => {
  it('starts at the walker truth and ends at the routed target', () => {
    const route = computeRoute(entrance, hatshepsut, { targetHallId: 'upper-hall' });
    expect(route.ok).toBe(true);

    const from = { x: 13.5, y: 6.5, floor: 'ground' as const };
    const path = routeFollowPath(from, route);

    expect(path[0]).toEqual(from);
    expect(path[path.length - 1].floor).toBe('upper');
    expect(path[path.length - 1].x).toBeCloseTo(hatshepsut.x, 1);
    expect(path[path.length - 1].y).toBeCloseTo(hatshepsut.y, 1);
  });

  it('does not send the walker back through vertices it has already passed', () => {
    const route = computeRoute(entrance, hatshepsut, { targetHallId: 'upper-hall' });
    const from = { x: 27, y: 15, floor: 'ground' as const }; // corridor, midway
    const path = routeFollowPath(from, route);

    // Everything after the start must come from the route, in order, after the
    // nearest vertex to `from`. c-m is index 2 of the route.
    const routeIndex = (p: { x: number; y: number; floor: string }) =>
      route.points.findIndex((rp) => rp.floor === p.floor && Math.hypot(rp.x - p.x, rp.y - p.y) < 0.01);
    const indices = path.slice(1).map(routeIndex).filter((index) => index >= 0);
    expect(indices.length).toBeGreaterThan(2);
    for (let i = 1; i < indices.length; i += 1) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
    expect(indices[0]).toBe(route.points.findIndex((p) => p.nodeId === 'c-m') + 1);
  });

  it('walks every sampled metre inside a metre of the route it is following', () => {
    const route = computeRoute(entrance, hatshepsut, { targetHallId: 'upper-hall' });
    const from = { x: 13.5, y: 6.5, floor: 'ground' as const };
    const path = routeFollowPath(from, route);
    const total = pathLengthM(path);
    expect(total).toBeGreaterThan(25);

    for (let distance = 0; distance <= total; distance += 0.5) {
      const sample = pointAlongPath(path, distance);
      const offRoute = distanceToLine(route.points, sample.position);
      expect(Number.isFinite(offRoute)).toBe(true);
      expect(offRoute).toBeLessThanOrEqual(1.01);
    }
  });

  it('joins the free-walk loop without teleporting to its first point', () => {
    const demo = MUSEUM.paths.find((p) => p.id === 'grand-highlights') ?? MUSEUM.paths[0];
    const from = { x: 28, y: 15, floor: 'ground' as const };
    const path = freeWalkPath(from, demo);

    expect(path[0]).toEqual(from);
    expect(pathLengthM(path)).toBeGreaterThan(10);
    const first = pointAlongPath(path, 0.2).position;
    expect(Math.hypot(first.x - from.x, first.y - from.y)).toBeLessThan(1);
  });

  it('returns a single point for a failed route', () => {
    const route = computeRoute(entrance, hatshepsut, { avoidStairs: true, targetHallId: 'upper-hall' });
    expect(route.ok).toBe(false);
    const from = { x: 11, y: 3, floor: 'ground' as const };
    expect(routeFollowPath(from, route)).toEqual([from]);
    expect(followPathFrom(from, [])).toEqual([from]);
  });
});
