import type { Position2D } from './types';

export interface KalmanState {
  position: Position2D;
  velocity: Position2D;
  /** 1σ position uncertainty in metres (max of the two axes). */
  sigmaM: number;
  /** 95% radius in metres. */
  radius95M: number;
}

type Matrix4 = number[][];

const identity = (): Matrix4 => [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1]
];

/**
 * 2D constant-velocity Kalman filter.
 *
 * Two measurement paths are supported:
 *  - absolute position fixes (BLE/Wi-Fi trilateration, QR resets)
 *  - relative displacement (one PDR step), injected as a state shift with the
 *    corresponding covariance growth.
 *
 * It is deliberately small and deterministic; every number in the debug panel
 * can be traced to these updates.
 */
export class Kalman2D {
  private s = [0, 0, 0, 0];
  private p: Matrix4 = identity();
  /** White-acceleration spectral density (m²/s³). */
  private q = 0.06;

  constructor(x?: number, y?: number, sigmaM = 2) {
    if (x != null && y != null) this.reset(x, y, sigmaM);
    else {
      this.p = [
        [100, 0, 0, 0],
        [0, 100, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ];
    }
  }

  get initialized(): boolean {
    return Number.isFinite(this.s[0]) && this.p[0][0] < 100;
  }

  reset(x: number, y: number, sigmaM = 1): void {
    this.s = [x, y, 0, 0];
    const v = Math.max(0.01, sigmaM * sigmaM);
    this.p = [
      [v, 0, 0, 0],
      [0, v, 0, 0],
      [0, 0, 0.02, 0],
      [0, 0, 0, 0.02]
    ];
  }

  /** Time update; call on the scan cadence, not per animation frame. */
  predict(dtSeconds: number): void {
    const dt = Math.min(4, Math.max(0, dtSeconds));
    if (dt === 0) return;
    this.s[0] += this.s[2] * dt;
    this.s[1] += this.s[3] * dt;

    // F P Fᵀ for constant velocity.
    const p = this.p;
    const fp: Matrix4 = [
      [p[0][0] + dt * p[2][0], p[0][1] + dt * p[2][1], p[0][2] + dt * p[2][2], p[0][3] + dt * p[2][3]],
      [p[1][0] + dt * p[3][0], p[1][1] + dt * p[3][1], p[1][2] + dt * p[3][2], p[1][3] + dt * p[3][3]],
      [p[2][0], p[2][1], p[2][2], p[2][3]],
      [p[3][0], p[3][1], p[3][2], p[3][3]]
    ];
    const nf: Matrix4 = [
      [fp[0][0] + dt * fp[0][2], fp[0][1] + dt * fp[0][3], fp[0][2], fp[0][3]],
      [fp[1][0] + dt * fp[1][2], fp[1][1] + dt * fp[1][3], fp[1][2], fp[1][3]],
      [fp[2][0] + dt * fp[2][2], fp[2][1] + dt * fp[2][3], fp[2][2], fp[2][3]],
      [fp[3][0] + dt * fp[3][2], fp[3][1] + dt * fp[3][3], fp[3][2], fp[3][3]]
    ];

    const q = this.q;
    const q11 = (q * dt ** 4) / 4;
    const q13 = (q * dt ** 3) / 2;
    const q33 = q * dt ** 2;
    nf[0][0] += q11;
    nf[1][1] += q11;
    nf[2][2] += q33;
    nf[3][3] += q33;
    nf[0][2] += q13;
    nf[2][0] += q13;
    nf[1][3] += q13;
    nf[3][1] += q13;
    this.p = nf;
  }

  updatePosition(x: number, y: number, varianceM2: number): void {
    const v = Math.max(0.0025, varianceM2);
    const p = this.p;
    const s00 = p[0][0] + v;
    const s01 = p[0][1];
    const s10 = p[1][0];
    const s11 = p[1][1] + v;
    const det = s00 * s11 - s01 * s10;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return;

    const k: number[][] = [];
    for (let i = 0; i < 4; i++) {
      k.push([
        (p[i][0] * s11 - p[i][1] * s10) / det,
        (-p[i][0] * s01 + p[i][1] * s00) / det
      ]);
    }
    const ix = x - this.s[0];
    const iy = y - this.s[1];
    for (let i = 0; i < 4; i++) this.s[i] += k[i][0] * ix + k[i][1] * iy;

    const next: Matrix4 = [];
    for (let i = 0; i < 4; i++) {
      next.push([
        p[i][0] - k[i][0] * p[0][0] - k[i][1] * p[1][0],
        p[i][1] - k[i][0] * p[0][1] - k[i][1] * p[1][1],
        p[i][2] - k[i][0] * p[0][2] - k[i][1] * p[1][2],
        p[i][3] - k[i][0] * p[0][3] - k[i][1] * p[1][3]
      ]);
    }
    this.p = symmetrize(next);
  }

  /** PDR: shift the state by one step and grow position covariance. */
  applyDisplacement(dx: number, dy: number, varianceM2: number): void {
    this.s[0] += dx;
    this.s[1] += dy;
    this.p[0][0] += Math.max(0.0025, varianceM2);
    this.p[1][1] += Math.max(0.0025, varianceM2);
  }

  state(): KalmanState {
    const sigma = Math.sqrt(Math.max(this.p[0][0], this.p[1][1]));
    return {
      position: { x: this.s[0], y: this.s[1] },
      velocity: { x: this.s[2], y: this.s[3] },
      sigmaM: sigma,
      radius95M: 1.96 * sigma
    };
  }

  covariance(): Matrix4 {
    return this.p.map((row) => [...row]);
  }
}

function symmetrize(m: Matrix4): Matrix4 {
  const out: Matrix4 = m.map((row) => [...row]);
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const avg = (out[i][j] + out[j][i]) / 2;
      out[i][j] = avg;
      out[j][i] = avg;
    }
  }
  return out;
}
