import { describe, expect, it } from 'vitest';
import { DAILY_CAP, REWARD_POINTS, applyReward, badgesFor, emptyLedger, dayKey } from './ledger';

const day = new Date(2026, 9, 24, 10, 0, 0);
const nextDay = new Date(2026, 9, 25, 9, 0, 0);

describe('rewards ledger', () => {
  it('awards an artifact scan once', () => {
    let state = emptyLedger(day);
    state = applyReward(state, { type: 'artifact-scan', artifactId: 'tut-mask', hallId: 'hall-b' }, day);
    expect(state.totalPoints).toBe(REWARD_POINTS.artifactScan);
    expect(state.scannedArtifacts).toEqual(['tut-mask']);

    const again = applyReward(state, { type: 'artifact-scan', artifactId: 'tut-mask', hallId: 'hall-b' }, day);
    expect(again.totalPoints).toBe(REWARD_POINTS.artifactScan);
    expect(again.history).toHaveLength(1);
  });

  it('awards a themed route once', () => {
    let state = emptyLedger(day);
    state = applyReward(state, { type: 'route-complete', routeId: 'royal-90' }, day);
    state = applyReward(state, { type: 'route-complete', routeId: 'royal-90' }, day);
    expect(state.totalPoints).toBe(REWARD_POINTS.routeComplete);
  });

  it('awards a quiet-hall scan once per hall', () => {
    let state = emptyLedger(day);
    state = applyReward(state, { type: 'quiet-hall-scan', artifactId: 'a', hallId: 'hall-c' }, day);
    state = applyReward(state, { type: 'quiet-hall-scan', artifactId: 'b', hallId: 'hall-c' }, day);
    expect(state.totalPoints).toBe(REWARD_POINTS.quietHallVisit);
  });

  it('caps the day at 200 points but keeps the history', () => {
    let state = emptyLedger(day);
    for (let i = 0; i < 10; i++) {
      state = applyReward(state, { type: 'artifact-scan', artifactId: `artifact-${i}`, hallId: 'hall-a' }, day);
    }
    for (let i = 0; i < 4; i++) {
      state = applyReward(state, { type: 'route-complete', routeId: `route-${i}` }, day);
    }
    expect(state.todayPoints).toBe(DAILY_CAP);
    expect(state.totalPoints).toBe(DAILY_CAP);
    expect(state.history).toHaveLength(14);
    expect(state.history.filter((entry) => entry.points === 0).length).toBeGreaterThan(0);
  });

  it('resets the daily allowance on the next local day', () => {
    let state = emptyLedger(day);
    for (let i = 0; i < 10; i++) {
      state = applyReward(state, { type: 'artifact-scan', artifactId: `artifact-${i}`, hallId: 'hall-a' }, day);
    }
    state = applyReward(state, { type: 'route-complete', routeId: 'r1' }, day);
    expect(state.todayPoints).toBe(150);

    const tomorrow = applyReward(state, { type: 'route-complete', routeId: 'r2' }, nextDay);
    expect(tomorrow.dayKey).toBe(dayKey(nextDay));
    expect(tomorrow.todayPoints).toBe(REWARD_POINTS.routeComplete);
    expect(tomorrow.totalPoints).toBe(150 + REWARD_POINTS.routeComplete);
  });

  it('derives badges from real counts only', () => {
    let state = emptyLedger(day);
    expect(badgesFor(state).every((badge) => !badge.earned)).toBe(true);
    state = applyReward(state, { type: 'artifact-scan', artifactId: 'tut-mask', hallId: 'hall-b' }, day);
    state = applyReward(state, { type: 'quiet-hall-scan', artifactId: 'tut-mask', hallId: 'hall-b' }, day);
    const earned = badgesFor(state).filter((badge) => badge.earned).map((badge) => badge.id);
    expect(earned).toContain('first-artifact');
    expect(earned).toContain('quiet-visitor');
    expect(earned).not.toContain('five-artifacts');
  });
});
