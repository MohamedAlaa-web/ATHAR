import { distanceM, findArtifactMarker, findDevice, inBounds, nearestArtifact } from './room';
import type {
  Contribution,
  FusedEstimate,
  Observation,
  Position2D,
  PositionObservation,
  RangeObservation,
  RejectReason,
  RejectedObservation,
  RoomConfig,
  RoomDevice,
  SourceKind
} from './types';

/**
 * Observation lifetimes. A measurement older than its TTL is not evidence of
 * the *current* position and is rejected instead of silently dragging the
 * estimate.
 */
export const TTL_MS: Record<SourceKind, number> = {
  qr: 90_000,
  manual: 90_000,
  wifi: 15_000,
  ble: 10_000,
  motion: 5_000
};

/** After this window a QR scan is history, not a location proof. */
export const QR_CONFIRM_WINDOW_MS = 45_000;

/** Minimum ranges for a solvable position. Two circles meet in two points;
 *  three or more remove the mirror ambiguity and improve conditioning. */
export const MIN_RANGES = 2;

/** Per-metre growth of uncertainty for an artifact anchor (walking drift). */
export const ANCHOR_DRIFT_PER_SEC = 0.15;

/** A pair of estimates further apart than this many combined sigmas conflicts. */
export const CONFLICT_SIGMA = 3;

const MAX_ACCURACY_M = 30;
const PRIOR_MAX_AGE_MS = 8_000;
const PRIOR_GROWTH = 0.5;
const PRIOR_MAX_SIGMA = 10;

interface Resolved {
  observation: Observation;
  position: Position2D;
  accuracyM: number;
  ageMs: number;
}

export interface FusionOptions {
  room: RoomConfig;
  now: number;
  /** Previous fused output, used only as a short-lived motion prior. */
  previous?: Pick<FusedEstimate, 'position' | 'accuracyM' | 'status'> | null;
  previousTimestamp?: number;
}

/**
 * Deterministic, UI-independent fusion.
 *
 * 1. Validate observations (finite, bounded, fresh, known ids).
 * 2. Turn BLE/Wi-Fi ranges into ONE position per radio source via
 *    Gauss–Newton multilateration; the resulting 1-sigma comes from the
 *    normal-equation covariance.
 * 3. Combine point estimates with inverse-variance weights (the maximum
 *    likelihood solution for independent Gaussian errors).
 * 4. Add a short-lived prior from the previous estimate so the marker cannot
 *    teleport; its sigma grows with the time gap.
 * 5. Refuse to answer when evidence is missing or contradicts itself.
 */
export function fuse(observations: Observation[], opts: FusionOptions): FusedEstimate {
  const { room, now } = opts;
  const rejected: RejectedObservation[] = [];
  const resolved: Resolved[] = [];

  for (const obs of observations) {
    const verdict = validate(obs, room, now);
    if (verdict) {
      rejected.push({ observation: obs, reason: verdict, ageMs: now - obs.timestamp });
      continue;
    }
    const ageMs = Math.max(0, now - obs.timestamp);
    if (obs.kind === 'position') {
      resolved.push({ observation: obs, position: obs.position, accuracyM: obs.accuracyM, ageMs });
    } else if (obs.kind === 'artifact') {
      const marker = findArtifactMarker(room, obs.artifactId)!;
      resolved.push({
        observation: obs,
        position: marker.position,
        accuracyM: obs.accuracyM + (ANCHOR_DRIFT_PER_SEC * ageMs) / 1000,
        ageMs
      });
    }
  }

  const rangeObs = observations.filter(
    (o): o is RangeObservation => o.kind === 'range' && !rejected.some((r) => r.observation === o)
  );

  let rangeResidual: number | null = null;
  const bySource = new Map<'wifi' | 'ble', RangeObservation[]>();
  for (const o of rangeObs) {
    const list = bySource.get(o.source) ?? [];
    list.push(o);
    bySource.set(o.source, list);
  }

  for (const [source, list] of bySource) {
    if (list.length < MIN_RANGES) {
      for (const o of list) {
        rejected.push({ observation: o, reason: 'insufficient-ranges', ageMs: Math.max(0, now - o.timestamp) });
      }
      continue;
    }
    const inputs = list.map((o) => {
      const device = findDevice(room, o.deviceId)!;
      return { device, rangeM: o.rangeM, accuracyM: o.accuracyM };
    });
    const solution = multilaterate(inputs, room);
    if (!solution) {
      for (const o of list) {
        rejected.push({ observation: o, reason: 'degenerate-geometry', ageMs: Math.max(0, now - o.timestamp) });
      }
      continue;
    }
    if (solution.residualRms > CONFLICT_SIGMA * mean(list.map((o) => o.accuracyM))) {
      rangeResidual = Math.max(rangeResidual ?? 0, solution.residualRms);
    }
    const newest = list.reduce((s, o) => Math.max(s, o.timestamp), 0);
    const synthetic: PositionObservation = {
      id: `range:${source}`,
      kind: 'position',
      source,
      position: solution.position,
      accuracyM: solution.accuracyM,
      timestamp: newest,
      live: list.every((o) => o.live)
    };
    resolved.push({ observation: synthetic, position: solution.position, accuracyM: solution.accuracyM, ageMs: Math.max(0, now - newest) });
  }

  const contributions: Contribution[] = [];
  const weights: number[] = [];
  let weightSum = 0;

  for (const r of resolved) {
    const w = 1 / (r.accuracyM * r.accuracyM);
    weights.push(w);
    weightSum += w;
  }

  let priorApplied = false;
  let priorPosition: Position2D | null = null;
  if (opts.previous?.position && opts.previous.accuracyM != null && opts.previousTimestamp != null) {
    const dt = now - opts.previousTimestamp;
    if (dt >= 0 && dt <= PRIOR_MAX_AGE_MS) {
      const sigma = Math.min(
        PRIOR_MAX_SIGMA,
        opts.previous.accuracyM + 0.8 + PRIOR_GROWTH * Math.sqrt(dt / 1000)
      );
      const w = 1 / (sigma * sigma);
      weights.push(w);
      weightSum += w;
      priorApplied = true;
      priorPosition = opts.previous.position;
      resolved.push({
        observation: {
          id: 'temporal-prior',
          kind: 'position',
          source: 'motion',
          position: opts.previous.position,
          accuracyM: sigma,
          timestamp: opts.previousTimestamp,
          live: false
        },
        position: opts.previous.position,
        accuracyM: sigma,
        ageMs: dt
      });
    }
  }

  const references = resolved
    .filter((r) => r.observation.kind === 'artifact')
    .map((r) => ({
      artifactId: (r.observation as Extract<Observation, { kind: 'artifact' }>).artifactId,
      source: (r.observation as Extract<Observation, { kind: 'artifact' }>).source,
      ageMs: r.ageMs,
      live: r.observation.live
    }));

  if (weightSum === 0 || resolved.length === 0) {
    return {
      status: 'unknown',
      position: null,
      accuracyM: null,
      confidence: 0,
      contributions: [],
      accepted: [],
      rejected,
      references,
      conflict: false,
      diagnostics: { acceptedCount: 0, normalizedDisagreement: null, rangeResidual, clampedToRoom: false },
      notes: ['no-evidence']
    };
  }

  let x = 0;
  let y = 0;
  for (let i = 0; i < resolved.length; i++) {
    const w = weights[i];
    x += resolved[i].position.x * w;
    y += resolved[i].position.y * w;
  }
  x /= weightSum;
  y /= weightSum;
  const rawPosition = { x, y };
  const position = {
    x: Math.min(room.widthM, Math.max(0, x)),
    y: Math.min(room.heightM, Math.max(0, y))
  };
  const clampedToRoom = Math.abs(position.x - rawPosition.x) > 1e-9 || Math.abs(position.y - rawPosition.y) > 1e-9;
  const accuracyM = Math.sqrt(1 / weightSum);

  for (let i = 0; i < resolved.length; i++) {
    contributions.push({
      observation: resolved[i].observation,
      weightPct: Math.round((weights[i] / weightSum) * 1000) / 10,
      ageMs: resolved[i].ageMs,
      resolved: resolved[i].position,
      effectiveAccuracyM: Math.round(resolved[i].accuracyM * 100) / 100
    });
  }
  contributions.sort((a, b) => b.weightPct - a.weightPct);

  let normalizedDisagreement: number | null = null;
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      const combined = Math.hypot(resolved[i].accuracyM, resolved[j].accuracyM);
      if (combined <= 0) continue;
      const d = distanceM(resolved[i].position, resolved[j].position) / combined;
      normalizedDisagreement = Math.max(normalizedDisagreement ?? 0, d);
    }
  }

  const notes: string[] = [];
  let conflict = false;
  if (normalizedDisagreement != null && normalizedDisagreement > CONFLICT_SIGMA) {
    conflict = true;
    notes.push('conflicting-observations');
  }
  if (rangeResidual != null) {
    conflict = true;
    notes.push('range-residual-high');
  }
  if (clampedToRoom) {
    notes.push('estimate-clamped-to-room');
  }
  if (priorApplied) notes.push('temporal-prior-applied');

  const freshReferences = references.filter((r) => r.ageMs <= QR_CONFIRM_WINDOW_MS);
  const nearestId = nearestArtifact(room, { position, accuracyM, status: 'estimated' }).artifactId;
  const confirmedMatch = freshReferences.some((r) => r.artifactId === nearestId);

  let status: FusedEstimate['status'];
  if (conflict) status = 'uncertain';
  else if (accuracyM > 5) status = 'uncertain';
  else if (confirmedMatch && accuracyM <= 2.5) status = 'confirmed';
  else status = 'estimated';

  if (status === 'uncertain' && !conflict) notes.push('low-accuracy');

  const newestResolved = resolved.reduce((a, b) => (b.observation.timestamp > a.observation.timestamp ? b : a), resolved[0]);
  const freshness = Math.max(0, 1 - newestResolved.ageMs / Math.max(1, TTL_MS[newestResolved.observation.source]));
  const raw = (1 / (1 + accuracyM / 2.5)) * (conflict ? 0.5 : 1) * freshness;

  return {
    status,
    position,
    accuracyM: Math.round(accuracyM * 100) / 100,
    confidence: Math.round(Math.max(0, Math.min(1, raw)) * 100) / 100,
    contributions,
    accepted: [...rangeObs, ...resolved.map((r) => r.observation)],
    rejected,
    references,
    conflict,
    diagnostics: {
      acceptedCount: resolved.length,
      normalizedDisagreement: normalizedDisagreement == null ? null : Math.round(normalizedDisagreement * 100) / 100,
      rangeResidual: rangeResidual == null ? null : Math.round(rangeResidual * 100) / 100,
      clampedToRoom
    },
    notes
  };
}

function validate(obs: Observation, room: RoomConfig, now: number): RejectReason | null {
  if (!Number.isFinite(obs.timestamp)) return 'invalid-time';
  const age = now - obs.timestamp;
  if (age < -5_000) return 'invalid-time';
  if (age > TTL_MS[obs.source]) return 'stale';
  if (!Number.isFinite(obs.accuracyM) || obs.accuracyM <= 0 || obs.accuracyM > MAX_ACCURACY_M) {
    return 'invalid-accuracy';
  }
  if (obs.kind === 'position') {
    if (!Number.isFinite(obs.position.x) || !Number.isFinite(obs.position.y)) return 'invalid-accuracy';
    if (!inBounds(room, obs.position, 1)) return 'out-of-bounds';
  }
  if (obs.kind === 'artifact') {
    if (!findArtifactMarker(room, obs.artifactId)) return 'unknown-artifact';
  }
  if (obs.kind === 'range') {
    if (!findDevice(room, obs.deviceId)) return 'unknown-device';
    if (!Number.isFinite(obs.rangeM) || obs.rangeM < -0.5 || obs.rangeM > room.widthM + room.heightM + 5) {
      return 'out-of-bounds';
    }
  }
  return null;
}

const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);

export interface MultilaterationResult {
  position: Position2D;
  accuracyM: number;
  residualRms: number;
  iterations: number;
}

/**
 * Range-based multilateration with Gauss–Newton least squares.
 * Requires at least three non-collinear devices. Sigma comes from the
 * linearised covariance sigma² · (JᵀJ)⁻¹.
 */
export function multilaterate(
  inputs: Array<{ device: RoomDevice; rangeM: number; accuracyM: number }>,
  room: RoomConfig
): MultilaterationResult | null {
  if (inputs.length < MIN_RANGES) return null;

  const sigma = Math.sqrt(mean(inputs.map((i) => i.accuracyM ** 2)));

  const costAt = (px: number, py: number): number => {
    let total = 0;
    for (const { device, rangeM, accuracyM } of inputs) {
      const predicted = Math.hypot(px - device.position.x, py - device.position.y);
      total += ((predicted - rangeM) / Math.max(0.1, accuracyM)) ** 2;
    }
    return total;
  };

  /** Damped Gauss–Newton (Levenberg–Marquardt) from one seed. */
  const solve = (seedX: number, seedY: number) => {
    let px = seedX;
    let py = seedY;
    let cost = costAt(px, py);
    let lambda = 1e-3;
    let used = 0;

    for (let step = 0; step < 40; step++) {
      used = step + 1;
      let h00 = 0;
      let h01 = 0;
      let h11 = 0;
      let g0 = 0;
      let g1 = 0;

      for (const { device, rangeM, accuracyM } of inputs) {
        const dx = px - device.position.x;
        const dy = py - device.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1e-6) continue;
        const weight = 1 / Math.max(0.1, accuracyM) ** 2;
        const jx = (weight * dx) / dist;
        const jy = (weight * dy) / dist;
        const residual = dist - rangeM;
        h00 += (jx * dx) / dist;
        h01 += (jx * dy) / dist;
        h11 += (jy * dy) / dist;
        g0 += jx * residual;
        g1 += jy * residual;
      }

      const det = h00 * h11 - h01 * h01;
      if (!Number.isFinite(det) || Math.abs(det) < 1e-9) break;

      let accepted = false;
      for (let attempt = 0; attempt < 6; attempt++) {
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
        const nx = px + stepX;
        const ny = py + stepY;
        const nextCost = costAt(nx, ny);
        if (nextCost < cost) {
          const moved = Math.hypot(stepX, stepY);
          px = nx;
          py = ny;
          cost = nextCost;
          lambda = Math.max(1e-6, lambda * 0.4);
          accepted = true;
          if (moved < 1e-4) step = 40;
          break;
        }
        lambda *= 8;
      }
      if (!accepted || cost < 1e-12) break;
    }

    return { x: px, y: py, cost, iterations: used };
  };

  const seeds: Position2D[] = [
    {
      x: mean(inputs.map((i) => i.device.position.x)),
      y: mean(inputs.map((i) => i.device.position.y))
    }
  ];
  const gridStep = 1.5;
  for (let gx = 0.5; gx < room.widthM; gx += gridStep) {
    for (let gy = 0.5; gy < room.heightM; gy += gridStep) seeds.push({ x: gx, y: gy });
  }

  let best: { x: number; y: number; cost: number; iterations: number } | null = null;
  for (const seed of seeds) {
    const candidate = solve(seed.x, seed.y);
    if (!Number.isFinite(candidate.cost)) continue;
    if (!best || candidate.cost < best.cost - 1e-9) best = candidate;
  }
  if (!best) return null;

  const x = Math.min(room.widthM, Math.max(0, best.x));
  const y = Math.min(room.heightM, Math.max(0, best.y));

  let h00 = 0;
  let h01 = 0;
  let h11 = 0;
  let sq = 0;
  for (const { device, rangeM, accuracyM } of inputs) {
    const dx = x - device.position.x;
    const dy = y - device.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) return null;
    const weight = 1 / Math.max(0.1, accuracyM) ** 2;
    h00 += (weight * dx * dx) / (dist * dist);
    h01 += (weight * dx * dy) / (dist * dist);
    h11 += (weight * dy * dy) / (dist * dist);
    sq += (dist - rangeM) ** 2;
  }
  const det = h00 * h11 - h01 * h01;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return null;

  const accuracy = Math.sqrt(Math.max(h11 / det, h00 / det));
  const residualRms = Math.sqrt(sq / inputs.length);

  return {
    position: { x, y },
    accuracyM: Math.min(MAX_ACCURACY_M, Math.max(0.2, accuracy)),
    residualRms,
    iterations: best.iterations
  };
}

