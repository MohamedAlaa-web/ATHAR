import type { MuseumPathPoint, DemoPath, Beacon } from '../../data/museum';
import { CROWD_PROFILE, distanceToRssi } from './rssi';
import type { BeaconReading, CrowdLevel, FloorId, FloorPosition } from './types';

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

export function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface PathSample {
  position: FloatFloorPosition;
  headingDeg: number;
  segmentProgress: number;
}

interface FloatFloorPosition extends FloorPosition {}

export function pathLengthM(path: DemoPath | MuseumPathPoint[]): number {
  const points = Array.isArray(path) ? path : path.points;
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return total;
}

/**
 * Position at `distanceM` along the path. Plan coordinates interpolate during
 * a staircase segment; the floor switches at the top. This is a simulation of
 * walking, not a stair detector.
 */
export function pointAlongPath(path: DemoPath | MuseumPathPoint[], distanceM: number): PathSample {
  const points = Array.isArray(path) ? path : path.points;
  if (points.length === 0) {
    return { position: { x: 0, y: 0, floor: 'ground' }, headingDeg: 0, segmentProgress: 0 };
  }
  const total = pathLengthM(points);
  const target = Math.max(0, Math.min(total, distanceM));
  let remaining = target;
  let lastFloor: FloorId = points[0].floor;
  let lastHeading = 0;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    lastFloor = a.floor;
    if (length > 1e-6) lastHeading = (Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI;
    if (remaining <= length || i === points.length - 1) {
      const t = length < 1e-6 ? 1 : Math.min(1, remaining / length);
      // A staircase segment is modelled as a floor switch at its start, then
      // plan-coordinate travel on the destination floor. This keeps the walker
      // inside a walkable polygon while climbing; it is a simulation shortcut.
      const floor = b.floor !== a.floor ? b.floor : a.floor;
      return {
        position: {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          floor
        },
        headingDeg: (lastHeading + 360) % 360,
        segmentProgress: t
      };
    }
    remaining -= length;
  }

  const last = points[points.length - 1];
  return {
    position: { x: last.x, y: last.y, floor: last.floor },
    headingDeg: (lastHeading + 360) % 360,
    segmentProgress: 1
  };
}

export interface ScanOptions {
  truth: FloorPosition;
  beacons: Beacon[];
  crowd: CrowdLevel;
  rng: () => number;
  timestamp: number;
  /** Beacons beyond this range are not heard at all. */
  maxRangeM?: number;
}

/**
 * One BLE scan: log-distance RSSI + Gaussian shadowing + crowd-dependent NLOS
 * attenuation + random dropouts. Deterministic given the RNG.
 */
export function generateBeaconScan({ truth, beacons, crowd, rng, timestamp, maxRangeM = 34 }: ScanOptions): BeaconReading[] {
  const profile = CROWD_PROFILE[crowd];
  const readings: BeaconReading[] = [];
  for (const beacon of beacons) {
    if (beacon.floor !== truth.floor) continue;
    const distanceM = Math.hypot(truth.x - beacon.x, truth.y - beacon.y);
    if (distanceM > maxRangeM) continue;
    if (rng() < profile.dropout) continue;

    let rssi = distanceToRssi(distanceM, beacon.txPower, beacon.pathLoss) + gaussian(rng) * profile.rssiSigmaDb;
    // Bodies attenuate; occasionally a strong NLOS penalty makes the beacon
    // look farther away than it is.
    if (profile.nlosBiasDb > 0 && rng() < 0.18) {
      rssi -= Math.abs(gaussian(rng)) * profile.nlosBiasDb;
    }
    readings.push({
      beaconId: beacon.id,
      rssi: Math.round(rssi * 10) / 10,
      timestamp
    });
  }
  return readings;
}

export interface WalkerStep {
  truth: FloorPosition;
  headingDeg: number;
  distanceM: number;
  readings: BeaconReading[];
  floorChanged: boolean;
}

/** Stateless single tick used by the runner and by unit tests. */
export function stepWalker(opts: {
  path: DemoPath | MuseumPathPoint[];
  distanceM: number;
  deltaM: number;
  beacons: Beacon[];
  crowd: CrowdLevel;
  rng: () => number;
  timestamp: number;
}): WalkerStep {
  const sample = pointAlongPath(opts.path, opts.distanceM);
  const previous = pointAlongPath(opts.path, Math.max(0, opts.distanceM - opts.deltaM));
  return {
    truth: sample.position,
    headingDeg: sample.headingDeg,
    distanceM: opts.deltaM,
    readings: generateBeaconScan({
      truth: sample.position,
      beacons: opts.beacons,
      crowd: opts.crowd,
      rng: opts.rng,
      timestamp: opts.timestamp
    }),
    floorChanged: previous.position.floor !== sample.position.floor
  };
}

export function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
