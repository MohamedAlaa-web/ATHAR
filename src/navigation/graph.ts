import type { FloorId, MuseumGraph } from '../data/museum';
import type { RoutePoint } from './types';

export function floorRank(floor: FloorId): number {
  return floor === 'upper' ? 1 : 0;
}

export function horizontalDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 3D-ish distance used by the heuristic; stairs cost time, not just metres. */
export function floorDistance(a: RoutePoint, b: RoutePoint): number {
  return horizontalDistance(a, b) + Math.abs(floorRank(a.floor) - floorRank(b.floor)) * 5;
}

export function nearestNode(
  graph: MuseumGraph,
  p: { x: number; y: number; floor: FloorId },
  closedHalls: Set<string> = new Set()
): { node: MuseumGraph['nodes'][number]; distanceM: number } | null {
  let best: { node: MuseumGraph['nodes'][number]; distanceM: number } | null = null;
  for (const node of graph.nodes) {
    if (node.floor !== p.floor) continue;
    if (closedHalls.has(node.hallId)) continue;
    const d = horizontalDistance(node, p);
    if (!best || d < best.distanceM) best = { node, distanceM: d };
  }
  return best;
}

export interface AdjacencyEntry {
  to: string;
  edgeId: string;
  weightM: number;
  hasStairs: boolean;
}

export function buildAdjacency(
  graph: MuseumGraph,
  opts: { avoidStairs: boolean; closedHalls: Set<string> }
): Map<string, AdjacencyEntry[]> {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, AdjacencyEntry[]>();
  for (const node of graph.nodes) {
    if (opts.closedHalls.has(node.hallId)) continue;
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    if (opts.avoidStairs && edge.hasStairs) continue;
    const a = nodes.get(edge.from);
    const b = nodes.get(edge.to);
    if (!a || !b) continue;
    if (opts.closedHalls.has(a.hallId) || opts.closedHalls.has(b.hallId)) continue;
    if (!adjacency.has(a.id) || !adjacency.has(b.id)) continue;
    adjacency.get(a.id)!.push({ to: b.id, edgeId: edge.id, weightM: edge.weightM, hasStairs: edge.hasStairs });
    adjacency.get(b.id)!.push({ to: a.id, edgeId: edge.id, weightM: edge.weightM, hasStairs: edge.hasStairs });
  }
  return adjacency;
}

export class MinHeap<T> {
  private items: T[] = [];

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.items.length;
  }

  push(item: T): void {
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.items[i], this.items[parent]) >= 0) break;
      [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
      i = parent;
    }
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.compare(this.items[left], this.items[smallest]) < 0) smallest = left;
        if (right < this.items.length && this.compare(this.items[right], this.items[smallest]) < 0) smallest = right;
        if (smallest === i) break;
        [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
        i = smallest;
      }
    }
    return top;
  }
}
