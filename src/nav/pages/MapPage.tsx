import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CornerUpLeft,
  CornerUpRight,
  MoveUpLeft,
  MoveUpRight,
  Undo2,
  ChevronsUp,
  ChevronsDown,
  Flag,
  Search,
  QrCode,
  Crosshair,
  Pause,
  Play,
  TriangleAlert,
  ChevronUp,
  Users,
  Route
} from 'lucide-react';
import { useNav } from '../NavProvider';
import { navT, formatMeters, formatPct } from '../i18n';
import { MUSEUM, floorLabel, hallAt, museumArtifactById, type FloorId } from '../../data/museum';
import { FloorMap } from '../components/FloorMap';
import { usePlan } from '../../planner/PlanContext';

type Snap = 'peek' | 'half' | 'full';

const SNAP_ORDER: Snap[] = ['peek', 'half', 'full'];

function TurnGlyph({ kind, size = 44 }: { kind?: string; size?: number }) {
  const props = { size, strokeWidth: 1.6 } as const;
  switch (kind) {
    case 'left':
      return <CornerUpLeft {...props} />;
    case 'right':
      return <CornerUpRight {...props} />;
    case 'slight-left':
      return <MoveUpLeft {...props} />;
    case 'slight-right':
      return <MoveUpRight {...props} />;
    case 'uturn':
      return <Undo2 {...props} />;
    case 'stairs-up':
      return <ChevronsUp {...props} />;
    case 'stairs-down':
      return <ChevronsDown {...props} />;
    case 'arrive':
      return <Flag {...props} />;
    default:
      return <CornerUpRight {...props} />;
  }
}

export function MapPage() {
  const {
    lang,
    estimate,
    mode,
    simulationRunning,
    settings,
    closedHalls,
    route,
    routeError,
    targetId,
    progress,
    arrived,
    lastQr,
    walkerMode,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    walkRoute,
    freeWalk,
    setWalkSpeed,
    activateManual,
    placeManual,
    clearNavigation,
    nearestArtifact,
    artifactPosition,
    onboarded,
    crowdLevels
  } = useNav();
  const { suggestion, acceptSuggestion, dismissSuggestion, running: planRunning, activeIndex, plan } = usePlan();
  const navigate = useNavigate();
  const [floor, setFloor] = useState<FloorId>(estimate?.floor ?? 'ground');
  const [busy, setBusy] = useState(false);
  const [snap, setSnap] = useState<Snap>('peek');
  const [showCrowd, setShowCrowd] = useState(false);

  useEffect(() => {
    if (!onboarded && !estimate) navigate('/onboarding', { replace: true });
  }, [estimate, navigate, onboarded]);

  useEffect(() => {
    if (estimate?.floor) setFloor(estimate.floor);
  }, [estimate?.floor]);

  const target = targetId ? museumArtifactById(targetId) : undefined;
  const currentHall = estimate ? hallAt(estimate, estimate.floor) : null;
  const manualMode = mode === 'manual' || (!estimate && mode === 'idle');

  const nearby = useMemo(() => {
    if (!estimate) return [];
    return MUSEUM.artifacts
      .filter((artifact) => artifact.floor === estimate.floor)
      .map((artifact) => {
        const position = artifactPosition(artifact.id) ?? artifact;
        return { artifact, distanceM: Math.hypot(position.x - estimate.x, position.y - estimate.y) };
      })
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 4);
  }, [artifactPosition, estimate]);

  const nearest = estimate ? nearestArtifact(estimate) : null;
  const lowConfidence = Boolean(estimate && (estimate.confidence < 0.55 || estimate.accuracyRadiusM > 3.5));

  const begin = async () => {
    setBusy(true);
    await startSimulation();
    setBusy(false);
  };

  const sourceLabel =
    estimate?.source === 'qr'
      ? navT(lang, 'map.source.qr')
      : estimate?.source === 'motion'
        ? navT(lang, 'map.source.motion')
        : estimate?.source === 'manual'
          ? navT(lang, 'map.source.manual')
          : estimate?.source === 'ble'
            ? navT(lang, 'map.source.ble')
            : navT(lang, 'map.source.sim');

  const navigating = Boolean(route?.ok && target && !arrived);
  const instruction = progress?.instruction;
  const maneuverM = progress?.distanceToManeuverM ?? null;
  const cycleSnap = () => setSnap((s) => SNAP_ORDER[(SNAP_ORDER.indexOf(s) + 1) % SNAP_ORDER.length]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Map: full-bleed, the floor is the page. */}
      {/* While a route is live the banner sits on the map, so the map gets a
          taller frame to stay readable underneath it. */}
      <div
        className={`relative ${navigating ? 'aspect-[1.62/1]' : 'aspect-[2.1/1]'} shrink-0 overflow-hidden border-b border-rule bg-stone-100`}
      >
        <FloorMap
          floor={floor}
          onMapTap={manualMode ? (point) => placeManual(point) : undefined}
          onArtifactTap={(artifactId) => navigate(`/item/${artifactId}`)}
          showRoute
          crowdLevels={showCrowd ? crowdLevels : undefined}
          className="h-full w-full"
        />

        {/* The sign: only while navigating. */}
        {navigating && target ? (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-20">
            <div className="sign flex items-stretch gap-3 px-3 py-3">
              <div className="grid w-14 shrink-0 place-items-center rounded-sm bg-white/10">
                <TurnGlyph kind={instruction?.kind} />
              </div>
              <div className="min-w-0 flex-1">
                {instruction?.kind === 'arrive' ? (
                  <p className="text-xl font-semibold leading-none">{navT(lang, 'map.arrived')}</p>
                ) : (
                  <p className="num text-2xl font-semibold leading-none">
                    {maneuverM === null ? '—' : Math.max(1, Math.round(maneuverM))}
                    <span className="ms-1 text-base font-medium text-white/70">{lang === 'ar' ? 'م' : 'm'}</span>
                  </p>
                )}
                <p className="mt-1 truncate text-sm font-medium text-white">
                  {instruction?.label[lang] ?? navT(lang, 'map.routeBanner')}
                </p>
                <p className="sign-meta mt-0.5 truncate">{target.name[lang]}</p>
                {currentHall && <p className="sign-meta truncate">{currentHall.name[lang]}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-2 rounded-sm border border-rule bg-surface/95 px-3 py-2 backdrop-blur">
            <div className="min-w-0">
              <p className="label">{navT(lang, 'map.hall')}</p>
              <p className="truncate text-sm font-semibold text-ink">
                {currentHall ? currentHall.name[lang] : navT(lang, 'map.positionUnknown')}
              </p>
            </div>
            {estimate ? (
              <p className="num shrink-0 text-end text-xs text-ink-soft">
                <span className="block text-ink">{formatMeters(estimate.accuracyRadiusM, lang)}</span>
                <span className="block">{formatPct(estimate.confidence * 100, lang)}</span>
              </p>
            ) : (
              <span className="ui-chip shrink-0">{navT(lang, 'map.source.sim')}</span>
            )}
          </div>
        )}

        {/* Floor switch stays on the map. */}
        <div className="absolute inset-x-3 bottom-3 z-20 flex items-end justify-between gap-2">
          <div className="flex overflow-hidden rounded-sm border border-rule bg-surface/95 backdrop-blur">
            {(['ground', 'upper'] as FloorId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setFloor(id)}
                aria-pressed={floor === id}
                className={`min-h-11 px-3 text-xs font-medium ${
                  floor === id ? 'bg-ink text-white' : 'text-ink-soft'
                }`}
              >
                {floorLabel(id, lang)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {estimate && (
              <span className="ui-chip bg-surface/95 backdrop-blur" title={sourceLabel}>
                <span className="h-1.5 w-1.5 rounded-full bg-lapis" />
                {sourceLabel}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowCrowd((value) => !value)}
              aria-pressed={showCrowd}
              aria-label={navT(lang, 'crowd.overlay')}
              title={`${navT(lang, 'crowd.overlay')} (${navT(lang, 'crowd.simulated')})`}
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-sm border backdrop-blur ${
                showCrowd ? 'border-ink bg-ink text-white' : 'border-rule bg-surface/95 text-ink-soft'
              }`}
            >
              <Users size={16} strokeWidth={1.6} />
            </button>
            {mode === 'sim' && (
              <button
                type="button"
                onClick={() => (simulationRunning ? pauseSimulation() : resumeSimulation())}
                aria-label={simulationRunning ? navT(lang, 'map.pause') : navT(lang, 'map.resume')}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-rule bg-surface/95 text-ink-soft backdrop-blur"
              >
                {simulationRunning ? <Pause size={16} /> : <Play size={16} />}
              </button>
            )}
          </div>
        </div>

        {manualMode && (
          <div className="pointer-events-none absolute inset-x-3 bottom-14 z-10 rounded-sm bg-ink/90 px-3 py-1.5 text-xs text-white">
            {navT(lang, 'map.manualHint')}
          </div>
        )}
      </div>

      {/* One sheet: search, destination, route summary, nearby. */}
      <section
        className={`sheet z-20 flex flex-col overflow-hidden ${
          snap === 'peek'
            ? 'min-h-0 flex-1 border-t border-rule'
            : 'absolute inset-x-0 bottom-0 shadow-sign'
        }`}
        style={snap === 'peek' ? undefined : { height: snap === 'half' ? '54%' : '82%' }}
        aria-label={navT(lang, 'map.nearby')}
      >
        <button
          type="button"
          onClick={cycleSnap}
          className="flex min-h-11 w-full shrink-0 items-center justify-center py-2"
          aria-label={snap === 'full' ? navT(lang, 'sheet.collapse') : navT(lang, 'sheet.expand')}
        >
          <span className="sheet-handle m-0" />
          <ChevronUp
            size={14}
            className={`ms-1 text-ink-muted transition-transform ${snap === 'full' ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <Link
            to="/search"
            className="flex min-h-11 items-center gap-2 rounded-sm border border-rule bg-stone-100 px-3 text-sm text-ink-muted"
          >
            <Search size={17} className="text-ink-soft" />
            <span className="flex-1">{navT(lang, 'map.searchPlaceholder')}</span>
          </Link>

          <div className="mt-2 flex items-center justify-between gap-2">
            <Link to="/plan" className="inline-flex min-h-11 min-w-11 items-center gap-1.5 px-1 text-xs font-medium text-lapis">
              <Route size={15} strokeWidth={1.6} />
              {navT(lang, 'plan.open')}
            </Link>
            {planRunning && plan && (
              <span className="ui-chip border-lapis text-lapis">
                {navT(lang, 'plan.running')}
                <span className="num">{activeIndex + 1}/{plan.stops.length}</span>
              </span>
            )}
          </div>

          {suggestion && (
            <div className="mt-2 rounded-sm border border-ochre/40 bg-ochre/[0.06] p-3" role="status">
              <p className="text-sm font-semibold text-ink">{navT(lang, 'suggest.title')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                {navT(lang, 'suggest.body')} {navT(lang, 'suggest.alternative')}
              </p>
              <p className="mt-1 text-sm text-ink">
                {museumArtifactById(suggestion.artifactId)?.name[lang] ?? suggestion.artifactId}
                <span className="num ms-2 text-micro text-ink-muted" dir="ltr">
                  +{suggestion.extraMinutes.toFixed(1)} {lang === 'ar' ? 'د' : 'min'}
                </span>
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={acceptSuggestion} className="ui-btn-primary flex-1 py-2 text-xs">
                  {navT(lang, 'suggest.accept')}
                </button>
                <button type="button" onClick={dismissSuggestion} className="ui-btn-secondary flex-1 py-2 text-xs">
                  {navT(lang, 'suggest.dismiss')}
                </button>
              </div>
            </div>
          )}

          {navigating && route?.ok && target && (
            <div className="mt-3 border-t border-rule pt-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="label">{navT(lang, 'map.navigatingTo')}</p>
                <p className="num text-xs text-ink-soft">
                  {formatMeters(progress?.distanceToTargetM ?? route.totalDistanceM, lang)}
                </p>
              </div>
              <p className="mt-0.5 text-sm font-semibold text-ink">{target.name[lang]}</p>
              <p className="num mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                <span>
                  <span className="text-ink">
                    {route.instructions.filter((i) => i.kind !== 'start' && i.kind !== 'arrive').length + 1}
                  </span>{' '}
                  {lang === 'ar' ? 'خطوات' : 'steps'}
                </span>
                <span className="text-ink">{formatMeters(route.totalDistanceM, lang)}</span>
                {settings.accessible && <span>{navT(lang, 'settings.accessible')}</span>}
                <span dir="ltr">{route.computeMs.toFixed(2)} ms</span>
              </p>
              {progress && progress.offRouteM > 4 && progress.offRouteM < Number.POSITIVE_INFINITY && !(mode === 'sim' && walkerMode === 'free') && (
                <p className="mt-1 text-xs text-ochre">
                  {navT(lang, 'map.recalculating')} ({formatMeters(progress.offRouteM, lang)})
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={clearNavigation} className="ui-btn-secondary flex-1">
                  {navT(lang, 'map.stopNav')}
                </button>
                <Link to={`/item/${target.id}`} className="ui-btn-secondary flex-1">
                  {navT(lang, 'common.details')}
                </Link>
              </div>
            </div>
          )}

          {arrived && target && (
            <div className="mt-3 border-t border-rule pt-3">
              <p className="text-sm font-semibold text-malachite">{navT(lang, 'map.arrived')}</p>
              <p className="mt-0.5 text-lg font-semibold text-ink">{target.name[lang]}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{navT(lang, 'map.arrivedBody')}</p>
              <div className="mt-3 flex gap-2">
                <Link to={`/item/${target.id}`} className="ui-btn-primary flex-1">
                  {navT(lang, 'qr.openArtifact')}
                </Link>
                <button type="button" onClick={clearNavigation} className="ui-btn-secondary flex-1">
                  {navT(lang, 'map.stopNav')}
                </button>
              </div>
            </div>
          )}

          {routeError && (
            <div className="mt-3 border-t border-rule pt-3" role="alert">
              <p className="flex items-center gap-2 text-sm font-semibold text-carnelian">
                <TriangleAlert size={17} />
                {navT(lang, `route.reason.${routeError}`)}
              </p>
              {target && (
                <p className="mt-1 text-xs text-ink-soft">
                  {navT(lang, 'map.navigatingTo')}: {target.name[lang]}
                </p>
              )}
              <button type="button" onClick={clearNavigation} className="ui-btn-secondary mt-3 w-full">
                {navT(lang, 'map.stopNav')}
              </button>
            </div>
          )}

          {!estimate && (
            <div className="mt-3 border-t border-rule pt-3">
              <p className="text-sm font-semibold text-ink">{navT(lang, 'map.positionUnknown')}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{navT(lang, 'map.positionUnknownBody')}</p>
              <button type="button" onClick={begin} disabled={busy} className="ui-btn-primary mt-3 w-full">
                <Play size={16} />
                {navT(lang, 'map.startDemo')}
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/qr?entrance=1" className="ui-btn-secondary">
                  <QrCode size={16} />
                  {navT(lang, 'onboard.scanEntrance')}
                </Link>
                <button type="button" onClick={() => activateManual()} className="ui-btn-secondary">
                  <Crosshair size={16} />
                  {navT(lang, 'onboard.tapMap')}
                </button>
              </div>
            </div>
          )}

          {!route && targetId && target && estimate && (
            <button
              type="button"
              onClick={() => navigate(`/item/${target.id}`)}
              className="ui-btn-primary mt-3 w-full"
            >
              {navT(lang, 'map.navigatingTo')} {target.name[lang]}
            </button>
          )}

          {lowConfidence && nearest && (
            <div className="mt-3 border-t border-rule pt-3">
              <p className="text-xs leading-relaxed text-ochre">{navT(lang, 'map.lowConfidence')}</p>
              <Link to={`/qr?artifact=${nearest.artifact.id}`} className="ui-btn-secondary mt-2 w-full">
                <QrCode size={16} />
                {navT(lang, 'map.scanNearest')} — {nearest.artifact.name[lang]}
              </Link>
            </div>
          )}

          {lastQr?.ok && Date.now() - lastQr.at < 45000 && (
            <p className="mt-2 text-xs text-ink-soft">
              {navT(lang, 'qr.applied')} —{' '}
              {lastQr.kind === 'entrance' ? navT(lang, 'qr.entrance') : museumArtifactById(lastQr.artifactId ?? '')?.name[lang]}
              <span className="num ms-1 text-ink-muted">{Math.round((Date.now() - lastQr.at) / 1000)}s</span>
            </p>
          )}

          {(mode === 'sim' || route?.ok) && (
            <div className="mt-3 border-t border-rule pt-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="section-title">{navT(lang, 'walker.title')}</h2>
                <span className={`ui-chip ${walkerMode === 'route' && simulationRunning ? 'border-malachite text-malachite' : ''}`}>
                  {route?.ok && walkerMode === 'route' ? navT(lang, 'walker.following') : navT(lang, 'walker.free')}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={walkRoute}
                  disabled={!route?.ok}
                  aria-pressed={walkerMode === 'route'}
                  className={walkerMode === 'route' ? 'ui-btn-primary' : 'ui-btn-secondary'}
                >
                  {navT(lang, 'walker.followRoute')}
                </button>
                <button
                  type="button"
                  onClick={freeWalk}
                  aria-pressed={walkerMode === 'free'}
                  className={walkerMode === 'free' ? 'ui-btn-primary' : 'ui-btn-secondary'}
                >
                  {navT(lang, 'walker.freeWalk')}
                </button>
              </div>
              {!route?.ok && <p className="mt-1.5 text-xs text-ink-muted">{navT(lang, 'walker.noRoute')}</p>}
              <label className="mt-3 flex items-center justify-between gap-3 text-xs text-ink-soft">
                <span>{navT(lang, 'walker.speed')}</span>
                <span className="num font-medium text-ink" dir="ltr">
                  {settings.walkSpeedMps.toFixed(1)} m/s
                </span>
              </label>
              <input
                type="range"
                min={0.3}
                max={2}
                step={0.1}
                value={settings.walkSpeedMps}
                onChange={(event) => setWalkSpeed(Number(event.target.value))}
                aria-label={navT(lang, 'walker.speed')}
                className="mt-1 h-11 w-full accent-lapis"
              />
              <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'walker.note')}</p>
            </div>
          )}

          <div className="mt-3 flex items-baseline justify-between border-t border-rule pt-3">
            <h2 className="section-title">{navT(lang, 'map.nearby')}</h2>
            <Link to="/search" className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-xs font-medium text-lapis">
              {navT(lang, 'search.title')}
            </Link>
          </div>

          {nearby.length === 0 && (
            <p className="mt-2 text-xs text-ink-muted">{navT(lang, 'search.floorNote')}</p>
          )}

          <ul className="mt-1 divide-y divide-rule">
            {nearby.map(({ artifact, distanceM }) => (
              <li key={artifact.id}>
                <Link to={`/item/${artifact.id}`} className="flex min-h-14 items-center gap-3 py-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-rule text-xs font-semibold text-ink-soft">
                    {artifact.short[lang].slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{artifact.name[lang]}</span>
                    <span className="block truncate text-xs text-ink-muted">{artifact.qrId}</span>
                  </span>
                  <span className="num shrink-0 text-end text-xs text-ink-soft">
                    {formatMeters(distanceM, lang)}
                    <span className="block text-micro text-ink-muted">{floorLabel(artifact.floor, lang)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-lapis" /> {navT(lang, 'map.legend.you')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-lapis" /> {navT(lang, 'map.legend.route')}
            </span>
            {settings.accessible && <span>{navT(lang, 'settings.accessible')}</span>}
            {closedHalls.length > 0 && <span className="text-carnelian">{navT(lang, 'map.legend.closed')}</span>}
            {showCrowd && (
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm border border-rule" /> {navT(lang, 'crowd.quiet')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-ochre/30" /> {navT(lang, 'crowd.busy')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-ochre/70" /> {navT(lang, 'crowd.crowded')}
                </span>
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
