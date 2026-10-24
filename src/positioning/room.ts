import type {
  FusedEstimate,
  NearestArtifact,
  Position2D,
  RoomArtifact,
  RoomConfig,
  RoomDevice
} from './types';

/**
 * Demo room. Dimensions are a manual tape-measure of a rectangular teaching
 * room; no claim is made that a router can discover these walls.
 * Edit this object (or paste a layout in the UI) to match the real room.
 */
export const DEMO_ROOM: RoomConfig = {
  id: 'athar-demo-hall',
  name: 'ATHAR demo hall',
  widthM: 12,
  heightM: 8,
  gridStepM: 1,
  proximityThresholdM: 3.2,
  ambiguityMarginM: 0.9,
  devices: [
    { id: 'wifi-1', kind: 'wifi', label: 'Wi-Fi NW', position: { x: 1, y: 6.8 }, rangeSigmaM: 1.8, physical: false },
    { id: 'wifi-2', kind: 'wifi', label: 'Wi-Fi SE', position: { x: 11, y: 0.8 }, rangeSigmaM: 1.8, physical: false },
    { id: 'wifi-3', kind: 'wifi', label: 'Wi-Fi S', position: { x: 6, y: 1.2 }, rangeSigmaM: 1.8, physical: false },
    { id: 'ble-1', kind: 'ble', label: 'BLE-N', position: { x: 1, y: 1.2 }, rangeSigmaM: 1.1, physical: false },
    { id: 'ble-2', kind: 'ble', label: 'BLE-SE', position: { x: 11, y: 6.8 }, rangeSigmaM: 1.1, physical: false },
    { id: 'ble-3', kind: 'ble', label: 'BLE-NE', position: { x: 6, y: 7.4 }, rangeSigmaM: 1.1, physical: false }
  ],
  artifacts: [
    { id: 'royal-mummy', label: 'Mummy', position: { x: 3.2, y: 3.2 }, radiusM: 1.2 },
    { id: 'painted-coffin', label: 'Coffin', position: { x: 6.2, y: 6.1 }, radiusM: 1.2 },
    { id: 'royal-statue', label: 'Statue', position: { x: 9.2, y: 2.4 }, radiusM: 1.2 }
  ],
  obstacles: [
    { id: 'case-1', label: 'Display case', x: 5.3, y: 3.3, widthM: 1.6, heightM: 1.1 },
    { id: 'bench-1', label: 'Bench', x: 7.6, y: 5.2, widthM: 1.4, heightM: 0.6 }
  ]
};

export function cloneRoom(room: RoomConfig = DEMO_ROOM): RoomConfig {
  return {
    ...room,
    devices: room.devices.map((d) => ({ ...d, position: { ...d.position } })),
    artifacts: room.artifacts.map((a) => ({ ...a, position: { ...a.position } })),
    obstacles: room.obstacles.map((o) => ({ ...o }))
  };
}

export function distanceM(a: Position2D, b: Position2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function inBounds(room: RoomConfig, p: Position2D, toleranceM = 0): boolean {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= -toleranceM &&
    p.y >= -toleranceM &&
    p.x <= room.widthM + toleranceM &&
    p.y <= room.heightM + toleranceM
  );
}

export function clampToRoom(room: RoomConfig, p: Position2D): Position2D {
  return {
    x: Math.min(room.widthM, Math.max(0, Number.isFinite(p.x) ? p.x : 0)),
    y: Math.min(room.heightM, Math.max(0, Number.isFinite(p.y) ? p.y : 0))
  };
}

/** Floor metres → SVG user units (y axis flipped). The viewBox adds a margin. */
export function toSvg(room: RoomConfig, p: Position2D): { x: number; y: number } {
  return { x: p.x, y: room.heightM - p.y };
}

export function fromSvg(room: RoomConfig, p: { x: number; y: number }): Position2D {
  return { x: p.x, y: room.heightM - p.y };
}

export function findDevice(room: RoomConfig, id: string): RoomDevice | undefined {
  return room.devices.find((d) => d.id === id);
}

export function findArtifactMarker(room: RoomConfig, id: string): RoomArtifact | undefined {
  return room.artifacts.find((a) => a.id === id);
}

export function sortByDistance(room: RoomConfig, p: Position2D): Array<{ artifact: RoomArtifact; distanceM: number }> {
  return room.artifacts
    .map((artifact) => ({ artifact, distanceM: distanceM(p, artifact.position) }))
    .sort((a, b) => a.distanceM - b.distanceM || a.artifact.id.localeCompare(b.artifact.id));
}

/**
 * Nearest artifact from an estimate. Deliberately conservative: a geometric
 * nearest point is never presented as a physical confirmation.
 */
export function nearestArtifact(
  room: RoomConfig,
  estimate: Pick<FusedEstimate, 'position' | 'accuracyM' | 'status'>,
  thresholdM: number = room.proximityThresholdM
): NearestArtifact {
  if (!estimate.position) {
    return { artifactId: null, distanceM: null, ambiguity: 'none', reason: 'no-position', runnersUp: [] };
  }
  const ranked = sortByDistance(room, estimate.position);
  const runnersUp = ranked.slice(1).map((r) => ({ artifactId: r.artifact.id, distanceM: round2(r.distanceM) }));
  if (ranked.length === 0) {
    return { artifactId: null, distanceM: null, ambiguity: 'none', reason: 'no-position', runnersUp };
  }
  const best = ranked[0];
  const second = ranked[1];
  if (best.distanceM > thresholdM) {
    return {
      artifactId: best.artifact.id,
      distanceM: round2(best.distanceM),
      ambiguity: 'none',
      reason: 'too-far',
      runnersUp
    };
  }
  if (second && Math.abs(second.distanceM - best.distanceM) < room.ambiguityMarginM) {
    return {
      artifactId: best.artifact.id,
      distanceM: round2(best.distanceM),
      ambiguity: 'ambiguous',
      reason: 'too-close',
      runnersUp
    };
  }
  if (estimate.status === 'uncertain' || estimate.status === 'unknown' || (estimate.accuracyM ?? 99) > thresholdM * 0.75) {
    return {
      artifactId: best.artifact.id,
      distanceM: round2(best.distanceM),
      ambiguity: 'ambiguous',
      reason: 'position-uncertain',
      runnersUp
    };
  }
  return {
    artifactId: best.artifact.id,
    distanceM: round2(best.distanceM),
    ambiguity: 'clear',
    reason: 'nearest',
    runnersUp
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface RoomValidation {
  ok: boolean;
  errors: string[];
}

/** Validates a pasted layout before it is used by the demo. */
export function validateRoom(value: unknown): RoomValidation {
  const errors: string[] = [];
  const r = value as Partial<RoomConfig> | null;
  if (!r || typeof r !== 'object') return { ok: false, errors: ['not-an-object'] };
  if (!(typeof r.widthM === 'number' && r.widthM >= 2 && r.widthM <= 60)) errors.push('width');
  if (!(typeof r.heightM === 'number' && r.heightM >= 2 && r.heightM <= 60)) errors.push('height');
  if (!(typeof r.gridStepM === 'number' && r.gridStepM > 0)) errors.push('grid');
  if (!(typeof r.proximityThresholdM === 'number' && r.proximityThresholdM > 0)) errors.push('threshold');
  if (!(typeof r.ambiguityMarginM === 'number' && r.ambiguityMarginM >= 0)) errors.push('ambiguity');
  if (!Array.isArray(r.devices) || r.devices.length < 3) errors.push('devices');
  if (!Array.isArray(r.artifacts) || r.artifacts.length < 1) errors.push('artifacts');
  if (!Array.isArray(r.obstacles)) errors.push('obstacles');
  if (errors.length) return { ok: false, errors };

  const room = r as RoomConfig;
  const seen = new Set<string>();
  for (const d of room.devices) {
    if (!d.id || seen.has(d.id)) errors.push(`device-id:${d.id ?? '?'}`);
    seen.add(d.id);
    if (d.kind !== 'wifi' && d.kind !== 'ble') errors.push(`device-kind:${d.id}`);
    if (!inBounds(room, d.position, 0.001)) errors.push(`device-bounds:${d.id}`);
    if (!(typeof d.rangeSigmaM === 'number' && d.rangeSigmaM > 0)) errors.push(`device-sigma:${d.id}`);
  }
  const artIds = new Set<string>();
  for (const a of room.artifacts) {
    if (!a.id || artIds.has(a.id)) errors.push(`artifact-id:${a.id ?? '?'}`);
    artIds.add(a.id);
    if (!inBounds(room, a.position, 0.001)) errors.push(`artifact-bounds:${a.id}`);
    if (!(typeof a.radiusM === 'number' && a.radiusM > 0)) errors.push(`artifact-radius:${a.id}`);
  }
  for (const o of room.obstacles) {
    if (!inBounds(room, { x: o.x, y: o.y }, 0.001)) errors.push(`obstacle-bounds:${o.id}`);
    if (!(o.widthM > 0 && o.heightM > 0)) errors.push(`obstacle-size:${o.id}`);
  }
  return { ok: errors.length === 0, errors };
}




