import type { MuseumGraph } from '../data/museum';
import { MinHeap, buildAdjacency, floorRank, horizontalDistance } from './graph';

export interface AstarOptions {
  avoidStairs?: boolean;
  closedHalls?: Set<string>;
  /**
   * Optional per-edge cost in "metres". The crowd-aware router multiplies an
   * edge by the occupancy level of the hall it lies in; without it A* uses the
   * plain walk cost, so every existing route is unchanged.
   */
  edgeCostM?: (edge: { from: string; to: string; weightM: number; hasStairs: boolean }) => number;
}

export interface AstarResult {
  path: string[];
  /** Accumulated cost used for the search (weighted when `edgeCostM` is set). */
  costM: number;
  /** Accumulated plain walk cost, so callers can still report real metres. */
  baseCostM: number;
  visited: number;
}

interface OpenNode {
  id: string;
  f: number;
  h: number;
}

/**
 * A* on the editable museum graph. Edge weights already include the stair
 * penalty; the heuristic is Euclidean distance plus a floor-change term so it
 * remains admissible.
 */
export function astar(graph: MuseumGraph, startId: string, targetId: string, opts: AstarOptions = {}): AstarResult | null {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const start = nodes.get(startId);
  const target = nodes.get(targetId);
  if (!start || !target) return null;

  const closedHalls = opts.closedHalls ?? new Set<string>();
  if (closedHalls.has(start.hallId) || closedHalls.has(target.hallId)) return null;

  const adjacency = buildAdjacency(graph, { avoidStairs: opts.avoidStairs === true, closedHalls });
  if (!adjacency.has(startId) || !adjacency.has(targetId)) return null;

  const heuristic = (id: string) => {
    const node = nodes.get(id)!;
    return horizontalDistance(node, target) + Math.abs(floorRank(node.floor) - floorRank(target.floor)) * 5;
  };

  const gScore = new Map<string, number>([[startId, 0]]);
  const baseScore = new Map<string, number>([[startId, 0]]);
  const cameFrom = new Map<string, string>();
  const closed = new Set<string>();
  const open = new MinHeap<OpenNode>((a, b) => a.f - b.f || a.h - b.h || a.id.localeCompare(b.id));
  open.push({ id: startId, f: heuristic(startId), h: heuristic(startId) });
  let visited = 0;

  while (open.size > 0) {
    const current = open.pop()!;
    if (closed.has(current.id)) continue;
    visited += 1;
    if (current.id === targetId) {
      const path: string[] = [targetId];
      let cursor = targetId;
      while (cameFrom.has(cursor)) {
        cursor = cameFrom.get(cursor)!;
        path.push(cursor);
      }
      path.reverse();
      return {
        path,
        costM: gScore.get(targetId) ?? 0,
        baseCostM: baseScore.get(targetId) ?? 0,
        visited
      };
    }
    closed.add(current.id);

    for (const entry of adjacency.get(current.id) ?? []) {
      if (closed.has(entry.to)) continue;
      const step =
        opts.edgeCostM?.({
          from: current.id,
          to: entry.to,
          weightM: entry.weightM,
          hasStairs: entry.hasStairs
        }) ?? entry.weightM;
      const tentative = (gScore.get(current.id) ?? Number.POSITIVE_INFINITY) + step;
      if (tentative < (gScore.get(entry.to) ?? Number.POSITIVE_INFINITY) - 1e-9) {
        cameFrom.set(entry.to, current.id);
        gScore.set(entry.to, tentative);
        baseScore.set(entry.to, (baseScore.get(current.id) ?? 0) + entry.weightM);
        const h = heuristic(entry.to);
        open.push({ id: entry.to, f: tentative + h, h });
      }
    }
  }
  return null;
}
