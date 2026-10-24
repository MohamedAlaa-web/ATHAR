import { useState } from 'react';
import { useNav } from '../NavProvider';
import { formatMeters, formatPct, navT } from '../i18n';
import { FloorMap } from '../components/FloorMap';
import { ScenarioChart, SHORT as SHORT_CONFIG } from '../components/ScenarioChart';
import { NavHeader } from '../components/NavLayout';
import { FUSION_CONFIGS, runScenarioMatrix, type ScenarioMatrix } from '../../positioning/core/scenario';
import { benchmarkRouting, type RouteBenchmarkResult } from '../../debug/benchmark';
import { downloadText, scenarioToCsv, scenarioToJson, timestampSlug } from '../../debug/export';
import {
  runSmartVisitEvaluation,
  smartVisitToCsv,
  smartVisitToJson,
  type SmartVisitEvaluation
} from '../../evaluation/smartVisit';
import type { FloorId } from '../../data/museum';

const num = (value: number | null | undefined, digits = 2) =>
  value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);

export function DebugPage() {
  const { lang, estimate, truth, metrics, route, simulationRunning, motionRunning, startSimulation, settings } = useNav();
  const trackingLive = simulationRunning || motionRunning;
  const [floor, setFloor] = useState<FloorId>('ground');
  const [matrix, setMatrix] = useState<ScenarioMatrix | null>(null);
  const [running, setRunning] = useState(false);
  const [runMs, setRunMs] = useState<number | null>(null);
  const [bench, setBench] = useState<RouteBenchmarkResult | null>(null);
  const [benchRunning, setBenchRunning] = useState(false);
  const [smart, setSmart] = useState<SmartVisitEvaluation | null>(null);
  const [smartRunning, setSmartRunning] = useState(false);

  const liveError = truth && estimate ? Math.hypot(truth.x - estimate.x, truth.y - estimate.y) : null;

  const runScenarios = () => {
    setRunning(true);
    window.setTimeout(() => {
      const started = performance.now();
      const result = runScenarioMatrix({ seed: 2026 });
      setMatrix(result);
      setRunMs(performance.now() - started);
      setRunning(false);
    }, 60);
  };

  const runBenchmark = () => {
    setBenchRunning(true);
    window.setTimeout(() => {
      setBench(benchmarkRouting(40));
      setBenchRunning(false);
    }, 40);
  };

  const runSmart = () => {
    setSmartRunning(true);
    window.setTimeout(() => {
      setSmart(runSmartVisitEvaluation());
      setSmartRunning(false);
    }, 60);
  };

  const configLabel = (id: string) => FUSION_CONFIGS.find((config) => config.id === id)?.label[lang] ?? id;

  return (
    <div className="min-h-dvh bg-stone">
      <div className="mx-auto w-full max-w-[680px] bg-surface md:my-4 md:min-h-[calc(100dvh-2rem)] md:rounded-[2rem] md:border md:border-rule">
        <NavHeader back title={navT(lang, 'debug.title')} />
        <main className="space-y-4 px-4 pb-10 pt-4">
          <div>
            <h1 className="text-lg text-ink">{lang === 'ar' ? 'قياس صادق' : 'Measured, not claimed'}</h1>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{navT(lang, 'debug.sub')}</p>
          </div>

          <section className="ui-card overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 pt-4">
              <div className="flex rounded-full border border-rule bg-stone-100 p-1">
                {(['ground', 'upper'] as FloorId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFloor(id)}
                    className={`min-h-11 rounded-sm px-3 text-xs font-medium ${floor === id ? 'bg-ink text-white' : 'text-ink-muted'}`}
                  >
                    {id === 'ground' ? navT(lang, 'common.ground') : navT(lang, 'common.upper')}
                  </button>
                ))}
              </div>
              <span className={`ui-chip whitespace-nowrap text-micro ${truth ? 'border-malachite text-malachite' : 'text-ink-muted'}`}>
                {truth
                  ? lang === 'ar' ? 'موقع حقيقي (محاكاة)' : 'simulated truth'
                  : lang === 'ar' ? 'لا موقع حقيقي' : 'no truth'}
              </span>
            </div>
            <FloorMap floor={floor} showTruth showBeacons showRoute className="aspect-[2/1] px-1" />
            <div className="grid grid-cols-3 gap-2 p-4 text-micro">
              <div>
                <p className="text-ink-muted">{lang === 'ar' ? 'الحقيقي' : 'truth'}</p>
                <p className="mt-0.5 num text-ink-soft" dir="ltr">
                  {truth ? `${truth.x.toFixed(1)}, ${truth.y.toFixed(1)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-ink-muted">{lang === 'ar' ? 'التقدير' : 'estimate'}</p>
                <p className="mt-0.5 num text-ink-soft" dir="ltr">
                  {estimate ? `${estimate.x.toFixed(1)}, ${estimate.y.toFixed(1)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-ink-muted">{navT(lang, 'debug.error')}</p>
                <p className={`mt-0.5 num ${liveError != null && liveError > 3 ? 'text-carnelian' : 'text-malachite'}`} dir="ltr">
                  {liveError != null ? `${liveError.toFixed(2)} m` : '—'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-4 text-micro text-ink-muted">
              <span>{navT(lang, 'debug.col.hall')}: <span className="text-ink-soft">{estimate?.hallId ?? '—'}</span></span>
              <span>{navT(lang, 'debug.col.radius')}: <span className="num text-ink-soft">{estimate ? formatMeters(estimate.accuracyRadiusM, lang) : '—'}</span></span>
              <span>{navT(lang, 'debug.col.conf')}: <span className="num text-ink-soft">{estimate ? formatPct(estimate.confidence * 100, lang) : '—'}</span></span>
              <span>{navT(lang, 'debug.col.source')}: <span className="text-ink-soft">{estimate?.source ?? '—'}</span></span>
              {!estimate && (
                <button type="button" onClick={startSimulation} className="ui-btn-secondary ms-auto py-1.5 text-micro">
                  {navT(lang, 'map.startDemo')}
                </button>
              )}
            </div>
          </section>

          {!truth && (
            <p className="border-s-2 border-ochre px-3 py-1.5 text-micro leading-relaxed text-ochre">
              {navT(lang, 'debug.noTruth')}
            </p>
          )}

          <section className="ui-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="section-title">{navT(lang, 'debug.liveMetrics')}</h2>
              <span
                className={`ui-chip shrink-0 ${
                  trackingLive
                    ? 'border-malachite bg-malachite/10 text-malachite'
                    : 'border-rule bg-lapis/10 text-lapis'
                }`}
                role="status"
                aria-live="polite"
              >
                {trackingLive ? `● ${navT(lang, 'debug.liveBadge')}` : `Ⅱ ${navT(lang, 'debug.staleBadge')}`}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              {!trackingLive && (
                <p className="text-micro leading-relaxed text-lapis/90">{navT(lang, 'debug.staleBody')}</p>
              )}
              <span className="ms-auto shrink-0 text-micro text-ink-muted">
                {metrics.samples} {navT(lang, 'debug.samples')} — {metrics.elapsedSec.toFixed(1)} s
              </span>
            </div>                <dl className={`mt-2 divide-y divide-rule border-y border-rule transition-opacity ${trackingLive ? '' : 'opacity-40'}`}>
                  {[
                { label: navT(lang, 'debug.mean'), value: formatMeters(metrics.meanErrorM, lang, 2) },
                { label: navT(lang, 'debug.median'), value: formatMeters(metrics.medianErrorM, lang, 2) },
                { label: navT(lang, 'debug.p95'), value: formatMeters(metrics.p95ErrorM, lang, 2) },
                { label: navT(lang, 'debug.updateRate'), value: `${metrics.updateRateHz.toFixed(2)} Hz` },
                { label: navT(lang, 'debug.hallAcc'), value: metrics.hallAccuracyPct == null ? '—' : formatPct(metrics.hallAccuracyPct, lang) },
                { label: navT(lang, 'debug.nearestAcc'), value: metrics.nearestArtifactAccuracyPct == null ? '—' : formatPct(metrics.nearestArtifactAccuracyPct, lang) },
                { label: navT(lang, 'debug.readings'), value: `${metrics.lastReadingsUsed} / 4` },
                {
                  label: navT(lang, 'debug.scanInterval'),
                  value: `${settings.lowPower ? 2000 : 1000} ms`
                }                ].map((item) => (
                  <div key={item.label} className="flex items-baseline justify-between gap-3 py-1.5">
                    <dt className="text-xs text-ink-soft">{item.label}</dt>
                    <dd className="num text-sm font-medium text-ink" dir="ltr">{item.value}</dd>
                  </div>
                ))}
                </dl>
            <div className={`mt-3 border-y border-rule py-3 transition-opacity ${trackingLive ? '' : 'opacity-40'}`}>
              <p className="text-micro text-ink-muted">{navT(lang, 'debug.battery')}</p>
              <div className="mt-1.5 grid grid-cols-3 gap-2 text-micro">
                <span className="text-ink-soft">{navT(lang, 'debug.activations')}<br /><b className="num text-ink">{metrics.sensorActivationsPerMin.toFixed(1)}</b></span>
                <span className="text-ink-soft">{navT(lang, 'debug.cpuOps')}<br /><b className="num text-ink">{metrics.cpuOpsPerMin.toFixed(1)}</b></span>
                <span className="text-ink-soft">{navT(lang, 'debug.scanInterval')}<br /><b className="num text-ink">{settings.lowPower ? '2000' : '1000'} ms</b></span>
              </div>
              <p className="mt-2 text-micro leading-relaxed text-ink-muted">
                {lang === 'ar'
                  ? 'مؤشر شفاف: تنشيطات الحساسات وعمليات التقدير في الدقيقة، وليس نسبة بطارية مُدّعاة.'
                  : 'A transparent proxy: sensor activations and estimator operations per minute — not an invented battery percentage.'}
              </p>
            </div>
            <div className={`mt-2 grid grid-cols-2 gap-2 text-micro text-ink-muted transition-opacity ${trackingLive ? '' : 'opacity-40'}`}>
              <span>{lang === 'ar' ? 'عمليات التثليث' : 'trilaterations'}: <b className="num text-ink-soft">{metrics.trilaterations}</b></span>
              <span>{lang === 'ar' ? 'خطوات PDR' : 'PDR steps'}: <b className="num text-ink-soft">{metrics.pdrSteps}</b></span>
              <span>{lang === 'ar' ? 'إعادة حساب المسار' : 'route recomputes'}: <b className="num text-ink-soft">{metrics.routeRecomputations}</b></span>
              <span>{lang === 'ar' ? 'آخر حساب مسار' : 'last route'}: <b className="num text-ink-soft">{metrics.lastRouteComputeMs == null ? '—' : `${metrics.lastRouteComputeMs.toFixed(2)} ms`}</b></span>
            </div>
            <p className="mt-2 text-micro text-ink-muted">
              {lang === 'ar' ? 'المسار النشط' : 'active route'}:{' '}
              {route?.ok
                ? `${route.totalDistanceM.toFixed(1)} m / ${route.points.length} pts`
                : lang === 'ar' ? 'لا يوجد' : 'none'}
              <span className="ms-3">{lang === 'ar' ? 'المحاكي' : 'simulator'}: {simulationRunning ? (lang === 'ar' ? 'يعمل' : 'running') : (lang === 'ar' ? 'متوقف' : 'stopped')}</span>
            </p>
          </section>

          <section className="ui-card p-4">
            <h2 className="section-title">{navT(lang, 'debug.scenario')}</h2>
            <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'debug.scenarioBody')}</p>
            <button type="button" onClick={runScenarios} disabled={running} className="ui-btn-primary mt-3 w-full">
              {running ? navT(lang, 'debug.running') : navT(lang, 'debug.run')}
            </button>
            {!matrix && !running && <p className="mt-2 text-micro text-ink-muted">{navT(lang, 'debug.noData')}</p>}

            {matrix && (
              <>
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-ink-soft">{navT(lang, 'debug.compare')}</h3>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full border-collapse text-micro">
                      <thead>
                        <tr className="text-start text-ink-muted">
                          {[navT(lang, 'debug.config'), navT(lang, 'debug.mean'), navT(lang, 'debug.median'), navT(lang, 'debug.p95'), navT(lang, 'debug.hallAcc'), navT(lang, 'debug.qrResets')].map((label) => (
                            <th key={label} className="border-b border-rule px-1.5 py-1 text-start font-medium">{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-ink-soft">
                        {matrix.configSummary.map((row) => (
                          <tr key={row.config}>
                            <td className="border-b border-rule px-1.5 py-1">{configLabel(row.config)}</td>
                            <td className="num border-b border-rule px-1.5 py-1" dir="ltr">{row.meanErrorM.toFixed(2)} m</td>
                            <td className="num border-b border-rule px-1.5 py-1" dir="ltr">{row.medianErrorM.toFixed(2)}</td>
                            <td className="num border-b border-rule px-1.5 py-1" dir="ltr">{row.p95ErrorM.toFixed(2)}</td>
                            <td className="num border-b border-rule px-1.5 py-1" dir="ltr">{row.hallAccuracyPct.toFixed(1)}%</td>
                            <td className="num border-b border-rule px-1.5 py-1" dir="ltr">{row.qrResetsAvg.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-ink-soft">{navT(lang, 'debug.chart')}</h3>
                  <ScenarioChart matrix={matrix} lang={lang} />
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-ink-soft">{navT(lang, 'debug.results')}</h3>
                  <span className="text-micro text-ink-muted">
                    {matrix.runs.length} {navT(lang, 'debug.runs')}
                    <span className="ms-2">{runMs == null ? '—' : `${Math.round(runMs)} ms`}</span>
                    <span className="ms-2">{navT(lang, 'debug.seed')} {matrix.seed}</span>
                  </span>
                </div>
                {/* Seven columns is what a 390 px sheet holds without sideways
                    scrolling; nearest-artifact and readings are still in the CSV. */}
                <div className="mt-2">
                  <table className="w-full border-collapse text-micro">
                    <thead>
                      <tr className="text-start text-ink-muted">
                        {[navT(lang, 'debug.config'), navT(lang, 'debug.crowd'), navT(lang, 'debug.mean'), navT(lang, 'debug.median'), navT(lang, 'debug.p95'), navT(lang, 'debug.hallAcc'), navT(lang, 'debug.qrResets')].map((label) => (
                          <th key={label} className="border-b border-rule px-1 py-1.5 text-start font-medium">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-ink-soft">
                      {matrix.summary.map((row) => (
                        <tr key={`${row.config}-${row.crowd}`}>
                          <td className="whitespace-nowrap border-b border-rule px-1 py-1.5">{SHORT_CONFIG[row.config] ?? configLabel(row.config)}</td>
                          <td className="border-b border-rule px-1 py-1.5">{row.crowd}</td>
                          <td className="num whitespace-nowrap border-b border-rule px-1 py-1.5" dir="ltr">{row.meanErrorM.toFixed(2)}</td>
                          <td className="num whitespace-nowrap border-b border-rule px-1 py-1.5" dir="ltr">{row.medianErrorM.toFixed(2)}</td>
                          <td className="num whitespace-nowrap border-b border-rule px-1 py-1.5" dir="ltr">{row.p95ErrorM.toFixed(2)}</td>
                          <td className="num whitespace-nowrap border-b border-rule px-1 py-1.5" dir="ltr">{row.hallAccuracyPct.toFixed(1)}%</td>
                          <td className="num whitespace-nowrap border-b border-rule px-1 py-1.5" dir="ltr">{row.qrResetsAvg.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-1 text-micro text-ink-muted">
                    {lang === 'ar'
                      ? 'المتوسط والوسيط والمئين 95 بالمتر، وكشف القاعة بالنسبة، وإعادة ضبط QR بعدد المرات.'
                      : 'Mean, median and P95 in metres; hall detection in percent; QR resets as a count.'}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadText(`athar-scenarios-${timestampSlug()}.json`, scenarioToJson(matrix), 'application/json')}
                    className="ui-btn-secondary py-2 text-[11px]"
                  >
                    {navT(lang, 'debug.exportJson')}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadText(`athar-scenarios-${timestampSlug()}.csv`, scenarioToCsv(matrix), 'text/csv')}
                    className="ui-btn-secondary py-2 text-[11px]"
                  >
                    {navT(lang, 'debug.exportCsv')}
                  </button>
                </div>

                <details className="mt-3 rounded-sm border border-rule p-2.5">
                  <summary className="cursor-pointer text-micro font-semibold text-ink-soft">{navT(lang, 'debug.details')}</summary>
                  <div className="mt-2 max-h-64 overflow-auto">
                    <table className="w-full min-w-[460px] border-collapse text-micro">
                      <thead className="sticky top-0 bg-surface">
                        <tr className="text-ink-muted">
                          <th className="px-1 py-1 text-start">{navT(lang, 'debug.path')}</th>
                          <th className="px-1 py-1 text-start">{navT(lang, 'debug.crowd')}</th>
                          <th className="px-1 py-1 text-start">{navT(lang, 'debug.config')}</th>
                          <th className="px-1 py-1 text-start">{navT(lang, 'debug.mean')}</th>
                          <th className="px-1 py-1 text-start">P95</th>
                          <th className="px-1 py-1 text-start">{navT(lang, 'debug.qrResets')}</th>
                        </tr>
                      </thead>
                      <tbody className="text-ink-soft">
                        {matrix.runs.map((run) => (
                          <tr key={run.id}>
                            <td className="border-b border-rule px-1 py-1">{run.pathName[lang]}</td>
                            <td className="border-b border-rule px-1 py-1">{run.crowd}</td>
                            <td className="border-b border-rule px-1 py-1">{configLabel(run.config)}</td>
                            <td className="border-b border-rule px-1 py-1 num" dir="ltr">{run.meanErrorM.toFixed(2)}</td>
                            <td className="border-b border-rule px-1 py-1 num" dir="ltr">{run.p95ErrorM.toFixed(2)}</td>
                            <td
                              className="border-b border-rule px-1 py-1 num"
                              dir="ltr"
                              title={run.qrResets.map((reset) => `${reset.atSec}s ${reset.kind}${reset.artifactId ? `:${reset.artifactId}` : ''}`).join(', ')}
                            >
                              {run.qrResetCount} · {run.qrResets.map((reset) => `${reset.atSec}s`).join(', ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
          </section>

          <section className="ui-card p-4">
            <h2 className="section-title">{navT(lang, 'debug.routing')}</h2>
            <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'debug.routingBody')}</p>
            <button type="button" onClick={runBenchmark} disabled={benchRunning} className="ui-btn-secondary mt-3 w-full py-2 text-xs">
              {benchRunning ? navT(lang, 'debug.running') : navT(lang, 'debug.routingRun')}
            </button>
            {bench && (
              <div className="mt-3">
                <dl className="mt-3 divide-y divide-rule border-y border-rule text-xs">
                  {[
                    { label: navT(lang, 'debug.routingP50'), value: bench.p50Ms },
                    { label: navT(lang, 'debug.routingP95'), value: bench.p95Ms },
                    { label: navT(lang, 'debug.routingMax'), value: bench.maxMs }
                  ].map((item) => (
                    <div key={item.label} className="flex items-baseline justify-between gap-3 py-1.5">
                      <dt className="text-ink-soft">{item.label}</dt>
                      <dd className="num font-medium text-ink" dir="ltr">{item.value.toFixed(2)} ms</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-1 text-micro text-ink-muted">
                  {bench.samples} {navT(lang, 'debug.routes')}
                </p>
                <div className="mt-2 space-y-1 text-micro text-ink-muted">
                  {bench.routes.map((route) => (
                    <div key={route.name} className="flex justify-between gap-2">
                      <span className="truncate">{route.name}</span>
                      <span className="shrink-0 num" dir="ltr">{route.distanceM.toFixed(1)} m / {route.instructions} / {route.computeMs} ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="ui-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="section-title">{navT(lang, 'eval.smartTitle')}</h2>
              <span className="ui-chip shrink-0 py-0.5 text-micro">{navT(lang, 'crowd.simulated')}</span>
            </div>
            <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'eval.smartBody')}</p>
            <button type="button" onClick={runSmart} disabled={smartRunning} className="ui-btn-secondary mt-3 w-full py-2 text-xs">
              {smartRunning ? navT(lang, 'debug.running') : navT(lang, 'eval.run')}
            </button>

            {smart && (
              <>
                <p
                  className={`mt-3 border-s-2 px-2 py-1 text-micro ${
                    smart.planner.allWithinBudget ? 'border-malachite text-malachite' : 'border-carnelian text-carnelian'
                  }`}
                >
                  {smart.planner.allWithinBudget
                    ? navT(lang, 'eval.withinBudget')
                    : navT(lang, 'eval.outOfBudget')}
                  <span className="num ms-2 text-ink-muted" dir="ltr">
                    mean {smart.planner.meanComputeMs.toFixed(2)} ms · {smart.planner.runs} runs
                  </span>
                </p>

                <div className="mt-2 overflow-x-auto">
                  <table className="w-full border-collapse text-micro">
                    <thead>
                      <tr className="text-start text-ink-muted">
                        {[
                          navT(lang, 'eval.profile'),
                          navT(lang, 'eval.budget'),
                          navT(lang, 'eval.planned'),
                          navT(lang, 'eval.stops'),
                          navT(lang, 'eval.value'),
                          navT(lang, 'eval.baseline'),
                          navT(lang, 'eval.compute')
                        ].map((label) => (
                          <th key={label} className="whitespace-nowrap border-b border-rule px-1 py-1 text-start font-medium">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-ink-soft">
                      {smart.planner.rows.map((row) => (
                        <tr key={`${row.profile}-${row.budgetMinutes}`}>
                          <td className="border-b border-rule px-1 py-1">{row.profileLabel[lang]}</td>
                          <td className="num border-b border-rule px-1 py-1" dir="ltr">{row.budgetMinutes}</td>
                          <td className="num border-b border-rule px-1 py-1" dir="ltr">{row.plannedMinutes.toFixed(1)}</td>
                          <td className="num border-b border-rule px-1 py-1" dir="ltr">{row.stops}</td>
                          <td className="num border-b border-rule px-1 py-1" dir="ltr">{row.value.toFixed(1)}</td>
                          <td className="num border-b border-rule px-1 py-1" dir="ltr">{row.baselineValue.toFixed(1)}</td>
                          <td className="num border-b border-rule px-1 py-1" dir="ltr">{row.computeMs.toFixed(2)} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-ink-soft">{navT(lang, 'eval.crowdSummary')}</h3>
                  <dl className="mt-2 divide-y divide-rule border-y border-rule text-micro">
                    {[
                      {
                        label: navT(lang, 'eval.avgLength'),
                        plain: `${smart.crowd.averagePlainLengthM.toFixed(1)} m`,
                        crowd: `${smart.crowd.averageCrowdLengthM.toFixed(1)} m`
                      },
                      {
                        label: navT(lang, 'eval.avgExposure'),
                        plain: smart.crowd.averagePlainExposure.toFixed(2),
                        crowd: smart.crowd.averageCrowdExposure.toFixed(2)
                      }
                    ].map((item) => (
                      <div key={item.label} className="flex items-baseline justify-between gap-2 py-1.5">
                        <dt className="text-ink-soft">{item.label}</dt>
                        <dd className="num text-ink" dir="ltr">
                          {item.plain} → {item.crowd}
                        </dd>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between gap-2 py-1.5">
                      <dt className="text-ink-soft">{navT(lang, 'eval.changed')}</dt>
                      <dd className="num text-ink" dir="ltr">
                        {smart.crowd.changedRoutes} / {smart.crowd.runs} · alpha {smart.crowd.alpha}
                      </dd>
                    </div>
                  </dl>
                  <details className="mt-2 rounded-sm border border-rule p-2.5">
                    <summary className="cursor-pointer text-micro font-semibold text-ink-soft">
                      {smart.crowd.runs} routes
                    </summary>
                    <div className="mt-2 max-h-56 overflow-auto">
                      <table className="w-full min-w-[420px] border-collapse text-micro">
                        <thead className="sticky top-0 bg-surface">
                          <tr className="text-ink-muted">
                            <th className="px-1 py-1 text-start">from</th>
                            <th className="px-1 py-1 text-start">to</th>
                            <th className="px-1 py-1 text-start">{navT(lang, 'eval.avgLength')}</th>
                            <th className="px-1 py-1 text-start">{navT(lang, 'eval.avgExposure')}</th>
                          </tr>
                        </thead>
                        <tbody className="text-ink-soft">
                          {smart.crowd.rows.map((row) => (
                            <tr key={`${row.from}-${row.to}`}>
                              <td className="border-b border-rule px-1 py-1">{row.from}</td>
                              <td className="border-b border-rule px-1 py-1">{row.to}</td>
                              <td className="num border-b border-rule px-1 py-1" dir="ltr">
                                {row.plainLengthM.toFixed(1)} → {row.crowdLengthM.toFixed(1)}
                              </td>
                              <td className="num border-b border-rule px-1 py-1" dir="ltr">
                                {row.plainExposure.toFixed(2)} → {row.crowdExposure.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadText(`athar-smart-visit-${timestampSlug()}.json`, smartVisitToJson(smart), 'application/json')}
                    className="ui-btn-secondary py-2 text-[11px]"
                  >
                    {navT(lang, 'eval.exportJson')}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadText(`athar-smart-visit-${timestampSlug()}.csv`, smartVisitToCsv(smart), 'text/csv')}
                    className="ui-btn-secondary py-2 text-[11px]"
                  >
                    {navT(lang, 'eval.exportCsv')}
                  </button>
                </div>
                <p className="mt-2 text-micro leading-relaxed text-ink-muted">{navT(lang, 'eval.note')}</p>
              </>
            )}
          </section>

          <p className="border-t border-rule pt-3 text-micro leading-relaxed text-ink-muted">
            {navT(lang, 'debug.notes')}
          </p>
        </main>
      </div>
    </div>
  );
}
