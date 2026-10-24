import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Map as MapIcon, Navigation, Play, QrCode } from 'lucide-react';
import { useNav } from '../NavProvider';
import { navT, formatMeters } from '../i18n';
import { MUSEUM, categoryLabel, floorLabel, hallById, museumArtifactById } from '../../data/museum';

export function ArtifactNavPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, estimate, navigateTo, startSimulation, completeOnboarding, addRecent, artifactPosition } = useNav();
  const artifact = id ? museumArtifactById(id) : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (artifact) addRecent(artifact.id);
  }, [addRecent, artifact]);

  const position = artifact ? artifactPosition(artifact.id) : null;
  const hall = artifact ? hallById(artifact.hallId) : undefined;

  const distance = useMemo(() => {
    if (!artifact || !position || !estimate || estimate.floor !== artifact.floor) return null;
    return Math.hypot(position.x - estimate.x, position.y - estimate.y);
  }, [artifact, estimate, position]);

  const related = useMemo(() => {
    if (!artifact) return [];
    return MUSEUM.artifacts
      .filter((item) => item.id !== artifact.id)
      .sort((a, b) => {
        const aSame = a.hallId === artifact.hallId ? 0 : 1;
        const bSame = b.hallId === artifact.hallId ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
        return Math.hypot(a.x - artifact.x, a.y - artifact.y) - Math.hypot(b.x - artifact.x, b.y - artifact.y);
      })
      .slice(0, 3);
  }, [artifact]);

  if (!artifact) {
    return (
      <div className="px-5 py-10">
        <p className="text-sm text-ink-soft">Artifact not found.</p>
        <Link to="/search" className="ui-btn-primary mt-4">
          {navT(lang, 'search.title')}
        </Link>
      </div>
    );
  }

  const startNavigation = async () => {
    setError(false);
    setBusy(true);
    if (!estimate) {
      await startSimulation();
      completeOnboarding();
    }
    const route = navigateTo(artifact.id);
    setBusy(false);
    if (!route) {
      setError(true);
      return;
    }
    navigate('/map');
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="-ms-2 flex min-h-11 items-center gap-1 pe-2 text-xs font-medium text-ink-soft"
      >
        <ChevronLeft size={18} className="rtl:rotate-180" />
        {navT(lang, 'common.back')}
      </button>

      <header className="mt-1">
        <h1 className="text-xl leading-snug text-ink">{artifact.name[lang]}</h1>
        <p className="mt-1 text-sm text-ink-muted" dir={lang === 'ar' ? 'ltr' : 'rtl'}>
          {artifact.name[lang === 'ar' ? 'en' : 'ar']}
        </p>
        <p className="num mt-1 text-xs text-ink-muted">{artifact.qrId}</p>
      </header>

      <dl className="mt-4 divide-y divide-rule border-y border-rule">
        <div className="flex items-baseline justify-between gap-3 py-2">
          <dt className="label">{navT(lang, 'common.floor')}</dt>
          <dd className="text-sm text-ink">{floorLabel(artifact.floor, lang)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2">
          <dt className="label">{navT(lang, 'search.category')}</dt>
          <dd className="text-sm text-ink">{categoryLabel(artifact.category, lang)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2">
          <dt className="label">{navT(lang, 'map.hall')}</dt>
          <dd className="text-sm text-ink">
            <Link to={`/search?hall=${artifact.hallId}`} className="inline-flex min-h-11 items-center underline underline-offset-4 decoration-rule">
              {hall?.name[lang]}
            </Link>
          </dd>
        </div>
        {distance != null && (
          <div className="flex items-baseline justify-between gap-3 py-2">
            <dt className="label">{navT(lang, 'artifact.distance')}</dt>
            <dd className="num text-sm text-ink">{formatMeters(distance, lang)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 grid gap-2">
        <button type="button" onClick={startNavigation} disabled={busy} className="ui-btn-primary">
          <Navigation size={17} strokeWidth={1.8} />
          {busy ? '…' : navT(lang, 'artifact.navigate')}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <Link to={`/qr?artifact=${artifact.id}`} className="ui-btn-secondary">
            <QrCode size={17} strokeWidth={1.8} />
            {navT(lang, 'artifact.scan')}
          </Link>
          <Link to="/map" className="ui-btn-secondary">
            <MapIcon size={17} strokeWidth={1.8} />
            {navT(lang, 'artifact.openInMap')}
          </Link>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-carnelian">{navT(lang, 'artifact.positionRequired')}</p>}
      {!estimate && (
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          {navT(lang, 'artifact.positionRequired')}
        </p>
      )}

      <section className="mt-6">
        <h2 className="section-title">{navT(lang, 'artifact.about')}</h2>
        <p className={`mt-2 ${lang === 'ar' ? 'reading' : 'text-sm leading-relaxed text-ink-soft'}`}>
          {artifact.description[lang]}
        </p>
        <p className="mt-2 text-micro text-ink-muted">{navT(lang, 'onboard.placeholderNote')}</p>
      </section>

      <section className="mt-6">
        <h2 className="section-title">{navT(lang, 'artifact.cinematic')}</h2>
        <div className="mt-2 flex aspect-video items-center justify-center rounded-sm border border-rule bg-stone-100">
          <span className="grid h-14 w-14 place-items-center rounded-full border border-rule bg-surface text-ink-soft">
            <Play size={22} strokeWidth={1.5} />
          </span>
        </div>
        <p className="mt-1 flex items-center justify-between text-micro text-ink-muted">
          <span>{navT(lang, 'artifact.placeholder')}</span>
          <span className="num">16:9</span>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{navT(lang, 'artifact.cinematicNote')}</p>
      </section>

      <section className="mt-6">
        <h2 className="section-title">{navT(lang, 'artifact.related')}</h2>
        <ul className="mt-1 divide-y divide-rule border-t border-rule">
          {related.map((item) => (
            <li key={item.id}>
              <Link to={`/item/${item.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{item.name[lang]}</span>
                  <span className="block truncate text-xs text-ink-muted">{hallById(item.hallId)?.name[lang]}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-muted">{floorLabel(item.floor, lang)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
