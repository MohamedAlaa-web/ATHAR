import { describe, expect, it } from 'vitest';
import { runCrowdRoutingEvaluation, runPlannerEvaluation } from './smartVisit';

describe('smart visit evaluation', () => {
  it('reports nine planner rows, all inside their budget', () => {
    const result = runPlannerEvaluation();
    expect(result.rows).toHaveLength(9);
    expect(result.allWithinBudget).toBe(true);
    for (const row of result.rows) {
      expect(row.plannedMinutes).toBeLessThanOrEqual(row.budgetMinutes + 0.01);
      expect(Number.isFinite(row.computeMs)).toBe(true);
      expect(row.computeMs).toBeGreaterThanOrEqual(0);
      expect(row.value).toBeGreaterThan(0);
    }
  });

  it('measures ten crowd routes with finite lengths and exposures', () => {
    const result = runCrowdRoutingEvaluation();
    expect(result.runs).toBe(10);
    expect(result.rows).toHaveLength(10);
    for (const row of result.rows) {
      expect(row.plainLengthM).toBeGreaterThan(0);
      expect(row.crowdLengthM).toBeGreaterThan(0);
      expect(row.plainExposure).toBeGreaterThanOrEqual(0);
      expect(row.crowdExposure).toBeGreaterThanOrEqual(0);
    }
  });
});
