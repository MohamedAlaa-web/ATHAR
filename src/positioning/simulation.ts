import { distanceM, inBounds, nearestArtifact, sortByDistance } from './room';
import { fuse } from './fusion';
import type {
  EvaluationPointResult,
  EvaluationReport,
  FusedEstimate,
  Observation,
  Position2D,
  PositionObservation,
  RangeObservation,
  ArtifactObservation,
  RoomConfig
} from './types';

export type ScenarioId = 'clean' | 'noisy' | 'conflicting';

export interface Scenario {
  id: ScenarioId;
  wifiSigmaScale: number;
  bleSigmaScale: number;
  dropout: number;
  /** Deliberately inconsistent measurement, used to demonstrate conflict handling. */
  spoof?: { deviceId: string; factor: number };
  /** A rogue radio fix that claims a confident but wrong position. */
  rogue?: { source: 'wifi' | 'ble'; position: Position2D; accuracyM: number };
  qrNearArtifacts: boolean;
}

export const SCENARIOS: Scenario[] = [
  { id: 'clean', wifiSigmaScale: 1, bleSigmaScale: 1, dropout: 0, qrNearArtifacts: true },
  { id: 'noisy', wifiSigmaScale: 2.4, bleSigmaScale: 2, dropout: 0.15, qrNearArtifacts: true },
  {
    id: 'conflicting',
    wifiSigmaScale: 0.8,
    bleSigmaScale: 0.8,
    dropout: 0,
    rogue: { source: 'ble', position: { x: 10.4, y: 6.4 }, accuracyM: 0.5 },
    qrNearArtifacts: false
  }
];

export const getScenario = (id: ScenarioId): Scenario =>
  SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];

/** Ground-truth walking route, metres. Closed loop. */
export const DEMO_PATH: Position2D[] = [
  { x: 1.5, y: 1.5 },
  { x: 4.2, y: 2.2 },
  { x: 7.4, y: 3.1 },
  { x: 9.4, y: 5.4 },
  { x: 6.0, y: 6.6 },
  { x: 2.6, y: 5.4 }
];

export function pathLength(path: Position2D[]): number {
  let total = 0;
  for (let i = 0; i < path.length; i++) {
    total += distanceM(path[i], path[(i + 1) % path.length]);
  }
  return total;
}

/** Point at normalised distance t (0..1) around the closed route. */
export function targetAt(path: Position2D[], t: number): Position2D {
  if (path.length === 0) return { x: 0, y: 0 };
  const total = pathLength(path);
  let remaining = ((t % 1) + 1) % 1 * total;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    const len = distanceM(a, b);
    if (remaining <= len || i === path.length - 1) {
      const k = len === 0 ? 0 : remaining / len;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    remaining -= len;
  }
  return path[0];
}

/** Deterministic PRNG (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface SimStepOptions {
  room: RoomConfig;
  scenario: Scenario;
  /** Visitor ground truth for this step. */
  target: Position2D;
  seed: number;
  step: number;
  now: number;
}

/**
 * Produces simulated measurements for one step. Everything is derived from
 * `(seed, step)` so the same inputs always produce the same numbers.
 * These observations are always emitted with `live: false`.
 */
export function simulateStep(opts: SimStepOptions): Observation[] {
  const { room, scenario, target, seed, step, now } = opts;
  const rng = makeRng((seed ^ Math.imul(step + 1, 0x9e3779b1)) >>> 0);
  const out: Observation[] = [];

  for (const device of room.devices) {
    if (rng() < scenario.dropout) continue;
    const scale = device.kind === 'wifi' ? scenario.wifiSigmaScale : scenario.bleSigmaScale;
    const sigma = device.rangeSigmaM * scale;
    let range = distanceM(target, device.position) + gaussian(rng) * sigma;
    if (scenario.spoof && scenario.spoof.deviceId === device.id) range *= scenario.spoof.factor;
    range = Math.max(0.3, range);
    out.push({
      id: `sim-${step}-${device.id}`,
      kind: 'range',
      source: device.kind,
      deviceId: device.id,
      rangeM: Math.round(range * 1000) / 1000,
      accuracyM: Math.round(sigma * 1000) / 1000,
      timestamp: now,
      live: false
    } satisfies RangeObservation);
  }

  if (scenario.rogue) {
    out.push({
      id: `sim-${step}-rogue`,
      kind: 'position',
      source: scenario.rogue.source,
      position: { ...scenario.rogue.position },
      accuracyM: scenario.rogue.accuracyM,
      timestamp: now,
      live: false
    } satisfies PositionObservation);
  }

  if (scenario.qrNearArtifacts) {
    const near = sortByDistance(room, target).find((r) => r.distanceM <= 1.6);
    if (near) {
      out.push({
        id: `sim-${step}-qr-${near.artifact.id}`,
        kind: 'artifact',
        source: 'qr',
        artifactId: near.artifact.id,
        accuracyM: 1.4,
        timestamp: now,
        live: false
      } satisfies ArtifactObservation);
    }
  }

  return out;
}

export interface ScenarioRun {
  steps: number;
  estimate: FusedEstimate;
  truth: Position2D;
  targetArtifactId: string | null;
}

/**
 * Runs `steps` simulated steps along the demo path from a fixed seed.
 * Used by the "repeat scenario" control and by the deterministic tests.
 */
export function runScenario(
  room: RoomConfig,
  scenarioId: ScenarioId,
  steps: number,
  seed = 42,
  now = 1_000_000
): ScenarioRun[] {
  const scenario = getScenario(scenarioId);
  const results: ScenarioRun[] = [];
  let previous: FusedEstimate | null = null;
  let previousTimestamp: number | undefined;
  for (let i = 0; i < steps; i++) {
    const target = targetAt(DEMO_PATH, i / Math.max(1, steps));
    const observations = simulateStep({ room, scenario, target, seed, step: i, now });
    const estimate = fuse(observations, { room, now, previous, previousTimestamp });
    results.push({
      steps: i,
      estimate,
      truth: target,
      targetArtifactId: nearestArtifact(room, { position: target, accuracyM: 0.3, status: 'estimated' }).artifactId
    });
    previous = estimate;
    previousTimestamp = now;
  }
  return results;
}

const percentile = (values: number[], p: number): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[idx] * 100) / 100;
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 100) / 100;
};

export interface EvaluationOptions {
  seed?: number;
  /** Points per axis (default 5 → 25 test points). */
  grid?: number;
  scenario?: ScenarioId;
}

/**
 * Repeatable evaluation against known ground-truth points. This measures the
 * *algorithm on simulated measurements*, never real-world accuracy.
 */
export function runEvaluation(room: RoomConfig, opts: EvaluationOptions = {}): EvaluationReport {
  const seed = opts.seed ?? 2026;
  const grid = Math.max(3, opts.grid ?? 5);
  const scenario = getScenario(opts.scenario ?? 'clean');
  const now = 1_000_000;
  const points: EvaluationPointResult[] = [];
  const errors: number[] = [];
  const bySource: Record<'wifi' | 'ble' | 'fused', number[]> = { wifi: [], ble: [], fused: [] };
  let inside = 0;
  let nearestTotal = 0;
  let nearestCorrect = 0;

  const xs = Array.from({ length: grid }, (_, i) => 1.5 + (i * (room.widthM - 3)) / (grid - 1));
  const ys = Array.from({ length: grid }, (_, i) => 1.5 + (i * (room.heightM - 3)) / (grid - 1));

  let pointIndex = 0;
  for (const x of xs) {
    for (const y of ys) {
      const truth = { x, y };
      const observations = simulateStep({ room, scenario, target: truth, seed, step: pointIndex, now });
      const estimate = fuse(observations, { room, now });
      const wifiObs = observations.filter((o) => o.kind === 'range' && o.source === 'wifi');
      const bleObs = observations.filter((o) => o.kind === 'range' && o.source === 'ble');
      const wifi = fuse(wifiObs, { room, now });
      const ble = fuse(bleObs, { room, now });
      const errorM =
        estimate.position && estimate.status !== 'unknown' ? Math.round(distanceM(estimate.position, truth) * 100) / 100 : null;
      if (errorM != null) errors.push(errorM);
      for (const [key, result] of [
        ['wifi', wifi],
        ['ble', ble],
        ['fused', estimate]
      ] as const) {
        if (result.position && result.status !== 'unknown') {
          bySource[key].push(distanceM(result.position, truth));
        }
      }
      if (estimate.position && !estimate.diagnostics.clampedToRoom) inside++;

      const truthArtifact = nearestArtifact(room, { position: truth, accuracyM: 0.2, status: 'estimated' });
      const truthId = truthArtifact.reason === 'nearest' || truthArtifact.reason === 'too-close' ? truthArtifact.artifactId : null;
      const predicted = nearestArtifact(room, estimate);
      const predictedId = predicted.artifactId;
      const comparable = truthId != null;
      if (comparable) {
        nearestTotal++;
        if (predictedId === truthId) nearestCorrect++;
      }

      points.push({
        truth,
        estimate: estimate.position,
        errorM,
        status: estimate.status,
        truthArtifactId: truthId,
        predictedArtifactId: predictedId,
        nearestCorrect: comparable ? predictedId === truthId : null
      });
      pointIndex++;
    }
  }

  return {
    mode: 'simulation',
    testPoints: points.length,
    medianErrorM: median(errors),
    p90ErrorM: percentile(errors, 90),
    roomClassificationRate: points.length ? Math.round((inside / points.length) * 1000) / 1000 : 0,
    nearestArtifactAccuracy: nearestTotal ? Math.round((nearestCorrect / nearestTotal) * 1000) / 1000 : null,
    bySource: (['wifi', 'ble', 'fused'] as const).map((source) => ({
      source,
      medianErrorM: median(bySource[source]),
      p90ErrorM: percentile(bySource[source], 90),
      points: bySource[source].length
    })),
    points,
    seed
  };
}


