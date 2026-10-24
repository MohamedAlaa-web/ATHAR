import { MUSEUM, qrTarget, type Beacon, type DemoPath, type MuseumPathPoint } from '../../data/museum';
import type { PositioningEngine } from './engine';
import { StepDetector, displacementFromStep } from './pdr';
import { generateBeaconScan, makeRng, pathLengthM, pointAlongPath, type WalkerStep } from './simulation';
import type {
  BeaconReading,
  CrowdLevel,
  EngineSnapshot,
  FloorPosition,
  PositionEstimate,
  SensorStatus
} from './types';

export interface SensorSource {
  readonly kind: 'sim' | 'qr' | 'motion' | 'manual' | 'ble';
  status(): SensorStatus;
  start(): Promise<boolean>;
  stop(): void;
}

/* ------------------------------------------------------------------ */
/* 1. SimulatedSource — the demo's virtual walker + virtual beacons    */
/* ------------------------------------------------------------------ */

export interface SimulatedSourceOptions {
  path: DemoPath | MuseumPathPoint[];
  beacons: Beacon[];
  crowd: CrowdLevel;
  intervalMs?: number;
  speedMps?: number;
  seed?: number;
  loop?: boolean;
  onSample: (sample: WalkerStep) => void;
  onStatus?: (status: SensorStatus) => void;
  onEnd?: () => void;
}

/**
 * Walks a virtual visitor along `path` on a timer and generates realistic,
 * noisy BLE advertisement readings (log-distance + shadowing + dropouts).
 * The map is only redrawn on these ticks, never at 60 fps.
 */
export class SimulatedSource implements SensorSource {
  readonly kind = 'sim' as const;
  private timer: number | null = null;
  private path: DemoPath | MuseumPathPoint[];
  private distanceM = 0;
  private tick = 0;
  private rng: () => number;
  private crowd: CrowdLevel;
  private intervalMs: number;
  private speedMps: number;
  private readonly seed: number;
  private loop: boolean;
  private running = false;

  constructor(private readonly options: SimulatedSourceOptions) {
    this.path = options.path;
    this.crowd = options.crowd;
    this.intervalMs = options.intervalMs ?? 1000;
    this.speedMps = options.speedMps ?? 1.1;
    this.seed = options.seed ?? 2026;
    this.loop = options.loop ?? false;
    this.rng = makeRng(this.seed);
  }

  status(): SensorStatus {
    return {
      available: true,
      reason: 'available',
      detail: 'Virtual walker with simulated BLE beacons. Nothing comes from hardware.'
    };
  }

  async start(): Promise<boolean> {
    if (this.running) return true;
    this.running = true;
    this.tickOnce(0);
    this.timer = setInterval(() => this.tickOnce(this.intervalMs), this.intervalMs) as unknown as number;
    this.options.onStatus?.(this.status());
    return true;
  }

  stop(): void {
    this.running = false;
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setPath(path: DemoPath | MuseumPathPoint[], loop = false): void {
    this.path = path;
    this.loop = loop;
    this.distanceM = 0;
  }

  setCrowd(crowd: CrowdLevel): void {
    this.crowd = crowd;
  }

  /** Demo control: 0.5–2 m/s. Values outside the range are clamped. */
  setSpeed(speedMps: number): void {
    if (!Number.isFinite(speedMps)) return;
    this.speedMps = Math.min(2, Math.max(0.3, speedMps));
  }

  get speed(): number {
    return this.speedMps;
  }

  setInterval(intervalMs: number): void {
    this.intervalMs = intervalMs;
    if (this.running) {
      this.stop();
      this.running = true;
      this.timer = setInterval(() => this.tickOnce(this.intervalMs), this.intervalMs) as unknown as number;
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  private tickOnce(deltaMs: number): void {
    const total = pathLengthM(this.path);
    if (total <= 0) return;
    const delta = (this.speedMps * deltaMs) / 1000;
    const before = pointAlongPath(this.path, this.distanceM).position;
    this.distanceM += delta;
    if (this.distanceM > total) {
      if (this.loop) this.distanceM %= total;
      else this.distanceM = total;
    }
    const sample = pointAlongPath(this.path, this.distanceM);
    const readings = generateBeaconScan({
      truth: sample.position,
      beacons: this.options.beacons,
      crowd: this.crowd,
      rng: this.rng,
      timestamp: Date.now()
    });
    this.options.onSample({
      truth: sample.position,
      headingDeg: sample.headingDeg,
      distanceM: delta,
      readings,
      floorChanged: before.floor !== sample.position.floor
    });
    this.tick += 1;
    if (!this.loop && this.distanceM >= total) {
      this.stop();
      this.options.onEnd?.();
    }
  }
}

/* ------------------------------------------------------------------ */
/* 2. QrSource — real camera QR decoding, position reset only          */
/* ------------------------------------------------------------------ */

export interface QrApplyResult {
  ok: boolean;
  kind: 'artifact' | 'entrance' | 'hall' | null;
  artifactId: string | null;
  hallId: string | null;
  estimate: PositionEstimate | null;
}

/**
 * The camera frame → payload work is done by `useQrScanner` (jsQR). This
 * source maps a decoded payload to an exact, map-matched position reset.
 * A QR code is the only source that can produce sub-metre confidence.
 */
export class QrSource implements SensorSource {
  readonly kind = 'qr' as const;

  status(): SensorStatus {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { available: false, reason: 'not-supported', detail: 'No camera API.' };
    }
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return { available: false, reason: 'insecure-context', detail: 'Camera needs HTTPS or localhost.' };
    }
    return {
      available: true,
      reason: 'available',
      detail: 'Camera + jsQR decoding; the camera is opened only while the scan sheet is visible.'
    };
  }

  async start(): Promise<boolean> {
    return this.status().available;
  }

  stop(): void {
    // The scanner hook owns the MediaStream; stopping is handled there.
  }

  apply(raw: string, engine: PositioningEngine, now: number): QrApplyResult {
    const target = qrTarget(raw);
    if (!target) return { ok: false, kind: null, artifactId: null, hallId: null, estimate: null };
    if (target.kind === 'entrance') {
      const estimate = engine.confirmQr(
        { x: MUSEUM.entrance.x, y: MUSEUM.entrance.y, floor: MUSEUM.entrance.floor },
        now,
        0.6
      );
      return { ok: true, kind: 'entrance', artifactId: null, hallId: null, estimate };
    }
    if (target.kind === 'hall') {
      /* A hall code identifies a hall, not a pedestal: its fix is coarser than
       * an artifact code but still much tighter than trilateration. */
      const hall = target.hall;
      const estimate = engine.confirmQr(
        { x: hall.labelAt.x, y: hall.labelAt.y, floor: hall.floor },
        now,
        0.9
      );
      return { ok: true, kind: 'hall', artifactId: null, hallId: hall.id, estimate };
    }
    const artifact = target.artifact;
    const estimate = engine.confirmQr({ x: artifact.x, y: artifact.y, floor: artifact.floor }, now, 0.4);
    return { ok: true, kind: 'artifact', artifactId: artifact.id, hallId: null, estimate };
  }
}

/* ------------------------------------------------------------------ */
/* 3. ManualSource — tap-to-place presentation fallback                */
/* ------------------------------------------------------------------ */

export class ManualSource implements SensorSource {
  readonly kind = 'manual' as const;

  status(): SensorStatus {
    return { available: true, reason: 'available', detail: 'Tap the map to place the visitor. No sensors involved.' };
  }

  async start(): Promise<boolean> {
    return true;
  }

  stop(): void {}

  apply(point: FloorPosition, engine: PositioningEngine, now: number): PositionEstimate {
    return engine.setManual(point, now, 0.9);
  }
}

/* ------------------------------------------------------------------ */
/* 4. MotionSource — REAL DeviceMotion/DeviceOrientation PDR           */
/* ------------------------------------------------------------------ */

export interface MotionStep {
  headingDeg: number;
  distanceM: number;
  stepCount: number;
  timestamp: number;
}

export interface MotionSourceOptions {
  onStep: (step: MotionStep) => void;
  onStatus?: (status: SensorStatus) => void;
  strideM?: number;
}

const motionPermission = async (ctor: { requestPermission?: () => Promise<string> } | undefined): Promise<boolean> => {
  if (!ctor || typeof ctor.requestPermission !== 'function') return true;
  try {
    return (await ctor.requestPermission()) === 'granted';
  } catch {
    return false;
  }
};

/** Resolves true once a walkable accelerometer sample arrives, false on timeout. */
function waitForUsableMotion(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('devicemotion', onEvent);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const onEvent = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (acc && acc.x != null && acc.y != null && acc.z != null) finish(true);
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    window.addEventListener('devicemotion', onEvent, { passive: true });
  });
}

/**
 * Real phone sensors for Pedestrian Dead Reckoning. Only step count and
 * heading are used; the camera is untouched. iOS permission is requested only
 * from a user gesture (the Start button). If sensors are missing, denied, or
 * silent on this device the UI falls back to simulated/manual positioning — it
 * never fakes a heading or reports "live" without data.
 */
export class MotionSource implements SensorSource {
  readonly kind = 'motion' as const;
  private detector = new StepDetector();
  private headingDeg = 0;
  private hasHeading = false;
  private headingIsAbsolute = false;
  private running = false;
  private samples = 0;
  private orientationSamples = 0;
  private orientationPermission: 'n/a' | 'not-requested' | 'granted' | 'denied' = 'n/a';
  private statusValue: SensorStatus = { available: false, reason: 'idle', detail: 'Not started.' };
  private readonly onMotion = (e: DeviceMotionEvent) => this.handleMotion(e);
  private readonly onOrientation = (e: DeviceOrientationEvent) => this.handleOrientation(e);

  constructor(private readonly options: MotionSourceOptions) {}

  status(): SensorStatus {
    return this.statusValue;
  }

  async start(): Promise<boolean> {
    if (typeof window === 'undefined') {
      this.setStatus({ available: false, reason: 'not-supported', detail: 'No window/DeviceMotion in this environment.' });
      return false;
    }
    if (!('DeviceMotionEvent' in window)) {
      this.setStatus({ available: false, reason: 'not-supported', detail: 'DeviceMotion is unavailable in this browser.' });
      return false;
    }
    if (window.isSecureContext === false) {
      this.setStatus({ available: false, reason: 'insecure-context', detail: 'Motion sensors require HTTPS on a phone.' });
      return false;
    }
    const MotionEvent = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } })
      .DeviceMotionEvent;
    const OrientationEvent = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } })
      .DeviceOrientationEvent;
    if (typeof MotionEvent?.requestPermission === 'function') {
      this.setStatus({ available: true, reason: 'permission-required', detail: 'Waiting for the iOS motion permission prompt.' });
      this.options.onStatus?.(this.statusValue);
      const granted = await motionPermission(MotionEvent);
      if (!granted) {
        this.setStatus({ available: false, reason: 'permission-denied', detail: 'Motion permission was denied.' });
        return false;
      }
      if (typeof OrientationEvent?.requestPermission === 'function') {
        this.orientationPermission = (await motionPermission(OrientationEvent)) ? 'granted' : 'denied';
      }
    }

    this.detector.reset();
    window.addEventListener('devicemotion', this.onMotion, { passive: true });
    window.addEventListener('deviceorientation', this.onOrientation, { passive: true });

    /*
     * Chrome on a laptop exposes DeviceMotionEvent but never fires usable
     * accelerometer data. Claiming "live" there freezes the blue dot while the
     * UI says tracking is on, so wait for one usable event before saying yes.
     */
    const sawData = await waitForUsableMotion(1500);
    if (!sawData) {
      window.removeEventListener('devicemotion', this.onMotion);
      window.removeEventListener('deviceorientation', this.onOrientation);
      this.setStatus({
        available: false,
        reason: 'no-events',
        detail:
          'No accelerometer events arrived from this device. Tablets/laptops often have no usable motion sensor — use the simulated tour or tap the map.'
      });
      return false;
    }

    this.running = true;
    this.setStatus({ available: true, reason: 'available', detail: 'Live accelerometer steps + compass heading. Walk to move the blue dot.' });
    return true;
  }

  stop(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.onMotion);
      window.removeEventListener('deviceorientation', this.onOrientation);
    }
    this.running = false;
    this.setStatus({ available: true, reason: 'idle', detail: 'Motion tracking stopped; sensors are off.' });
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Accelerometer events with usable x/y/z since start. */
  get eventCount(): number {
    return this.samples;
  }

  get orientationEventCount(): number {
    return this.orientationSamples;
  }

  /** iOS-only result for the compass prompt; 'n/a' elsewhere. */
  get orientationPermissionResult(): 'n/a' | 'not-requested' | 'granted' | 'denied' {
    return this.orientationPermission;
  }

  get stepCount(): number {
    return this.detector.steps;
  }

  get headingDegrees(): number {
    return this.headingDeg;
  }

  get headingReliability(): 'absolute' | 'relative' | 'unknown' {
    if (!this.hasHeading) return 'unknown';
    return this.headingIsAbsolute ? 'absolute' : 'relative';
  }

  private setStatus(status: SensorStatus): void {
    this.statusValue = status;
    this.options.onStatus?.(status);
  }

  private handleOrientation(e: DeviceOrientationEvent): void {
    this.orientationSamples += 1;
    const webkit = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
    if (typeof webkit.webkitCompassHeading === 'number' && Number.isFinite(webkit.webkitCompassHeading)) {
      this.headingDeg = webkit.webkitCompassHeading;
      this.hasHeading = true;
      this.headingIsAbsolute = true;
      return;
    }
    if (typeof e.alpha === 'number' && Number.isFinite(e.alpha)) {
      // alpha is a relative rotation, not magnetic north. It is still useful
      // for short walks, and the UI says so.
      this.headingDeg = 360 - e.alpha;
      this.hasHeading = true;
      this.headingIsAbsolute = false;
    }
  }

  private handleMotion(e: DeviceMotionEvent): void {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
    this.samples += 1;
    const magnitude = Math.hypot(acc.x, acc.y, acc.z);
    if (!this.detector.push(magnitude, Date.now())) return;
    const step = displacementFromStep(this.headingDeg, this.options.strideM ?? 0.68);
    this.options.onStep({
      headingDeg: this.headingDeg,
      distanceM: Math.hypot(step.x, step.y),
      stepCount: this.detector.steps,
      timestamp: Date.now()
    });
  }
}

/* ------------------------------------------------------------------ */
/* 5. BleSource — documented future interface, NOT implemented         */
/* ------------------------------------------------------------------ */

export interface NativeBleBridge {
  /** Must return real advertisement RSSI values from a native scanner. */
  scan(): Promise<BeaconReading[]>;
}

/**
 * Real BLE is impossible in a browser: Web Bluetooth exposes neither scan
 * results nor advertisement RSSI. This class is deliberately a stub. When a
 * native shell (Capacitor/CoreBluetooth/Android BLE) implements
 * `window.__ATHAR_BLE__`, the rest of the positioning pipeline can consume its
 * readings unchanged. It must never report positions without that bridge.
 */
export class BleSource implements SensorSource {
  readonly kind = 'ble' as const;
  private readonly bridge: NativeBleBridge | null;

  constructor(bridge?: NativeBleBridge | null) {
    const injected =
      bridge ??
      (typeof window !== 'undefined'
        ? (window as unknown as { __ATHAR_BLE__?: NativeBleBridge }).__ATHAR_BLE__
        : null) ??
      null;
    this.bridge = injected && typeof injected.scan === 'function' ? injected : null;
  }

  status(): SensorStatus {
    return this.bridge
      ? {
          available: true,
          reason: 'available',
          detail: 'Native BLE bridge injected. Reading real advertisement RSSI is the bridge owner’s responsibility.'
        }
      : {
          available: false,
          reason: 'native-only',
          detail:
            'Web Bluetooth cannot scan advertisements or expose RSSI. Real BLE requires a native build (Capacitor/CoreBluetooth). The simulator is the only working BLE path in this browser demo.'
        };
  }

  async start(): Promise<boolean> {
    return this.bridge != null;
  }

  stop(): void {}

  /** Returns real readings only when a native bridge exists; otherwise []. */
  async scan(): Promise<BeaconReading[]> {
    if (!this.bridge) return [];
    try {
      return await this.bridge.scan();
    } catch {
      return [];
    }
  }
}

export function describeEngine(snapshot: EngineSnapshot): string {
  if (!snapshot.estimate) return 'No position yet';
  return `${snapshot.estimate.x.toFixed(1)}, ${snapshot.estimate.y.toFixed(1)} m · ${snapshot.estimate.hallId ?? '—'}`;
}
