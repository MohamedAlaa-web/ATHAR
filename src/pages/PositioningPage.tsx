import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getArtifact } from '../data/artifacts';
import { artName } from '../i18n/content';
import { useLang } from '../i18n/LanguageContext';
import { IndoorMap } from '../components/IndoorMap';
import { clampToRoom, cloneRoom, DEMO_ROOM, nearestArtifact, validateRoom } from '../positioning/room';
import { fuse } from '../positioning/fusion';
import { DEMO_PATH, getScenario, runEvaluation, SCENARIOS, simulateStep, targetAt, type ScenarioId } from '../positioning/simulation';
import { detectProviders, MotionPositionProvider, qrObservation, readWifiRanges } from '../positioning/providers';
import type {
  EvaluationReport,
  FusedEstimate,
  Observation,
  Position2D,
  RoomConfig
} from '../positioning/types';

const STEPS_PER_LOOP = 18;
const LAST_SCAN_KEY = 'athar-last-scan';
const MAX_TRAIL = 40;

interface StoredScan {
  raw: string;
  artifactId: string;
  live: boolean;
  timestamp: number;
}

function readStoredScan(): StoredScan | null {
  try {
    const raw = sessionStorage.getItem(LAST_SCAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredScan;
    if (!parsed?.artifactId || !getArtifact(parsed.artifactId)) return null;
    if (Date.now() - parsed.timestamp > 10 * 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

const emptyEstimate = (): FusedEstimate => ({
  status: 'unknown',
  position: null,
  accuracyM: null,
  confidence: 0,
  contributions: [],
  accepted: [],
  rejected: [],
  references: [],
  conflict: false,
  diagnostics: { acceptedCount: 0, normalizedDisagreement: null, rangeResidual: null, clampedToRoom: false },
  notes: ['no-evidence']
});

const fmt1 = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '—' : n.toFixed(1));
const fmt2 = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '—' : n.toFixed(2));

export function PositioningPage() {
  const { lang, tr } = useLang();
  const [room, setRoom] = useState<RoomConfig>(() => cloneRoom(DEMO_ROOM));
  const [scenarioId, setScenarioId] = useState<ScenarioId>('clean');
  const [seed, setSeed] = useState(42);
  const [step, setStep] = useState(0);
  const [truth, setTruth] = useState<Position2D>(DEMO_PATH[0]);
  const [estimate, setEstimate] = useState<FusedEstimate>(emptyEstimate);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [trail, setTrail] = useState<Position2D[]>([]);
  const [liveObs, setLiveObs] = useState<Observation[]>([]);
  const [auto, setAuto] = useState(false);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [layoutText, setLayoutText] = useState('');
  const [layoutErrors, setLayoutErrors] = useState<string[]>([]);
  const [motionState, setMotionState] = useState<'idle' | 'running' | 'denied' | 'unsupported'>('idle');
  const [motionSteps, setMotionSteps] = useState(0);
  const [bridgeMessage, setBridgeMessage] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<StoredScan | null>(() => readStoredScan());

  const prevRef = useRef<{ estimate: FusedEstimate; timestamp: number } | null>(null);
  const motionRef = useRef<MotionPositionProvider | null>(null);
  const motionIntervalRef = useRef<number | null>(null);
  const liveRef = useRef<Observation[]>([]);
  const stepRef = useRef(0);
  const truthRef = useRef<Position2D>(DEMO_PATH[0]);

  liveRef.current = liveObs;
  stepRef.current = step;
  truthRef.current = truth;

  const providers = useMemo(() => detectProviders(), []);

  const runAt = useCallback(
    (target: Position2D, stepIndex: number, extra: Observation[] = [], usePrior = true) => {
      const now = Date.now();
      const scenario = getScenario(scenarioId);
      const measured = simulateStep({ room, scenario, target, seed, step: stepIndex, now });
      const all = [...measured, ...extra];
      const fused = fuse(all, {
        room,
        now,
        previous: usePrior ? prevRef.current?.estimate ?? null : null,
        previousTimestamp: usePrior ? prevRef.current?.timestamp : undefined
      });
      prevRef.current = { estimate: fused, timestamp: now };
      setObservations(all);
      setEstimate(fused);
      setTruth(target);
      if (fused.position) {
        setTrail((t) => [...t.slice(-(MAX_TRAIL - 1)), fused.position!]);
      }
    },
    [room, scenarioId, seed]
  );

  const advance = useCallback(() => {
    const next = stepRef.current + 1;
    setStep(next);
    const target = targetAt(DEMO_PATH, (next % STEPS_PER_LOOP) / STEPS_PER_LOOP);
    runAt(target, next, liveRef.current);
  }, [runAt]);

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => advanceRef.current(), 900);
    return () => window.clearInterval(id);
  }, [auto]);

  useEffect(() => () => motionRef.current?.stop(), []);

  /** Re-seed the demo whenever the room layout changes. */
  useEffect(() => {
    prevRef.current = null;
    setStep(0);
    setTrail([]);
    setLiveObs([]);
    runAt(DEMO_PATH[0], 0, [], false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const reset = () => {
    setAuto(false);
    setStep(0);
    setTrail([]);
    setLiveObs([]);
    setReport(null);
    setMotionSteps(0);
    prevRef.current = null;
    runAt(DEMO_PATH[0], 0, [], false);
  };

  const moveTarget = (p: Position2D) => {
    const clamped = clampToRoom(room, p);
    const rounded = { x: Math.round(clamped.x * 10) / 10, y: Math.round(clamped.y * 10) / 10 };
    runAt(rounded, stepRef.current, liveRef.current);
  };

  const useStoredScan = () => {
    if (!lastScan) return;
    const obs = qrObservation(room, lastScan.artifactId, Date.now(), lastScan.live);
    if (!obs) return;
    const next = [...liveRef.current.filter((o) => o.source !== 'qr' && o.source !== 'manual'), obs];
    setLiveObs(next);
    runAt(truthRef.current, stepRef.current, next);
  };

  const confirmArtifact = (artifactId: string) => {
    const obs = qrObservation(room, artifactId, Date.now(), false);
    if (!obs) return;
    const next = [...liveRef.current.filter((o) => o.source !== 'qr' && o.source !== 'manual'), obs];
    setLiveObs(next);
    runAt(truthRef.current, stepRef.current, next);
  };

  const applyScenario = (next: ScenarioId) => {
    setScenarioId(next);
    setAuto(false);
    prevRef.current = null;
    setTrail([]);
    setStep(0);
    const target = DEMO_PATH[0];
    const now = Date.now();
    const obs = simulateStep({ room, scenario: getScenario(next), target, seed, step: 0, now });
    const all = [...obs, ...liveRef.current];
    const fused = fuse(all, { room, now });
    prevRef.current = { estimate: fused, timestamp: now };
    setObservations(all);
    setEstimate(fused);
    setTruth(target);
  };

  const startMotion = async () => {
    const provider = new MotionPositionProvider();
    motionRef.current = provider;
    const ok = await provider.start(truthRef.current);
    if (!ok) {
      const supported = providers.find((p) => p.source === 'motion')?.available;
      setMotionState(supported ? 'denied' : 'unsupported');
      return;
    }
    setMotionState('running');
    const id = window.setInterval(() => {
      const snap = provider.snapshot(Date.now());
      setMotionSteps(provider.stepCount);
      if (!snap) return;
      const next = [...liveRef.current.filter((o) => o.source !== 'motion'), snap];
      setLiveObs(next);
      runAt(truthRef.current, stepRef.current, next);
    }, 1000);
    motionIntervalRef.current = id;
  };

  const stopMotion = () => {
    motionRef.current?.stop();
    motionRef.current = null;
    setMotionState('idle');
    if (motionIntervalRef.current != null) {
      window.clearInterval(motionIntervalRef.current);
      motionIntervalRef.current = null;
    }
    const next = liveRef.current.filter((o) => o.source !== 'motion');
    setLiveObs(next);
  };

  const readWifi = async () => {
    const obs = await readWifiRanges(room, Date.now());
    if (obs.length === 0) {
      setBridgeMessage(tr('pos.noWifiBridge'));
      return;
    }
    setBridgeMessage(null);
    const next = [...liveRef.current.filter((o) => o.source !== 'wifi'), ...obs];
    setLiveObs(next);
    runAt(truthRef.current, stepRef.current, next);
  };

  const applyLayout = () => {
    try {
      const parsed = JSON.parse(layoutText) as RoomConfig;
      const verdict = validateRoom(parsed);
      if (!verdict.ok) {
        setLayoutErrors(verdict.errors);
        return;
      }
      setLayoutErrors([]);
      setRoom(cloneRoom(parsed));
    } catch {
      setLayoutErrors(['invalid-json']);
    }
  };

  const nearest = useMemo(() => nearestArtifact(room, estimate), [room, estimate]);
  const nearestArtifactData = nearest.artifactId ? getArtifact(nearest.artifactId) : undefined;
  const selectedArtifactId = nearest.artifactId;

  const liveSources = useMemo(() => {
    const set = new Set<string>();
    for (const c of estimate.contributions) if (c.observation.live) set.add(c.observation.source);
    return set;
  }, [estimate]);

  const anyLive = liveSources.size > 0;
  const statusChip =
    estimate.status === 'unknown'
      ? tr('pos.status.unknown')
      : estimate.status === 'uncertain'
        ? tr('pos.status.uncertain')
        : estimate.status === 'confirmed'
          ? tr('pos.status.confirmed')
          : tr('pos.status.estimated');

  const nearestReasonKey =
    nearest.reason === 'no-position'
      ? 'pos.nearest.none'
      : nearest.reason === 'too-far'
        ? 'pos.nearest.tooFar'
        : nearest.reason === 'too-close'
          ? 'pos.nearest.tooClose'
          : nearest.reason === 'position-uncertain'
            ? 'pos.nearest.uncertain'
            : 'pos.nearest.clear';

  const weightById = useMemo(
    () => new Map(estimate.contributions.map((c) => [c.observation.id, c.weightPct] as const)),
    [estimate]
  );

  const describe = (o: Observation) =>
    o.kind === 'range'
      ? `${o.deviceId} · ${fmt1(o.rangeM)} m`
      : o.kind === 'artifact'
        ? o.artifactId
        : `${fmt1(o.position.x)}, ${fmt1(o.position.y)}`;

  const contributionRows = [
    ...estimate.accepted.map((o) => ({
      key: `a-${o.id}`,
      source: o.source,
      value: describe(o),
      age: Math.max(0, Math.round((Date.now() - o.timestamp) / 1000)),
      sigma: o.accuracyM,
      weight: weightById.get(o.id) ?? null,
      ok: true,
      reason: ''
    })),
    ...estimate.rejected.map((r) => ({
      key: `r-${r.observation.id}`,
      source: r.observation.source,
      value: describe(r.observation),
      age: Math.round(Math.max(0, r.ageMs) / 1000),
      sigma: r.observation.accuracyM,
      weight: null,
      ok: false,
      reason: tr(`pos.reason.${r.reason}`)
    }))
  ];

  return (
    <div className="pos-page">
      <section style={{ paddingTop: 28 }}>
        <p className="kicker">{tr('nav.positioning')}</p>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(28px,3.6vw,42px)', margin: '6px 0' }}>
          {tr('pos.title')}
        </h1>
        <p className="prose" style={{ maxWidth: '72ch' }}>{tr('pos.sub')}</p>
        <p className="muted" style={{ maxWidth: '72ch' }}>{tr('pos.disclaimer')}</p>
      </section>

      <div className="pos-chips" role="status" aria-live="polite">
        <span className={`chip ${anyLive ? 'chip-live' : 'chip-sim'}`}>
          {anyLive ? tr('pos.status.live') : tr('pos.status.simulation')}
        </span>
        <span className={`chip ${estimate.status === 'uncertain' ? 'chip-warn' : 'chip-neutral'}`}>{statusChip}</span>
        {liveSources.has('qr') && <span className="chip chip-live">{tr('pos.live.qr')}</span>}
        {liveSources.has('motion') && <span className="chip chip-live">{tr('pos.live.motion')}</span>}
        {liveSources.has('wifi') && <span className="chip chip-live">{tr('pos.live.wifi')}</span>}
        {liveSources.has('ble') && <span className="chip chip-live">{tr('pos.live.ble')}</span>}
      </div>

      <div className="pos-layout">
        <div className="map-card">
          <div className="map-head">
            <strong>{tr('pos.map')}</strong>
            <span className="muted">{room.widthM} × {room.heightM} m</span>
          </div>
          <IndoorMap
            room={room}
            estimate={estimate}
            truth={truth}
            trail={trail}
            selectedArtifactId={selectedArtifactId}
            lang={lang}
            onPickTarget={moveTarget}
          />
          <p className="muted" style={{ marginBottom: 0 }}>{tr('pos.mapHint')}</p>
          <ul className="map-legend">
            <li><span className="lg-dot lg-device" /> {tr('pos.legend.devices')}</li>
            <li><span className="lg-dot lg-artifact" /> {tr('pos.legend.artifacts')}</li>
            <li><span className="lg-dot lg-estimate" /> {tr('pos.legend.visitor')}</li>
            <li><span className="lg-dot lg-truth" /> {tr('pos.legend.truth')}</li>
            <li><span className="lg-ring" /> {tr('pos.legend.accuracy')}</li>
          </ul>
        </div>

        <div className="pos-side">
          <div className="panel">
            <h2 style={{ fontSize: 20 }}>{tr('pos.fusion')}</h2>
            <dl className="kv" style={{ marginTop: 10 }}>
              <dt>{tr('pos.position')}</dt>
              <dd dir="ltr">
                {estimate.position ? `${fmt2(estimate.position.x)} m, ${fmt2(estimate.position.y)} m` : '—'}
              </dd>
              <dt>{tr('pos.accuracy')}</dt>
              <dd dir="ltr">{estimate.accuracyM == null ? '—' : `±${fmt2(estimate.accuracyM)} m (1σ)`}</dd>
              <dt>{tr('pos.confidence')}</dt>
              <dd dir="ltr">{Math.round(estimate.confidence * 100)}%</dd>
              <dt>{tr('pos.nearest')}</dt>
              <dd>
                {nearestArtifactData ? artName(nearestArtifactData, lang) : tr('pos.nearest.none')}
                {nearest.distanceM != null && (
                  <span className="muted" dir="ltr"> · {fmt1(nearest.distanceM)} m</span>
                )}
              </dd>
            </dl>
            <p className={`nearest-reason ${nearest.ambiguity === 'clear' ? 'ok' : 'warn'}`}>
              {nearest.ambiguity === 'ambiguous' ? `⚠ ${tr('pos.nearest.ambiguous')} — ` : ''}
              {tr(nearestReasonKey)}
            </p>
            {estimate.references.length > 0 && (
              <p className="muted" style={{ marginBottom: 0 }}>{tr('pos.qrNote')}</p>
            )}
          </div>

          <div className="panel">
            <h2 style={{ fontSize: 20 }}>{tr('pos.controls')}</h2>
            <div className="field">
              <label htmlFor="scenario">{tr('pos.scenario')}</label>
              <select
                id="scenario"
                className="select"
                value={scenarioId}
                onChange={(e) => applyScenario(e.target.value as ScenarioId)}
              >
                {SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>{tr(`pos.scenario.${s.id}`)}</option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="seed">{tr('pos.seed')}</label>
                <input
                  id="seed"
                  className="text-input"
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value) || 0)}
                />
              </div>
              <div className="field">
                <label>{tr('pos.step')}</label>
                <div className="step-readout" dir="ltr">{step}</div>
              </div>
            </div>

            <div className="cta-row" style={{ marginTop: 0 }}>
              <button className="btn btn-gold btn-sm" onClick={advance}>{tr('pos.nextStep')} →</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAuto((v) => !v)}>
                {auto ? `■ ${tr('pos.stopAuto')}` : `▷ ${tr('pos.auto')}`}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={reset}>{tr('pos.reset')}</button>
            </div>

            <div className="field-row" style={{ marginTop: 14 }}>
              <div className="field">
                <label htmlFor="tx">{tr('pos.targetX')}</label>
                <input
                  id="tx"
                  type="range"
                  min={0}
                  max={room.widthM}
                  step={0.1}
                  value={truth.x}
                  onChange={(e) => moveTarget({ x: Number(e.target.value), y: truth.y })}
                />
              </div>
              <div className="field">
                <label htmlFor="ty">{tr('pos.targetY')}</label>
                <input
                  id="ty"
                  type="range"
                  min={0}
                  max={room.heightM}
                  step={0.1}
                  value={truth.y}
                  onChange={(e) => moveTarget({ x: truth.x, y: Number(e.target.value) })}
                />
              </div>
            </div>
            <p className="muted" style={{ marginBottom: 0 }} dir="ltr">
              truth: {fmt1(truth.x)}, {fmt1(truth.y)} m
            </p>
          </div>
        </div>
      </div>

      <div className="pos-layout">
        <div className="panel">
          <h2 style={{ fontSize: 20 }}>{tr('pos.qrSection')}</h2>
          <p className="muted">{tr('pos.lastScan')}</p>
          {lastScan ? (
            <div className="success-box" style={{ marginTop: 8 }}>
              <strong dir="ltr">
                {lastScan.live ? tr('pos.live.qr') : tr('pos.status.simulation')} · {lastScan.artifactId}
              </strong>
              <p className="muted" dir="ltr" style={{ margin: '6px 0 10px', wordBreak: 'break-all' }}>{lastScan.raw}</p>
              <button className="btn btn-gold btn-sm" onClick={useStoredScan}>{tr('pos.useScan')}</button>
            </div>
          ) : (
            <p className="muted" role="status">{tr('pos.noScan')}</p>
          )}
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="confirm-art">{tr('pos.confirmManual')}</label>
            <select id="confirm-art" className="select" defaultValue="" onChange={(e) => e.target.value && confirmArtifact(e.target.value)}>
              <option value="">—</option>
              {room.artifacts.map((a) => {
                const data = getArtifact(a.id);
                return (
                  <option key={a.id} value={a.id}>
                    {data ? artName(data, lang) : a.label}
                  </option>
                );
              })}
            </select>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>{tr('pos.qrNote')}</p>
        </div>

        <div className="panel">
          <h2 style={{ fontSize: 20 }}>{tr('pos.radioSection')}</h2>
          <div className="cta-row" style={{ marginTop: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={readWifi}>{tr('pos.readWifi')}</button>
          </div>
          {bridgeMessage && <p className="muted" role="status">{bridgeMessage}</p>}
          <p className="muted">{tr('pos.bleUnavailable')}</p>
          <h2 style={{ fontSize: 20, marginTop: 16 }}>{tr('pos.motionSection')}</h2>
          <div className="cta-row" style={{ marginTop: 0 }}>
            {motionState === 'running' ? (
              <button className="btn btn-ghost btn-sm" onClick={stopMotion}>{tr('pos.stopMotion')}</button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={startMotion}>{tr('pos.startMotion')}</button>
            )}
          </div>
          {motionState === 'running' && (
            <p className="muted" dir="ltr" role="status">● {motionSteps} steps</p>
          )}
          {motionState === 'unsupported' && <p className="muted" role="alert">⚠ {tr('pos.motionUnsupported')}</p>}
          {motionState === 'denied' && <p className="muted" role="alert">⚠ {tr('pos.motionDenied')}</p>}
        </div>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 20 }}>{tr('pos.evidence')}</h2>
        {contributionRows.length === 0 ? (
          <p className="muted">{tr('pos.evidence.empty')}</p>
        ) : (
          <div className="table-scroll">
            <table className="obs-table">
              <thead>
                <tr>
                  <th>{tr('pos.col.source')}</th>
                  <th>{tr('pos.col.value')}</th>
                  <th>{tr('pos.col.age')}</th>
                  <th>{tr('pos.col.sigma')}</th>
                  <th>{tr('pos.col.weight')}</th>
                  <th>{tr('pos.col.status')}</th>
                </tr>
              </thead>
              <tbody>
                {contributionRows.map((r) => (
                  <tr key={r.key} className={r.ok ? '' : 'rejected'}>
                    <td><span className={`src src-${r.source}`}>{r.source.toUpperCase()}</span></td>
                    <td dir="ltr">{r.value}</td>
                    <td dir="ltr">{r.age}s</td>
                    <td dir="ltr">{fmt1(r.sigma)}</td>
                    <td dir="ltr">{r.ok ? (r.weight == null ? '—' : `${r.weight}%`) : '—'}</td>
                    <td>{r.ok ? tr('pos.accepted') : `${tr('pos.rejected')}: ${r.reason}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {estimate.notes.length > 0 && (
          <p className="muted" dir="ltr" style={{ marginBottom: 0 }}>
            {tr('pos.notes')}: {estimate.notes.join(' · ')} · disagreement={fmt2(estimate.diagnostics.normalizedDisagreement)}σ
          </p>
        )}
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 20 }}>{tr('pos.evaluation')}</h2>
        <div className="cta-row" style={{ marginTop: 0 }}>
          <button className="btn btn-gold btn-sm" onClick={() => setReport(runEvaluation(room, { seed }))}>
            {tr('pos.runEvaluation')}
          </button>
        </div>
        {report && (
          <>
            <p className="muted">{tr('pos.evalNote')}</p>
            <div className="stat-grid">
              <div className="stat"><span>{tr('pos.testPoints')}</span><strong dir="ltr">{report.testPoints}</strong></div>
              <div className="stat"><span>{tr('pos.medianError')}</span><strong dir="ltr">{fmt2(report.medianErrorM)} m</strong></div>
              <div className="stat"><span>{tr('pos.p90Error')}</span><strong dir="ltr">{fmt2(report.p90ErrorM)} m</strong></div>
              <div className="stat"><span>{tr('pos.roomRate')}</span><strong dir="ltr">{Math.round(report.roomClassificationRate * 100)}%</strong></div>
              <div className="stat">
                <span>{tr('pos.nearestRate')}</span>
                <strong dir="ltr">{report.nearestArtifactAccuracy == null ? '—' : `${Math.round(report.nearestArtifactAccuracy * 100)}%`}</strong>
              </div>
            </div>
            <div className="table-scroll">
              <table className="obs-table">
                <thead>
                  <tr>
                    <th>{tr('pos.bySource')}</th>
                    <th>{tr('pos.medianError')}</th>
                    <th>{tr('pos.p90Error')}</th>
                    <th>{tr('pos.testPoints')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bySource.map((s) => (
                    <tr key={s.source}>
                      <td><span className={`src src-${s.source}`}>{s.source.toUpperCase()}</span></td>
                      <td dir="ltr">{fmt2(s.medianErrorM)} m</td>
                      <td dir="ltr">{fmt2(s.p90ErrorM)} m</td>
                      <td dir="ltr">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ marginBottom: 0 }} dir="ltr">
              mode: {report.mode} · seed: {report.seed}
            </p>
          </>
        )}
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 20 }}>{tr('pos.providers')}</h2>
        <ul className="provider-list">
          {providers.map((p) => (
            <li key={p.source}>
              <span className={`src src-${p.source}`}>{p.source.toUpperCase()}</span>
              <span className={p.available ? 'ok' : 'warn'}>
                {p.available ? tr('pos.available') : tr('pos.unavailable')}
              </span>
              <span className="muted">{p.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <details className="panel" style={{ marginTop: 16 }}>
        <summary style={{ cursor: 'pointer' }}>
          <strong>{tr('pos.layout')}</strong>
        </summary>
        <p className="muted">{tr('pos.mapHint')} · {tr('pos.obstacles')}</p>
        <textarea
          className="text-input layout-editor"
          dir="ltr"
          value={layoutText || JSON.stringify(room, null, 2)}
          onChange={(e) => setLayoutText(e.target.value)}
          rows={14}
          aria-label={tr('pos.layout')}
        />
        <div className="cta-row" style={{ marginTop: 8 }}>
          <button className="btn btn-gold btn-sm" onClick={applyLayout}>{tr('pos.applyLayout')}</button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setRoom(cloneRoom(DEMO_ROOM));
              setLayoutText('');
              setLayoutErrors([]);
              reset();
            }}
          >
            {tr('pos.resetLayout')}
          </button>
        </div>
        {layoutErrors.length > 0 && (
          <p className="muted" role="alert">⚠ {tr('pos.layoutError')}: {layoutErrors.join(', ')}</p>
        )}
        <p className="muted" style={{ marginBottom: 0 }}>
          {tr('pos.registry')}: {room.artifacts.map((a) => a.id).join(' · ')}
        </p>
      </details>

      <div className="back-row">
        <Link className="btn btn-ghost btn-sm" to="/">← {tr('common.home')}</Link>
        <Link className="btn btn-ghost btn-sm" to="/scan">{tr('nav.scan')}</Link>
      </div>
    </div>
  );
}

