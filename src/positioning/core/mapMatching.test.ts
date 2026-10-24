import { describe, expect, it } from 'vitest';
import { pointInWalkable, snapToWalkable } from './mapMatching';
import { MUSEUM_ENGINE_MAP } from './defaultMap';
import { PositioningEngine } from './engine';

const ground = MUSEUM_ENGINE_MAP.rects.ground;

describe('map matching', () => {
  it('leaves a point inside the hall untouched', () => {
    const result = snapToWalkable({ x: 10, y: 12 }, ground);
    expect(result.snapped).toBe(false);
    expect(result.position).toEqual({ x: 10, y: 12 });
  });

  it('pulls a point outside the wall to the nearest walkable edge', () => {
    const result = snapToWalkable({ x: 0, y: 15 }, ground);
    expect(result.snapped).toBe(true);
    expect(result.position.x).toBeCloseTo(2, 6);
    expect(result.position.y).toBeCloseTo(15, 6);
    expect(result.distanceM).toBeCloseTo(2, 6);
    expect(pointInWalkable(result.position, ground)).toBe(true);
  });

  it('snaps to the upper gallery on the upper floor', () => {
    const result = snapToWalkable({ x: 50, y: 18 }, MUSEUM_ENGINE_MAP.rects.upper);
    expect(result.snapped).toBe(true);
    expect(result.position.x).toBeCloseTo(46, 6);
    expect(pointInWalkable(result.position, MUSEUM_ENGINE_MAP.rects.upper)).toBe(true);
  });
});

describe('positioning engine', () => {
  it('produces an estimate with hall, confidence and radius after a beacon scan', () => {
    const now = 1_000_000;
    const engine = new PositioningEngine(MUSEUM_ENGINE_MAP);
    engine.initialize({ x: 11, y: 15, floor: 'ground' }, 'manual', 1, now);
    const readings = MUSEUM_ENGINE_MAP.beacons
      .filter((b) => b.floor === 'ground')
      .map((b) => ({
        beaconId: b.id,
        timestamp: now,
        rssi: b.txPower - 10 * b.pathLoss * Math.log10(Math.max(0.25, Math.hypot(11 - b.x, 15 - b.y)))
      }));
    const estimate = engine.applyBeaconScan(readings, 'low', now + 1000);
    expect(estimate).not.toBeNull();
    if (!estimate) return;
    expect(estimate.floor).toBe('ground');
    expect(estimate.hallId).toBe('hall-a');
    expect(estimate.accuracyRadiusM).toBeGreaterThan(0);
    expect(estimate.confidence).toBeGreaterThan(0);
    expect(estimate.confidence).toBeLessThanOrEqual(1);
    expect(Math.hypot(estimate.x - 11, estimate.y - 15)).toBeLessThan(3);
    expect(engine.statistics.trilaterations).toBe(1);
    expect(engine.statistics.lastScan?.used).toBeGreaterThanOrEqual(3);
  });

  it('collapses uncertainty and snaps to the artifact on a QR reset', () => {
    const now = 2_000_000;
    const engine = new PositioningEngine(MUSEUM_ENGINE_MAP);
    engine.initialize({ x: 30, y: 15, floor: 'ground' }, 'manual', 1, now);
    const estimate = engine.confirmQr({ x: 48, y: 8, floor: 'ground' }, now + 5000);
    expect(estimate.source).toBe('qr');
    expect(estimate.hallId).toBe('hall-c');
    expect(estimate.accuracyRadiusM).toBeLessThan(1.2);
    expect(estimate.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('moves the estimate one PDR step and records it', () => {
    const now = 3_000_000;
    const engine = new PositioningEngine(MUSEUM_ENGINE_MAP);
    engine.initialize({ x: 11, y: 10, floor: 'ground' }, 'qr', 0.4, now);
    const estimate = engine.applyPdrStep(90, now + 1000, 0.68);
    expect(estimate).not.toBeNull();
    expect(estimate!.x).toBeGreaterThan(11.5);
    expect(estimate!.y).toBeCloseTo(10, 1);
    expect(engine.statistics.pdrSteps).toBe(1);
  });

  it('does not update without a position or enough ranges', () => {
    const engine = new PositioningEngine(MUSEUM_ENGINE_MAP);
    expect(engine.applyBeaconScan([], 'low', 0)).toBeNull();
    engine.initialize({ x: 11, y: 15, floor: 'ground' }, 'manual', 1, 0);
    const estimate = engine.applyBeaconScan(
      [{ beaconId: 'ble-a1', rssi: -60, timestamp: 0 }],
      'low',
      1000
    );
    expect(estimate).not.toBeNull();
    expect(engine.statistics.trilaterations).toBe(0);
  });
});
