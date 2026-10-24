import type { CrowdLevel } from './types';

/**
 * Log-distance path-loss model.
 *
 *   RSSI(d) = txPower − 10 · n · log10(d)
 *
 * txPower is the measured RSSI at 1 m and n is the environmental exponent
 * (2.0 in free space, higher in a crowded museum). Distances are clamped so a
 * dropped/optimistic sample cannot produce an absurd metre value.
 */
export const DEFAULT_TX_POWER = -59;
export const DEFAULT_PATH_LOSS = 2.0;
export const MIN_DISTANCE_M = 0.25;
export const MAX_DISTANCE_M = 60;

export function distanceToRssi(
  distanceM: number,
  txPower = DEFAULT_TX_POWER,
  pathLoss = DEFAULT_PATH_LOSS
): number {
  const d = Math.max(MIN_DISTANCE_M, distanceM);
  return txPower - 10 * pathLoss * Math.log10(d);
}

export function rssiToDistance(
  rssi: number,
  txPower = DEFAULT_TX_POWER,
  pathLoss = DEFAULT_PATH_LOSS
): number {
  if (!Number.isFinite(rssi)) return MAX_DISTANCE_M;
  const d = Math.pow(10, (txPower - rssi) / (10 * pathLoss));
  return Math.min(MAX_DISTANCE_M, Math.max(MIN_DISTANCE_M, d));
}

/** Crowd levels increase RSSI noise and dropout probability (a real effect: bodies absorb 2.4 GHz). */
export const CROWD_PROFILE: Record<
  CrowdLevel,
  { rssiSigmaDb: number; dropout: number; nlosBiasDb: number; labelEn: string; labelAr: string }
> = {
  low: { rssiSigmaDb: 2.5, dropout: 0, nlosBiasDb: 0, labelEn: 'Low', labelAr: 'منخفض' },
  medium: { rssiSigmaDb: 5.5, dropout: 0.08, nlosBiasDb: 2.5, labelEn: 'Medium', labelAr: 'متوسط' },
  high: { rssiSigmaDb: 8.5, dropout: 0.18, nlosBiasDb: 5, labelEn: 'High', labelAr: 'مرتفع' }
};

/**
 * Expected range error (1σ, metres) implied by an RSSI spread. Differentiating
 * the path-loss model: σ_d ≈ d · ln(10) · σ_rssi / (10 · n).
 */
export function distanceSigmaM(distanceM: number, rssiSigmaDb: number, pathLoss = DEFAULT_PATH_LOSS): number {
  return Math.max(0.25, (distanceM * Math.LN10 * rssiSigmaDb) / (10 * pathLoss));
}

/** Fixed-window moving average, one instance per beacon. */
export class MovingAverage {
  private values: number[] = [];

  constructor(private readonly window = 4) {}

  push(value: number): number {
    this.values.push(value);
    if (this.values.length > this.window) this.values.shift();
    return this.value;
  }

  get value(): number {
    if (this.values.length === 0) return Number.NaN;
    return this.values.reduce((sum, v) => sum + v, 0) / this.values.length;
  }

  get count(): number {
    return this.values.length;
  }

  reset(): void {
    this.values = [];
  }
}

/** Select the strongest N readings; ties resolve by beacon id for determinism. */
export function strongestReadings<T extends { rssi: number; beaconId: string }>(readings: T[], max = 4): T[] {
  return [...readings]
    .sort((a, b) => b.rssi - a.rssi || a.beaconId.localeCompare(b.beaconId))
    .slice(0, max);
}
