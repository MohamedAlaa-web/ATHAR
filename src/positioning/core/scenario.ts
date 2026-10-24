import { MUSEUM, hallAt, type DemoPath, type Localized } from '../../data/museum';
import { MUSEUM_ENGINE_MAP } from './defaultMap';
import { PositioningEngine } from './engine';
import { generateBeaconScan, hashSeed, makeRng, pathLengthM, pointAlongPath } from './simulation';
import type { CrowdLevel, FloorId, FloorPosition } from './types';

export type FusionConfigId = 'beacons' | 'beacons-pdr' | 'full';

export interface FusionConfig {
  id: FusionConfigId;
  label: Localized;
  description: Localized;
  useBeacons: boolean;
  usePdr: boolean;
  useQr: boolean;
}

export const FUSION_CONFIGS: FusionConfig[] = [
  {
    id: 'beacons',
    label: { ar: 'BLE فقط', en: 'BLE only' },
    description: {
      ar: 'ثلاثي الأبعاد من أقوى ٣–٤ منارات فقط؛ لا خطوات ولا QR بعد البداية.',
      en: 'Trilateration from the strongest 3–4 beacons only; no PDR and no QR after the start.'
    },
    useBeacons: true,
    usePdr: false,
    useQr: false
  },
  {
    id: 'beacons-pdr',
    label: { ar: 'BLE + حركة', en: 'BLE + PDR' },
    description: {
      ar: 'دمج منارات BLE مع خطوات الهاتف واتجاهه في مرشح كالمان.',
      en: 'BLE trilateration fused with phone step/heading dead reckoning in a Kalman filter.'
    },
    useBeacons: true,
    usePdr: true,
    useQr: false
  },
  {
    id: 'full',
    label: { ar: 'الدمج الكامل + QR', en: 'Full fusion + QR' },
    description: {
      ar: 'BLE + حركة + مسح QR عند القطع، مع مطابقة الموقع للمناطق الممشاة.',
      en: 'BLE + PDR + a QR reset at each artifact, with map matching.'
    },
    useBeacons: true,
    usePdr: true,
    useQr: true
  }
];

export interface ScenarioQrReset {
  /** Seconds from the start of this run (0 = the initial entrance fix). */
  atSec: number;
  kind: 'entrance' | 'artifact';
  artifactId: string | null;
}

export interface ScenarioRunResult {
  id: string;
  pathId: string;
  pathName: Localized;
  crowd: CrowdLevel;
  config: FusionConfigId;
  seed: number;
  steps: number;
  durationSec: number;
  meanErrorM: number;
  medianErrorM: number;
  p95ErrorM: number;
  hallAccuracyPct: number;
  nearestArtifactAccuracyPct: number;
  updateRateHz: number;
  beaconReadingsUsedAvg: number;
  sensorActivationsPerMin: number;
  cpuOpsPerMin: number;
  finalTruth: FloorPosition;
  finalEstimate: FloorPosition;
  /** Every QR reset applied, including the entrance initialisation at 0 s. */
  qrResets: ScenarioQrReset[];
  qrResetCount: number;
  /** Resets from artifact proximity only (the `full` config); entrance excluded. */
  qrArtifactResetCount: number;
  errors: number[];
}

export interface ScenarioSummaryRow {
  config: FusionConfigId;
  crowd: CrowdLevel;
  runs: number;
  meanErrorM: number;
  medianErrorM: number;
  p95ErrorM: number;
  hallAccuracyPct: number;
  nearestArtifactAccuracyPct: number;
  updateRateHz: number;
  beaconReadingsUsedAvg: number;
  sensorActivationsPerMin: number;
  cpuOpsPerMin: number;
  qrResetsAvg: number;
}

export interface ScenarioMatrix {
  mode: 'simulation';
  generatedAt: string;
  seed: number;
  speedMps: number;
  dtSec: number;
  runs: ScenarioRunResult[];
  summary: ScenarioSummaryRow[];
  configSummary: Array<{
    config: FusionConfigId;
    meanErrorM: number;
    medianErrorM: number;
    p95ErrorM: number;
    hallAccuracyPct: number;
    qrResetsAvg: number;
    numberOfRuns: number;
  }>;
}

export interface ScenarioOptions {
  seed?: number;
  paths?: DemoPath[];
  crowds?: CrowdLevel[];
  configs?: FusionConfigId[];
  speedMps?: number;
  dtSec?: number;
}

const round = (value: number, places = 2): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function nearestArtifactId(p: FloorPosition): string | null {
  let best: { id: string; d: number } | null = null;
  for (const artifact of MUSEUM.artifacts) {
    if (artifact.floor !== p.floor) continue;
    const d = Math.hypot(artifact.x - p.x, artifact.y - p.y);
    if (!best || d < best.d) best = { id: artifact.id, d };
  }
  return best?.id ?? null;
}

/** Replays one path with one configuration; all randomness is seeded. */
export function runScenario(
  path: DemoPath,
  crowd: CrowdLevel,
  configId: FusionConfigId,
  options: ScenarioOptions = {}
): ScenarioRunResult {
  const config = FUSION_CONFIGS.find((c) => c.id === configId) ?? FUSION_CONFIGS[0];
  const speedMps = options.speedMps ?? 1.1;
  const dtSec = options.dtSec ?? 1;
  const baseSeed = options.seed ?? 2026;
  const seed = hashSeed(`${path.id}|${crowd}|${baseSeed}`);
  const rng = makeRng(seed);
  const totalM = pathLengthM(path);
  const steps = Math.max(12, Math.min(240, Math.ceil(totalM / (speedMps * dtSec))));
  const deltaM = totalM / steps;
  const durationSec = steps * dtSec;

  const engine = new PositioningEngine(MUSEUM_ENGINE_MAP);
  let now = 1_000_000;
  const qrResets: ScenarioQrReset[] = [{ atSec: 0, kind: 'entrance', artifactId: null }];
  engine.confirmQr({ ...MUSEUM.entrance, floor: MUSEUM.entrance.floor }, now);

  const errors: number[] = [];
  let hallHits = 0;
  let nearestHits = 0;
  let compared = 0;
  let scans = 0;
  let readingsUsed = 0;
  let pdrSteps = 0;
  let updates = 0;
  let trilaterations = 0;
  const scannedArtifacts = new Set<string>();

  for (let step = 1; step <= steps; step++) {
    now += dtSec * 1000;
    const sample = pointAlongPath(path, deltaM * step);
    const previous = pointAlongPath(path, deltaM * (step - 1));
    const truth = sample.position;

    if (truth.floor !== engine.currentFloor) engine.setFloor(truth.floor, now);

    if (config.usePdr) {
      const horizontalM = Math.hypot(truth.x - previous.position.x, truth.y - previous.position.y);
      const count = Math.max(1, Math.round(horizontalM / 0.68));
      const stride = horizontalM / count;
      for (let s = 0; s < count; s++) {
        engine.applyPdrStep(sample.headingDeg, now, stride, 14);
        pdrSteps += 1;
        updates += 1;
      }
    }

    if (config.useBeacons) {
      const readings = generateBeaconScan({ truth, beacons: MUSEUM.beacons, crowd, rng, timestamp: now });
      engine.applyBeaconScan(readings, crowd, now);
      scans += 1;
      const last = engine.statistics.lastScan;
      readingsUsed += last?.used ?? 0;
      if (last?.fix) {
        trilaterations += 1;
        updates += 1;
      }
    }

    if (config.useQr) {
      for (const artifact of MUSEUM.artifacts) {
        if (artifact.floor !== truth.floor) continue;
        if (scannedArtifacts.has(artifact.id)) continue;
        if (Math.hypot(artifact.x - truth.x, artifact.y - truth.y) <= 1.25) {
          engine.confirmQr({ x: artifact.x, y: artifact.y, floor: artifact.floor }, now, 0.4);
          qrResets.push({ atSec: round(step * dtSec, 1), kind: 'artifact', artifactId: artifact.id });
          scannedArtifacts.add(artifact.id);
          updates += 1;
        }
      }
    }

    if (truth.floor !== engine.currentFloor) engine.setFloor(truth.floor, now);
    const estimate = engine.estimate(now);
    if (!estimate) continue;

    const error = Math.hypot(estimate.x - truth.x, estimate.y - truth.y);
    errors.push(error);
    const truthHall = hallAt(truth, truth.floor)?.id ?? null;
    if (truthHall && estimate.floor === truth.floor && estimate.hallId === truthHall) hallHits += 1;
    const truthNearest = nearestArtifactId(truth);
    const estimateNearest = nearestArtifactId({ x: estimate.x, y: estimate.y, floor: estimate.floor });
    if (truthNearest !== null) {
      compared += 1;
      if (truthNearest === estimateNearest) nearestHits += 1;
    }
  }

  const trilaterationCount = engine.statistics.trilaterations;
  const lastTruth = pointAlongPath(path, totalM).position;
  const lastEstimate = engine.estimate(now) ?? { ...MUSEUM.entrance };

  return {
    id: `${path.id}__${crowd}__${configId}`,
    pathId: path.id,
    pathName: path.name,
    crowd,
    config: configId,
    seed,
    steps,
    durationSec: round(durationSec, 1),
    meanErrorM: round(mean(errors)),
    medianErrorM: round(median(errors)),
    p95ErrorM: round(percentile(errors, 95)),
    hallAccuracyPct: round((hallHits / Math.max(1, errors.length)) * 100, 1),
    nearestArtifactAccuracyPct: round((nearestHits / Math.max(1, compared)) * 100, 1),
    updateRateHz: round(updates / Math.max(1, durationSec), 2),
    beaconReadingsUsedAvg: round(readingsUsed / Math.max(1, scans), 2),
    sensorActivationsPerMin: round(((scans + pdrSteps) / Math.max(1, durationSec)) * 60, 1),
    cpuOpsPerMin: round(((trilaterationCount + pdrSteps) / Math.max(1, durationSec)) * 60, 1),
    finalTruth: lastTruth,
    finalEstimate: { x: lastEstimate.x, y: lastEstimate.y, floor: lastEstimate.floor },
    qrResets,
    qrResetCount: qrResets.length,
    qrArtifactResetCount: qrResets.filter((reset) => reset.kind === 'artifact').length,
    errors: errors.map((e) => round(e, 3))
  };
}

export function summarizeRuns(runs: ScenarioRunResult[]): ScenarioSummaryRow[] {
  const rows: ScenarioSummaryRow[] = [];
  const crowds: CrowdLevel[] = ['low', 'medium', 'high'];
  for (const config of FUSION_CONFIGS) {
    for (const crowd of crowds) {
      const group = runs.filter((r) => r.config === config.id && r.crowd === crowd);
      if (!group.length) continue;
      rows.push({
        config: config.id,
        crowd,
        runs: group.length,
        meanErrorM: round(mean(group.map((r) => r.meanErrorM))),
        medianErrorM: round(mean(group.map((r) => r.medianErrorM))),
        p95ErrorM: round(mean(group.map((r) => r.p95ErrorM))),
        hallAccuracyPct: round(mean(group.map((r) => r.hallAccuracyPct)), 1),
        nearestArtifactAccuracyPct: round(mean(group.map((r) => r.nearestArtifactAccuracyPct)), 1),
        updateRateHz: round(mean(group.map((r) => r.updateRateHz)), 2),
        beaconReadingsUsedAvg: round(mean(group.map((r) => r.beaconReadingsUsedAvg)), 2),
        sensorActivationsPerMin: round(mean(group.map((r) => r.sensorActivationsPerMin)), 1),
        cpuOpsPerMin: round(mean(group.map((r) => r.cpuOpsPerMin)), 1),
        qrResetsAvg: round(mean(group.map((r) => r.qrResetCount)), 2)
      });
    }
  }
  return rows;
}

/** 3 paths × 3 crowd levels × 3 fusion configurations = 27 real runs. */
export function runScenarioMatrix(options: ScenarioOptions = {}): ScenarioMatrix {
  const seed = options.seed ?? 2026;
  const paths = options.paths ?? MUSEUM.paths;
  const crowds = options.crowds ?? (['low', 'medium', 'high'] as CrowdLevel[]);
  const configs = options.configs ?? FUSION_CONFIGS.map((c) => c.id);
  const runs: ScenarioRunResult[] = [];
  for (const path of paths) {
    for (const crowd of crowds) {
      for (const config of configs) {
        runs.push(runScenario(path, crowd, config, { ...options, seed }));
      }
    }
  }
  const summary = summarizeRuns(runs);
  const configSummary = FUSION_CONFIGS.filter((c) => configs.includes(c.id)).map((config) => {
    const group = runs.filter((r) => r.config === config.id);
    return {
      config: config.id,
      meanErrorM: round(mean(group.map((r) => r.meanErrorM))),
      medianErrorM: round(mean(group.map((r) => r.medianErrorM))),
      p95ErrorM: round(mean(group.map((r) => r.p95ErrorM))),
      hallAccuracyPct: round(mean(group.map((r) => r.hallAccuracyPct)), 1),
      qrResetsAvg: round(mean(group.map((r) => r.qrResetCount)), 2),
      numberOfRuns: group.length
    };
  });

  return {
    mode: 'simulation',
    generatedAt: new Date().toISOString(),
    seed,
    speedMps: options.speedMps ?? 1.1,
    dtSec: options.dtSec ?? 1,
    runs,
    summary,
    configSummary
  };
}
