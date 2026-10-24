import { describe, expect, it } from 'vitest';
import { Kalman2D } from './kalman';
import { StepDetector, bearingBetween, displacementFromStep, normalizeHeading, turnAngle } from './pdr';

describe('Kalman2D', () => {
  it('starts with the requested uncertainty and converges on repeated fixes', () => {
    const kf = new Kalman2D(0, 0, 5);
    expect(kf.state().sigmaM).toBeCloseTo(5, 4);
    for (let i = 0; i < 20; i++) kf.updatePosition(10, 8, 1);
    expect(kf.state().position.x).toBeCloseTo(10, 1);
    expect(kf.state().position.y).toBeCloseTo(8, 1);
    expect(kf.state().sigmaM).toBeLessThan(1);
  });

  it('collapses uncertainty on a QR reset', () => {
    const kf = new Kalman2D(4, 4, 4);
    kf.reset(14, 12, 0.4);
    expect(kf.state().position).toEqual({ x: 14, y: 12 });
    expect(kf.state().sigmaM).toBeCloseTo(0.4, 5);
    expect(kf.state().radius95M).toBeCloseTo(0.784, 3);
  });

  it('moves with a PDR step and grows position covariance', () => {
    const kf = new Kalman2D(10, 10, 0.5);
    const before = kf.state().sigmaM;
    kf.applyDisplacement(0, 0.68, 0.02);
    expect(kf.state().position.y).toBeCloseTo(10.68, 6);
    expect(kf.state().sigmaM).toBeGreaterThan(before);
  });
});

describe('PDR geometry', () => {
  it('converts headings to map displacement (0° north, 90° east)', () => {
    const north = displacementFromStep(0, 1);
    expect(north.x).toBeCloseTo(0, 6);
    expect(north.y).toBeCloseTo(1, 6);
    const east = displacementFromStep(90, 1);
    expect(east.x).toBeCloseTo(1, 6);
    expect(east.y).toBeCloseTo(0, 6);
    expect(normalizeHeading(-90)).toBe(270);
  });

  it('computes signed turn angles and bearings', () => {
    expect(turnAngle(0, 90)).toBe(90);
    expect(turnAngle(350, 10)).toBe(20);
    expect(turnAngle(10, 350)).toBe(-20);
    expect(bearingBetween({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90, 5);
  });

  it('detects a single step per peak with the refractory window', () => {
    const detector = new StepDetector();
    expect(detector.push(9.81, 0)).toBe(false);
    expect(detector.push(13.2, 100)).toBe(false); // armed
    expect(detector.push(9.9, 200)).toBe(true); // landed
    expect(detector.push(13.2, 300)).toBe(false);
    expect(detector.push(9.9, 350)).toBe(false); // too soon
    expect(detector.push(13.2, 700)).toBe(false);
    expect(detector.push(9.85, 800)).toBe(true);
    expect(detector.steps).toBe(2);
  });
});
