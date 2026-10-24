import { Kalman2D } from './kalman';
import { snapToWalkable } from './mapMatching';
import { displacementFromStep } from './pdr';
import {
  CROWD_PROFILE,
  MovingAverage,
  distanceSigmaM,
  rssiToDistance,
  strongestReadings
} from './rssi';
import { trilaterateRobust } from './trilateration';
import type {
  BeaconReading,
  BeaconScanSummary,
  CrowdLevel,
  EngineMap,
  EngineSnapshot,
  FloorId,
  FloorPosition,
  HallLike,
  PositionEstimate,
  PositionSource
} from './types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Model floors for the reported 95% radius. A browser BLE demo cannot honestly
 * claim sub-metre beacon accuracy: the linearised covariance is optimistic
 * because RSSI errors are correlated and NLOS-biased. These floors are
 * deliberately conservative and are separate from the raw Kalman covariance.
 */
const MODEL_FLOOR_SIGMA_M: Record<PositionSource, number> = {
  qr: 0.35,
  manual: 0.7,
  motion: 1.2,
  ble: 2.5,
  'sim-ble': 2.5
};

function hallAt(map: EngineMap, p: { x: number; y: number }, floor: FloorId): HallLike | null {
  const halls = map.halls.filter((h) => h.floor === floor);
  const exact = halls.find((h) => h.rects.some((r) => p.x >= r.x && p.y >= r.y && p.x <= r.x + r.w && p.y <= r.y + r.h));
  if (exact) return exact;
  let best: { hall: HallLike; d: number } | null = null;
  for (const hall of halls) {
    for (const r of hall.rects) {
      const cx = clamp(p.x, r.x, r.x + r.w);
      const cy = clamp(p.y, r.y, r.y + r.h);
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (!best || d < best.d) best = { hall, d };
    }
  }
  return best?.hall ?? null;
}

export interface EngineOptions {
  averagingWindow?: number;
  now?: () => number;
}

/**
 * The single place where sensor evidence becomes a position estimate.
 *
 * - BLE ranges are smoothed, strongest 3–4 trilaterated, then used as an
 *   absolute Kalman update.
 * - A PDR step is a relative Kalman shift with covariance growth.
 * - QR/manual evidence resets the filter and collapses uncertainty.
 * - Every output is map-matched to walkable floor area.
 */
export class PositioningEngine {
  private kf = new Kalman2D();
  private initialized = false;
  private floor: FloorId = 'ground';
  private source: PositionSource = 'manual';
  private updatedAt = 0;
  private lastPredictAt = 0;
  private smoothing = new Map<string, MovingAverage>();
  private lastScan: BeaconScanSummary | null = null;
  private lastEstimate: PositionEstimate | null = null;
  private qrConfirmations = 0;
  private pdrSteps = 0;
  private trilaterations = 0;
  private snapDistanceM = 0;
  private readonly averagingWindow: number;

  constructor(private readonly map: EngineMap, opts: EngineOptions = {}) {
    this.averagingWindow = opts.averagingWindow ?? 4;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get currentFloor(): FloorId {
    return this.floor;
  }

  initialize(position: FloorPosition, source: PositionSource, accuracyM: number, now: number): PositionEstimate {
    this.initialized = true;
    this.floor = position.floor;
    this.source = source;
    this.updatedAt = now;
    this.lastPredictAt = now;
    this.kf.reset(position.x, position.y, accuracyM);
    for (const average of this.smoothing.values()) average.reset();
    return this.computeEstimate(now);
  }

  setManual(position: FloorPosition, now: number, accuracyM = 0.9): PositionEstimate {
    this.qrConfirmations += 0;
    return this.initialize(position, 'manual', accuracyM, now);
  }

  confirmQr(position: FloorPosition, now: number, accuracyM = 0.4): PositionEstimate {
    this.qrConfirmations += 1;
    return this.initialize(position, 'qr', accuracyM, now);
  }

  /** Apply one scan of BLE advertisement RSSI values. */
  applyBeaconScan(
    readings: BeaconReading[],
    crowd: CrowdLevel,
    now: number,
    source: 'sim-ble' | 'ble' = 'sim-ble'
  ): PositionEstimate | null {
    if (!this.initialized) return null;
    const known = readings.filter((r) => this.map.beacons.some((b) => b.id === r.beaconId && b.floor === this.floor));

    const smoothed = known
      .map((reading) => {
        const beacon = this.map.beacons.find((b) => b.id === reading.beaconId)!;
        let average = this.smoothing.get(beacon.id);
        if (!average) {
          average = new MovingAverage(this.averagingWindow);
          this.smoothing.set(beacon.id, average);
        }
        const rssi = average.push(reading.rssi);
        return { beacon, rssi };
      })
      .filter((entry) => Number.isFinite(entry.rssi));

    const strongest = strongestReadings(
      smoothed.map((entry) => ({ beaconId: entry.beacon.id, rssi: entry.rssi })),
      4
    );

    const summary: BeaconScanSummary = {
      total: readings.length,
      used: 0,
      strongest: strongest.map((entry) => ({
        ...entry,
        distanceM: Math.round(rssiToDistance(entry.rssi) * 10) / 10
      })),
      fix: null
    };

    if (strongest.length < 3) {
      this.lastScan = summary;
      return this.lastEstimate;
    }

    const crowdProfile = CROWD_PROFILE[crowd];
    const inputs = strongest.map((entry) => {
      const beacon = this.map.beacons.find((b) => b.id === entry.beaconId)!;
      const distanceM = rssiToDistance(entry.rssi, beacon.txPower, beacon.pathLoss);
      const sigmaM = distanceSigmaM(distanceM, crowdProfile.rssiSigmaDb, beacon.pathLoss);
      return { x: beacon.x, y: beacon.y, distanceM, sigmaM };
    });

    const fix = trilaterateRobust(inputs);
    this.trilaterations += 1;
    if (!fix) {
      this.lastScan = summary;
      return this.lastEstimate;
    }

    summary.used = fix.used;
    const fixSnap = snapToWalkable({ x: fix.x, y: fix.y }, this.map.rects[this.floor] ?? []);
    summary.fix = {
      x: Math.round(fix.x * 10) / 10,
      y: Math.round(fix.y * 10) / 10,
      accuracyM: Math.round(fix.accuracyM * 10) / 10,
      residualM: Math.round(fix.residualRmsM * 10) / 10
    };
    this.lastScan = summary;

    if (fixSnap.distanceM > 12) return this.lastEstimate;

    // A fix that needed snapping is less trustworthy than its residual says.
    const variance = fix.accuracyM ** 2 + fixSnap.distanceM ** 2;
    const dt = Math.max(0, (now - this.lastPredictAt) / 1000);
    this.kf.predict(dt);
    this.lastPredictAt = now;
    this.kf.updatePosition(fix.x, fix.y, variance);
    const matched = snapToWalkable(this.kf.state().position, this.map.rects[this.floor] ?? []);
    this.kf.updatePosition(matched.position.x, matched.position.y, 0.04);
    this.snapDistanceM = matched.distanceM;
    this.source = source;
    this.updatedAt = now;
    return this.computeEstimate(now);
  }

  /**
   * One detected step from DeviceMotion + heading. `source` is overridable so a
   * simulated walker's synthetic steps are not reported as real phone motion.
   */
  applyPdrStep(
    headingDeg: number,
    now: number,
    strideM = 0.68,
    headingErrorDeg = 14,
    source: PositionSource = 'motion'
  ): PositionEstimate | null {
    if (!this.initialized) return null;
    const step = displacementFromStep(headingDeg, strideM);
    const headingErrorRad = (Math.max(4, headingErrorDeg) * Math.PI) / 180;
    const variance = (0.1 * strideM) ** 2 + (strideM * Math.sin(headingErrorRad)) ** 2;
    this.kf.applyDisplacement(step.x, step.y, variance);
    const matched = snapToWalkable(this.kf.state().position, this.map.rects[this.floor] ?? []);
    this.kf.updatePosition(matched.position.x, matched.position.y, 0.02);
    this.snapDistanceM = matched.distanceM;
    this.pdrSteps += 1;
    this.source = source;
    this.updatedAt = now;
    return this.computeEstimate(now);
  }

  setFloor(floor: FloorId, now: number): void {
    this.floor = floor;
    this.updatedAt = now;
    this.computeEstimate(now);
  }

  estimate(now: number): PositionEstimate | null {
    if (!this.initialized) return null;
    return this.computeEstimate(now);
  }

  snapshot(now: number): EngineSnapshot {
    return {
      estimate: this.initialized ? this.computeEstimate(now) : null,
      lastScan: this.lastScan,
      qrConfirmations: this.qrConfirmations,
      pdrSteps: this.pdrSteps,
      trilaterations: this.trilaterations
    };
  }

  private computeEstimate(now: number): PositionEstimate {
    const state = this.kf.state();
    const stalenessSec = Math.max(0, (now - this.updatedAt) / 1000);
    const sigma =
      Math.hypot(state.sigmaM, MODEL_FLOOR_SIGMA_M[this.source]) + Math.min(8, stalenessSec * 0.08);
    const radius = Math.max(0.5, 1.96 * sigma);
    const hall = hallAt(this.map, state.position, this.floor);
    const freshness = Math.exp(-stalenessSec / 180);
    const rawConfidence = (1 / (1 + sigma / 3)) * freshness;
    const confidence = this.source === 'qr' ? Math.max(rawConfidence, 0.88 * freshness) : rawConfidence;

    const estimate: PositionEstimate = {
      x: Math.round(state.position.x * 100) / 100,
      y: Math.round(state.position.y * 100) / 100,
      floor: this.floor,
      hallId: hall?.id ?? null,
      confidence: Math.round(clamp(confidence, 0, 1) * 100) / 100,
      accuracyRadiusM: Math.round(radius * 10) / 10,
      source: this.source,
      updatedAt: this.updatedAt
    };
    this.lastEstimate = estimate;
    return estimate;
  }

  /** Exposed for the debug panel: how far the last update was snapped. */
  get lastSnapDistanceM(): number {
    return this.snapDistanceM;
  }

  get statistics(): {
    qrConfirmations: number;
    pdrSteps: number;
    trilaterations: number;
    lastScan: BeaconScanSummary | null;
  } {
    return {
      qrConfirmations: this.qrConfirmations,
      pdrSteps: this.pdrSteps,
      trilaterations: this.trilaterations,
      lastScan: this.lastScan
    };
  }
}
