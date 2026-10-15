import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ARTIFACTS, PHOTO_CREDITS } from '../data/artifacts';
import { useLang } from '../i18n/LanguageContext';
import { artName } from '../i18n/content';
import { ArtifactCard } from '../components/ArtifactCard';

const POS: Record<string, { x: number; y: number; label: string }> = {
  'royal-mummy': { x: 180, y: 130, label: 'A' },
  'painted-coffin': { x: 420, y: 200, label: 'B' },
  'royal-statue': { x: 620, y: 120, label: 'C' }
};

const SHORT: Record<string, { en: string; ar: string; fr: string }> = {
  'royal-mummy': { en: 'Royal Mummy', ar: 'مومياء ملكية', fr: 'Momie royale' },
  'painted-coffin': { en: 'Painted Coffin', ar: 'تابوت ملوّن', fr: 'Cercueil peint' },
  'royal-statue': { en: 'Royal Statue', ar: 'تمثال ملكي', fr: 'Statue royale' }
};

export function ExplorePage() {
  const { lang, tr } = useLang();
  const ar = lang === 'ar';
  const [active, setActive] = useState<string>('royal-mummy');
  const current = ARTIFACTS.find((a) => a.id === active);

  return (
    <div style={{ paddingTop: 24 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,4vw,44px)', margin: 0 }}>
        {tr('explore.title')}
      </h1>
      <p className="prose">{tr('explore.sub')}</p>

      <div className="map-card" style={{ marginTop: 18 }}>
        <svg className="map-svg" viewBox="0 0 800 320" role="img" aria-label={tr('explore.mapNote')}>
          <rect x="40" y="40" width="720" height="240" rx="16" fill="none" stroke="#c6a15b" strokeWidth="1.5" opacity="0.6" />
          <path d="M40 160 H760" stroke="#c6a15b" strokeWidth="1" strokeDasharray="8 8" opacity="0.5" />
          <path d="M280 40 V280 M540 40 V280" stroke="#c6a15b" strokeWidth="1" strokeDasharray="8 8" opacity="0.35" />
          {ARTIFACTS.map((a) => {
            const p = POS[a.id] ?? { x: 100, y: 100, label: '•' };
            return (
              <g key={a.id} className={`stop ${active === a.id ? 'active' : ''}`}
                 onClick={() => setActive(a.id)} role="button" tabIndex={0}
                 onKeyDown={(e) => { if (e.key === 'Enter') setActive(a.id); }}
                 aria-label={artName(a, lang)}>
                <circle cx={p.x} cy={p.y} r="26" />
                <text x={p.x} y={p.y + 5} textAnchor="middle" fontWeight="800">{p.label}</text>
                <text x={p.x} y={p.y + 46} textAnchor="middle">{(SHORT[a.id]?.[lang] ?? SHORT[a.id]?.en) ?? p.label}</text>
              </g>
            );
          })}
        </svg>
        <p className="muted" style={{ marginBottom: 0 }}>⚠ {tr('explore.mapNote')}</p>
        {current && (
          <div style={{ marginTop: 12 }}>
            <Link className="btn btn-gold btn-sm" to={`/artifact/${current.id}`}>
              {tr('explore.open')}: {artName(current, lang)} →
            </Link>
          </div>
        )}
      </div>

      <section className="section">
        <div className="section-head"><h2>{tr('explore.listTitle')}</h2></div>
        <div className="card-grid">
          {ARTIFACTS.map((a) => <ArtifactCard key={a.id} artifact={a} />)}
        </div>
      </section>

      <section className="section" aria-label={tr('credits.title')}>
        <div className="section-head">
          <h2>📷 {tr('credits.title')}</h2>
        </div>
        <p className="muted">{tr('credits.sub')}</p>
        <div className="facts-grid">
          {Object.entries(PHOTO_CREDITS).map(([file, credit]) => (
            <div className="fact-card" key={file}>
              <h3 dir="ltr" style={{ fontSize: 13 }}>{file}</h3>
              <p dir="ltr" style={{ fontSize: 13 }}>{credit}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
