import { describe, expect, it } from 'vitest';
import { MUSEUM } from '../data/museum';
import { astar } from './astar';
import { buildInstructions, classifyTurn, formatInstruction } from './instructions';
import { buildInstructions as generate } from './instructions';
import { computeRoute } from './route';
import { distanceToRouteM, routeProgress } from './geometry';
import type { RoutePoint } from './types';

const entrance = { x: 11, y: 3, floor: 'ground' as const };
const hatshepsut = { x: 40, y: 18, floor: 'upper' as const };

describe('A* routing', () => {
  it('finds a path from the entrance to the far sculpture court', () => {
    const result = astar(MUSEUM.graph, 'entrance', 'c4');
    expect(result).not.toBeNull();
    expect(result!.path[0]).toBe('entrance');
    expect(result!.path[result!.path.length - 1]).toBe('c4');
    expect(result!.costM).toBeGreaterThan(30);
    expect(result!.visited).toBeGreaterThan(3);
  });

  it('honours the accessible no-stairs option', () => {
    expect(astar(MUSEUM.graph, 'entrance', 'u-hat')).not.toBeNull();
    expect(astar(MUSEUM.graph, 'entrance', 'u-hat', { avoidStairs: true })).toBeNull();
  });

  it('removes closed halls from the graph', () => {
    expect(astar(MUSEUM.graph, 'entrance', 'c4', { closedHalls: new Set(['corridor']) })).toBeNull();
    expect(astar(MUSEUM.graph, 'entrance', 'c4', { closedHalls: new Set(['hall-a']) })).toBeNull();
  });
});

describe('route computation', () => {
  it('produces a cross-floor route with a stairs instruction', () => {
    const route = computeRoute(entrance, hatshepsut, { targetHallId: 'upper-hall' });
    expect(route.ok).toBe(true);
    expect(route.reason).toBeNull();
    expect(route.floors).toEqual(['ground', 'upper']);
    expect(route.points.length).toBeGreaterThan(5);
    expect(route.totalDistanceM).toBeGreaterThan(25);
    expect(route.instructions.some((i) => i.kind === 'stairs-up')).toBe(true);
    expect(route.instructions[route.instructions.length - 1].kind).toBe('arrive');
    expect(route.computeMs).toBeGreaterThanOrEqual(0);
  });

  it('reports stairs-only instead of inventing an accessible route', () => {
    const route = computeRoute(entrance, hatshepsut, { avoidStairs: true, targetHallId: 'upper-hall' });
    expect(route.ok).toBe(false);
    expect(route.reason).toBe('stairs-only');
  });

  it('rejects a target in a closed hall and a start in a closed hall', () => {
    const closedTarget = computeRoute(entrance, { x: 54, y: 22, floor: 'ground' }, {
      targetHallId: 'hall-c',
      closedHalls: ['hall-c']
    });
    expect(closedTarget.reason).toBe('target-closed');
    const closedStart = computeRoute(entrance, hatshepsut, {
      fromHallId: 'hall-a',
      closedHalls: ['hall-a'],
      targetHallId: 'upper-hall'
    });
    expect(closedStart.reason).toBe('no-start');
  });

  it('reroutes around a closed corridor or fails honestly', () => {
    const route = computeRoute(entrance, { x: 48, y: 8, floor: 'ground' }, {
      targetHallId: 'hall-c',
      closedHalls: ['corridor']
    });
    expect(route.ok).toBe(false);
    expect(route.reason).toBe('closed');
  });

  it('recomputes well under the 100 ms target', () => {
    const samples: number[] = [];
    for (let i = 0; i < 20; i++) {
      const route = computeRoute(entrance, { x: 54, y: 22, floor: 'ground' }, { targetHallId: 'hall-c' });
      samples.push(route.computeMs);
    }
    samples.sort((a, b) => a - b);
    expect(samples[Math.floor(samples.length / 2)]).toBeLessThan(100);
    expect(samples.every((s) => s < 100)).toBe(true);
  });
});

describe('turn-by-turn instructions', () => {
  it('emits a right turn and arrival with distances', () => {
    const points: RoutePoint[] = [
      { x: 0, y: 0, floor: 'ground' },
      { x: 0, y: 10, floor: 'ground' },
      { x: 10, y: 10, floor: 'ground' }
    ];
    const set = buildInstructions(points);
    const turn = set.instructions.find((i) => i.kind === 'right');
    expect(turn).toBeDefined();
    expect(turn!.distanceM).toBeCloseTo(10, 5);
    expect(set.totalDistanceM).toBeCloseTo(20, 5);
    expect(routeText(set.instructions, 8, 'en')).toBe('Turn right in 8 m');
    expect(routeText(set.instructions, 8, 'ar')).toContain('انعطف يمينًا');
    expect(routeText(set.instructions, 8, 'ar')).toContain('8 م');
  });

  it('detects left and u-turn angles', () => {
    expect(classifyTurn(80)).toBe('right');
    expect(classifyTurn(-80)).toBe('left');
    expect(classifyTurn(40)).toBe('slight-right');
    expect(classifyTurn(20)).toBeNull();
    expect(classifyTurn(170)).toBe('uturn');
  });

  it('adds a stairs instruction on a floor change', () => {
    const set = buildInstructions([
      { x: 34, y: 18, floor: 'ground' },
      { x: 34, y: 21, floor: 'ground' },
      { x: 34, y: 10, floor: 'upper' },
      { x: 40, y: 18, floor: 'upper' }
    ]);
    expect(set.instructions.some((i) => i.kind === 'stairs-up')).toBe(true);
    expect(set.instructions[set.instructions.length - 1].kind).toBe('arrive');
  });

  it('keeps straight routes free of fake turns', () => {
    const set = generate([
      { x: 0, y: 0, floor: 'ground' },
      { x: 0, y: 10, floor: 'ground' },
      { x: 0, y: 20, floor: 'ground' }
    ]);
    expect(set.instructions.map((i) => i.kind)).toEqual(['start', 'arrive']);
  });
});

describe('route progress and deviation', () => {
  const points: RoutePoint[] = [
    { x: 0, y: 0, floor: 'ground' },
    { x: 0, y: 10, floor: 'ground' },
    { x: 10, y: 10, floor: 'ground' }
  ];
  const [start, turn, arrive] = buildInstructions(points).instructions;

  it('measures deviation from the polyline', () => {
    expect(distanceToRouteM({ points }, { x: 0, y: 5, floor: 'ground' })).toBeCloseTo(0, 5);
    expect(distanceToRouteM({ points }, { x: 5, y: 5, floor: 'ground' })).toBeCloseTo(5, 5);
    expect(distanceToRouteM({ points }, { x: 0, y: 5, floor: 'upper' })).toBe(Number.POSITIVE_INFINITY);
  });

  it('reports the next maneuver and arrival', () => {
    const route = {
      ok: true,
      reason: null,
      request: {
        from: points[0],
        to: points[2],
        targetArtifactId: null,
        targetHallId: null,
        avoidStairs: false,
        closedHalls: []
      },
      points,
      instructions: [start, turn, arrive],
      totalDistanceM: 20,
      floors: ['ground' as const],
      computeMs: 0,
      maxDeviationM: 0
    };
    const progress = routeProgress(route, { x: 0, y: 2, floor: 'ground' }, 'en');
    expect(progress.arrived).toBe(false);
    expect(progress.instruction?.kind).toBe('right');
    expect(progress.distanceToManeuverM).toBeCloseTo(8, 5);

    const atEnd = routeProgress(route, { x: 10, y: 10, floor: 'ground' }, 'en');
    expect(atEnd.arrived).toBe(true);
    expect(atEnd.instruction?.kind).toBe('arrive');
  });
});

function routeText(
  instructions: ReturnType<typeof buildInstructions>['instructions'],
  distance: number,
  lang: 'ar' | 'en'
): string {
  const turn = instructions.find((i) => i.kind === 'right');
  if (!turn) throw new Error('missing turn');
  return formatInstruction(turn, distance, lang);
}
