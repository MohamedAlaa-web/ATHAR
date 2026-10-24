import raw from './museum.json';

export type FloorId = 'ground' | 'upper';
export type UiLang = 'ar' | 'en';

export interface Localized {
  ar: string;
  en: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Hall {
  id: string;
  /** Printed QR identifier, accepted by `qrTarget` alongside artifacts. */
  qrId: string;
  name: Localized;
  short: Localized;
  floor: FloorId;
  labelAt: { x: number; y: number };
  description: Localized;
  rects: Rect[];
  /** Placeholder visitor capacity used by the simulated crowd model. */
  capacity?: number;
}

export type ArtifactCategory = 'royal' | 'funerary' | 'sculpture';

export interface MuseumArtifact {
  id: string;
  name: Localized;
  short: Localized;
  description: Localized;
  hallId: string;
  floor: FloorId;
  category: ArtifactCategory;
  x: number;
  y: number;
  qrId: string;
  /** Placeholder planner metadata (see `placeholder: true` on each artifact). */
  tags?: string[];
  importance?: number;
  dwellMinutes?: number;
  placeholder?: boolean;
}

export interface Beacon {
  id: string;
  label: string;
  floor: FloorId;
  x: number;
  y: number;
  txPower: number;
  pathLoss: number;
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  floor: FloorId;
  hallId: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  hasStairs: boolean;
  /** Walk cost in metres; stairs add a penalty so A* favours level routes. */
  weightM: number;
}

export interface MuseumGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface MuseumPathPoint {
  x: number;
  y: number;
  floor: FloorId;
}

export interface DemoPath {
  id: string;
  name: Localized;
  points: MuseumPathPoint[];
}

export interface MuseumData {
  meta: {
    id: string;
    name: Localized;
    note: Localized;
    placeholder: true;
    unit: 'metres';
    widthM: number;
    heightM: number;
  };
  entrance: { floor: FloorId; x: number; y: number; qrId: string; label: Localized };
  halls: Hall[];
  artifacts: MuseumArtifact[];
  beacons: Beacon[];
  obstacles: Array<{ id: string; label: Localized; x: number; y: number; w: number; h: number }>;
  graph: MuseumGraph;
  paths: DemoPath[];
}

interface RawMuseumData {
  meta: MuseumData['meta'];
  entrance: MuseumData['entrance'];
  halls: Hall[];
  artifacts: MuseumArtifact[];
  beacons: Beacon[];
  obstacles: MuseumData['obstacles'];
  graph: { nodes: GraphNode[]; edges: Array<{ from: string; to: string; hasStairs?: boolean }> };
  paths: DemoPath[];
}

const rawData = raw as unknown as RawMuseumData;

export const MUSEUM: MuseumData = {
  ...rawData,
  graph: {
    nodes: rawData.graph.nodes,
    edges: rawData.graph.edges.map((edge, index) => {
      const from = rawData.graph.nodes.find((n) => n.id === edge.from);
      const to = rawData.graph.nodes.find((n) => n.id === edge.to);
      const horizontal = from && to ? Math.hypot(from.x - to.x, from.y - to.y) : 0;
      const hasStairs = edge.hasStairs === true;
      return {
        id: `e${index + 1}-${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        hasStairs,
        weightM: Math.round((horizontal + (hasStairs ? 3 : 0)) * 100) / 100
      };
    })
  }
};

export const MUSEUM_WIDTH_M = MUSEUM.meta.widthM;
export const MUSEUM_HEIGHT_M = MUSEUM.meta.heightM;
export const PLACEHOLDER_NOTE = MUSEUM.meta.note;

export const CATEGORIES: Array<{ id: ArtifactCategory; label: Localized; glyph: string }> = [
  { id: 'royal', label: { ar: 'ملكي', en: 'Royal' }, glyph: '𓋹' },
  { id: 'funerary', label: { ar: 'جنائزي', en: 'Funerary' }, glyph: '𓂀' },
  { id: 'sculpture', label: { ar: 'نحت', en: 'Sculpture' }, glyph: '𓀭' }
];

export const FLOORS: Array<{ id: FloorId; label: Localized }> = [
  { id: 'ground', label: { ar: 'الطابق الأرضي', en: 'Ground floor' } },
  { id: 'upper', label: { ar: 'المعرض العلوي', en: 'Upper gallery' } }
];

export const museumArtifactById = (id: string): MuseumArtifact | undefined =>
  MUSEUM.artifacts.find((a) => a.id === id);

export const hallById = (id: string): Hall | undefined => MUSEUM.halls.find((h) => h.id === id);

export const beaconById = (id: string): Beacon | undefined => MUSEUM.beacons.find((b) => b.id === id);

export const artifactsInHall = (hallId: string): MuseumArtifact[] =>
  MUSEUM.artifacts.filter((a) => a.hallId === hallId);

export const categoryLabel = (category: ArtifactCategory, lang: UiLang): string =>
  CATEGORIES.find((c) => c.id === category)?.label[lang] ?? category;

export const floorLabel = (floor: FloorId, lang: UiLang): string =>
  FLOORS.find((f) => f.id === floor)?.label[lang] ?? floor;

export function walkableRects(floor: FloorId): Rect[] {
  return MUSEUM.halls.filter((h) => h.floor === floor).flatMap((h) => h.rects);
}

export function pointInRect(p: { x: number; y: number }, r: Rect, epsilon = 0): boolean {
  return (
    p.x >= r.x - epsilon &&
    p.y >= r.y - epsilon &&
    p.x <= r.x + r.w + epsilon &&
    p.y <= r.y + r.h + epsilon
  );
}

export function isWalkable(p: { x: number; y: number }, floor: FloorId): boolean {
  return walkableRects(floor).some((r) => pointInRect(p, r));
}

export function hallAt(p: { x: number; y: number }, floor: FloorId): Hall | null {
  const halls = MUSEUM.halls.filter((h) => h.floor === floor);
  const exact = halls.find((h) => h.rects.some((r) => pointInRect(p, r)));
  if (exact) return exact;
  let best: { hall: Hall; d: number } | null = null;
  for (const hall of halls) {
    for (const rect of hall.rects) {
      const cx = Math.min(rect.x + rect.w, Math.max(rect.x, p.x));
      const cy = Math.min(rect.y + rect.h, Math.max(rect.y, p.y));
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (!best || d < best.d) best = { hall, d };
    }
  }
  return best?.hall ?? null;
}

export type QrTarget =
  | { kind: 'artifact'; artifact: MuseumArtifact }
  | { kind: 'entrance' }
  | { kind: 'hall'; hall: Hall };

/** Distances and QR codes are demo identifiers. */
export function qrTarget(raw: string): QrTarget | null {
  let value = raw.trim();
  if (!value) return null;
  const prefixed = value.match(/^(?:ATHAR|أثر)\s*:\s*(.+)$/i);
  if (prefixed) value = prefixed[1].trim();
  const normalized = value
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^#?\//, '')
    .replace(/\?.*$/, '')
    .replace(/\/$/, '');

  if (value.toUpperCase() === MUSEUM.entrance.qrId.toUpperCase()) return { kind: 'entrance' };
  const direct = MUSEUM.artifacts.find((a) => a.qrId.toUpperCase() === value.toUpperCase());
  if (direct) return { kind: 'artifact', artifact: direct };
  const directHall = MUSEUM.halls.find((h) => h.qrId.toUpperCase() === value.toUpperCase());
  if (directHall) return { kind: 'hall', hall: directHall };
  const byId = value.split('/').pop();
  const artifact = MUSEUM.artifacts.find(
    (a) => a.id === byId || a.qrId.toUpperCase() === byId?.toUpperCase()
  );
  if (artifact) return { kind: 'artifact', artifact };
  const hall = MUSEUM.halls.find(
    (h) => h.id === byId || h.qrId.toUpperCase() === byId?.toUpperCase()
  );
  if (hall) return { kind: 'hall', hall };
  if (/^(gem-)?entrance$/i.test(normalized)) return { kind: 'entrance' };
  return null;
}

export interface MuseumValidation {
  ok: boolean;
  errors: string[];
}

/** Structural checks used by tests and by the admin editor before applying a change. */
export function validateMuseum(data: MuseumData = MUSEUM): MuseumValidation {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const artifact of data.artifacts) {
    if (ids.has(artifact.id)) errors.push(`duplicate-artifact:${artifact.id}`);
    ids.add(artifact.id);
    const hall = data.halls.find((h) => h.id === artifact.hallId);
    if (!hall) errors.push(`missing-hall:${artifact.id}`);
    if (hall && hall.floor !== artifact.floor) errors.push(`floor-mismatch:${artifact.id}`);
    if (hall && !hall.rects.some((r) => pointInRect(artifact, r))) errors.push(`outside-walkable:${artifact.id}`);
    if (!artifact.qrId) errors.push(`missing-qr:${artifact.id}`);
    if (!artifact.name.ar || !artifact.name.en) errors.push(`missing-name:${artifact.id}`);
  }
  const qrIds = new Set(data.artifacts.map((a) => a.qrId.toUpperCase()));
  if (qrIds.size !== data.artifacts.length) errors.push('duplicate-qr');
  if (data.beacons.length < 8 || data.beacons.length > 10) errors.push('beacon-count');
  if (new Set(data.beacons.map((b) => b.id)).size !== data.beacons.length) errors.push('duplicate-beacon');
  const groundHalls = data.halls.filter((h) => h.floor === 'ground');
  if (groundHalls.length < 3) errors.push('hall-count');
  const nodes = new Map(data.graph.nodes.map((n) => [n.id, n]));
  for (const edge of data.graph.edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) errors.push(`edge-node:${edge.from}-${edge.to}`);
  }
  for (const edge of data.graph.edges) {
    const a = nodes.get(edge.from);
    const b = nodes.get(edge.to);
    if (a && b && a.floor === b.floor) {
      // Same-floor edges must stay inside walkable areas; the stair edge is the
      // only edge allowed to change floor.
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const p = { x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps };
        if (!isWalkable(p, a.floor)) {
          errors.push(`edge-through-wall:${edge.from}-${edge.to}`);
          break;
        }
      }
    }
  }
  for (const path of data.paths) {
    for (const p of path.points) {
      if (!isWalkable(p, p.floor)) errors.push(`path-outside:${path.id}`);
    }
  }
  return { ok: errors.length === 0, errors };
}
