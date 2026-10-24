import { describe, expect, it } from 'vitest';
import { MUSEUM } from '../data/museum';
import { astar } from '../navigation/astar';
import { crowdEdgeCost } from '../crowd/edgeCost';
import { planVisit, planVisitBaseline, replan } from './planner';
import type { PlanInput } from './types';

const entrance = { x: MUSEUM.entrance.x, y: MUSEUM.entrance.y, floor: MUSEUM.entrance.floor };

const baseInput = (overrides: Partial<PlanInput> = {}): PlanInput => ({
  start: entrance,
  budgetMinutes: 90,
  interests: ['royal'],
  avoidStairs: false,
  speedMps: 1.0,
  ...overrides
});

describe('visit planner', () => {
  it('never plans more than the time budget', () => {
    for (const budget of [45, 90, 150]) {
      const plan = planVisit(baseInput({ budgetMinutes: budget }));
      expect(plan.totalMinutes).toBeLessThanOrEqual(budget + 0.01);
      expect(plan.walkMinutes + plan.dwellMinutes).toBeLessThanOrEqual(budget + 0.02);
      for (const stop of plan.stops) {
        expect(stop.cumulativeMinutes).toBeLessThanOrEqual(budget + 0.02);
      }
    }
  });

  it('keeps ETAs in order and counts up from the first walk', () => {
    const plan = planVisit(baseInput({ budgetMinutes: 150 }));
    expect(plan.stops.length).toBeGreaterThan(2);
    let previous = 0;
    for (const stop of plan.stops) {
      expect(stop.etaMinutes).toBeGreaterThanOrEqual(previous);
      expect(stop.etaMinutes).toBeLessThan(stop.cumulativeMinutes);
      previous = stop.cumulativeMinutes;
    }
  });

  it('respects avoidStairs and reports why an upstairs artifact was skipped', () => {
    const plan = planVisit(baseInput({ budgetMinutes: 150, avoidStairs: true }));
    expect(plan.stops.every((stop) => stop.floor === 'ground')).toBe(true);
    const upstairs = plan.skipped.find((skip) => skip.artifactId === 'hatshepsut-statue');
    expect(upstairs?.reason).toBe('stairs');
  });

  it('reaches the upper gallery when stairs are allowed', () => {
    const plan = planVisit(baseInput({ budgetMinutes: 240, avoidStairs: false, interests: ['sculpture'] }));
    expect(plan.stops.some((stop) => stop.artifactId === 'hatshepsut-statue')).toBe(true);
  });

  it('changes the order when the interest profile changes', () => {
    const royal = planVisit(baseInput({ interests: ['royal'], budgetMinutes: 150 }));
    const funerary = planVisit(baseInput({ interests: ['funerary'], budgetMinutes: 150 }));
    expect(funerary.stops.some((stop) => stop.artifactId === 'tut-mask' && stop.interestMatch)).toBe(true);
    expect(royal.stops.map((s) => s.artifactId).join('>')).not.toBe(
      funerary.stops.map((s) => s.artifactId).join('>')
    );
    expect(planVisit(baseInput({ interests: ['royal'] })).stops[0].value).toBeGreaterThan(0);
  });

  it('is deterministic for the same input', () => {
    const a = planVisit(baseInput());
    const b = planVisit(baseInput());
    expect(a.stops.map((s) => s.artifactId)).toEqual(b.stops.map((s) => s.artifactId));
    expect(a.totalMinutes).toBe(b.totalMinutes);
  });

  it('reports a measured compute time and a value-only baseline', () => {
    const plan = planVisit(baseInput({ budgetMinutes: 150 }));
    expect(plan.computeMs).toBeGreaterThanOrEqual(0);
    expect(plan.baselineStops).toBeGreaterThan(0);
    expect(plan.baselineValue).toBeGreaterThan(0);
    /* 2-opt never lowers value: it only reorders the same stops. */
    expect(plan.value).toBeGreaterThanOrEqual(plan.baselineValue - 1e-9);
  });

  it('drops the lowest-value remaining stop when the visitor is behind', () => {
    const input = baseInput({ budgetMinutes: 150 });
    const plan = planVisit(input);
    expect(plan.stops.length).toBeGreaterThan(2);

    const behind = replan(plan, input, { completed: [], elapsedMinutes: 130, reason: 'behind' });
    expect(behind.stops.length).toBeLessThan(plan.stops.length);
    expect(behind.totalMinutes).toBeLessThanOrEqual(50 + 0.02);

    const removed = plan.stops.filter((stop) => !behind.stops.some((s) => s.artifactId === stop.artifactId));
    expect(removed.length).toBeGreaterThan(0);
    /* The lowest-value stop is always the first to go. */
    const minValue = Math.min(...plan.stops.map((stop) => stop.value));
    expect(removed.some((stop) => Math.abs(stop.value - minValue) < 1e-6)).toBe(true);
  });

  it('drops completed stops and adds a requested stop inside the budget', () => {
    const input = baseInput({ budgetMinutes: 150 });
    const plan = planVisit(input);
    const first = plan.stops[0];
    const next = replan(plan, input, { completed: [first.artifactId], elapsedMinutes: 0, reason: 'behind' });
    expect(next.stops.some((stop) => stop.artifactId === first.artifactId)).toBe(false);
    expect(next.totalMinutes).toBeLessThanOrEqual(input.budgetMinutes + 0.02);
  });

  it('offers a value-only baseline that can be compared with the ratio plan', () => {
    const input = baseInput({ budgetMinutes: 90 });
    const baseline = planVisitBaseline(input);
    const plan = planVisit(input);
    expect(baseline.stops.length).toBeGreaterThan(0);
    expect(baseline.totalMinutes).toBeLessThanOrEqual(input.budgetMinutes + 0.02);
    expect(plan.stops.length).toBeGreaterThan(0);
  });
});

describe('crowd-aware edge cost', () => {
  const graph = MUSEUM.graph;

  it('leaves every edge unchanged when all halls are quiet', () => {
    const levels = Object.fromEntries(MUSEUM.halls.map((hall) => [hall.id, 0 as const]));
    const cost = crowdEdgeCost(graph, levels, 0.5);
    for (const edge of graph.edges) {
      expect(cost({ from: edge.from, to: edge.to, weightM: edge.weightM })).toBeCloseTo(edge.weightM, 9);
    }
  });

  it('multiplies an edge by 1 + alpha * tier of the hall it enters', () => {
    const levels = { 'hall-b': 2 as const };
    const cost = crowdEdgeCost(graph, levels, 0.5);
    const node = graph.nodes.find((n) => n.hallId === 'hall-b');
    const edge = graph.edges.find((e) => e.to === node?.id || e.from === node?.id);
    expect(edge).toBeDefined();
    const entering = graph.edges.find((e) => e.to === node?.id);
    if (entering) expect(cost({ from: entering.from, to: entering.to, weightM: entering.weightM })).toBeCloseTo(entering.weightM * 2, 9);
  });

  it('picks the longer quiet path when the short one is crowded', () => {
    /* Synthetic graph: two parallel corridors, the short one through a busy hall. */
    const synthetic = {
      nodes: [
        { id: 's', x: 0, y: 0, floor: 'ground' as const, hallId: 'quiet' },
        { id: 'a1', x: 5, y: 0, floor: 'ground' as const, hallId: 'busy' },
        { id: 'a2', x: 10, y: 0, floor: 'ground' as const, hallId: 'busy' },
        { id: 'b1', x: 5, y: 8, floor: 'ground' as const, hallId: 'quiet' },
        { id: 'b2', x: 10, y: 8, floor: 'ground' as const, hallId: 'quiet' },
        { id: 't', x: 10, y: 0, floor: 'ground' as const, hallId: 'quiet' }
      ],
      edges: [
        { id: 'e1', from: 's', to: 'a1', hasStairs: false, weightM: 5 },
        { id: 'e2', from: 'a1', to: 'a2', hasStairs: false, weightM: 5 },
        { id: 'e3', from: 'a2', to: 't', hasStairs: false, weightM: 0.1 },
        { id: 'e4', from: 's', to: 'b1', hasStairs: false, weightM: 9.5 },
        { id: 'e5', from: 'b1', to: 'b2', hasStairs: false, weightM: 5 },
        { id: 'e6', from: 'b2', to: 't', hasStairs: false, weightM: 9 }
      ]
    };
    const plain = astar(synthetic, 's', 't');
    expect(plain?.path).toEqual(['s', 'a1', 'a2', 't']);

    const busy = astar(synthetic, 's', 't', {
      /* tier 2 with alpha 1.5 multiplies the busy edges by 4. */
      edgeCostM: crowdEdgeCost(synthetic, { busy: 2 }, 1.5)
    });
    expect(busy?.path).not.toContain('a1');
    expect(busy?.path).toEqual(expect.arrayContaining(['s', 'b1', 'b2', 't']));
  });
});
