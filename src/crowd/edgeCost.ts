import type { MuseumGraph } from '../data/museum';
import type { CrowdLevels } from './types';
import { DEFAULT_CROWD_ALPHA } from './types';

/**
 * Edge cost for crowd-aware routing: length * (1 + alpha * tier of the hall
 * the edge enters). alpha = 0 restores plain A*.
 */
export function crowdEdgeCost(graph: MuseumGraph, crowd: CrowdLevels | undefined, alpha = DEFAULT_CROWD_ALPHA) {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  return (edge: { from: string; to: string; weightM: number }) => {
    if (!crowd || alpha <= 0) return edge.weightM;
    const hallId = nodes.get(edge.to)?.hallId;
    const tier = hallId ? (crowd[hallId] ?? 0) : 0;
    return edge.weightM * (1 + alpha * tier);
  };
}
