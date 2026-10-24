import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CrowdLevel, FloorPosition, PositionEstimate, SensorStatus } from '../positioning/core/types';
import {
  MUSEUM,
  hallAt,
  isWalkable,
  museumArtifactById,
  type ArtifactCategory,
  type MuseumArtifact,
  type UiLang
} from '../data/museum';
import { PositioningEngine } from '../positioning/core/engine';
import { MUSEUM_ENGINE_MAP } from '../positioning/core/defaultMap';
import { computeRoute } from '../navigation/route';
import { freeWalkPath, routeFollowPath } from '../navigation/followPath';
import { routeProgress } from '../navigation/geometry';
import { progressText } from '../navigation/geometry';
import type { RouteFailure, RouteProgress, RouteResult } from '../navigation/types';
import { QrSource, ManualSource, MotionSource, SimulatedSource } from '../positioning/core/sources';
import type { MotionStep } from '../positioning/core/sources';
import { useLang } from '../i18n/LanguageContext';
import { SimulatedCrowdSource } from '../crowd/simulated';
import { DEFAULT_CROWD_ALPHA, type CrowdLevels } from '../crowd/types';

const SETTINGS_KEY = 'athar.nav.settings';
const RECENTS_KEY = 'athar.nav.recents';
const OVERRIDES_KEY = 'athar.nav.overrides';
const CLOSED_KEY = 'athar.nav.closed';
const ONBOARDED_KEY = 'athar.nav.onboarded';
const WALKER_KEY = 'athar.nav.walker';

export interface NavSettings {
  accessible: boolean;
  lowPower: boolean;
  crowd: CrowdLevel;
  /** Virtual walker pace in m/s (0.3–2). */
  walkSpeedMps: number;
  /** Crowd-aware routing: weight edges by the occupancy of the hall they enter. */
  avoidCrowded: boolean;
}

const DEFAULT_SETTINGS: NavSettings = {
  accessible: false,
  lowPower: false,
  crowd: 'low',
  walkSpeedMps: 1.1,
  avoidCrowded: false
};

const clampSpeed = (value: number): number =>
  Math.min(2, Math.max(0.3, Math.round((Number.isFinite(value) ? value : DEFAULT_SETTINGS.walkSpeedMps) * 10) / 10));

export type SourceMode = 'idle' | 'sim' | 'motion' | 'manual' | 'qr';
export type WalkerMode = 'free' | 'route';

export interface LastQr {
  raw: string;
  ok: boolean;
  kind: 'artifact' | 'entrance' | 'hall' | null;
  artifactId: string | null;
  hallId: string | null;
  at: number;
}

export interface SessionMetrics {
  startedAt: number;
  elapsedSec: number;
  samples: number;
  meanErrorM: number | null;
  medianErrorM: number | null;
  p95ErrorM: number | null;
  hallAccuracyPct: number | null;
  nearestArtifactAccuracyPct: number | null;
  updates: number;
  scans: number;
  pdrSteps: number;
  trilaterations: number;
  routeRecomputations: number;
  updateRateHz: number;
  sensorActivationsPerMin: number;
  cpuOpsPerMin: number;
  scanIntervalMs: number;
  lastReadingsUsed: number;
  lastRouteComputeMs: number | null;
}

interface Counters {
  startedAt: number;
  samples: Array<{ errorM: number; hallCorrect: boolean; nearestCorrect: boolean }>;
  updates: number;
  scans: number;
  pdrSteps: number;
  trilaterations: number;
  routeRecomputations: number;
  lastRouteComputeMs: number | null;
}

const freshCounters = (): Counters => ({
  startedAt: 0,
  samples: [],
  updates: 0,
  scans: 0,
  pdrSteps: 0,
  trilaterations: 0,
  routeRecomputations: 0,
  lastRouteComputeMs: null
});

const EMPTY_METRICS: SessionMetrics = {
  startedAt: 0,
  elapsedSec: 0,
  samples: 0,
  meanErrorM: null,
  medianErrorM: null,
  p95ErrorM: null,
  hallAccuracyPct: null,
  nearestArtifactAccuracyPct: null,
  updates: 0,
  scans: 0,
  pdrSteps: 0,
  trilaterations: 0,
  routeRecomputations: 0,
  updateRateHz: 0,
  sensorActivationsPerMin: 0,
  cpuOpsPerMin: 0,
  scanIntervalMs: 1000,
  lastReadingsUsed: 0,
  lastRouteComputeMs: null
};

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
    /* storage can be unavailable in private mode; the demo still runs */
  }
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

export interface NavContextValue {
  lang: UiLang;
  setLang: (lang: 'ar' | 'en') => void;
  estimate: PositionEstimate | null;
  truth: FloorPosition | null;
  mode: SourceMode;
  simulationRunning: boolean;
  walkerMode: WalkerMode;
  motionRunning: boolean;
  motionStatus: SensorStatus | null;
  motionHeading: 'absolute' | 'relative' | 'unknown';
  route: RouteResult | null;
  routeError: RouteFailure | null;
  targetId: string | null;
  progress: RouteProgress | null;
  routeBanner: string | null;
  arrived: boolean;
  settings: NavSettings;
  /** Simulated hall tiers (0 quiet, 2 crowded) refreshed every 20 s. */
  crowdLevels: CrowdLevels;
  closedHalls: string[];
  overrides: Record<string, { x: number; y: number }>;
  lastQr: LastQr | null;
  metrics: SessionMetrics;
  lastScanUsed: number;
  recents: string[];
  onboarded: boolean;
  startSimulation: () => Promise<void>;
  pauseSimulation: () => void;
  resumeSimulation: () => Promise<void>;
  walkRoute: () => Promise<void>;
  freeWalk: () => Promise<void>;
  setWalkSpeed: (speedMps: number) => void;
  startMotion: () => Promise<boolean>;
  stopMotion: () => void;
  activateManual: () => void;
  placeManual: (point: FloorPosition) => void;
  confirmQr: (raw: string) => {
    ok: boolean;
    kind: 'artifact' | 'entrance' | 'hall' | null;
    artifactId: string | null;
    hallId: string | null;
  };
  navigateTo: (artifactId: string) => RouteResult | null;
  clearNavigation: () => void;
  addRecent: (artifactId: string) => void;
  clearRecents: () => void;
  setAccessible: (value: boolean) => void;
  setLowPower: (value: boolean) => void;
  setCrowd: (crowd: CrowdLevel) => void;
  setAvoidCrowded: (value: boolean) => void;
  toggleHallClosed: (hallId: string) => void;
  setArtifactPosition: (artifactId: string, x: number, y: number) => { ok: boolean; error?: string };
  resetOverrides: () => void;
  artifactPosition: (artifactId: string) => { x: number; y: number; floor: 'ground' | 'upper' } | null;
  startTourAtEntrance: () => Promise<void>;
  completeOnboarding: () => void;
  resetDemo: () => void;
  artifactsByCategory: (category: ArtifactCategory | null) => MuseumArtifact[];
  nearestArtifact: (point: FloorPosition) => { artifact: MuseumArtifact; distanceM: number } | null;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const { lang: globalLang, setLang: setGlobalLang } = useLang();
  const lang: UiLang = globalLang === 'ar' ? 'ar' : 'en';

  const engineRef = useRef<PositioningEngine | null>(null);
  if (!engineRef.current) engineRef.current = new PositioningEngine(MUSEUM_ENGINE_MAP);
  const simRef = useRef<SimulatedSource | null>(null);
  const motionRef = useRef<MotionSource | null>(null);
  const qrSourceRef = useRef(new QrSource());
  const manualSourceRef = useRef(new ManualSource());

  const [estimate, setEstimate] = useState<PositionEstimate | null>(null);
  const [truth, setTruth] = useState<FloorPosition | null>(null);
  const [mode, setMode] = useState<SourceMode>('idle');
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [walkerMode, setWalkerMode] = useState<WalkerMode>(() => {
    const stored = readJson<string>(WALKER_KEY, 'route');
    return stored === 'free' ? 'free' : 'route';
  });
  const [motionRunning, setMotionRunning] = useState(false);
  const [motionStatus, setMotionStatus] = useState<SensorStatus | null>(null);
  const [motionHeading, setMotionHeading] = useState<'absolute' | 'relative' | 'unknown'>('unknown');
  const [settings, setSettings] = useState<NavSettings>(() => {
    const stored = readJson<Partial<NavSettings>>(SETTINGS_KEY, {});
    return { ...DEFAULT_SETTINGS, ...stored, walkSpeedMps: clampSpeed(stored.walkSpeedMps ?? DEFAULT_SETTINGS.walkSpeedMps) };
  });
  const [closedHalls, setClosedHalls] = useState<string[]>(() => readJson(CLOSED_KEY, []));
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>(() =>
    readJson(OVERRIDES_KEY, {})
  );
  const [recents, setRecents] = useState<string[]>(() => readJson(RECENTS_KEY, []));
  const [onboarded, setOnboarded] = useState<boolean>(() => readJson(ONBOARDED_KEY, false));
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeError, setRouteError] = useState<RouteFailure | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [progress, setProgress] = useState<RouteProgress | null>(null);
  const [arrived, setArrived] = useState(false);
  const [lastQr, setLastQr] = useState<LastQr | null>(null);
  const [metrics, setMetrics] = useState<SessionMetrics>(EMPTY_METRICS);
  const [lastScanUsed, setLastScanUsed] = useState(0);
  const crowdSourceRef = useRef(new SimulatedCrowdSource({ seed: 2026 }));
  const [crowdLevels, setCrowdLevels] = useState<CrowdLevels>(() =>
    crowdSourceRef.current.getLevels()
  );

  const langRef = useRef<UiLang>(lang);
  langRef.current = lang;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const closedRef = useRef(closedHalls);
  closedRef.current = closedHalls;
  const overridesRef = useRef(overrides);
  overridesRef.current = overrides;
  const crowdRef = useRef<CrowdLevels>(crowdLevels);
  crowdRef.current = crowdLevels;
  const routeRef = useRef<RouteResult | null>(null);
  const targetRef = useRef<string | null>(null);
  const truthRef = useRef<FloorPosition | null>(null);
  const modeRef = useRef<SourceMode>('idle');
  const simRunningRef = useRef(false);
  const walkerModeRef = useRef<WalkerMode>(walkerMode);
  const arrivedRef = useRef(false);
  const countersRef = useRef<Counters>(freshCounters());
  const lastRerouteAtRef = useRef(0);
  const startedRef = useRef(false);

  modeRef.current = mode;
  simRunningRef.current = simulationRunning;
  walkerModeRef.current = walkerMode;
  arrivedRef.current = arrived;
  routeRef.current = route;
  targetRef.current = targetId;
  truthRef.current = truth;

  const ensureSession = useCallback(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      countersRef.current = freshCounters();
      countersRef.current.startedAt = Date.now();
    }
  }, []);

  const artifactPosition = useCallback(
    (artifactId: string): { x: number; y: number; floor: 'ground' | 'upper' } | null => {
      const artifact = museumArtifactById(artifactId);
      if (!artifact) return null;
      const override = overridesRef.current[artifactId];
      return { x: override?.x ?? artifact.x, y: override?.y ?? artifact.y, floor: artifact.floor };
    },
    []
  );

  const nearestArtifact = useCallback(
    (point: FloorPosition): { artifact: MuseumArtifact; distanceM: number } | null => {
      let best: { artifact: MuseumArtifact; distanceM: number } | null = null;
      for (const artifact of MUSEUM.artifacts) {
        if (artifact.floor !== point.floor) continue;
        const p = artifactPosition(artifact.id) ?? artifact;
        const distanceM = Math.hypot(p.x - point.x, p.y - point.y);
        if (!best || distanceM < best.distanceM) best = { artifact, distanceM };
      }
      return best;
    },
    [artifactPosition]
  );

  const refreshMetrics = useCallback(() => {
    const counters = countersRef.current;
    const now = Date.now();
    const elapsedSec = counters.startedAt ? Math.max(0.01, (now - counters.startedAt) / 1000) : 0;
    const errors = counters.samples.map((s) => s.errorM);
    const hallHits = counters.samples.filter((s) => s.hallCorrect).length;
    const nearestHits = counters.samples.filter((s) => s.nearestCorrect).length;
    const engine = engineRef.current!;
    const lastScan = engine.statistics.lastScan;
    setLastScanUsed(lastScan?.used ?? 0);
    setMetrics({
      startedAt: counters.startedAt,
      elapsedSec,
      samples: counters.samples.length,
      meanErrorM: errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : null,
      medianErrorM: errors.length ? median(errors) : null,
      p95ErrorM: errors.length ? percentile(errors, 95) : null,
      hallAccuracyPct: counters.samples.length ? (hallHits / counters.samples.length) * 100 : null,
      nearestArtifactAccuracyPct: counters.samples.length ? (nearestHits / counters.samples.length) * 100 : null,
      updates: counters.updates,
      scans: counters.scans,
      pdrSteps: counters.pdrSteps,
      trilaterations: counters.trilaterations,
      routeRecomputations: counters.routeRecomputations,
      updateRateHz: elapsedSec ? counters.updates / elapsedSec : 0,
      sensorActivationsPerMin: elapsedSec ? ((counters.scans + counters.pdrSteps) / elapsedSec) * 60 : 0,
      cpuOpsPerMin: elapsedSec ? ((counters.trilaterations + counters.pdrSteps) / elapsedSec) * 60 : 0,
      scanIntervalMs: settingsRef.current.lowPower ? 2000 : 1000,
      lastReadingsUsed: lastScan?.used ?? 0,
      lastRouteComputeMs: counters.lastRouteComputeMs
    });
  }, []);

  const stopSimulationInternal = useCallback(() => {
    simRef.current?.stop();
    simRef.current = null;
    setSimulationRunning(false);
  }, []);

  const stopMotionInternal = useCallback(() => {
    motionRef.current?.stop();
    motionRef.current = null;
    setMotionRunning(false);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(null);
    setArrived(false);
    arrivedRef.current = false;
  }, []);

  const recomputeRoute = useCallback(
    (artifactId: string | null, reason: 'user' | 'deviation' | 'settings' | 'admin' = 'user'): RouteResult | null => {
      if (!artifactId) return null;
      const engine = engineRef.current!;
      const current = engine.estimate(Date.now());
      const target = artifactPosition(artifactId);
      const artifact = museumArtifactById(artifactId);
      if (!current || !target || !artifact) {
        routeRef.current = null;
        setRoute(null);
        setRouteError('no-start');
        resetProgress();
        return null;
      }
      ensureSession();
      const next = computeRoute(
        { x: current.x, y: current.y, floor: current.floor },
        { x: target.x, y: target.y, floor: target.floor },
        {
          fromHallId: current.hallId,
          targetHallId: artifact.hallId,
          targetArtifactId: artifactId,
          avoidStairs: settingsRef.current.accessible,
          closedHalls: closedRef.current,
          /* Only when the visitor asked for it: plain shortest path otherwise. */
          crowd: settingsRef.current.avoidCrowded
            ? { levels: crowdRef.current, alpha: DEFAULT_CROWD_ALPHA }
            : undefined
        }
      );
      countersRef.current.routeRecomputations += 1;
      countersRef.current.lastRouteComputeMs = next.computeMs;
      if (reason === 'deviation') lastRerouteAtRef.current = Date.now();
      routeRef.current = next;
      setRoute(next);
      setRouteError(next.ok ? null : next.reason);
      setArrived(false);
      arrivedRef.current = false;
      if (next.ok) {
        const p = routeProgress(next, current, langRef.current);
        setProgress(p);
        // In route mode the walker re-joins the new route from its own ground
        // truth, so a reroute bends the walk instead of teleporting it back to
        // the route start. Free walk deliberately keeps its own loop.
        if (
          walkerModeRef.current === 'route' &&
          modeRef.current === 'sim' &&
          simRunningRef.current &&
          truthRef.current
        ) {
          simRef.current?.setPath(routeFollowPath(truthRef.current, next), false);
        }
      } else {
        setProgress(null);
        if (modeRef.current === 'sim' && walkerModeRef.current === 'route') stopSimulationInternal();
      }
      refreshMetrics();
      return next;
    },
    [artifactPosition, ensureSession, refreshMetrics, resetProgress, stopSimulationInternal]
  );

  const handlePosition = useCallback(
    (nextEstimate: PositionEstimate, nextTruth: FloorPosition | null) => {
      setEstimate(nextEstimate);
      setTruth(nextTruth);
      truthRef.current = nextTruth;

      if (nextTruth) {
        const truthHall = hallAt(nextTruth, nextTruth.floor)?.id ?? null;
        const estNearest = nearestArtifact(nextEstimate);
        const truthNearest = nearestArtifact(nextTruth);
        countersRef.current.samples.push({
          errorM: Math.hypot(nextEstimate.x - nextTruth.x, nextEstimate.y - nextTruth.y),
          hallCorrect: truthHall != null && nextEstimate.floor === nextTruth.floor && nextEstimate.hallId === truthHall,
          nearestCorrect: estNearest?.artifact.id === truthNearest?.artifact.id
        });
        if (countersRef.current.samples.length > 3600) countersRef.current.samples.shift();
      }

      const activeRoute = routeRef.current;
      if (activeRoute?.ok) {
        const p = routeProgress(activeRoute, nextEstimate, langRef.current);
        setProgress(p);
        /* In free walk the visitor is deliberately off the route, so neither an
         * arrival nor a deviation should end the loop or trigger reroutes. */
        const freeSim = modeRef.current === 'sim' && walkerModeRef.current === 'free';
        if (p.arrived) {
          /* A free walk that happens to pass the target is not an arrival. */
          if (!freeSim && !arrivedRef.current) {
            setArrived(true);
            arrivedRef.current = true;
            stopSimulationInternal();
            stopMotionInternal();
          }
        } else if (!freeSim && p.offRouteM > 4 && Date.now() - lastRerouteAtRef.current > 2500) {
          recomputeRoute(targetRef.current, 'deviation');
        }
      }
      refreshMetrics();
    },
    [nearestArtifact, recomputeRoute, refreshMetrics, stopMotionInternal, stopSimulationInternal]
  );

  /* ------------------------------ sources ------------------------------ */

  /**
   * Start the virtual walker. `followRoute` keeps the active navigation route
   * and walks it from the current position; otherwise the demo loop starts at
   * the entrance and any active route is cleared.
   */
  const startSimulationInternal = useCallback(async (followRoute = false) => {
    ensureSession();
    stopMotionInternal();
    const engine = engineRef.current!;
    const now = Date.now();
    const forwardedRoute = followRoute && routeRef.current?.ok ? routeRef.current : null;
    if (!forwardedRoute) {
      setRoute(null);
      routeRef.current = null;
      setRouteError(null);
      setTargetId(null);
      targetRef.current = null;
    }

    const start: FloorPosition = forwardedRoute
      ? (truthRef.current ??
        (() => {
          const current = engine.estimate(now);
          return current
            ? { x: current.x, y: current.y, floor: current.floor }
            : { ...MUSEUM.entrance, floor: MUSEUM.entrance.floor };
        })())
      : { ...MUSEUM.entrance, floor: MUSEUM.entrance.floor };
    if (!engine.isInitialized || !forwardedRoute) engine.confirmQr(start, now, 0.7);

    const demoPath = MUSEUM.paths.find((p) => p.id === 'grand-highlights') ?? MUSEUM.paths[0];
    const path = forwardedRoute ? routeFollowPath(start, forwardedRoute) : freeWalkPath(start, demoPath);

    setMode('sim');
    modeRef.current = 'sim';
    setTruth(start);
    truthRef.current = start;
    const initial = engine.estimate(now);
    if (initial) setEstimate(initial);
    if (!forwardedRoute) resetProgress();

    const source = new SimulatedSource({
      path,
      beacons: MUSEUM.beacons,
      crowd: settingsRef.current.crowd,
      intervalMs: settingsRef.current.lowPower ? 2000 : 1000,
      speedMps: settingsRef.current.walkSpeedMps,
      loop: !forwardedRoute,
      seed: 2026,
      onEnd: () => {
        setSimulationRunning(false);
        simRunningRef.current = false;
      },
      onSample: (sample) => {
        const tickNow = Date.now();
        const currentEngine = engineRef.current!;
        if (sample.floorChanged) currentEngine.setFloor(sample.truth.floor, tickNow);
        const stepCount = Math.max(1, Math.round(sample.distanceM / 0.68));
        const stride = sample.distanceM > 0 ? sample.distanceM / stepCount : 0.68;
        for (let i = 0; i < stepCount; i++) {
          /* synthetic steps: keep the reported source honest (simulated BLE) */
          currentEngine.applyPdrStep(sample.headingDeg, tickNow, stride, 14, 'sim-ble');
          countersRef.current.pdrSteps += 1;
          countersRef.current.updates += 1;
        }
        currentEngine.applyBeaconScan(sample.readings, settingsRef.current.crowd, tickNow, 'sim-ble');
        countersRef.current.scans += 1;
        countersRef.current.trilaterations = currentEngine.statistics.trilaterations;
        if (currentEngine.statistics.lastScan?.fix) countersRef.current.updates += 1;
        const nextEstimate = currentEngine.estimate(tickNow);
        if (nextEstimate) handlePosition(nextEstimate, sample.truth);
        else refreshMetrics();
      }
    });
    simRef.current = source;
    const started = await source.start();
    setSimulationRunning(started);
    simRunningRef.current = started;
  }, [ensureSession, handlePosition, refreshMetrics, resetProgress, stopMotionInternal]);

  const pauseSimulation = useCallback(() => {
    simRef.current?.stop();
    setSimulationRunning(false);
    simRunningRef.current = false;
  }, []);

  const resumeSimulation = useCallback(async () => {
    if (simRef.current) {
      /* The route or the walker mode may have changed while paused. Re-aim
       * before restarting so resuming never walks the previous path. */
      const truth = truthRef.current;
      if (truth) {
        const active = routeRef.current;
        if (walkerModeRef.current === 'route' && active?.ok) {
          simRef.current.setPath(routeFollowPath(truth, active), false);
        } else if (walkerModeRef.current === 'free') {
          const demoPath = MUSEUM.paths.find((p) => p.id === 'grand-highlights') ?? MUSEUM.paths[0];
          simRef.current.setPath(freeWalkPath(truth, demoPath), true);
        }
      }
      simRef.current.setSpeed(settingsRef.current.walkSpeedMps);
      const started = await simRef.current.start();
      setSimulationRunning(started);
      simRunningRef.current = started;
      return;
    }
    await startSimulationInternal();
  }, [startSimulationInternal]);

  const setWalkerModeInternal = useCallback((next: WalkerMode) => {
    walkerModeRef.current = next;
    setWalkerMode(next);
    writeJson(WALKER_KEY, next);
  }, []);

  /** Start or re-aim the virtual walker at the active route. */
  const walkRoute = useCallback(async () => {
    setWalkerModeInternal('route');
    const target = targetRef.current;
    if (!target) {
      /* No destination yet: this is the same as starting the demo tour. */
      await startSimulationInternal();
      return;
    }
    /* Recompute from where the visitor is now. A route computed before a free
     * walk can start in another hall, so re-joining it would look like a jump. */
    const active = recomputeRoute(target, 'user');
    if (!active?.ok) return;
    const truth =
      truthRef.current ??
      (() => {
        const current = engineRef.current!.estimate(Date.now());
        return current ? { x: current.x, y: current.y, floor: current.floor } : null;
      })();
    if (!truth) {
      await startSimulationInternal(true);
      return;
    }
    if (simRef.current) {
      simRef.current.setPath(routeFollowPath(truth, active), false);
      simRef.current.setSpeed(settingsRef.current.walkSpeedMps);
      setMode('sim');
      modeRef.current = 'sim';
      setTruth(truth);
      truthRef.current = truth;
      if (!simRunningRef.current) {
        const started = await simRef.current.start();
        setSimulationRunning(started);
        simRunningRef.current = started;
      }
      resetProgress();
      return;
    }
    await startSimulationInternal(true);
  }, [recomputeRoute, resetProgress, setWalkerModeInternal, startSimulationInternal]);

  /** Keep the demo loop as an explicit option; active routes stay on screen. */
  const freeWalk = useCallback(async () => {
    setWalkerModeInternal('free');
    const demoPath = MUSEUM.paths.find((p) => p.id === 'grand-highlights') ?? MUSEUM.paths[0];
    const truth = truthRef.current;
    if (simRef.current && truth) {
      simRef.current.setPath(freeWalkPath(truth, demoPath), true);
      /* loop is enabled on the source too, so the demo keeps going */
      simRef.current.setSpeed(settingsRef.current.walkSpeedMps);
      setMode('sim');
      modeRef.current = 'sim';
      if (!simRunningRef.current) {
        const started = await simRef.current.start();
        setSimulationRunning(started);
        simRunningRef.current = started;
      }
      resetProgress();
      return;
    }
    await startSimulationInternal();
  }, [resetProgress, setWalkerModeInternal, startSimulationInternal]);

  const setWalkSpeed = useCallback((speedMps: number) => {
    const next = clampSpeed(speedMps);
    setSettings((current) => ({ ...current, walkSpeedMps: next }));
    simRef.current?.setSpeed(next);
  }, []);

  const startMotionInternal = useCallback(async (): Promise<boolean> => {
    ensureSession();
    stopSimulationInternal();
    const engine = engineRef.current!;
    const now = Date.now();
    if (!engine.isInitialized) {
      engine.confirmQr({ ...MUSEUM.entrance, floor: MUSEUM.entrance.floor }, now, 0.7);
      const start = engine.estimate(now);
      if (start) setEstimate(start);
    }
    setTruth(null);
    truthRef.current = null;
    setMode('motion');
    modeRef.current = 'motion';
    resetProgress();

    let reliability: 'absolute' | 'relative' | 'unknown' = 'unknown';
    const source = new MotionSource({
      onStep: (step: MotionStep) => {
        const tickNow = Date.now();
        const next = engineRef.current!.applyPdrStep(
          step.headingDeg,
          tickNow,
          step.distanceM,
          reliability === 'relative' ? 26 : reliability === 'unknown' ? 35 : 15
        );
        countersRef.current.pdrSteps += 1;
        countersRef.current.updates += 1;
        countersRef.current.trilaterations = engineRef.current!.statistics.trilaterations;
        if (next) handlePosition(next, null);
        else refreshMetrics();
      },
      onStatus: (status) => setMotionStatus(status),
      strideM: 0.68
    });
    motionRef.current = source;
    const started = await source.start();
    reliability = source.headingReliability;
    setMotionHeading(reliability);
    setMotionRunning(started);
    if (!started) {
      setMode('manual');
      modeRef.current = 'manual';
    }
    return started;
  }, [ensureSession, handlePosition, refreshMetrics, resetProgress, stopSimulationInternal]);

  const stopMotion = useCallback(() => {
    stopMotionInternal();
    setMotionStatus({ available: true, reason: 'idle', detail: 'Sensors off.' });
    setMode((m) => (m === 'motion' ? 'manual' : m));
    modeRef.current = 'manual';
  }, [stopMotionInternal]);

  const activateManual = useCallback(() => {
    stopSimulationInternal();
    stopMotionInternal();
    setTruth(null);
    truthRef.current = null;
    setMode('manual');
    modeRef.current = 'manual';
    resetProgress();
  }, [resetProgress, stopMotionInternal, stopSimulationInternal]);

  const placeManual = useCallback(
    (point: FloorPosition) => {
      ensureSession();
      const engine = engineRef.current!;
      const next = manualSourceRef.current.apply(point, engine, Date.now());
      countersRef.current.updates += 1;
      setMode('manual');
      modeRef.current = 'manual';
      setTruth(null);
      truthRef.current = null;
      handlePosition(next, null);
      if (targetRef.current) recomputeRoute(targetRef.current, 'user');
    },
    [ensureSession, handlePosition, recomputeRoute]
  );

  const confirmQr = useCallback(
    (raw: string) => {
      ensureSession();
      const engine = engineRef.current!;
      const result = qrSourceRef.current.apply(raw, engine, Date.now());
      setLastQr({
        raw,
        ok: result.ok,
        kind: result.kind,
        artifactId: result.artifactId,
        hallId: result.hallId,
        at: Date.now()
      });
      if (!result.ok || !result.estimate) {
        refreshMetrics();
        return { ok: false, kind: null, artifactId: null, hallId: null };
      }
      countersRef.current.updates += 1;
      if (modeRef.current !== 'sim') {
        setMode('qr');
        modeRef.current = 'qr';
        setTruth(null);
        truthRef.current = null;
      }
      handlePosition(result.estimate, truthRef.current);
      if (result.kind === 'artifact' && result.artifactId && targetRef.current) {
        recomputeRoute(targetRef.current, 'user');
      }
      return { ok: true, kind: result.kind, artifactId: result.artifactId, hallId: result.hallId };
    },
    [ensureSession, handlePosition, recomputeRoute, refreshMetrics]
  );

  /* ------------------------------ routing ----------------------------- */

  const addRecentInternal = useCallback((artifactId: string) => {
    setRecents((current) => {
      const next = [artifactId, ...current.filter((id) => id !== artifactId)].slice(0, 6);
      writeJson(RECENTS_KEY, next);
      return next;
    });
  }, []);

  const navigateTo = useCallback(
    (artifactId: string): RouteResult | null => {
      if (!museumArtifactById(artifactId)) return null;
      setTargetId(artifactId);
      targetRef.current = artifactId;
      addRecentInternal(artifactId);
      /* Choosing a destination while the virtual walker is running puts it on
       * the route; free walk remains available as an explicit choice. */
      if (simRunningRef.current && walkerModeRef.current === 'free') setWalkerModeInternal('route');
      return recomputeRoute(artifactId, 'user');
    },
    [addRecentInternal, recomputeRoute, setWalkerModeInternal]
  );

  const addRecent = useCallback(
    (artifactId: string) => {
      addRecentInternal(artifactId);
    },
    [addRecentInternal]
  );

  const clearRecents = useCallback(() => {
    setRecents([]);
    writeJson(RECENTS_KEY, []);
  }, []);

  const clearNavigation = useCallback(() => {
    setRoute(null);
    routeRef.current = null;
    setRouteError(null);
    setTargetId(null);
    targetRef.current = null;
    resetProgress();
  }, [resetProgress]);

  /* ------------------------------ settings ---------------------------- */

  useEffect(() => {
    writeJson(SETTINGS_KEY, settings);
    if (simRef.current) simRef.current.setCrowd(settings.crowd);
    if (simRef.current) simRef.current.setInterval(settings.lowPower ? 2000 : 1000);
    if (simRef.current) simRef.current.setSpeed(settings.walkSpeedMps);
  }, [settings]);

  useEffect(() => writeJson(OVERRIDES_KEY, overrides), [overrides]);
  useEffect(() => writeJson(CLOSED_KEY, closedHalls), [closedHalls]);
  useEffect(() => writeJson(ONBOARDED_KEY, onboarded), [onboarded]);

  const setAccessible = useCallback(
    (value: boolean) => {
      setSettings((current) => ({ ...current, accessible: value }));
      if (targetRef.current) recomputeRoute(targetRef.current, 'settings');
    },
    [recomputeRoute]
  );

  const setLowPower = useCallback((value: boolean) => {
    setSettings((current) => ({ ...current, lowPower: value }));
  }, []);

  const setCrowd = useCallback((crowd: CrowdLevel) => {
    setSettings((current) => ({ ...current, crowd }));
    simRef.current?.setCrowd(crowd);
  }, []);

  const setAvoidCrowded = useCallback(
    (value: boolean) => {
      setSettings((current) => ({ ...current, avoidCrowded: value }));
      /* Recompute with the new weighting so the visible route matches the toggle. */
      window.setTimeout(() => {
        if (targetRef.current) recomputeRoute(targetRef.current, 'settings');
      }, 0);
    },
    [recomputeRoute]
  );

  const toggleHallClosed = useCallback(
    (hallId: string) => {
      const next = closedRef.current.includes(hallId)
        ? closedRef.current.filter((id) => id !== hallId)
        : [...closedRef.current, hallId];
      closedRef.current = next;
      setClosedHalls(next);
      if (targetRef.current) {
        window.setTimeout(() => recomputeRoute(targetRef.current, 'admin'), 0);
      }
    },
    [recomputeRoute]
  );

  const setArtifactPosition = useCallback(
    (artifactId: string, x: number, y: number): { ok: boolean; error?: string } => {
      const artifact = museumArtifactById(artifactId);
      if (!artifact) return { ok: false, error: 'unknown-artifact' };
      if (!isWalkable({ x, y }, artifact.floor)) return { ok: false, error: 'outside-walkable' };
      if (hallAt({ x, y }, artifact.floor)?.id !== artifact.hallId) return { ok: false, error: 'outside-hall' };
      setOverrides((current) => ({ ...current, [artifactId]: { x, y } }));
      if (targetRef.current === artifactId) {
        window.setTimeout(() => recomputeRoute(artifactId, 'admin'), 0);
      }
      return { ok: true };
    },
    [recomputeRoute]
  );

  const resetOverrides = useCallback(() => {
    setOverrides({});
    if (targetRef.current) window.setTimeout(() => recomputeRoute(targetRef.current, 'admin'), 0);
  }, [recomputeRoute]);

  const completeOnboarding = useCallback(() => setOnboarded(true), []);

  const startTourAtEntrance = useCallback(async () => {
    setOnboarded(true);
    clearNavigation();
    await startSimulationInternal();
  }, [clearNavigation, startSimulationInternal]);

  const resetDemo = useCallback(() => {
    stopSimulationInternal();
    stopMotionInternal();
    engineRef.current = new PositioningEngine(MUSEUM_ENGINE_MAP);
    countersRef.current = freshCounters();
    startedRef.current = false;
    lastRerouteAtRef.current = 0;
    setEstimate(null);
    setTruth(null);
    truthRef.current = null;
    setMode('idle');
    modeRef.current = 'idle';
    setRoute(null);
    routeRef.current = null;
    setRouteError(null);
    setTargetId(null);
    targetRef.current = null;
    setProgress(null);
    setArrived(false);
    arrivedRef.current = false;
    setLastQr(null);
    setMetrics(EMPTY_METRICS);
    setClosedHalls([]);
    setOverrides({});
    setSettings(DEFAULT_SETTINGS);
    setWalkerMode('route');
    walkerModeRef.current = 'route';
    setRecents([]);
    setOnboarded(false);
    try {
      [SETTINGS_KEY, RECENTS_KEY, OVERRIDES_KEY, CLOSED_KEY, WALKER_KEY].forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(ONBOARDED_KEY, 'false');
    } catch {
      /* ignore */
    }
  }, [stopMotionInternal, stopSimulationInternal]);

  const artifactsByCategory = useCallback(
    (category: ArtifactCategory | null) =>
      MUSEUM.artifacts.filter((artifact) => (category ? artifact.category === category : true)),
    []
  );

  /* ------------------------------ lifecycle --------------------------- */

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (simRef.current) {
          simRef.current.stop();
          setSimulationRunning(false);
          simRunningRef.current = false;
        }
        if (motionRef.current) {
          motionRef.current.stop();
          motionRef.current = null;
          setMotionRunning(false);
          setMotionStatus({ available: true, reason: 'idle', detail: 'Sensors stopped while the app was in the background.' });
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      simRef.current?.stop();
      motionRef.current?.stop();
    };
  }, []);

  /* Crowd tiers are simulated; refresh on a timer so the heatmap and the
   * suggestion banner do not recompute on every render. */
  useEffect(() => {
    const tick = () => setCrowdLevels(crowdSourceRef.current.getLevels());
    tick();
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, []);

  const routeBanner = useMemo(() => (progress ? progressText(progress, lang) : null), [lang, progress]);

  const value: NavContextValue = {
    lang,
    setLang: (next) => setGlobalLang(next),
    estimate,
    truth,
    mode,
    simulationRunning,
    motionRunning,
    motionStatus,
    motionHeading,
    route,
    routeError,
    targetId,
    progress,
    routeBanner,
    arrived,
    settings,
    crowdLevels,
    closedHalls,
    overrides,
    lastQr,
    metrics,
    lastScanUsed,
    recents,
    onboarded,
    startSimulation: () => startSimulationInternal(),
    pauseSimulation,
    resumeSimulation,
    walkRoute,
    freeWalk,
    setWalkSpeed,
    walkerMode,
    startMotion: startMotionInternal,
    stopMotion,
    activateManual,
    placeManual,
    confirmQr,
    navigateTo,
    clearNavigation,
    addRecent,
    clearRecents,
    setAccessible,
    setLowPower,
    setCrowd,
    setAvoidCrowded,
    toggleHallClosed,
    setArtifactPosition,
    resetOverrides,
    artifactPosition,
    startTourAtEntrance,
    completeOnboarding,
    resetDemo,
    artifactsByCategory,
    nearestArtifact
  };

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const context = useContext(NavContext);
  if (!context) throw new Error('useNav must be used inside NavProvider');
  return context;
}
