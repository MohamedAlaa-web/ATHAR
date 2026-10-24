import type { Position2D } from './types';

export interface RangeInput {
  x: number;
  y: number;
  distanceM: number;
  /** 1σ range error in metres. */
  sigmaM: number;
}

export interface TrilaterationResult extends Position2D {
  accuracyM: number;
  residualRmsM: number;
  iterations: number;
  used: number;
}

/**
 * Weighted least-squares trilateration (damped Gauss–Newton).
 *
 * Requires at least 3 ranges. The caller is expected to pass the 3–4 strongest
 * beacons; more is not automatically better when the extra ranges are weak.
 * The returned accuracy is √(σ² · max diagonal of (JᵀWJ)⁻¹), i.e. a
 * linearised 1σ position uncertainty including the range residuals.
 */
export function trilaterate(inputs: RangeInput[]): TrilaterationResult | null {
  if (inputs.length < 3) return null;
  if (inputs.some((i) => !Number.isFinite(i.x) || !Number.isFinite(i.y) || !Number.isFinite(i.distanceM))) {
    return null;
  }

  const weights = inputs.map((i) => 1 / Math.max(0.2, i.sigmaM) ** 2);
  const weightSum = weights.reduce((s, w) => s + w, 0);
  let x = inputs.reduce((s, input, i) => s + input.x * weights[i], 0) / weightSum;
  let y = inputs.reduce((s, input, i) => s + input.y * weights[i], 0) / weightSum;

  const costAt = (px: number, py: number): number => {
    let cost = 0;
    for (let i = 0; i < inputs.length; i++) {
      const d = Math.hypot(px - inputs[i].x, py - inputs[i].y);
      cost += weights[i] * (d - inputs[i].distanceM) ** 2;
    }
    return cost;
  };

  let cost = costAt(x, y);
  let lambda = 1e-3;
  let iterations = 0;

  for (let step = 0; step < 40; step++) {
    iterations = step + 1;
    let h00 = 0;
    let h01 = 0;
    let h11 = 0;
    let g0 = 0;
    let g1 = 0;

    for (let i = 0; i < inputs.length; i++) {
      const dx = x - inputs[i].x;
      const dy = y - inputs[i].y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1e-6) continue;
      const jx = dx / dist;
      const jy = dy / dist;
      const w = weights[i];
      const r = dist - inputs[i].distanceM;
      h00 += w * jx * jx;
      h01 += w * jx * jy;
      h11 += w * jy * jy;
      g0 += w * jx * r;
      g1 += w * jy * r;
    }

    const det = h00 * h11 - h01 * h01;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-10) break;

    let accepted = false;
    for (let attempt = 0; attempt < 7; attempt++) {
      const a00 = h00 * (1 + lambda);
      const a11 = h11 * (1 + lambda);
      const aDet = a00 * a11 - h01 * h01;
      if (!Number.isFinite(aDet) || Math.abs(aDet) < 1e-12) {
        lambda *= 10;
        continue;
      }
      const stepX = -(a11 * g0 - h01 * g1) / aDet;
      const stepY = -(-h01 * g0 + a00 * g1) / aDet;
      if (!Number.isFinite(stepX) || !Number.isFinite(stepY)) {
        lambda *= 10;
        continue;
      }
      const nx = x + stepX;
      const ny = y + stepY;
      const nextCost = costAt(nx, ny);
      if (nextCost < cost) {
        const moved = Math.hypot(stepX, stepY);
        x = nx;
        y = ny;
        cost = nextCost;
        lambda = Math.max(1e-7, lambda * 0.4);
        accepted = true;
        if (moved < 1e-5) step = 40;
        break;
      }
      lambda *= 8;
    }
    if (!accepted) break;
  }

  let h00 = 0;
  let h01 = 0;
  let h11 = 0;
  let weightedSq = 0;
  for (let i = 0; i < inputs.length; i++) {
    const dx = x - inputs[i].x;
    const dy = y - inputs[i].y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) return null;
    const w = weights[i];
    const r = dist - inputs[i].distanceM;
    h00 += (w * dx * dx) / (dist * dist);
    h01 += (w * dx * dy) / (dist * dist);
    h11 += (w * dy * dy) / (dist * dist);
    weightedSq += w * r * r;
  }
  const det = h00 * h11 - h01 * h01;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-10) return null;

  const dof = Math.max(1, inputs.length - 2);
  const varianceOfUnitWeight = Math.max(weightedSq / dof, 0.04);
  const accuracy = Math.sqrt(
    varianceOfUnitWeight * Math.max(h11 / det, h00 / det)
  );

  return {
    x,
    y,
    accuracyM: Math.min(30, Math.max(0.15, accuracy)),
    residualRmsM: Math.sqrt(weightedSq / inputs.length),
    iterations,
    used: inputs.length
  };
}

/** Drop one gross outlier when four ranges are available (simple NLOS guard). */
export function trilaterateRobust(inputs: RangeInput[]): TrilaterationResult | null {
  const initial = trilaterate(inputs);
  if (!initial || inputs.length < 4) return initial;

  let worstIndex = -1;
  let worstResidual = 0;
  for (let i = 0; i < inputs.length; i++) {
    const d = Math.hypot(initial.x - inputs[i].x, initial.y - inputs[i].y);
    const residual = Math.abs(d - inputs[i].distanceM);
    if (residual > worstResidual) {
      worstResidual = residual;
      worstIndex = i;
    }
  }
  const threshold = Math.max(2.5, 2.5 * Math.max(...inputs.map((i) => i.sigmaM)));
  if (worstIndex >= 0 && worstResidual > threshold) {
    const filtered = inputs.filter((_, i) => i !== worstIndex);
    const retry = trilaterate(filtered);
    if (retry) return retry;
  }
  return initial;
}
