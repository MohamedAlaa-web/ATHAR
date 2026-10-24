import { MUSEUM, type MuseumPathPoint } from '../data/museum';
import { astar } from './astar';
import { nearestNode } from './graph';
import { crowdEdgeCost } from '../crowd/edgeCost';
import { buildInstructions } from './instructions';
import type { RouteFailure, RouteOptions, RoutePoint, RouteResult } from './types';

const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function failure(
  reason: RouteFailure,
  from: MuseumPathPoint,
  to: MuseumPathPoint,
  opts: Required<Pick<RouteOptions, 'avoidStairs' | 'closedHalls' | 'targetArtifactId' | 'targetHallId'>>,
  startedAt: number
): RouteResult {
  return {
    ok: false,
    reason,
    request: {
      from,
      to,
      targetArtifactId: opts.targetArtifactId,
      targetHallId: opts.targetHallId,
      avoidStairs: opts.avoidStairs,
      closedHalls: opts.closedHalls
    },
    points: [],
    instructions: [],
    totalDistanceM: 0,
    floors: [],
    computeMs: round2(nowMs() - startedAt),
    maxDeviationM: 0
  };
}

/**
 * Compute a route from a (map-matched) position to a target, on the shared
 * editable graph. Repeatable and UI-independent so tests and the debug panel
 * measure the same code the screens use.
 */
export function computeRoute(from: MuseumPathPoint, to: MuseumPathPoint, options: RouteOptions = {}): RouteResult {
  const startedAt = nowMs();
  const graph = options.graph ?? MUSEUM.graph;
  const avoidStairs = options.avoidStairs === true;
  const closedHalls = options.closedHalls ?? [];
  const closedSet = new Set(closedHalls);
  const targetArtifactId = options.targetArtifactId ?? null;
  const targetHallId = options.targetHallId ?? null;
  const normalized = { avoidStairs, closedHalls, targetArtifactId, targetHallId };

  if (targetHallId && closedSet.has(targetHallId)) {
    return failure('target-closed', from, to, normalized, startedAt);
  }
  if (options.fromHallId && closedSet.has(options.fromHallId)) {
    return failure('no-start', from, to, normalized, startedAt);
  }

  const start = nearestNode(graph, from, closedSet);
  if (!start) return failure('no-start', from, to, normalized, startedAt);

  const target = nearestNode(graph, to, closedSet);
  if (!target) {
    const anyTarget = nearestNode(graph, to, new Set());
    return failure(anyTarget ? 'target-closed' : 'no-target', from, to, normalized, startedAt);
  }

  /* Crowd weighting only changes which edge is cheaper; without `options.crowd`
   * the search is exactly the plain shortest path used by every scenario. */
  const edgeCostM = options.crowd ? crowdEdgeCost(graph, options.crowd.levels, options.crowd.alpha) : undefined;

  let path = astar(graph, start.node.id, target.node.id, { avoidStairs, closedHalls: closedSet, edgeCostM });
  if (!path) {
    if (avoidStairs) {
      const stairsPath = astar(graph, start.node.id, target.node.id, { avoidStairs: false, closedHalls: closedSet });
      return failure(stairsPath ? 'stairs-only' : closedSet.size > 0 ? 'closed' : 'no-route', from, to, normalized, startedAt);
    }
    return failure(closedSet.size > 0 ? 'closed' : 'no-route', from, to, normalized, startedAt);
  }

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const points: RoutePoint[] = [{ x: from.x, y: from.y, floor: from.floor }];

  for (const nodeId of path.path) {
    const node = nodeById.get(nodeId)!;
    const previous = points[points.length - 1];
    if (Math.hypot(previous.x - node.x, previous.y - node.y) < 0.1 && previous.floor === node.floor) continue;
    points.push({ x: node.x, y: node.y, floor: node.floor, nodeId: node.id });
  }

  const last = points[points.length - 1];
  if (last.floor === to.floor && Math.hypot(last.x - to.x, last.y - to.y) < 0.35) {
    points[points.length - 1] = { x: to.x, y: to.y, floor: to.floor, nodeId: last.nodeId };
  } else if (last.floor !== to.floor || Math.hypot(last.x - to.x, last.y - to.y) > 0.1) {
    points.push({ x: to.x, y: to.y, floor: to.floor });
  }

  const withInstruction = buildInstructions(points);
  const floors = [...new Set(points.map((p) => p.floor))];

  return {
    ok: true,
    reason: null,
    request: { from, to, targetArtifactId, targetHallId, avoidStairs, closedHalls },
    points,
    instructions: withInstruction.instructions,
    totalDistanceM: withInstruction.totalDistanceM,
    floors,
    computeMs: round2(nowMs() - startedAt),
    maxDeviationM: 0
  };
}

/** Measurement helper for the evaluation panel: recompute with timing only. */
export function routeCostMs(from: MuseumPathPoint, to: MuseumPathPoint, options: RouteOptions = {}): number {
  return computeRoute(from, to, options).computeMs;
}
