import { Link } from 'react-router-dom';
import { ARTIFACTS } from '../data/artifacts';
import type { Artifact } from '../data/artifacts';
import { assetUrl } from '../utils/helpers';
import { useLang } from '../i18n/LanguageContext';
import { artName, artTagline, imgAlt } from '../i18n/content';

export function ArtifactCard({ artifact }: { artifact: Artifact }) {
  const { lang, tr } = useLang();
  return (
    <article className="artifact-card">
      <img
        src={assetUrl(artifact.image.src)}
        alt={imgAlt(artifact.image, lang)}
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="artifact-card-body">
        <span className="badge">{tr('artifact.demoBadge')}</span>
        <h3>{artName(artifact, lang)}</h3>
        <p>{artTagline(artifact, lang)}</p>
        <div className="meta-row">
          <span>{artifact.chapters.length} · {tr('artifact.storyMeta')}</span>
        </div>
        <Link className="btn btn-ghost btn-sm" to={`/artifact/${artifact.id}`}>
          {tr('home.open')}
        </Link>
      </div>
    </article>
  );
}

export function RelatedArtifacts({ ids }: { ids: string[] }) {
  const { lang, tr } = useLang();
  const items = ARTIFACTS.filter((a: Artifact) => ids.includes(a.id));
  if (items.length === 0) return null;
  return (
    <section className="section" aria-label={tr('artifact.related')}>
      <div className="section-head">
        <h2>{tr('artifact.related')}</h2>
      </div>
      <div className="card-grid">
        {items.map((a: Artifact) => (
          <article className="artifact-card" key={a.id}>
            <img
              src={assetUrl(a.image.src)}
              alt={imgAlt(a.image, lang)}
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="artifact-card-body">
              <h3>{artName(a, lang)}</h3>
              <p>{artTagline(a, lang)}</p>
              <Link className="btn btn-ghost btn-sm" to={`/artifact/${a.id}`}>
                {tr('artifact.openRelated')}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
