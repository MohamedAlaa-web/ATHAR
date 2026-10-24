import { describe, expect, it } from 'vitest';
import { MUSEUM } from '../data/museum';
import { SimulatedCrowdSource } from './simulated';
import { RemoteCrowdSource } from './remote';
import { tierForRatio } from './types';

describe('crowd thresholds', () => {
  it('maps occupancy ratios to the documented tiers', () => {
    expect(tierForRatio(0)).toBe(0);
    expect(tierForRatio(0.39)).toBe(0);
    expect(tierForRatio(0.4)).toBe(1);
    expect(tierForRatio(0.74)).toBe(1);
    expect(tierForRatio(0.75)).toBe(2);
    expect(tierForRatio(1)).toBe(2);
  });
});

describe('simulated crowd source', () => {
  it('is deterministic for the same clock value', () => {
    const a = new SimulatedCrowdSource({ seed: 7 });
    const b = new SimulatedCrowdSource({ seed: 7 });
    const at = 1_760_000_000_000;
    expect(a.getLevels(at)).toEqual(b.getLevels(at));
  });

  it('covers every hall with a valid tier', () => {
    const source = new SimulatedCrowdSource();
    const levels = source.getLevels(1_760_000_000_000);
    expect(Object.keys(levels).sort()).toEqual(MUSEUM.halls.map((hall) => hall.id).sort());
    for (const tier of Object.values(levels)) expect([0, 1, 2]).toContain(tier);
  });

  it('changes over the day and reaches both quiet and crowded halls', () => {
    const source = new SimulatedCrowdSource();
    const seen = new Set<number>();
    for (let i = 0; i < 40; i++) {
      const levels = source.getLevels(1_760_000_000_000 + i * 90_000);
      for (const tier of Object.values(levels)) seen.add(tier);
    }
    expect(seen.has(0)).toBe(true);
    expect(seen.has(2)).toBe(true);
  });

  it('labels itself as simulated', () => {
    const source = new SimulatedCrowdSource();
    expect(source.status.kind).toBe('simulated');
    expect(source.status.detail.en).toMatch(/simulated/i);
  });
});

describe('remote crowd stub', () => {
  it('never fabricates levels', () => {
    const source = new RemoteCrowdSource();
    expect(source.getLevels()).toEqual({});
    expect(source.status.implemented).toBe(false);
    expect(source.status.detail.en).toMatch(/not implemented/i);
  });
});
