/**
 * Core types for the ATHAR indoor positioning demo.
 *
 * Coordinate system: metres, origin at the bottom-left corner of the room,
 * +x to the right, +y "up" (towards the top wall). The SVG renderer flips y
 * once, in `toSvg`, so every model value stays in plain floor coordinates.
 */

export type SourceKind = 'qr' | 'manual' | 'wifi' | 'ble' | 'motion';

export interface Position2D {
  x: number;
  y: number;
}

export type DeviceKind = 'wifi' | 'ble';

export interface RoomDevice {
  id: string;
  kind: DeviceKind;
  label: string;
  position: Position2D;
  /** Stated 1-sigma range accuracy in metres (calibration input). */
  rangeSigmaM: number;
  /** True when the device is a real, physical unit in the demo room. */
  physical: boolean;
}

export interface RoomArtifact {
  /** Existing ATHAR artifact id — never invented here. */
  id: string;
  /** Human label, shown on the map. */
  label: string;
  position: Position2D;
  /** Radius around the marker that counts as "at the artifact". */
  radiusM: number;
}

export interface RoomObstacle {
  id: string;
  label: string;
  x: number;
  y: number;
  widthM: number;
  heightM: number;
}

export interface RoomConfig {
  id: string;
  name: string;
  widthM: number;
  heightM: number;
  gridStepM: number;
  devices: RoomDevice[];
  artifacts: RoomArtifact[];
  obstacles: RoomObstacle[];
  /** Distance above which the nearest artifact is not offered. */
  proximityThresholdM: number;
  /** Two artifacts closer than this cannot be told apart reliably. */
  ambiguityMarginM: number;
}

export interface PositionObservation {
  id: string;
  kind: 'position';
  source: SourceKind;
  position: Position2D;
  /** 1-sigma accuracy in metres. */
  accuracyM: number;
  timestamp: number;
  /** True only when the value came from real hardware/sensors. */
  live: boolean;
}

export interface RangeObservation {
  id: string;
  kind: 'range';
  source: 'wifi' | 'ble';
  deviceId: string;
  rangeM: number;
  /** 1-sigma range accuracy in metres. */
  accuracyM: number;
  timestamp: number;
  live: boolean;
}

export interface ArtifactObservation {
  id: string;
  kind: 'artifact';
  source: 'qr' | 'manual';
  artifactId: string;
  nil?: never;
  /** 1-sigma positional accuracy implied by standing at the artifact. */
  accuracyM: number;
  timestamp: number;
  live: boolean;
}

export type Observation = PositionObservation | RangeObservation | ArtifactObservation;

export type RejectReason =
  | 'stale'
  | 'out-of-bounds'
  | 'invalid-accuracy'
  | 'invalid-time'
  | 'unknown-artifact'
  | 'unknown-device'
  | 'degenerate-geometry'
  | 'insufficient-ranges';

export interface RejectedObservation {
  observation: Observation;
  reason: RejectReason;
  ageMs: number;
}

export interface Contribution {
  observation: Observation;
  /** Share of the final inverse-variance weight (0..1). */
  weightPct: number;
  ageMs: number;
  /** Position this observation resolves to (range → multilaterated point). */
  resolved: Position2D | null;
  /** Derived accuracy used in the fusion for this contribution. */
  effectiveAccuracyM: number;
}

export type PositionStatus = 'unknown' | 'uncertain' | 'estimated' | 'confirmed';

export interface FusedEstimate {
  status: PositionStatus;
  position: Position2D | null;
  /** 1-sigma fused accuracy in metres. */
  accuracyM: number | null;
  /** 0..1, documented formula in INDOOR_POSITIONING.md. */
  confidence: number;
  contributions: Contribution[];
  /** Every observation that passed validation and fed the estimate. */
  accepted: Observation[];
  rejected: RejectedObservation[];
  /** Fresh QR/manual artifact confirmations (scan-time references). */
  references: Array<{ artifactId: string; source: 'qr' | 'manual'; ageMs: number; live: boolean }>;
  /** True when observations disagree beyond their stated uncertainty. */
  conflict: boolean;
  /** Numeric diagnostics behind the conflict decision. */
  diagnostics: {
    acceptedCount: number;
    normalizedDisagreement: number | null;
    rangeResidual: number | null;
    /** True when the raw estimate left the room and was clamped to the walls. */
    clampedToRoom: boolean;
  };
  notes: string[];
}

export type Ambiguity = 'clear' | 'ambiguous' | 'none';

export interface NearestArtifact {
  artifactId: string | null;
  distanceM: number | null;
  ambiguity: Ambiguity;
  reason: 'nearest' | 'too-far' | 'too-close' | 'no-position' | 'position-uncertain';
  runnersUp: Array<{ artifactId: string; distanceM: number }>;
}

export interface ProviderStatus {
  source: SourceKind;
  available: boolean;
  /** Stable machine-readable reason, translated in the UI. */
  reason:
    | 'available'
    | 'no-secure-context'
    | 'not-supported'
    | 'permission-required'
    | 'no-browser-api'
    | 'simulation-only';
  detail: string;
}

export interface EvaluationPointResult {
  truth: Position2D;
  estimate: Position2D | null;
  errorM: number | null;
  status: PositionStatus;
  truthArtifactId: string | null;
  predictedArtifactId: string | null;
  nearestCorrect: boolean | null;
}

export interface EvaluationReport {
  /** How the numbers were produced — never ambiguous. */
  mode: 'simulation';
  testPoints: number;
  medianErrorM: number | null;
  p90ErrorM: number | null;
  roomClassificationRate: number;
  nearestArtifactAccuracy: number | null;
  bySource: Array<{
    source: 'wifi' | 'ble' | 'fused';
    medianErrorM: number | null;
    p90ErrorM: number | null;
    points: number;
  }>;
  points: EvaluationPointResult[];
  seed: number;
}
