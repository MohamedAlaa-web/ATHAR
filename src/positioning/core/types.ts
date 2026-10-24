/** Shared types for the pure positioning core (no React, no DOM). */

export type FloorId = 'ground' | 'upper';
export type CrowdLevel = 'low' | 'medium' | 'high';
export type PositionSource = 'sim-ble' | 'ble' | 'qr' | 'motion' | 'manual';
export type SourceFilter = 'sim' | 'motion' | 'manual';

export interface Position2D {
  x: number;
  y: number;
}

export interface FloorPosition extends Position2D {
  floor: FloorId;
}

export interface BeaconLike {
  id: string;
  floor: FloorId;
  x: number;
  y: number;
  txPower: number;
  pathLoss: number;
}

export interface HallLike {
  id: string;
  floor: FloorId;
  rects: Array<{ x: number; y: number; w: number; h: number }>;
}

export interface BeaconReading {
  beaconId: string;
  rssi: number;
  /** Epoch milliseconds. */
  timestamp: number;
}

export interface PositionEstimate extends FloorPosition {
  hallId: string | null;
  /** 0..1, from accuracy and freshness. */
  confidence: number;
  /** 95% radius in metres (1.96σ). */
  accuracyRadiusM: number;
  source: PositionSource;
  updatedAt: number;
}

export interface EngineMap {
  beacons: BeaconLike[];
  halls: HallLike[];
  rects: Record<FloorId, Array<{ x: number; y: number; w: number; h: number }>>;
}

export interface BeaconScanSummary {
  total: number;
  used: number;
  strongest: Array<{ beaconId: string; rssi: number; distanceM: number }>;
  fix: { x: number; y: number; accuracyM: number; residualM: number } | null;
}

export interface EngineSnapshot {
  estimate: PositionEstimate | null;
  lastScan: BeaconScanSummary | null;
  qrConfirmations: number;
  pdrSteps: number;
  trilaterations: number;
}

export interface SensorStatus {
  available: boolean;
  reason:
    | 'available'
    | 'permission-required'
    | 'permission-denied'
    | 'not-supported'
    | 'insecure-context'
    | 'camera-busy'
    | 'native-only'
    | 'no-events'
    | 'idle';
  detail: string;
}
