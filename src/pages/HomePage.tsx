import { Link } from 'react-router-dom';
import { ARTIFACTS } from '../data/artifacts';
import { assetUrl } from '../utils/helpers';
import { useLang } from '../i18n/LanguageContext';
import { ArtifactCard } from '../components/ArtifactCard';

export function HomePage() {
  const { lang, tr } = useLang();
  const ar = lang === 'ar';
  return (
    <div>
      <section className="hero">
        <div>
          <p className="kicker">{tr('home.kicker')}</p>
          <h1>
            {tr('home.headline')}
            <span className="alt">{tr('home.headlineAr')}</span>
          </h1>
          <p className="lede">{tr('home.sub')}</p>
          <div className="cta-row">
            <Link className="btn btn-gold" to="/explore">{tr('home.ctaStart')}</Link>
            <Link className="btn btn-ghost" to="/scan">{tr('home.ctaScan')}</Link>
          </div>
          <div className="mission">
            <span>{tr('home.mission')}</span>
            <small>{tr('home.missionAr')}</small>
          </div>
        </div>
        <figure className="hero-visual" style={{ margin: 0 }}>
          <img
            src={assetUrl('photo-hero-museum.jpg')}
            alt={ar ? 'القناع الذهبي لتوت عنخ آمون معروضًا في المتحف المصري الكبير' : 'The golden mask of Tutankhamun on display in the Grand Egyptian Museum'}
          />
          <figcaption>© {ar ? 'القناع الذهبي لتوت عنخ آمون في المتحف المصري الكبير' : 'The golden mask of Tutankhamun in the Grand Egyptian Museum'} · {tr('home.demoNote')}</figcaption>
        </figure>
      </section>

      <section className="section" aria-label={tr('home.howTitle')}>
        <div className="section-head"><h2>{tr('home.howTitle')}</h2></div>
        <div className="how-grid">
          <div className="how-card"><h3>{tr('home.how1t')}</h3><p>{tr('home.how1d')}</p></div>
          <div className="how-card"><h3>{tr('home.how2t')}</h3><p>{tr('home.how2d')}</p></div>
          <div className="how-card"><h3>{tr('home.how3t')}</h3><p>{tr('home.how3d')}</p></div>
        </div>
      </section>

      <section className="section" aria-label={tr('home.featured')}>
        <div className="section-head">
          <h2>{tr('home.featured')}</h2>
          <Link to="/explore" style={{ color: '#c6a15b', fontSize: 14 }}>{tr('home.ctaStart')} →</Link>
        </div>
        <div className="card-grid">
          {ARTIFACTS.map((a) => <ArtifactCard key={a.id} artifact={a} />)}
        </div>
      </section>
    </div>
  );
}
