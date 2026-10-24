import type { FloorId, Position2D } from './types';

export interface WalkableRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SnapResult {
  position: Position2D;
  snapped: boolean;
  distanceM: number;
}

export function pointInWalkable(p: Position2D, rects: WalkableRect[]): boolean {
  return rects.some(
    (r) => p.x >= r.x && p.y >= r.y && p.x <= r.x + r.w && p.y <= r.y + r.h
  );
}

/** Closest point on the union of axis-aligned walkable rectangles. */
export function snapToWalkable(
  p: Position2D,
  rects: WalkableRect[]
): SnapResult {
  if (rects.length === 0) return { position: p, snapped: false, distanceM: 0 };
  if (pointInWalkable(p, rects)) return { position: { ...p }, snapped: false, distanceM: 0 };

  let best: Position2D = { ...p };
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const r of rects) {
    const x = Math.min(r.x + r.w, Math.max(r.x, p.x));
    const y = Math.min(r.y + r.h, Math.max(r.y, p.y));
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestDistance) {
      bestDistance = d;
      best = { x, y };
    }
  }
  return { position: best, snapped: Number.isFinite(bestDistance), distanceM: bestDistance };
}

/**
 * Map matching with a small dead zone: estimates just outside a wall are
 * pulled inside; a large jump is still reported as the snapped distance so the
 * debug panel can show that it happened.
 */
export function matchToFloor(
  p: Position2D,
  floor: FloorId,
  rectsByFloor: Record<FloorId, WalkableRect[]>
): SnapResult & { floor: FloorId } {
  const rects = rectsByFloor[floor] ?? [];
  return { ...snapToWalkable(p, rects), floor };
}
