import { describe, expect, it } from 'vitest';
import {
  CROWD_PROFILE,
  MovingAverage,
  distanceSigmaM,
  distanceToRssi,
  rssiToDistance,
  strongestReadings
} from './rssi';

describe('log-distance RSSI model', () => {
  it('uses the reference power at one metre and round-trips distances', () => {
    expect(distanceToRssi(1)).toBeCloseTo(-59, 5);
    for (const d of [0.5, 2, 5, 12, 40]) {
      expect(rssiToDistance(distanceToRssi(d))).toBeCloseTo(d, 4);
    }
  });

  it('maps stronger RSSI to shorter distance and clamps outliers', () => {
    expect(rssiToDistance(-50)).toBeLessThan(rssiToDistance(-80));
    expect(rssiToDistance(20)).toBeGreaterThanOrEqual(0.25);
    expect(rssiToDistance(-200)).toBeLessThanOrEqual(60);
    expect(rssiToDistance(Number.NaN)).toBe(60);
  });

  it('inflates expected range error with distance and crowd noise', () => {
    expect(distanceSigmaM(10, CROWD_PROFILE.high.rssiSigmaDb)).toBeGreaterThan(
      distanceSigmaM(10, CROWD_PROFILE.low.rssiSigmaDb)
    );
    expect(CROWD_PROFILE.high.dropout).toBeGreaterThan(CROWD_PROFILE.low.dropout);
  });

  it('smooths a fixed window and resets', () => {
    const avg = new MovingAverage(3);
    expect(avg.push(10)).toBe(10);
    expect(avg.push(20)).toBe(15);
    expect(avg.push(30)).toBe(20);
    expect(avg.push(40)).toBe(30);
    expect(avg.count).toBe(3);
    avg.reset();
    expect(Number.isNaN(avg.value)).toBe(true);
  });

  it('selects the strongest readings deterministically', () => {
    const picked = strongestReadings(
      [
        { beaconId: 'b', rssi: -70 },
        { beaconId: 'a', rssi: -50 },
        { beaconId: 'c', rssi: -60 }
      ],
      2
    );
    expect(picked.map((p) => p.beaconId)).toEqual(['a', 'c']);
  });
});
