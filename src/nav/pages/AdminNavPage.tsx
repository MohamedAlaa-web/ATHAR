import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNav } from '../NavProvider';
import { navT, formatMeters } from '../i18n';
import { MUSEUM, floorLabel, hallById, museumArtifactById, type FloorId } from '../../data/museum';
import { simulatedHallDensity, totalSimulatedVisitors } from '../../admin/density';
import { FloorMap } from '../components/FloorMap';

export function AdminNavPage() {
  const {
    lang,
    closedHalls,
    toggleHallClosed,
    route,
    routeError,
    targetId,
    artifactPosition,
    setArtifactPosition,
    resetOverrides,
    estimate
  } = useNav();
  const [now, setNow] = useState(() => Date.now());
  const [floor, setFloor] = useState<FloorId>('ground');
  const [selectedArtifact, setSelectedArtifact] = useState(MUSEUM.artifacts[0].id);
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const artifact = museumArtifactById(selectedArtifact);
    const position = artifactPosition(selectedArtifact);
    if (!artifact || !position) return;
    setX(String(position.x));
    setY(String(position.y));
    setMessage(null);
  }, [artifactPosition, selectedArtifact]);

  const density = useMemo(() => simulatedHallDensity(now, closedHalls), [closedHalls, now]);
  const total = totalSimulatedVisitors(density);
  const target = targetId ? museumArtifactById(targetId) : null;
  const artifact = museumArtifactById(selectedArtifact);

  const applyCoordinates = () => {
    const nx = Number(x);
    const ny = Number(y);
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
      setMessage({ ok: false, text: lang === 'ar' ? 'إحداثيات غير صالحة.' : 'Coordinates must be numbers.' });
      return;
    }
    const result = setArtifactPosition(selectedArtifact, nx, ny);
    if (!result.ok) {
      setMessage({
        ok: false,
        text:
          result.error === 'outside-hall'
            ? lang === 'ar'
              ? 'النقطة داخل منطقة ممشاة لكن خارج قاعة القطعة.'
              : 'That point is walkable but outside the artifact’s hall.'
            : lang === 'ar'
              ? 'النقطة خارج المناطق الممشاة في هذا الطابق.'
              : 'That point is outside the walkable floor area.'
      });
      return;
    }
    setMessage({ ok: true, text: navT(lang, 'admin.saved') });
  };

  return (
    <div className="px-4 pt-5">
      <p className="text-xs font-medium text-ink-muted">{lang === 'ar' ? 'تشغيل المتحف' : 'Museum operations'}</p>
      <h1 className="mt-1 text-lg text-ink">{navT(lang, 'admin.title')}</h1>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{navT(lang, 'admin.sub')}</p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex rounded-full border border-rule bg-stone-100 p-1">
          {(['ground', 'upper'] as FloorId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFloor(id)}
              className={`min-h-11 rounded-sm px-3 py-1 text-micro font-semibold ${floor === id ? 'bg-ink text-white' : 'text-ink-muted'}`}
            >
              {id === 'ground' ? navT(lang, 'common.ground') : navT(lang, 'common.upper')}
            </button>
          ))}
        </div>
        <span className="text-micro text-ink-muted">
          {estimate ? `${estimate.hallId} (${formatMeters(estimate.accuracyRadiusM, lang)})` : lang === 'ar' ? 'لا موقع' : 'No position'}
        </span>
      </div>

      <div className="mt-2 overflow-hidden rounded-sm border border-rule bg-stone">
        <FloorMap floor={floor} showRoute className="aspect-[2/1]" />
      </div>

      <section className="ui-card mt-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="section-title">{navT(lang, 'admin.density')}</h2>
            <p className="mt-0.5 text-micro text-ink-muted">{navT(lang, 'admin.densityNote')}</p>
          </div>
          <span className="ui-chip border-rule text-lapis">
            {total} {navT(lang, 'admin.visitors')}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {density.map((row) => {
            const hall = hallById(row.hallId);
            if (!hall) return null;
            return (
              <div key={row.hallId} className="rounded-sm border border-rule p-2.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-ink-soft">{hall.name[lang]}</span>
                  <span className="text-ink-muted">
                    {row.count} / {row.capacity} ({row.pct}%)
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={`h-full rounded-full ${row.closed ? 'bg-carnelian' : row.pct > 70 ? 'bg-ochre' : 'bg-lapis'}`}
                    style={{ width: `${Math.min(100, row.pct)}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => toggleHallClosed(row.hallId)}
                  className={`mt-2 min-h-11 rounded-sm border px-3 py-1 text-micro font-semibold ${
                    row.closed ? 'border-carnelian/40 bg-carnelian/10 text-carnelian' : 'border-rule text-ink-muted'
                  }`}
                >
                  {navT(lang, row.closed ? 'admin.reopenHall' : 'admin.closeHall')}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ui-card mt-3 p-4">
        <h2 className="section-title">{navT(lang, 'admin.routeImpact')}</h2>
        {route?.ok && target ? (
          <>
            <p className="mt-1 text-xs text-ink-soft">
              {navT(lang, 'map.navigatingTo')} <b className="text-ink">{target.name[lang]}</b>
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-micro text-ink-muted">
              <span>distance<br /><b className="num text-ink">{route.totalDistanceM.toFixed(1)} m</b></span>
              <span>compute<br /><b className="num text-ink">{route.computeMs.toFixed(2)} ms</b></span>
              <span>points<br /><b className="num text-ink">{route.points.length}</b></span>
            </div>
            <p className="mt-2 text-micro text-ink-muted">
              {closedHalls.length ? `${closedHalls.join(', ')}` : lang === 'ar' ? 'لا قاعات مغلقة' : 'No halls closed'}
            </p>
          </>
        ) : routeError ? (
          <p className="mt-1 rounded-sm border border-carnelian/30 bg-carnelian/10 p-2.5 text-micro text-carnelian">
            {navT(lang, `route.reason.${routeError}`)}
          </p>
        ) : (
          <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'admin.noRoute')}</p>
        )}
        {closedHalls.length > 0 && (
          <button
            type="button"
            onClick={() => closedHalls.forEach((hall) => toggleHallClosed(hall))}
            className="ui-btn-secondary mt-3 w-full py-2 text-micro"
          >
            {lang === 'ar' ? 'إعادة فتح كل القاعات' : 'Reopen all halls'}
          </button>
        )}
      </section>

      <section className="ui-card mt-3 p-4">
        <h2 className="section-title">{navT(lang, 'admin.editArtifact')}</h2>
        <select
          className="ui-field mt-2 text-xs"
          value={selectedArtifact}
          onChange={(event) => setSelectedArtifact(event.target.value)}
          aria-label={navT(lang, 'admin.artifacts')}
        >
          {MUSEUM.artifacts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name[lang]} · {item.hallId}
            </option>
          ))}
        </select>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-micro text-ink-muted">
            {navT(lang, 'admin.x')}
            <input value={x} onChange={(event) => setX(event.target.value)} inputMode="decimal" className="ui-field mt-1 py-2 text-xs" dir="ltr" />
          </label>
          <label className="text-micro text-ink-muted">
            {navT(lang, 'admin.y')}
            <input value={y} onChange={(event) => setY(event.target.value)} inputMode="decimal" className="ui-field mt-1 py-2 text-xs" dir="ltr" />
          </label>
        </div>
        <p className="mt-1 text-micro text-ink-muted">
          {artifact
            ? `${artifact.hallId} — ${floorLabel(artifact.floor, lang)} — ${lang === 'ar' ? 'المساحة القابلة للسير فقط' : 'walkable area only'}`
            : ''}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={applyCoordinates} className="ui-btn-primary py-2 text-micro">
            {navT(lang, 'admin.apply')}
          </button>
          <button type="button" onClick={resetOverrides} className="ui-btn-secondary py-2 text-micro">
            {navT(lang, 'admin.reset')}
          </button>
        </div>
        {message && <p className={`mt-2 text-micro ${message.ok ? 'text-malachite' : 'text-carnelian'}`}>{message.text}</p>}
      </section>

      <div className="mt-4 flex flex-wrap gap-2 pb-3 text-micro">
        <Link to="/map" className="ui-btn-secondary flex-1 py-2">
          {navT(lang, 'admin.back')}
        </Link>
        <Link to="/settings" className="ui-btn-secondary flex-1 py-2">
          {navT(lang, 'nav.settings')}
        </Link>
      </div>
    </div>
  );
}
