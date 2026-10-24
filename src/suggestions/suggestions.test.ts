import { describe, expect, it } from 'vitest';
import { evaluateSuggestion, type SuggestionInput } from './rules';

const base = (overrides: Partial<SuggestionInput> = {}): SuggestionInput => ({
  nextHallId: 'hall-b',
  targetTags: ['funerary'],
  levels: { 'hall-b': 2, 'hall-c': 0 },
  alternatives: [
    { artifactId: 'ramesses-statue', hallId: 'hall-c', tags: ['funerary'], extraMinutes: 2.4 }
  ],
  nowMs: 1_000_000,
  lastSuggestionAt: null,
  dismissedHalls: [],
  ...overrides
});

describe('suggestion rules', () => {
  it('offers the alternative when every condition holds', () => {
    const result = evaluateSuggestion(base());
    expect(result).toEqual({ artifactId: 'ramesses-statue', hallId: 'hall-c', extraMinutes: 2.4 });
  });

  it('stays silent when the next hall is not crowded', () => {
    expect(evaluateSuggestion(base({ levels: { 'hall-b': 1, 'hall-c': 0 } }))).toBeNull();
  });

  it('stays silent when no same-tag alternative exists in a quiet hall', () => {
    expect(
      evaluateSuggestion(
        base({
          alternatives: [
            { artifactId: 'x', hallId: 'hall-c', tags: ['royal'], extraMinutes: 1 }
          ]
        })
      )
    ).toBeNull();
  });

  it('stays silent when the alternative hall is not quiet', () => {
    expect(evaluateSuggestion(base({ levels: { 'hall-b': 2, 'hall-c': 1 } }))).toBeNull();
  });

  it('stays silent when the detour is 3 minutes or more', () => {
    expect(
      evaluateSuggestion(
        base({
          alternatives: [
            { artifactId: 'ramesses-statue', hallId: 'hall-c', tags: ['funerary'], extraMinutes: 3 }
          ]
        })
      )
    ).toBeNull();
  });

  it('honours the ten-minute cooldown', () => {
    expect(evaluateSuggestion(base({ lastSuggestionAt: 1_000_000 - 9 * 60_000 }))).toBeNull();
    expect(evaluateSuggestion(base({ lastSuggestionAt: 1_000_000 - 10 * 60_000 }))).not.toBeNull();
  });

  it('remembers a dismissal for that hall', () => {
    expect(evaluateSuggestion(base({ dismissedHalls: ['hall-b'] }))).toBeNull();
  });

  it('picks the cheapest detour among alternatives', () => {
    const result = evaluateSuggestion(
      base({
        alternatives: [
          { artifactId: 'far', hallId: 'hall-c', tags: ['funerary'], extraMinutes: 2.9 },
          { artifactId: 'near', hallId: 'hall-c', tags: ['funerary'], extraMinutes: 0.8 }
        ]
      })
    );
    expect(result?.artifactId).toBe('near');
  });
});
