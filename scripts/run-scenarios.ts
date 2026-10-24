import fs from 'node:fs';
import path from 'node:path';
import { MUSEUM } from '../src/data/museum';
import { runScenarioMatrix } from '../src/positioning/core/scenario';
import { computeRoute } from '../src/navigation/route';
import { performance } from 'node:perf_hooks';

const outDir = path.join(process.cwd(), 'docs');
fs.mkdirSync(outDir, { recursive: true });

const started = performance.now();
const matrix = runScenarioMatrix({ seed: 2026 });
const scenarioMs = performance.now() - started;

const routePairs = [
  { name: 'entrance -> Khafre', from: { x: 11, y: 3, floor: 'ground' as const }, to: { x: 54, y: 22, floor: 'ground' as const }, targetHallId: 'hall-c' },
  { name: 'entrance -> Hatshepsut (stairs)', from: { x: 11, y: 3, floor: 'ground' as const }, to: { x: 40, y: 18, floor: 'upper' as const }, targetHallId: 'upper-hall' },
  { name: 'Hall B -> Hall A', from: { x: 36, y: 9, floor: 'ground' as const }, to: { x: 7, y: 9, floor: 'ground' as const }, targetHallId: 'hall-a' }
];

const routeTimes: number[] = [];
const routeSamples: Array<{ name: string; ms: number; distanceM: number; instructions: number }> = [];
for (const pair of routePairs) {
  for (let i = 0; i < 40; i++) {
    const route = computeRoute(pair.from, pair.to, {
      avoidStairs: false,
      targetHallId: pair.targetHallId,
      closedHalls: []
    });
    routeTimes.push(route.computeMs);
    if (i === 0) {
      routeSamples.push({
        name: pair.name,
        ms: route.computeMs,
        distanceM: route.totalDistanceM,
        instructions: route.instructions.length
      });
    }
  }
}
routeTimes.sort((a, b) => a - b);
const p50 = routeTimes[Math.floor(routeTimes.length / 2)];
const p95 = routeTimes[Math.floor(routeTimes.length * 0.95)];

const artifactCount = MUSEUM.artifacts.length;
const hallCount = MUSEUM.halls.filter((h) => h.floor === 'ground').length;

const artifact = {
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    museumArtifacts: artifactCount,
    groundHalls: hallCount,
    beacons: MUSEUM.beacons.length,
    graphNodes: MUSEUM.graph.nodes.length,
    graphEdges: MUSEUM.graph.edges.length
  },
  scenarioRunMs: Math.round(scenarioMs),
  matrix,
  routing: {
    samples: routeTimes.length,
    p50Ms: p50,
    p95Ms: p95,
    maxMs: routeTimes[routeTimes.length - 1],
    routes: routeSamples
  }
};

fs.writeFileSync(path.join(outDir, 'scenario-results.json'), JSON.stringify(artifact, null, 2));

console.log('Scenario matrix (27 runs) in', Math.round(scenarioMs), 'ms');
console.table(matrix.summary.map((row) => ({
  config: row.config,
  crowd: row.crowd,
  meanM: row.meanErrorM,
  medianM: row.medianErrorM,
  p95M: row.p95ErrorM,
  hallPct: row.hallAccuracyPct,
  nearestPct: row.nearestArtifactAccuracyPct,
  hz: row.updateRateHz,
  readings: row.beaconReadingsUsedAvg,
  actPerMin: row.sensorActivationsPerMin,
  cpuPerMin: row.cpuOpsPerMin,
  qrResets: row.qrResetsAvg
})));
console.table(matrix.configSummary);
console.log('Routing benchmark:', { p50, p95, max: routeTimes[routeTimes.length - 1] });
console.log('Wrote', path.join(outDir, 'scenario-results.json'));
