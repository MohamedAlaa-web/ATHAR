import { describe, expect, it } from 'vitest';
import { MUSEUM } from '../../data/museum';
import { pathLengthM, pointAlongPath } from './simulation';
import { runScenario, runScenarioMatrix } from './scenario';

describe('virtual walker', () => {
  it('interpolates the path and switches floor on the staircase segment', () => {
    const upperPath = MUSEUM.paths.find((p) => p.id === 'upper-gallery')!;
    const total = pathLengthM(upperPath);
    const start = pointAlongPath(upperPath, 0);
    expect(start.position.floor).toBe('ground');
    const nearEnd = pointAlongPath(upperPath, total * 0.95);
    expect(nearEnd.position.floor).toBe('upper');
    const mid = pointAlongPath(upperPath, total / 2);
    expect(mid.position.x).toBeGreaterThan(0);
  });

  it('is deterministic for a fixed seed', () => {
    const path = MUSEUM.paths[0];
    const a = runScenario(path, 'low', 'full', { seed: 7 });
    const b = runScenario(path, 'low', 'full', { seed: 7 });
    expect(a.errors).toEqual(b.errors);
    expect(a.meanErrorM).toBe(b.meanErrorM);
    expect(a.hallAccuracyPct).toBe(b.hallAccuracyPct);
  });

  it('reports plausible real-computation metrics', () => {
    const run = runScenario(MUSEUM.paths[1], 'medium', 'beacons-pdr', { seed: 42 });
    expect(run.steps).toBeGreaterThan(10);
    expect(run.meanErrorM).toBeGreaterThanOrEqual(0);
    expect(run.medianErrorM).toBeGreaterThanOrEqual(0);
    expect(run.p95ErrorM).toBeGreaterThanOrEqual(run.medianErrorM);
    expect(run.hallAccuracyPct).toBeGreaterThanOrEqual(0);
    expect(run.hallAccuracyPct).toBeLessThanOrEqual(100);
    expect(run.nearestArtifactAccuracyPct).toBeGreaterThanOrEqual(0);
    expect(run.updateRateHz).toBeGreaterThan(0);
    expect(run.beaconReadingsUsedAvg).toBeGreaterThanOrEqual(0);
    expect(run.errors.length).toBe(run.steps);
  });

  it('records every QR reset with its time and only the full config resets at artifacts', () => {
    const path = MUSEUM.paths[0];
    const beacons = runScenario(path, 'low', 'beacons', { seed: 7 });
    expect(beacons.qrResets).toEqual([{ atSec: 0, kind: 'entrance', artifactId: null }]);
    expect(beacons.qrResetCount).toBe(1);
    expect(beacons.qrArtifactResetCount).toBe(0);

    const full = runScenario(path, 'low', 'full', { seed: 7 });
    expect(full.qrResetCount).toBeGreaterThan(1);
    expect(full.qrArtifactResetCount).toBe(full.qrResetCount - 1);
    expect(full.qrResets[0]).toMatchObject({ atSec: 0, kind: 'entrance' });
    const times = full.qrResets.map((reset) => reset.atSec);
    expect(times[0]).toBe(0);
    expect(times.every((time) => time >= 0 && time <= full.durationSec)).toBe(true);
    for (let i = 1; i < times.length; i += 1) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);

    const artifacts = full.qrResets.filter((reset) => reset.kind === 'artifact').map((reset) => reset.artifactId);
    expect(artifacts.every((id) => id != null)).toBe(true);
    expect(new Set(artifacts).size).toBe(artifacts.length);
  });

  it('reports average QR resets in the summary rows', () => {
    const matrix = runScenarioMatrix({ seed: 2026 });
    for (const row of matrix.summary) {
      const runs = matrix.runs.filter((run) => run.config === row.config && run.crowd === row.crowd);
      const expected = runs.reduce((sum, run) => sum + run.qrResetCount, 0) / runs.length;
      expect(row.qrResetsAvg).toBeCloseTo(expected, 2);
    }
  });

  it('runs the full 27 combinations', () => {
    const matrix = runScenarioMatrix({ seed: 2026 });
    expect(matrix.runs).toHaveLength(27);
    expect(matrix.summary).toHaveLength(9);
    expect(matrix.configSummary).toHaveLength(3);
    expect(matrix.mode).toBe('simulation');
    for (const run of matrix.runs) {
      expect(Number.isFinite(run.meanErrorM)).toBe(true);
      expect(run.durationSec).toBeGreaterThan(0);
      expect(run.qrResetCount).toBe(run.qrResets.length);
    }
  });
});
