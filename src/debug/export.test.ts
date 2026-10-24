import { describe, expect, it } from 'vitest';
import { MUSEUM } from '../data/museum';
import { runScenarioMatrix } from '../positioning/core/scenario';
import { scenarioToCsv, scenarioToJson } from './export';

describe('scenario exports', () => {
  const matrix = runScenarioMatrix({
    seed: 2026,
    paths: [MUSEUM.paths[0]],
    crowds: ['low'],
    configs: ['beacons', 'full']
  });

  it('includes QR reset counts and times in JSON', () => {
    const parsed = JSON.parse(scenarioToJson(matrix)) as typeof matrix;
    const full = parsed.runs.find((run) => run.config === 'full')!;
    const beacons = parsed.runs.find((run) => run.config === 'beacons')!;
    expect(full.qrResets.length).toBeGreaterThan(1);
    expect(full.qrResetCount).toBe(full.qrResets.length);
    expect(full.qrResets[0].atSec).toBe(0);
    expect(beacons.qrResetCount).toBe(1);
  });

  it('includes QR reset columns in CSV and keeps one row per run', () => {
    const csv = scenarioToCsv(matrix);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(matrix.runs.length + 1);
    expect(lines[0]).toContain('qr_reset_count');
    expect(lines[0]).toContain('qr_artifact_reset_count');
    expect(lines[0]).toContain('qr_reset_times_sec');
    expect(lines[0]).toContain('qr_reset_events');
    expect(lines[0].split(',')).toHaveLength(26);
    expect(lines[2]).toContain('full');
  });
});
