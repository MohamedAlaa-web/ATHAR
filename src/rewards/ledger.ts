/**
 * Rewards — a local ledger, nothing else.
 *
 * No account, no server, no network. State lives in localStorage on this
 * device and can be reset from the rewards screen.
 *
 * Known limitation (also recorded in DEVIATIONS.md): a QR code can be
 * photographed and shared, so a scan is proof of intent, not proof of presence.
 * Points are therefore small, capped, and never a currency.
 */
export const REWARD_POINTS = {
  artifactScan: 10,
  routeComplete: 50,
  quietHallVisit: 15
} as const;

/** A day cannot award more than this, whatever combination of events occurs. */
export const DAILY_CAP = 200;

export type RewardEvent =
  | { type: 'artifact-scan'; artifactId: string; hallId: string | null }
  | { type: 'route-complete'; routeId: string }
  | { type: 'quiet-hall-scan'; artifactId: string; hallId: string };

export interface RewardEntry {
  at: number;
  kind: RewardEvent['type'];
  points: number;
  reference: string;
}

export interface RewardState {
  /** Local calendar day, so the cap resets at midnight device time. */
  dayKey: string;
  todayPoints: number;
  totalPoints: number;
  scannedArtifacts: string[];
  completedRoutes: string[];
  quietHallScans: string[];
  history: RewardEntry[];
}

export function emptyLedger(now = new Date()): RewardState {
  return {
    dayKey: dayKey(now),
    todayPoints: 0,
    totalPoints: 0,
    scannedArtifacts: [],
    completedRoutes: [],
    quietHallScans: [],
    history: []
  };
}

export function dayKey(now: Date): string {
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function withDay(state: RewardState, now: Date): RewardState {
  const key = dayKey(now);
  return key === state.dayKey ? state : { ...state, dayKey: key, todayPoints: 0 };
}

/** Apply one event, capped. Unknown or repeated events award nothing. */
export function applyReward(state: RewardState, event: RewardEvent, now = new Date()): RewardState {
  const current = withDay(state, now);
  let base = 0;
  let reference = '';
  let next = current;

  switch (event.type) {
    case 'artifact-scan': {
      if (current.scannedArtifacts.includes(event.artifactId)) return current;
      base = REWARD_POINTS.artifactScan;
      reference = event.artifactId;
      next = { ...current, scannedArtifacts: [...current.scannedArtifacts, event.artifactId] };
      break;
    }
    case 'route-complete': {
      if (current.completedRoutes.includes(event.routeId)) return current;
      base = REWARD_POINTS.routeComplete;
      reference = event.routeId;
      next = { ...current, completedRoutes: [...current.completedRoutes, event.routeId] };
      break;
    }
    case 'quiet-hall-scan': {
      if (current.quietHallScans.includes(event.hallId)) return current;
      base = REWARD_POINTS.quietHallVisit;
      reference = event.hallId;
      next = { ...current, quietHallScans: [...current.quietHallScans, event.hallId] };
      break;
    }
  }

  const allowance = Math.max(0, DAILY_CAP - current.todayPoints);
  const points = Math.min(base, allowance);
  /* A duplicate still marks the artifact as visited, even at 0 points. */
  return {
    ...next,
    todayPoints: current.todayPoints + points,
    totalPoints: current.totalPoints + points,
    history: [...next.history, { at: now.getTime(), kind: event.type, points, reference }].slice(-60)
  };
}

export const SCAN_EVENT_KEY = 'athar.rewards.scan';
export const ROUTE_EVENT_KEY = 'athar.rewards.route';

export interface Badge {
  id: string;
  threshold: number;
  earned: boolean;
  label: { ar: string; en: string };
  detail: { ar: string; en: string };
}

export function badgesFor(state: RewardState): Badge[] {
  const artifacts = state.scannedArtifacts.length;
  const quiet = state.quietHallScans.length;
  return [
    {
      id: 'first-artifact',
      threshold: 1,
      earned: artifacts >= 1,
      label: { ar: 'أول أثر', en: 'First artifact' },
      detail: { ar: 'امسح رمز قطعة واحدة.', en: 'Scan one artifact.' }
    },
    {
      id: 'five-artifacts',
      threshold: 5,
      earned: artifacts >= 5,
      label: { ar: 'خمس قطع', en: 'Five artifacts' },
      detail: { ar: 'امسح رموز خمس قطع مختلفة.', en: 'Scan five different artifacts.' }
    },
    {
      id: 'whole-museum',
      threshold: 10,
      earned: artifacts >= 10,
      label: { ar: 'المتحف كاملًا', en: 'Whole museum' },
      detail: { ar: 'امسح رموز القطع العشر.', en: 'Scan all ten artifacts.' }
    },
    {
      id: 'themed-route',
      threshold: 1,
      earned: state.completedRoutes.length >= 1,
      label: { ar: 'جولة كاملة', en: 'Completed route' },
      detail: { ar: 'أكمل جولة مقترحة.', en: 'Finish a planned visit.' }
    },
    {
      id: 'quiet-visitor',
      threshold: 1,
      earned: quiet >= 1,
      label: { ar: 'زيارة هادئة', en: 'Quiet visit' },
      detail: { ar: 'امسح رمزًا في قاعة اقترحها التطبيق لهدوئها.', en: 'Scan inside a hall the app suggested for being quiet.' }
    },
    {
      id: 'hundred-points',
      threshold: 100,
      earned: state.totalPoints >= 100,
      label: { ar: 'مئة نقطة', en: '100 points' },
      detail: { ar: 'اجمع ١٠٠ نقطة.', en: 'Collect 100 points.' }
    }
  ];
}
