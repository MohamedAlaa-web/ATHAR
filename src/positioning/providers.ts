import type { Position2D, PositionObservation, ProviderStatus, RangeObservation, RoomConfig } from './types';
import { findArtifactMarker } from './room';

/** Capability probe that never throws and never pretends hardware exists. */
export function detectProviders(): ProviderStatus[] {
  const hasWindow = typeof window !== 'undefined';
  const secure = !hasWindow ? false : window.isSecureContext !== false;
  const hasCamera = hasWindow && !!navigator.mediaDevices?.getUserMedia;
  const hasBluetooth = hasWindow && 'bluetooth' in navigator;
  const hasMotion = hasWindow && 'DeviceMotionEvent' in window;

  return [
    {
      source: 'qr',
      available: hasCamera && secure,
      reason: !hasCamera ? 'not-supported' : !secure ? 'no-secure-context' : 'available',
      detail: !hasCamera
        ? 'navigator.mediaDevices.getUserMedia is not exposed in this browser.'
        : !secure
          ? 'Camera access requires HTTPS or http://localhost.'
          : 'Camera + jsQR decoding in the browser.'
    },
    {
      source: 'manual',
      available: true,
      reason: 'available',
      detail: 'Visitor confirms an artifact from the demo list (no hardware).'
    },
    {
      source: 'wifi',
      available: false,
      reason: 'no-browser-api',
      detail:
        'Browsers cannot enumerate nearby access points or read RSSI/RTT. Wi-Fi RTT exists only in limited Chromium builds and needs compatible APs. Range measurements require a native bridge.'
    },
    {
      source: 'ble',
      available: false,
      reason: 'no-browser-api',
      detail:
        hasBluetooth
          ? 'Web Bluetooth is present but exposes no advertisement/RSSI scan results; GATT alone cannot estimate distance.'
          : 'Web Bluetooth is unavailable; BLE RSSI scanning requires a native bridge.'
    },
    {
      source: 'motion',
      available: hasMotion,
      reason: hasMotion ? (needsMotionPermission() ? 'permission-required' : 'available') : 'not-supported',
      detail: hasMotion
        ? needsMotionPermission()
          ? 'DeviceMotion/DeviceOrientation need an explicit user permission prompt on iOS, and HTTPS.'
          : 'DeviceMotion step counting + compass dead reckoning.'
        : 'No DeviceMotion API in this browser.'
    }
  ];
}

export function needsMotionPermission(): boolean {
  if (typeof window === 'undefined') return false;
  const anyWin = window as unknown as { DeviceOrientationEvent?: { requestPermission?: unknown } };
  return typeof anyWin.DeviceOrientationEvent?.requestPermission === 'function';
}

const QR_ANCHOR_SIGMA_M = 1.4;

/** A decoded (or manually confirmed) artifact behaves like a scan-time anchor. */
export function qrObservation(
  room: RoomConfig,
  artifactId: string,
  now: number,
  live: boolean
): PositionObservation | null {
  const marker = findArtifactMarker(room, artifactId);
  if (!marker) return null;
  return {
    id: `qr-${artifactId}-${now}`,
    kind: 'position',
    source: live ? 'qr' : 'manual',
    position: { ...marker.position },
    accuracyM: QR_ANCHOR_SIGMA_M,
    timestamp: now,
    live
  };
}

/**
 * Bridge contract for future native Wi-Fi range measurements.
 * A native shell (or a local companion app) can expose:
 *   window.__ATHAR_WIFI__ = { ranges(): Promise<Array<{ deviceId, rangeM, accuracyM }>> }
 * Nothing is fabricated when the bridge is absent.
 */
export interface WifiBridge {
  ranges(): Promise<Array<{ deviceId: string; rangeM: number; accuracyM: number }>>;
}

export function getWifiBridge(): WifiBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = (window as unknown as { __ATHAR_WIFI__?: WifiBridge }).__ATHAR_WIFI__;
  return bridge && typeof bridge.ranges === 'function' ? bridge : null;
}

export async function readWifiRanges(room: RoomConfig, now: number): Promise<RangeObservation[]> {
  const bridge = getWifiBridge();
  if (!bridge) return [];
  try {
    const raw = await bridge.ranges();
    return raw.map((r, i) => ({
      id: `wifi-bridge-${now}-${i}`,
      kind: 'range' as const,
      source: 'wifi' as const,
      deviceId: r.deviceId,
      rangeM: r.rangeM,
      accuracyM: r.accuracyM,
      timestamp: now,
      live: true
    })).filter((o) => room.devices.some((d) => d.id === o.deviceId));
  } catch {
    return [];
  }
}

/**
 * Real motion dead reckoning: step detection from accelerometer peaks and
 * heading from the device compass. Only emits a measurement after real events
 * have been received (`live: true`).
 */
export class MotionPositionProvider {
  private origin: Position2D | null = null;
  private position: Position2D | null = null;
  private headingDeg = 0;
  private steps = 0;
  private armed = false;
  private lastStepAt = 0;
  private started = false;
  private readonly onMotion = (e: DeviceMotionEvent) => this.handleMotion(e);
  private readonly onOrientation = (e: DeviceOrientationEvent) => this.handleOrientation(e);

  get stepCount(): number {
    return this.steps;
  }

  get isRunning(): boolean {
    return this.started;
  }

  async start(origin: Position2D): Promise<boolean> {
    const granted = await requestMotionPermission();
    if (!granted || typeof window === 'undefined') return false;
    this.origin = { ...origin };
    this.position = { ...origin };
    this.steps = 0;
    this.armed = false;
    window.addEventListener('devicemotion', this.onMotion, { passive: true });
    window.addEventListener('deviceorientation', this.onOrientation, { passive: true });
    this.started = true;
    return true;
  }

  stop(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('devicemotion', this.onMotion);
    window.removeEventListener('deviceorientation', this.onOrientation);
    this.started = false;
  }

  /** Current dead-reckoned estimate, or null if no real event was seen. */
  snapshot(now: number): PositionObservation | null {
    if (!this.position || !this.started) return null;
    return {
      id: `motion-${now}`,
      kind: 'position',
      source: 'motion',
      position: { ...this.position },
      // Uncertainty grows with distance walked (~12% of travelled path).
      accuracyM: Math.max(1.5, 1.5 + this.steps * 0.08),
      timestamp: now,
      live: true
    };
  }

  private handleOrientation(e: DeviceOrientationEvent): void {
    if (typeof e.alpha === 'number' && Number.isFinite(e.alpha)) this.headingDeg = e.alpha;
  }

  private handleMotion(e: DeviceMotionEvent): void {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
    const magnitude = Math.hypot(acc.x, acc.y, acc.z);
    const excess = Math.abs(magnitude - 9.81);
    const now = Date.now();
    if (!this.armed && excess > 2.2) {
      this.armed = true;
    } else if (this.armed && excess < 0.7) {
      this.armed = false;
      if (now - this.lastStepAt < 280) return;
      this.lastStepAt = now;
      this.steps += 1;
      const rad = (this.headingDeg * Math.PI) / 180;
      const strideM = 0.65;
      if (this.position) {
        this.position = {
          x: this.position.x + Math.sin(rad) * strideM,
          y: this.position.y + Math.cos(rad) * strideM
        };
      }
    }
  }
}

async function requestMotionPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const anyWin = window as unknown as {
    DeviceMotionEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> };
    DeviceOrientationEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> };
  };
  try {
    if (typeof anyWin.DeviceMotionEvent?.requestPermission === 'function') {
      const res = await anyWin.DeviceMotionEvent.requestPermission();
      if (res !== 'granted') return false;
    }
    if (typeof anyWin.DeviceOrientationEvent?.requestPermission === 'function') {
      await anyWin.DeviceOrientationEvent.requestPermission();
    }
    return true;
  } catch {
    return false;
  }
}
