import type { Position2D } from './types';

/** Metres per detected step. A demo constant, not a calibrated personal stride. */
export const DEFAULT_STRIDE_M = 0.68;

export function normalizeHeading(degrees: number): number {
  const value = degrees % 360;
  return value < 0 ? value + 360 : value;
}

/**
 * Heading convention: 0° = north (+y), 90° = east (+x), clockwise.
 * Screen/map coordinates use +y north and are flipped once when rendering.
 */
export function displacementFromStep(headingDeg: number, strideM = DEFAULT_STRIDE_M): Position2D {
  const rad = (normalizeHeading(headingDeg) * Math.PI) / 180;
  return {
    x: Math.sin(rad) * strideM,
    y: Math.cos(rad) * strideM
  };
}

/** Signed turn angle in degrees, positive = right turn (clockwise). */
export function turnAngle(prevBearingDeg: number, nextBearingDeg: number): number {
  let delta = normalizeHeading(nextBearingDeg) - normalizeHeading(prevBearingDeg);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

export function bearingBetween(a: Position2D, b: Position2D): number {
  return normalizeHeading((Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI);
}

/**
 * Step detector over |acceleration| − g. Emits at most one step per refractory
 * window; requires the signal to fall back below the low threshold first, which
 * rejects the double peak of a single footfall.
 */
export class StepDetector {
  private armed = false;
  private lastStepAt = 0;
  steps = 0;

  constructor(
    private readonly highThreshold = 2.2,
    private readonly lowThreshold = 0.7,
    private readonly refractoryMs = 280
  ) {}

  push(accelerationMagnitude: number, timestamp: number): boolean {
    const excess = Math.abs(accelerationMagnitude - 9.81);
    if (!this.armed && excess > this.highThreshold) {
      this.armed = true;
      return false;
    }
    if (this.armed && excess < this.lowThreshold) {
      this.armed = false;
      if (this.lastStepAt > 0 && timestamp - this.lastStepAt < this.refractoryMs) return false;
      this.lastStepAt = timestamp;
      this.steps += 1;
      return true;
    }
    return false;
  }

  reset(): void {
    this.armed = false;
    this.lastStepAt = 0;
    this.steps = 0;
  }
}
