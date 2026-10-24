import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNav } from '../nav/NavProvider';
import { museumArtifactById } from '../data/museum';
import { applyReward, badgesFor, emptyLedger, type Badge, type RewardState } from './ledger';

const LEDGER_KEY = 'athar.rewards.ledger';
const PENDING_QUIET_KEY = 'athar.rewards.quiet';

interface RewardsContextValue {
  state: RewardState;
  badges: Badge[];
  /** A hall the visitor accepted a suggestion for; a scan there earns +15. */
  pendingQuietHalls: string[];
  noteQuietHall: (hallId: string) => void;
  completeRoute: (routeId: string) => void;
  reset: () => void;
}

const RewardsContext = createContext<RewardsContextValue | null>(null);

function readLedger(): RewardState {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return emptyLedger();
    const parsed = JSON.parse(raw) as RewardState;
    return { ...emptyLedger(), ...parsed };
  } catch {
    return emptyLedger();
  }
}

function readPending(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_QUIET_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Rewards stay on this device. The only inputs are real app events: a QR scan
 * confirmed by `useNav`, a finished plan, and an accepted quiet-hall suggestion.
 */
export function RewardsProvider({ children }: { children: React.ReactNode }) {
  const { lastQr } = useNav();
  const [state, setState] = useState<RewardState>(readLedger);
  const [pendingQuietHalls, setPendingQuietHalls] = useState<string[]>(readPending);
  const handledScanRef = useRef<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify(state));
    } catch {
      /* private mode: points live for the session only */
    }
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(PENDING_QUIET_KEY, JSON.stringify(pendingQuietHalls));
    } catch {
      /* ignore */
    }
  }, [pendingQuietHalls]);

  useEffect(() => {
    if (!lastQr?.ok || lastQr.at <= handledScanRef.current) return;
    handledScanRef.current = lastQr.at;
    if (lastQr.kind !== 'artifact' || !lastQr.artifactId) return;
    const artifact = museumArtifactById(lastQr.artifactId);
    if (!artifact) return;
    setState((current) =>
      applyReward(current, { type: 'artifact-scan', artifactId: artifact.id, hallId: artifact.hallId })
    );
    if (pendingQuietHalls.includes(artifact.hallId)) {
      setState((current) =>
        applyReward(current, {
          type: 'quiet-hall-scan',
          artifactId: artifact.id,
          hallId: artifact.hallId
        })
      );
      setPendingQuietHalls((halls) => halls.filter((hall) => hall !== artifact.hallId));
    }
  }, [lastQr, pendingQuietHalls]);

  const noteQuietHall = useCallback((hallId: string) => {
    setPendingQuietHalls((halls) => (halls.includes(hallId) ? halls : [...halls, hallId]));
  }, []);

  const completeRoute = useCallback((routeId: string) => {
    setState((current) => applyReward(current, { type: 'route-complete', routeId }));
  }, []);

  const reset = useCallback(() => {
    setState(emptyLedger());
    setPendingQuietHalls([]);
    handledScanRef.current = 0;
  }, []);

  const badges = useMemo(() => badgesFor(state), [state]);

  return (
    <RewardsContext.Provider value={{ state, badges, pendingQuietHalls, noteQuietHall, completeRoute, reset }}>
      {children}
    </RewardsContext.Provider>
  );
}

export function useRewards(): RewardsContextValue {
  const context = useContext(RewardsContext);
  if (!context) throw new Error('useRewards must be used inside RewardsProvider');
  return context;
}
