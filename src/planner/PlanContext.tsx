import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { museumArtifactById } from '../data/museum';
import { useNav } from '../nav/NavProvider';
import { useRewards } from '../rewards/RewardsContext';
import { buildSuggestion } from '../suggestions/engine';
import type { Suggestion } from '../suggestions/rules';
import { planVisit, replan as replanPlan } from './planner';
import type { PlanInput, VisitPlan } from './types';

const DISMISSED_KEY = 'athar.plan.dismissedHalls';
const LAST_SUGGESTION_KEY = 'athar.plan.lastSuggestionAt';

interface PlanContextValue {
  input: PlanInput | null;
  plan: VisitPlan | null;
  running: boolean;
  activeIndex: number;
  completed: string[];
  /** Current stop being walked to, if the tour is running. */
  activeArtifactId: string | null;
  suggestion: Suggestion | null;
  startPlan: (input: PlanInput) => VisitPlan;
  beginTour: () => boolean;
  stopTour: () => void;
  reportBehind: () => VisitPlan | null;
  acceptSuggestion: () => void;
  dismissSuggestion: () => void;
  clearPlan: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/**
 * Runs a plan on top of the existing navigation: the first stop becomes the
 * navigation target, and each arrival advances to the next stop. No new
 * routing code — `navigateTo` is the same call the artifact page uses.
 */
export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { estimate, crowdLevels, settings, navigateTo, clearNavigation, arrived, targetId } = useNav();
  const { completeRoute, noteQuietHall } = useRewards();
  const [input, setInput] = useState<PlanInput | null>(null);
  const [plan, setPlan] = useState<VisitPlan | null>(null);
  const [running, setRunning] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [dismissedHalls, setDismissedHalls] = useState<string[]>(() => readJson(DISMISSED_KEY, []));
  const [lastSuggestionAt, setLastSuggestionAt] = useState<number | null>(() =>
    readJson<number | null>(LAST_SUGGESTION_KEY, null)
  );
  const tourStartedAtRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  const activeArtifactId = useMemo(
    () => (plan && running ? plan.stops[activeIndex]?.artifactId ?? null : null),
    [activeIndex, plan, running]
  );

  const startPlan = useCallback((nextInput: PlanInput) => {
    const next = planVisit(nextInput);
    setInput(nextInput);
    setPlan(next);
    setRunning(false);
    setActiveIndex(0);
    setCompleted([]);
    setSuggestion(null);
    tourStartedAtRef.current = null;
    return next;
  }, []);

  const beginTour = useCallback((): boolean => {
    if (!plan || plan.stops.length === 0) return false;
    const first = plan.stops[0];
    setRunning(true);
    setActiveIndex(0);
    setCompleted([]);
    tourStartedAtRef.current = Date.now();
    clearNavigation();
    navigateTo(first.artifactId);
    return true;
  }, [clearNavigation, navigateTo, plan]);

  const stopTour = useCallback(() => {
    setRunning(false);
    setSuggestion(null);
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    clearNavigation();
  }, [clearNavigation]);

  /* Advance on arrival — the only place a plan touches navigation state. */
  useEffect(() => {
    if (!running || !plan || !arrived || !targetId) return;
    if (plan.stops[activeIndex]?.artifactId !== targetId) return;

    setCompleted((current) =>
      current.includes(targetId) ? current : [...current, targetId]
    );
    setSuggestion(null);

    const nextStop = plan.stops[activeIndex + 1];
    if (nextStop) {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = window.setTimeout(() => {
        setActiveIndex((index) => index + 1);
        navigateTo(nextStop.artifactId);
      }, 900);
    } else {
      setRunning(false);
      completeRoute(plan.key);
    }
  }, [activeIndex, arrived, completeRoute, navigateTo, plan, running, targetId]);

  useEffect(
    () => () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    },
    []
  );

  /** Rebuild after falling behind, using the real elapsed time. */
  const reportBehind = useCallback((): VisitPlan | null => {
    if (!plan || !input || !tourStartedAtRef.current) return null;
    const elapsedMinutes = (Date.now() - tourStartedAtRef.current) / 60000;
    const next = replanPlan(plan, input, {
      completed,
      elapsedMinutes,
      current: estimate ? { x: estimate.x, y: estimate.y, floor: estimate.floor } : undefined,
      reason: 'behind'
    });
    setPlan(next);
    setActiveIndex(0);
    if (next.stops[0]) navigateTo(next.stops[0].artifactId);
    return next;
  }, [completed, estimate, input, navigateTo, plan]);

  /* Suggest a quieter alternative before starting a crowded stop. */
  useEffect(() => {
    if (!running || !plan) {
      setSuggestion(null);
      return;
    }
    const next = plan.stops[activeIndex];
    if (!next) return;
    const from = estimate
      ? { x: estimate.x, y: estimate.y, floor: estimate.floor }
      : input?.start;
    if (!from) return;
    const candidate = buildSuggestion({
      from,
      nextArtifactId: next.artifactId,
      levels: crowdLevels,
      nowMs: Date.now(),
      lastSuggestionAt,
      dismissedHalls,
      avoidStairs: settings.accessible,
      speedMps: input?.speedMps ?? 1
    });
    if (candidate) {
      setSuggestion(candidate);
      const at = Date.now();
      setLastSuggestionAt(at);
      writeJson(LAST_SUGGESTION_KEY, at);
    }
  }, [
    activeIndex,
    crowdLevels,
    dismissedHalls,
    estimate,
    input,
    lastSuggestionAt,
    plan,
    running,
    settings.accessible
  ]);

  const acceptSuggestion = useCallback(() => {
    if (!suggestion || !plan || !input) return;
    noteQuietHall(suggestion.hallId);
    const next = replanPlan(plan, input, {
      completed,
      elapsedMinutes: tourStartedAtRef.current ? (Date.now() - tourStartedAtRef.current) / 60000 : 0,
      addStop: suggestion.artifactId,
      reason: 'added-stop'
    });
    setPlan(next);
    setSuggestion(null);
    navigateTo(suggestion.artifactId);
    const index = next.stops.findIndex((stop) => stop.artifactId === suggestion.artifactId);
    if (index >= 0) setActiveIndex(index);
  }, [completed, input, navigateTo, noteQuietHall, plan, suggestion]);

  const dismissSuggestion = useCallback(() => {
    if (!suggestion) return;
    const next = [...new Set([...dismissedHalls, suggestion.hallId])];
    setDismissedHalls(next);
    writeJson(DISMISSED_KEY, next);
    setSuggestion(null);
  }, [dismissedHalls, suggestion]);

  const clearPlan = useCallback(() => {
    setPlan(null);
    setInput(null);
    setRunning(false);
    setCompleted([]);
    setActiveIndex(0);
    setSuggestion(null);
    tourStartedAtRef.current = null;
  }, []);

  return (
    <PlanContext.Provider
      value={{
        input,
        plan,
        running,
        activeIndex,
        completed,
        activeArtifactId,
        suggestion,
        startPlan,
        beginTour,
        stopTour,
        reportBehind,
        acceptSuggestion,
        dismissSuggestion,
        clearPlan
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) throw new Error('usePlan must be used inside PlanProvider');
  return context;
}

/** Re-exported so the plan screen does not import two planner modules. */
export { planVisit } from './planner';
export { museumArtifactById };
