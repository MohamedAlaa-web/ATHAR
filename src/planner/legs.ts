import { MUSEUM, museumArtifactById, type MuseumGraph, type MuseumPathPoint } from '../data/museum';
import { astar } from '../navigation/astar';
import { nearestNode } from '../navigation/graph';
import type { CrowdLevels } from '../crowd/types';
import { DEFAULT_CROWD_ALPHA } from '../crowd/types';
import { crowdEdgeCost } from '../crowd/edgeCost';

export interface Leg {
  walkM: number;
  walkMinutes: number;
  /** Distance-weighted average crowd tier along the chosen path (0–2). */
  exposure: number;
  /** True when the only way there is a stair edge. */
  stairsOnly: boolean;
}

export interface LegOptions {
  avoidStairs: boolean;
  speedMps: number;
  crowd?: CrowdLevels;
  alpha?: number;
  graph?: MuseumGraph;
  closedHalls?: string[];
}

const pointOf = (id: string, graph: MuseumGraph): MuseumPathPoint | null => {
  const node = graph.nodes.find((n) => n.id === id);
  return node ? { x: node.x, y: node.y, floor: node.floor } : null;
};

function astarLeg(
  graph: MuseumGraph,
  from: MuseumPathPoint,
  to: MuseumPathPoint,
  opts: LegOptions,
  avoidStairs: boolean
): { walkM: number; exposure: number } | null {
  const closed = new Set(opts.closedHalls ?? []);
  const start = nearestNode(graph, from, closed);
  const target = nearestNode(graph, to, closed);
  if (!start || !target) return null;
  const result = astar(graph, start.node.id, target.node.id, {
    avoidStairs,
    closedHalls: closed,
    edgeCostM: crowdEdgeCost(graph, opts.crowd, opts.alpha)
  });
  if (!result) return null;

  const points = result.path.map((id) => pointOf(id, graph)).filter((p): p is MuseumPathPoint => p !== null);
  let walkM = Math.hypot(from.x - points[0].x, from.y - points[0].y) + result.baseCostM;
  walkM += Math.hypot(to.x - points[points.length - 1].x, to.y - points[points.length - 1].y);

  /* Distance-weighted exposure along the path, in the same units as the path. */
  const levels = opts.crowd;
  let exposure = 0;
  let weight = 0;
  if (levels) {
    const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
    for (let i = 1; i < result.path.length; i++) {
      const a = nodes.get(result.path[i - 1]);
      const b = nodes.get(result.path[i]);
      if (!a || !b) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y) + (a.floor !== b.floor ? 3 : 0);
      exposure += (levels[b.hallId] ?? 0) * d;
      weight += d;
    }
  }
  return { walkM, exposure: weight > 0 ? exposure / weight : 0 };
}

/**
 * One leg between two places, in metres and minutes. Returns null when no
 * path exists; `stairsOnly` is reported separately so the planner can say why.
 */
export function legBetween(from: MuseumPathPoint, to: MuseumPathPoint, opts: LegOptions): Leg | null {
  const graph = opts.graph ?? MUSEUM.graph;
  const speed = opts.speedMps > 0 ? opts.speedMps : 1;
  const direct = astarLeg(graph, from, to, opts, opts.avoidStairs);
  if (direct) {
    return {
      walkM: direct.walkM,
      walkMinutes: direct.walkM / speed / 60,
      exposure: direct.exposure,
      stairsOnly: false
    };
  }
  if (!opts.avoidStairs) return null;
  const withStairs = astarLeg(graph, from, to, opts, false);
  if (!withStairs) return null;
  return {
    walkM: withStairs.walkM,
    walkMinutes: withStairs.walkM / speed / 60,
    exposure: withStairs.exposure,
    stairsOnly: true
  };
}

export interface ArtifactPoint extends MuseumPathPoint {
  artifactId: string;
  hallId: string;
}

export function artifactPoints(): ArtifactPoint[] {
  return MUSEUM.artifacts.map((artifact) => ({
    artifactId: artifact.id,
    hallId: artifact.hallId,
    x: artifact.x,
    y: artifact.y,
    floor: artifact.floor
  }));
}

/** Per-plan cache so the pairwise matrix is computed once, not per candidate. */
export class LegCache {
  private readonly cache = new Map<string, Leg | null>();

  constructor(private readonly opts: LegOptions) {}

  key(a: MuseumPathPoint & { id?: string }, b: MuseumPathPoint & { id?: string }): string {
    const crowd = this.opts.crowd
      ? Object.entries(this.opts.crowd)
          .sort(([x], [y]) => x.localeCompare(y))
          .map(([hall, tier]) => `${hall}:${tier}`)
          .join(',')
      : 'none';
    return [
      a.x,
      a.y,
      a.floor,
      b.x,
      b.y,
      b.floor,
      this.opts.avoidStairs ? 'stairs-off' : 'stairs-on',
      this.opts.speedMps,
      this.opts.alpha ?? DEFAULT_CROWD_ALPHA,
      crowd,
      [...(this.opts.closedHalls ?? [])].sort().join('+')
    ].join('|');
  }

  get(from: MuseumPathPoint, to: MuseumPathPoint): Leg | null {
    const id = this.key(from, to);
    if (!this.cache.has(id)) this.cache.set(id, legBetween(from, to, this.opts));
    return this.cache.get(id) ?? null;
  }
}

/** Planner metadata for one artifact (all values are placeholders). */
export function visitMeta(artifactId: string): { tags: string[]; importance: number; dwellMinutes: number } {
  const artifact = museumArtifactById(artifactId);
  return {
    tags: artifact?.tags ?? [],
    importance: artifact?.importance ?? 5,
    dwellMinutes: artifact?.dwellMinutes ?? 4
  };
}
