import type { Localized, UiLang } from '../data/museum';
import { bearingBetween, turnAngle } from '../positioning/core/pdr';
import { floorRank } from './graph';
import type { InstructionKind, InstructionSet, RouteInstruction, RoutePoint } from './types';

export const INSTRUCTION_LABELS: Record<InstructionKind, Localized> = {
  start: { ar: 'ابدأ السير', en: 'Start walking' },
  left: { ar: 'انعطف يسارًا', en: 'Turn left' },
  right: { ar: 'انعطف يمينًا', en: 'Turn right' },
  'slight-left': { ar: 'انعطف قليلًا يسارًا', en: 'Bear left' },
  'slight-right': { ar: 'انعطف قليلًا يمينًا', en: 'Bear right' },
  uturn: { ar: 'استدر للخلف', en: 'Turn around' },
  'stairs-up': { ar: 'اصعد السلالم', en: 'Take the stairs up' },
  'stairs-down': { ar: 'انزل السلالم', en: 'Take the stairs down' },
  arrive: { ar: 'لقد وصلت', en: 'You have arrived' }
};

function stepDistance(a: RoutePoint, b: RoutePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y) + (a.floor === b.floor ? 0 : 3);
}

export function classifyTurn(deltaDeg: number): InstructionKind | null {
  const abs = Math.abs(deltaDeg);
  if (abs < 25) return null;
  if (abs < 60) return deltaDeg > 0 ? 'slight-right' : 'slight-left';
  if (abs < 135) return deltaDeg > 0 ? 'right' : 'left';
  return 'uturn';
}

/**
 * Converts a polyline + floor transitions into maneuvers. Straight stretches
 * are folded into the distance of the next maneuver, which is what a walker
 * needs ("turn right in 10 m"), not a running commentary.
 */
export function buildInstructions(points: RoutePoint[]): InstructionSet {
  if (points.length === 0) return { instructions: [], totalDistanceM: 0 };

  const instructions: RouteInstruction[] = [
    {
      kind: 'start',
      pathIndex: 0,
      distanceM: 0,
      turnDeg: null,
      at: points[0],
      label: INSTRUCTION_LABELS.start
    }
  ];
  let sinceManeuver = 0;
  let totalDistanceM = 0;

  for (let i = 1; i < points.length; i++) {
    const d = stepDistance(points[i - 1], points[i]);
    sinceManeuver += d;
    totalDistanceM += d;

    if (points[i].floor !== points[i - 1].floor) {
      const kind: InstructionKind =
        floorRank(points[i].floor) > floorRank(points[i - 1].floor) ? 'stairs-up' : 'stairs-down';
      instructions.push({
        kind,
        pathIndex: i,
        distanceM: sinceManeuver,
        turnDeg: null,
        at: points[i],
        label: INSTRUCTION_LABELS[kind]
      });
      sinceManeuver = 0;
      continue;
    }

    if (i === points.length - 1) break;

    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    if (next.floor !== cur.floor || prev.floor !== cur.floor) continue;

    const inbound = bearingBetween(prev, cur);
    const outbound = bearingBetween(cur, next);
    const delta = turnAngle(inbound, outbound);
    const kind = classifyTurn(delta);
    if (kind) {
      instructions.push({
        kind,
        pathIndex: i,
        distanceM: sinceManeuver,
        turnDeg: Math.round(delta * 10) / 10,
        at: cur,
        label: INSTRUCTION_LABELS[kind]
      });
      sinceManeuver = 0;
    }
  }

  const last = points[points.length - 1];
  if (instructions[instructions.length - 1]?.kind !== 'arrive') {
    instructions.push({
      kind: 'arrive',
      pathIndex: points.length - 1,
      distanceM: sinceManeuver,
      turnDeg: null,
      at: last,
      label: INSTRUCTION_LABELS.arrive
    });
  }

  return { instructions, totalDistanceM: Math.round(totalDistanceM * 10) / 10 };
}

/** Full sentence, localized, for the current banner. */
export function formatInstruction(
  instruction: RouteInstruction,
  remainingM: number,
  lang: UiLang
): string {
  const label = instruction.label[lang];
  if (instruction.kind === 'start') return label;
  const metres = Math.max(0, Math.round(remainingM));
  if (instruction.kind === 'arrive') {
    if (metres > 3) {
      return lang === 'ar'
        ? `تابع إلى القطعة بعد ${metres} م`
        : `Continue to the artifact for ${metres} m`;
    }
    return label;
  }
  if (metres <= 1) return lang === 'ar' ? `${label} الآن` : `${label} now`;
  return lang === 'ar' ? `${label} بعد ${metres} م` : `${label} in ${metres} m`;
}

export function nearestInstruction(
  instructions: RouteInstruction[],
  pathIndex: number
): RouteInstruction | null {
  return (
    instructions.find((i) => i.kind !== 'start' && i.kind !== 'arrive' && i.pathIndex >= pathIndex) ??
    instructions.find((i) => i.kind === 'arrive') ??
    null
  );
}
