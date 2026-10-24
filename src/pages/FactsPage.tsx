import { Link, useParams } from 'react-router-dom';
import { getArtifact, getArtifactByCode } from '../data/artifacts';
import { useLang } from '../i18n/LanguageContext';
import { artContext, artName, artSignificance } from '../i18n/content';

export function FactsPage() {
  const { id } = useParams();
  const { lang, tr } = useLang();
  const ar = lang === 'ar';
  const fr = lang === 'fr';
  const artifact = id ? (getArtifact(id) ?? getArtifactByCode(id)) : undefined;
  if (!artifact) {
    return (
      <div style={{ paddingTop: 40 }}>
        <h1>{tr('qr.invalid')}</h1>
        <div className="back-row"><Link className="btn btn-gold btn-sm" to="/explore">{tr('explore.title')}</Link></div>
      </div>
    );
  }

  const ku = ar ? artifact.knownVsUncertainAr : artifact.knownVsUncertainEn;
  const sources = ar ? artifact.sourcesAr : artifact.sourcesEn;
  const fallback = fr && <p><span className="badge">EN · {tr('facts.fallback')}</span></p>;

  return (
    <div style={{ paddingTop: 24 }} className="editorial">
      <p className="kicker">{artName(artifact, lang)}</p>
      <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(30px,4vw,44px)', margin: '4px 0 12px' }}>
        {tr('facts.title')}
      </h1>
      {fallback}

      <div className="facts-grid">
        {artifact.facts.map((f) => (
          <div className="fact-card" key={f.labelEn}>
            <h3>{ar ? f.labelAr : f.labelEn}</h3>
            <p>{ar ? f.valueAr : f.valueEn}</p>
          </div>
        ))}
      </div>

      <section className="section">
        <div className="section-head"><h2>{tr('facts.context')}</h2></div>
        <p className="prose">{artContext(artifact, lang)}</p>
      </section>

      <section className="section">
        <div className="section-head"><h2>{tr('facts.significance')}</h2></div>
        <p className="prose">{artSignificance(artifact, lang)}</p>
      </section>

      <div className="split">
        <div className="fact-card">
          <h3>✓ {tr('facts.known')}</h3>
          <ul className="check-list">{ku.known.map((k) => <li key={k}>{k}</li>)}</ul>
        </div>
        <div className="fact-card">
          <h3>? {tr('facts.uncertain')}</h3>
          <ul className="q-list">{ku.uncertain.map((k) => <li key={k}>{k}</li>)}</ul>
        </div>
      </div>

      <section className="section">
        <div className="section-head"><h2>{tr('facts.sources')}</h2></div>
        <ul className="q-list">{sources.map((s) => <li key={s}>{s}</li>)}</ul>
      </section>

      <div className="back-row">
        <Link className="btn btn-gold btn-sm" to={`/artifact/${artifact.id}/story`}>▶ {tr('facts.backStory')}</Link>
        <Link className="btn btn-ghost btn-sm" to={`/artifact/${artifact.id}`}>← {tr('player.back')}</Link>
      </div>
    </div>
  );
}
