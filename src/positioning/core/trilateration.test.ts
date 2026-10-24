import { describe, expect, it } from 'vitest';
import { trilaterate, trilaterateRobust } from './trilateration';

const at = (x: number, y: number, tx: number, ty: number, sigmaM = 1) => ({
  x: tx,
  y: ty,
  distanceM: Math.hypot(x - tx, y - ty),
  sigmaM
});

describe('trilateration', () => {
  it('recovers an exact position from noiseless ranges', () => {
    const truth = { x: 5, y: 4 };
    const result = trilaterate([at(truth.x, truth.y, 0, 0), at(truth.x, truth.y, 10, 0), at(truth.x, truth.y, 5, 10)]);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(truth.x, 2);
    expect(result!.y).toBeCloseTo(truth.y, 2);
    expect(result!.accuracyM).toBeLessThan(0.5);
  });

  it('uses four ranges and keeps a small residual with a noisy sample', () => {
    const inputs = [
      { x: 0, y: 0, distanceM: 7.1, sigmaM: 1.2 },
      { x: 12, y: 0, distanceM: 7.2, sigmaM: 1.2 },
      { x: 0, y: 12, distanceM: 6.9, sigmaM: 1.2 },
      { x: 12, y: 12, distanceM: 8.1, sigmaM: 1.2 }
    ];
    const result = trilaterate(inputs);
    expect(result).not.toBeNull();
    expect(result!.x).toBeGreaterThan(4);
    expect(result!.x).toBeLessThan(8);
    expect(result!.y).toBeGreaterThan(4);
    expect(result!.y).toBeLessThan(8);
    expect(result!.residualRmsM).toBeLessThan(1.5);
    expect(result!.used).toBe(4);
  });

  it('refuses insufficient or degenerate geometry', () => {
    expect(trilaterate([at(5, 5, 0, 0), at(5, 5, 10, 0)])).toBeNull();
    const collinear = trilaterate([
      at(5, 0, 0, 0),
      at(5, 0, 5, 0),
      at(5, 0, 10, 0)
    ]);
    expect(collinear).toBeNull();
  });

  it('drops one gross outlier when four ranges are available', () => {
    const good = [
      at(6, 6, 0, 0, 0.8),
      at(6, 6, 12, 0, 0.8),
      at(6, 6, 0, 12, 0.8)
    ];
    const bad = { x: 12, y: 12, distanceM: 2, sigmaM: 0.8 };
    const robust = trilaterateRobust([...good, bad]);
    expect(robust).not.toBeNull();
    expect(robust!.x).toBeCloseTo(6, 0);
    expect(robust!.y).toBeCloseTo(6, 0);
  });
});
