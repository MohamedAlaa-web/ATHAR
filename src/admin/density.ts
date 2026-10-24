import { MUSEUM } from '../data/museum';
import { makeRng } from '../positioning/core/simulation';

export interface HallDensity {
  hallId: string;
  count: number;
  capacity: number;
  pct: number;
  closed: boolean;
}

const CAPACITY: Record<string, number> = {
  'hall-a': 90,
  corridor: 45,
  'hall-b': 75,
  'hall-c': 60,
  stair: 20,
  'upper-hall': 35
};

/** Five-minute anonymous bucket; counts change over time but never identify anyone. */
export function densityBucket(now = Date.now()): number {
  return Math.floor(now / (5 * 60 * 1000));
}

/**
 * Synthesized occupancy for the operations demo. No cameras, no phone data,
 * no identities: it is a seeded number generator, and the UI says so.
 */
export function simulatedHallDensity(now = Date.now(), closedHalls: string[] = []): HallDensity[] {
  const bucket = densityBucket(now);
  const hour = new Date(now).getHours();
  const peak = hour >= 10 && hour <= 17 ? 1 : 0.45;
  return MUSEUM.halls.map((hall) => {
    const capacity = CAPACITY[hall.id] ?? 30;
    const rng = makeRng((bucket * 2654435761 + hall.id.length * 97) >>> 0);
    const base = capacity * (0.2 + rng() * 0.55) * peak;
    const closed = closedHalls.includes(hall.id);
    const count = closed ? 0 : Math.round(base);
    return {
      hallId: hall.id,
      count,
      capacity,
      pct: Math.round((count / capacity) * 100),
      closed
    };
  });
}

export function totalSimulatedVisitors(density: HallDensity[]): number {
  return density.reduce((sum, hall) => sum + hall.count, 0);
}
