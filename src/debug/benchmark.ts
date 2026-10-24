import { MUSEUM, museumArtifactById } from '../data/museum';
import { computeRoute } from '../navigation/route';

export interface RouteBenchmarkResult {
  samples: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  routes: Array<{ name: string; distanceM: number; instructions: number; computeMs: number }>;
}

const pairs = [
  { name: 'entrance → Khafre', from: { x: 11, y: 3, floor: 'ground' as const }, toId: 'khafre-enthroned' },
  { name: 'entrance → Hatshepsut (stairs)', from: { x: 11, y: 3, floor: 'ground' as const }, toId: 'hatshepsut-statue' },
  { name: 'Tutankhamun Hall → Narmer Palette', from: { x: 36, y: 9, floor: 'ground' as const }, toId: 'narmer-palette' }
];

/**
 * Runs the production A* and instruction generator repeatedly and reports the
 * measured wall-clock time (performance.now), not an estimate.
 */
export function benchmarkRouting(iterations = 40): RouteBenchmarkResult {
  const times: number[] = [];
  const routes: RouteBenchmarkResult['routes'] = [];

  for (const pair of pairs) {
    const artifact = museumArtifactById(pair.toId);
    if (!artifact) continue;
    for (let i = 0; i < iterations; i++) {
      const started = performance.now();
      const route = computeRoute(pair.from, { x: artifact.x, y: artifact.y, floor: artifact.floor }, {
        targetArtifactId: artifact.id,
        targetHallId: artifact.hallId,
        avoidStairs: false,
        closedHalls: []
      });
      times.push(performance.now() - started);
      if (i === 0) {
        routes.push({
          name: pair.name,
          distanceM: route.totalDistanceM,
          instructions: route.instructions.length,
          computeMs: route.computeMs
        });
      }
    }
  }

  const sorted = [...times].sort((a, b) => a - b);
  return {
    samples: times.length,
    p50Ms: sorted[Math.floor(sorted.length / 2)] ?? 0,
    p95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    maxMs: sorted[sorted.length - 1] ?? 0,
    routes
  };
}

export const BENCHMARK_ARTIFACT_COUNT = MUSEUM.artifacts.length;
