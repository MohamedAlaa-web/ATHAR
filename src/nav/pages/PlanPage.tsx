import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Footprints, MapPin, Timer, TriangleAlert } from 'lucide-react';
import { useNav } from '../NavProvider';
import { usePlan } from '../../planner/PlanContext';
import { useRewards } from '../../rewards/RewardsContext';
import { navT } from '../i18n';
import { MUSEUM, museumArtifactById, hallById, floorLabel } from '../../data/museum';
import {
  DEFAULT_WALK_SPEED_MPS,
  INTEREST_LABEL,
  INTEREST_TAGS,
  type InterestTag,
  type PlanInput,
  type SkipReason
} from '../../planner/types';

const BUDGETS = [45, 90, 150] as const;
const num = (value: number, digits = 1) => value.toFixed(digits);

export function PlanPage() {
  const { lang, estimate, crowdLevels, settings } = useNav();
  const { plan, input, running, activeIndex, completed, startPlan, beginTour, stopTour, reportBehind } = usePlan();
  const { state: rewards } = useRewards();

  const [budget, setBudget] = useState<number>(90);
  const [interests, setInterests] = useState<InterestTag[]>(['royal']);
  const [avoidStairs, setAvoidStairs] = useState(settings.accessible);
  const [speed, setSpeed] = useState(DEFAULT_WALK_SPEED_MPS);
  const [behind, setBehind] = useState(false);

  const start = estimate
    ? { x: estimate.x, y: estimate.y, floor: estimate.floor }
    : { x: MUSEUM.entrance.x, y: MUSEUM.entrance.y, floor: MUSEUM.entrance.floor };

  const buildInput = (): PlanInput => ({
    start,
    budgetMinutes: budget,
    interests,
    avoidStairs,
    speedMps: speed,
    crowd: crowdLevels,
    alpha: 0.5
  });

  const build = () => {
    startPlan(buildInput());
    setBehind(false);
  };

  const toggleInterest = (tag: InterestTag) => {
    setInterests((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]
    );
  };

  const currentStop = plan && running ? plan.stops[activeIndex] : null;
  const nextStop = plan && running ? plan.stops[activeIndex + 1] : null;

  const totalStops = plan?.stops.length ?? 0;
  const progressPct = totalStops ? Math.round((completed.length / totalStops) * 100) : 0;

  const skippedByReason = useMemo(() => {
    if (!plan) return [] as Array<{ artifactId: string; reason: SkipReason }>;
    return [...plan.skipped].sort((a, b) => a.artifactId.localeCompare(b.artifactId));
  }, [plan]);

  return (
    <div className="min-h-0 flex-1">
      <main className="space-y-4 px-4 pb-8 pt-5">
        <section>
          <h1 className="text-lg text-ink">{navT(lang, 'plan.title')}</h1>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{navT(lang, 'plan.sub')}</p>
        </section>

        <section className="border-t border-rule pt-3">
          <div className="flex items-baseline justify-between">
            <h2 className="section-title">{navT(lang, 'plan.time')}</h2>
            <span className="num text-xs text-ink-soft">
              {budget} {navT(lang, 'plan.minutes')}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {BUDGETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={budget === minutes}
                onClick={() => setBudget(minutes)}
                className={`min-h-11 rounded-sm border px-2 text-sm font-semibold ${
                  budget === minutes ? 'border-ink bg-ink text-white' : 'border-rule bg-surface text-ink-soft'
                }`}
              >
                <span className="num">{minutes}</span> {navT(lang, 'plan.minutes')}
              </button>
            ))}
          </div>
        </section>

        <section className="border-t border-rule pt-3">
          <h2 className="section-title">{navT(lang, 'plan.interests')}</h2>
          <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'plan.interestsNote')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTEREST_TAGS.map((tag) => {
              const active = interests.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleInterest(tag)}
                  className={`min-h-11 rounded-full border px-3 text-xs font-medium ${
                    active ? 'border-lapis bg-lapis text-white' : 'border-rule bg-surface text-ink-soft'
                  }`}
                >
                  {INTEREST_LABEL[tag][lang]}
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-t border-rule pt-3">
          <button
            type="button"
            onClick={() => setAvoidStairs((value) => !value)}
            className="flex w-full items-start justify-between gap-4 py-1 text-start"
          >
            <span>
              <span className="block text-sm font-medium text-ink">{navT(lang, 'plan.stairs')}</span>
              <span className="mt-0.5 block text-micro leading-relaxed text-ink-muted">
                {navT(lang, 'plan.stairsNote')}
              </span>
            </span>
            <span
              role="switch"
              aria-checked={avoidStairs}
              className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 ${
                avoidStairs ? 'border-rule bg-lapis' : 'border-rule bg-stone-100'
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-stone transition ${
                  avoidStairs ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>

          <label className="mt-3 flex items-center justify-between gap-3 text-xs text-ink-soft">
            <span>{navT(lang, 'plan.speed')}</span>
            <span className="num font-medium text-ink" dir="ltr">
              {num(speed, 1)} m/s
            </span>
          </label>
          <input
            type="range"
            min={0.6}
            max={1.6}
            step={0.1}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            aria-label={navT(lang, 'plan.speed')}
            className="mt-1 h-11 w-full accent-lapis"
          />
        </section>

        <button type="button" onClick={build} className="ui-btn-primary w-full">
          <Timer size={17} />
          {plan ? navT(lang, 'plan.rebuild') : navT(lang, 'plan.build')}
        </button>

        {plan && (
          <section className="border-t border-rule pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="section-title">{navT(lang, 'plan.stops')}</h2>
              <span className="num text-xs text-ink-soft">
                {num(plan.totalMinutes, 0)} / {plan.budgetMinutes} {navT(lang, 'plan.minutes')}
              </span>
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between border-b border-rule py-1">
                <dt className="text-ink-muted">{navT(lang, 'plan.walk')}</dt>
                <dd className="num text-ink" dir="ltr">{num(plan.walkMinutes, 1)} min</dd>
              </div>
              <div className="flex justify-between border-b border-rule py-1">
                <dt className="text-ink-muted">{navT(lang, 'plan.dwell')}</dt>
                <dd className="num text-ink" dir="ltr">{num(plan.dwellMinutes, 0)} min</dd>
              </div>
              <div className="flex justify-between border-b border-rule py-1">
                <dt className="text-ink-muted">{navT(lang, 'plan.value')}</dt>
                <dd className="num text-ink" dir="ltr">{num(plan.value, 1)}</dd>
              </div>
              <div className="flex justify-between border-b border-rule py-1">
                <dt className="text-ink-muted">{navT(lang, 'plan.baseline')}</dt>
                <dd className="num text-ink" dir="ltr">{num(plan.baselineValue, 1)}</dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-ink-muted">{navT(lang, 'plan.compute')}</dt>
                <dd className="num text-ink" dir="ltr">{num(plan.computeMs, 2)} ms</dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-ink-muted">{navT(lang, 'crowd.title')}</dt>
                <dd className="text-ink">{navT(lang, 'crowd.simulated')}</dd>
              </div>
            </dl>

            {plan.stops.length === 0 && (
              <p className="mt-2 text-xs leading-relaxed text-ochre">{navT(lang, 'plan.empty')}</p>
            )}

            <ol className="mt-2 divide-y divide-rule border-y border-rule">
              {plan.stops.map((stop, index) => {
                const artifact = museumArtifactById(stop.artifactId);
                const hall = hallById(stop.hallId);
                const isDone = completed.includes(stop.artifactId);
                const isCurrent = running && index === activeIndex;
                return (
                  <li key={stop.artifactId} className={`py-2 ${isCurrent ? 'bg-lapis/[0.05]' : ''}`}>
                    <div className="flex items-start gap-3">
                      <span
                        className={`num mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-micro font-semibold ${
                          isDone
                            ? 'border-malachite bg-malachite/10 text-malachite'
                            : isCurrent
                              ? 'border-lapis bg-lapis text-white'
                              : 'border-rule text-ink-soft'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link to={`/item/${stop.artifactId}`} className="block truncate text-sm font-medium text-ink">
                          {artifact?.name[lang] ?? stop.artifactId}
                        </Link>
                        <p className="mt-0.5 truncate text-micro text-ink-muted">
                          {hall?.name[lang] ?? stop.hallId} · {floorLabel(stop.floor, lang)}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="num text-xs font-semibold text-ink" dir="ltr">
                          {num(stop.etaMinutes, 0)} min
                        </p>
                        <p className="num text-micro text-ink-muted" dir="ltr">
                          +{stop.dwellMinutes} · {num(stop.walkM, 0)} m
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {skippedByReason.length > 0 && (
              <details className="mt-2 rounded-sm border border-rule p-2.5">
                <summary className="cursor-pointer text-micro font-semibold text-ink-soft">
                  {navT(lang, 'plan.skipped')} ({skippedByReason.length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {skippedByReason.map((skip) => (
                    <li key={skip.artifactId} className="flex justify-between gap-2 text-micro">
                      <span className="truncate text-ink-soft">
                        {museumArtifactById(skip.artifactId)?.name[lang] ?? skip.artifactId}
                      </span>
                      <span className="shrink-0 text-ink-muted">
                        {navT(lang, `plan.reason.${skip.reason}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {!running ? (
              <button
                type="button"
                onClick={() => {
                  if (beginTour()) setBehind(false);
                }}
                disabled={plan.stops.length === 0}
                className="ui-btn-primary mt-3 w-full"
              >
                <Footprints size={17} />
                {navT(lang, 'plan.begin')}
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="ui-chip border-malachite text-malachite">{navT(lang, 'plan.running')}</span>
                  <span className="num text-xs text-ink-soft">
                    {activeIndex + 1} / {totalStops}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-stone-200">
                  <div className="h-full bg-lapis" style={{ width: `${progressPct}%` }} />
                </div>
                {currentStop && (
                  <p className="text-xs text-ink-soft">
                    {navT(lang, 'plan.nextStop')}:{' '}
                    <span className="font-medium text-ink">
                      {museumArtifactById(currentStop.artifactId)?.name[lang] ?? currentStop.artifactId}
                    </span>
                  </p>
                )}
                {nextStop && (
                  <p className="text-micro text-ink-muted">
                    {navT(lang, 'plan.eta')} {num(nextStop.etaMinutes - (currentStop?.etaMinutes ?? 0), 0)}{' '}
                    {navT(lang, 'plan.minutes')}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={stopTour} className="ui-btn-secondary">
                    {navT(lang, 'plan.stop')}
                  </button>
                  <Link to="/map" className="ui-btn-secondary">
                    {navT(lang, 'nav.map')}
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = reportBehind();
                    setBehind(Boolean(next));
                  }}
                  className="ui-btn-quiet w-full text-carnelian"
                >
                  <TriangleAlert size={15} />
                  {navT(lang, 'plan.replan')}
                </button>
                {behind && <p className="text-micro text-ink-muted">{navT(lang, 'plan.behind')}</p>}
              </div>
            )}
          </section>
        )}

        <section className="border-t border-rule pt-3 text-micro leading-relaxed text-ink-muted">
          <p className="flex items-start gap-2">
            <Clock3 size={14} className="mt-0.5 shrink-0" />
            <span>{navT(lang, 'plan.placeholder')}</span>
          </p>
          <p className="mt-2 flex items-start gap-2">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <span>{navT(lang, 'crowd.note')}</span>
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Link to="/rewards" className="ui-btn-secondary flex-1 text-xs">
              {navT(lang, 'plan.openRewards')}
            </Link>
            <span className="num shrink-0 text-xs text-ink-soft">
              {rewards.todayPoints} {navT(lang, 'rewards.cost')}
            </span>
          </div>
        </section>

        {settings.avoidCrowded && (
          <p className="text-micro text-lapis">{navT(lang, 'plan.crowdOn')}</p>
        )}
      </main>
    </div>
  );
}

