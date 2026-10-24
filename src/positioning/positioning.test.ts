import { describe, expect, it } from 'vitest';
import { ARTIFACTS, getArtifact } from '../data/artifacts';
import { ARTIFACT_INTRO_AUDIO, CHAPTER_MEDIA } from '../data/media';
import { artifactUrl } from '../config';
import { artifactPath, ROUTES, STATIC_ROUTES } from '../routes';
import { STRINGS, t } from '../i18n/dictionaries';
import { resolveQrPayload } from '../qr/payload';
import { cloneRoom, DEMO_ROOM, distanceM, inBounds, nearestArtifact, toSvg, validateRoom } from '../positioning/room';
import { fuse, TTL_MS } from '../positioning/fusion';
import { runEvaluation, runScenario, simulateStep, getScenario, targetAt, DEMO_PATH } from '../positioning/simulation';
import type { Observation, Position2D } from '../positioning/types';

const NOW = 1_000_000;

const posObs = (id: string, x: number, y: number, accuracyM: number, timestamp = NOW, source: 'wifi' | 'ble' | 'qr' = 'ble'): Observation => ({
  id,
  kind: 'position',
  source,
  position: { x, y },
  accuracyM,
  timestamp,
  live: false
});

const rangeObs = (id: string, deviceId: string, rangeM: number, accuracyM: number, source: 'wifi' | 'ble', timestamp = NOW): Observation => ({
  id,
  kind: 'range',
  source,
  deviceId,
  rangeM,
  accuracyM,
  timestamp,
  live: false
});

describe('QR payload resolution', () => {
  it('accepts plain demo codes case-insensitively', () => {
    expect(resolveQrPayload('MUMMY-001').artifactId).toBe('royal-mummy');
    expect(resolveQrPayload('  athar-coffin-002 ').artifactId).toBe('painted-coffin');
    expect(resolveQrPayload('STATUE-003').form).toBe('plain-code');
  });

  it('accepts ATHAR urls in hash, path and query form', () => {
    expect(resolveQrPayload('https://museum.example.org/#/artifact/STATUE-003')).toMatchObject({
      artifactId: 'royal-statue',
      form: 'url-hash'
    });
    expect(resolveQrPayload('https://museum.example.org/artifact/royal-mummy')).toMatchObject({
      artifactId: 'royal-mummy',
      form: 'url-path'
    });
    expect(resolveQrPayload('https://museum.example.org/?code=COFFIN-002')).toMatchObject({
      artifactId: 'painted-coffin',
      form: 'url-query'
    });
  });

  it('rejects arbitrary QR content instead of navigating', () => {
    expect(resolveQrPayload('').artifactId).toBeNull();
    expect(resolveQrPayload('https://evil.example/collect?x=1').artifactId).toBeNull();
    expect(resolveQrPayload('just some text').artifactId).toBeNull();
    expect(resolveQrPayload('https://museum.example.org/#/artifact/UNKNOWN-999').artifactId).toBeNull();
  });

  it('every printed artifact code round-trips to its own artifact', () => {
    for (const a of ARTIFACTS) {
      const resolved = resolveQrPayload(a.demoCode);
      expect(resolved.artifactId, a.demoCode).toBe(a.id);
      expect(resolveQrPayload(artifactUrl('https://museum.example.org', a.demoCode)).artifactId).toBe(a.id);
    }
  });
});

describe('routes and language switching', () => {
  it('exposes every visitor route including the positioning demo', () => {
    expect(STATIC_ROUTES).toContain(ROUTES.positioning);
    expect(STATIC_ROUTES).toContain(ROUTES.scan);
    for (const a of ARTIFACTS) {
      expect(artifactPath(a.id)).toBe(`/artifact/${a.id}`);
      expect(artifactPath(a.id, 'story')).toContain('/story');
      expect(artifactPath(a.id, 'facts')).toContain('/facts');
    }
    expect(ROUTES.artifact).toBe('/artifact/:id');
  });

  it('translates navigation in all three languages with a safe fallback', () => {
    expect(t('en', 'nav.positioning')).toBe('Positioning');
    expect(t('ar', 'nav.positioning')).toBe('التتبع الداخلي');
    expect(t('fr', 'nav.positioning')).toBe('Localisation');
    expect(t('en', 'missing.key')).toBe('missing.key');
    const enKeys = Object.keys(STRINGS.en);
    for (const k of enKeys) {
      expect(STRINGS.ar[k], `ar:${k}`).toBeTruthy();
      expect(STRINGS.fr[k], `fr:${k}`).toBeTruthy();
    }
  });

  it('keeps the positioning strings honest about live vs simulated', () => {
    expect(t('en', 'pos.status.live')).toBe('LIVE');
    expect(t('en', 'pos.status.simulation')).toBe('SIMULATION');
    expect(t('en', 'pos.disclaimer')).toContain('SIMULATION');
  });
});

describe('room geometry', () => {
  it('computes distances and converts floor metres to SVG units', () => {
    expect(distanceM({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(toSvg(DEMO_ROOM, { x: 2, y: 3 })).toEqual({ x: 2, y: DEMO_ROOM.heightM - 3 });
    expect(inBounds(DEMO_ROOM, { x: 2, y: 3 })).toBe(true);
    expect(inBounds(DEMO_ROOM, { x: -0.5, y: 3 })).toBe(false);
    expect(inBounds(DEMO_ROOM, { x: 99, y: 3 })).toBe(false);
  });

  it('validates a room layout and reports the broken field', () => {
    expect(validateRoom(cloneRoom(DEMO_ROOM)).ok).toBe(true);
    const bad = cloneRoom(DEMO_ROOM);
    bad.devices = bad.devices.slice(0, 2);
    expect(validateRoom(bad).ok).toBe(false);
    expect(validateRoom(bad).errors).toContain('devices');
    const outside = cloneRoom(DEMO_ROOM);
    outside.artifacts[0].position = { x: 100, y: 100 };
    expect(validateRoom(outside).errors.join()).toContain('artifact-bounds');
  });
});

describe('nearest artifact selection', () => {
  it('selects the geometrically closest artifact inside the threshold', () => {
    const marker = DEMO_ROOM.artifacts[0];
    const result = nearestArtifact(DEMO_ROOM, { position: marker.position, accuracyM: 0.4, status: 'estimated' });
    expect(result.artifactId).toBe(marker.id);
    expect(result.reason).toBe('nearest');
    expect(result.ambiguity).toBe('clear');
  });

  it('refuses to pick when nothing is inside the proximity threshold', () => {
    const result = nearestArtifact(DEMO_ROOM, { position: { x: 0.2, y: 0.2 }, accuracyM: 0.4, status: 'estimated' });
    expect(result.reason).toBe('too-far');
    expect(result.distanceM).toBeGreaterThan(DEMO_ROOM.proximityThresholdM);
  });

  it('flags two artifacts that are too close together', () => {
    const pair = cloneRoom(DEMO_ROOM);
    pair.artifacts = [
      { id: 'royal-mummy', label: 'A', position: { x: 5, y: 4 }, radiusM: 1 },
      { id: 'painted-coffin', label: 'B', position: { x: 5.5, y: 4 }, radiusM: 1 }
    ];
    const result = nearestArtifact(pair, { position: { x: 5.1, y: 4 }, accuracyM: 0.3, status: 'estimated' });
    expect(result.ambiguity).toBe('ambiguous');
    expect(result.reason).toBe('too-close');
  });

  it('does not confirm an artifact from an uncertain position', () => {
    const marker = DEMO_ROOM.artifacts[0];
    const result = nearestArtifact(DEMO_ROOM, { position: marker.position, accuracyM: 4, status: 'uncertain' });
    expect(result.reason).toBe('position-uncertain');
    expect(result.ambiguity).toBe('ambiguous');
  });

  it('returns no-position when there is no estimate at all', () => {
    expect(nearestArtifact(DEMO_ROOM, { position: null, accuracyM: null, status: 'unknown' }).reason).toBe('no-position');
  });
});

describe('observation validation and fusion', () => {
  it('rejects stale, out-of-bounds and invalid observations', () => {
    const out = fuse(
      [
        posObs('stale', 5, 5, 1, NOW - TTL_MS.ble - 1),
        posObs('outside', 500, 500, 1),
        posObs('zero-sigma', 5, 5, 0),
        posObs('good', 5, 5, 1)
      ],
      { room: DEMO_ROOM, now: NOW }
    );
    const reasons = out.rejected.map((r) => r.reason);
    expect(reasons).toContain('stale');
    expect(reasons).toContain('out-of-bounds');
    expect(reasons).toContain('invalid-accuracy');
    expect(out.accepted).toHaveLength(1);
    expect(out.status).toBe('estimated');
  });

  it('returns unknown rather than inventing coordinates', () => {
    const out = fuse([], { room: DEMO_ROOM, now: NOW });
    expect(out.status).toBe('unknown');
    expect(out.position).toBeNull();
    expect(out.accuracyM).toBeNull();
    expect(out.confidence).toBe(0);
  });

  it('fuses compatible measurements with inverse-variance weights', () => {
    const out = fuse([posObs('a', 5, 5, 1), posObs('b', 5.4, 5, 1)], { room: DEMO_ROOM, now: NOW });
    expect(out.status).toBe('estimated');
    expect(out.position!.x).toBeCloseTo(5.2, 2);
    expect(out.position!.y).toBeCloseTo(5, 2);
    expect(out.accuracyM!).toBeCloseTo(Math.SQRT1_2, 2);
    expect(out.contributions).toHaveLength(2);
    expect(out.contributions[0].weightPct + out.contributions[1].weightPct).toBeCloseTo(100, 1);
  });

  it('marks contradicting measurements as uncertain', () => {
    const out = fuse([posObs('a', 2, 2, 0.4), posObs('b', 10, 6, 0.4)], { room: DEMO_ROOM, now: NOW });
    expect(out.conflict).toBe(true);
    expect(out.status).toBe('uncertain');
    expect(out.diagnostics.normalizedDisagreement!).toBeGreaterThan(3);
  });

  it('solves ranges by multilateration', () => {
    const room = cloneRoom(DEMO_ROOM);
    room.widthM = 12;
    room.heightM = 12;
    room.devices = [
      { id: 'd1', kind: 'ble', label: 'A', position: { x: 0.5, y: 0.5 }, rangeSigmaM: 0.3, physical: false },
      { id: 'd2', kind: 'ble', label: 'B', position: { x: 11, y: 0.5 }, rangeSigmaM: 0.3, physical: false },
      { id: 'd3', kind: 'ble', label: 'C', position: { x: 0.5, y: 11 }, rangeSigmaM: 0.3, physical: false }
    ];
    const truth = { x: 4, y: 5 };
    const obs = room.devices.map((d, i) =>
      rangeObs(`r${i}`, d.id, distanceM(truth, d.position), 0.3, 'ble')
    );
    const out = fuse(obs, { room, now: NOW });
    expect(out.status).toBe('estimated');
    expect(out.position!.x).toBeCloseTo(truth.x, 1);
    expect(out.position!.y).toBeCloseTo(truth.y, 1);
    expect(out.rejected).toHaveLength(0);
  });

  it('rejects a radio source that has fewer than two ranges', () => {
    const out = fuse([rangeObs('r1', 'ble-1', 3, 1, 'ble')], { room: DEMO_ROOM, now: NOW });
    expect(out.rejected[0].reason).toBe('insufficient-ranges');
    expect(out.status).toBe('unknown');
  });

  it('smooths jumps with a short-lived temporal prior and then forgets it', () => {
    const first = fuse([posObs('a', 2, 2, 0.8)], { room: DEMO_ROOM, now: NOW });
    const moved = fuse([posObs('b', 6, 5, 0.8, NOW + 1000)], {
      room: DEMO_ROOM,
      now: NOW + 1000,
      previous: first,
      previousTimestamp: NOW
    });
    expect(moved.position!.x).toBeLessThan(6);
    expect(moved.position!.x).toBeGreaterThan(2);
    expect(moved.notes).toContain('temporal-prior-applied');
    const later = fuse([posObs('c', 6, 5, 0.8, NOW + 20_000)], {
      room: DEMO_ROOM,
      now: NOW + 20_000,
      previous: first,
      previousTimestamp: NOW
    });
    expect(later.notes).not.toContain('temporal-prior-applied');
  });

  it('treats a QR scan as a scan-time reference, not a permanent position', () => {
    const fresh = fuse(
      [{ id: 'q', kind: 'artifact', source: 'qr', artifactId: 'royal-mummy', accuracyM: 1.4, timestamp: NOW, live: true }],
      { room: DEMO_ROOM, now: NOW }
    );
    expect(fresh.references[0].artifactId).toBe('royal-mummy');
    expect(fresh.status).toBe('confirmed');

    const old = fuse(
      [
        { id: 'q', kind: 'artifact', source: 'qr', artifactId: 'royal-mummy', accuracyM: 1.4, timestamp: NOW - 80_000, live: true },
        posObs('p', 8, 6, 1.2, NOW)
      ],
      { room: DEMO_ROOM, now: NOW }
    );
    expect(old.status).not.toBe('confirmed');
  });
});

describe('deterministic simulation', () => {
  it('produces identical measurements for the same seed and step', () => {
    const args = { room: DEMO_ROOM, scenario: getScenario('noisy'), target: { x: 4, y: 3 }, seed: 7, step: 3, now: NOW };
    expect(simulateStep(args)).toEqual(simulateStep(args));
  });

  it('produces different measurements for a different seed', () => {
    const base = { room: DEMO_ROOM, scenario: getScenario('clean'), target: { x: 4, y: 3 }, step: 3, now: NOW };
    expect(simulateStep({ ...base, seed: 1 })).not.toEqual(simulateStep({ ...base, seed: 2 }));
  });

  it('never labels simulated observations as live', () => {
    const obs = simulateStep({
      room: DEMO_ROOM,
      scenario: getScenario('clean'),
      target: DEMO_PATH[0],
      seed: 1,
      step: 0,
      now: NOW
    });
    expect(obs.length).toBeGreaterThan(4);
    expect(obs.every((o) => o.live === false)).toBe(true);
  });

  it('follows the same path and estimates for repeated runs', () => {
    const a = runScenario(DEMO_ROOM, 'clean', 6, 42);
    const b = runScenario(DEMO_ROOM, 'clean', 6, 42);
    expect(a.map((r) => r.estimate.position)).toEqual(b.map((r) => r.estimate.position));
    expect(a.every((r) => r.targetArtifactId !== undefined)).toBe(true);
  });

  it('marks the conflicting scenario as uncertain rather than guessing', () => {
    const run = runScenario(DEMO_ROOM, 'conflicting', 18, 42);
    expect(run.some((r) => r.estimate.status === 'uncertain' || r.estimate.notes.includes('range-residual-high'))).toBe(true);
  });

  it('moves along the closed demo path', () => {
    const start = targetAt(DEMO_PATH, 0);
    const mid = targetAt(DEMO_PATH, 0.5);
    expect(distanceM(start, DEMO_PATH[0])).toBeLessThan(1e-9);
    expect(distanceM(mid, DEMO_PATH[0])).toBeGreaterThan(2);
  });
});

describe('simulated evaluation harness', () => {
  const report = runEvaluation(DEMO_ROOM, { seed: 2026 });

  it('covers 25 ground-truth points and reports simulation mode', () => {
    expect(report.mode).toBe('simulation');
    expect(report.testPoints).toBe(25);
    expect(report.points).toHaveLength(25);
    expect(report.seed).toBe(2026);
  });

  it('reports finite error statistics without inventing hardware results', () => {
    expect(report.medianErrorM).not.toBeNull();
    expect(report.medianErrorM!).toBeGreaterThan(0);
    expect(report.medianErrorM!).toBeLessThan(6);
    expect(report.p90ErrorM!).toBeGreaterThanOrEqual(report.medianErrorM!);
    expect(report.roomClassificationRate).toBeGreaterThan(0.9);
    expect(report.nearestArtifactAccuracy).not.toBeNull();
    expect(report.bySource.map((s) => s.source)).toEqual(['wifi', 'ble', 'fused']);
  });

  it('is repeatable for the same seed', () => {
    const again = runEvaluation(DEMO_ROOM, { seed: 2026 });
    expect(again.medianErrorM).toBe(report.medianErrorM);
    expect(again.p90ErrorM).toBe(report.p90ErrorM);
    expect(again.nearestArtifactAccuracy).toBe(report.nearestArtifactAccuracy);
  });
});

describe('media manifest still matches the positioning additions', () => {
  it('keeps chapter videos ready and AR/FR studio audio marked unavailable', () => {
    expect(CHAPTER_MEDIA.length).toBe(11);
    expect(Object.keys(ARTIFACT_INTRO_AUDIO).length).toBe(3);
    for (const m of CHAPTER_MEDIA) {
      expect(m.video.state).toBe('ready');
      expect(m.narration.ar.state).toBe('unavailable');
    }
  });

  it('keeps artifact ids aligned with the positioning registry', () => {
    const registered = DEMO_ROOM.artifacts.map((a) => a.id).sort();
    const ids = ARTIFACTS.map((a) => a.id).sort();
    expect(registered).toEqual(ids);
    for (const id of registered) expect(getArtifact(id)).toBeDefined();
  });
});

describe('type sanity', () => {
  it('exposes the demo room as a valid configurable layout', () => {
    const room = cloneRoom(DEMO_ROOM);
    expect(room.devices.length).toBe(6);
    expect(room.devices.filter((d) => d.kind === 'wifi').length).toBe(3);
    expect(room.devices.filter((d) => d.kind === 'ble').length).toBe(3);
    expect(room.artifacts.length).toBe(3);
    expect(room.widthM).toBe(12);
    const p: Position2D = { x: 1, y: 1 };
    expect(inBounds(room, p)).toBe(true);
  });
});

