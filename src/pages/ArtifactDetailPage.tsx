import { Link, useParams } from 'react-router-dom';
import { ARTIFACTS, getArtifact, getArtifactByCode, totalStoryDuration } from '../data/artifacts';
import { ARTIFACT_INTRO_AUDIO, isMediaReady } from '../data/media';
import { assetUrl, fmtTime } from '../utils/helpers';
import { useLang } from '../i18n/LanguageContext';
import { artContext, artDescription, artName, artPhotoNote, artSignificance, artTagline, imgAlt } from '../i18n/content';
import { LanguageSwitcher } from '../components/AppLayout';
import { NarrationPlayer } from '../components/NarrationPlayer';
import { photoCredit } from '../data/artifacts';

function resolveArtifact(id: string | undefined) {
  if (!id) return undefined;
  return getArtifact(id) ?? getArtifactByCode(id);
}

export function ArtifactDetailPage() {
  const { id } = useParams();
  const { lang, tr } = useLang();
  const artifact = resolveArtifact(id);

  if (!artifact) {
    return (
      <div style={{ paddingTop: 40 }}>
        <h1>{tr('qr.invalid')}</h1>
        <p className="prose">{tr('scan.manual')}</p>
        <div className="back-row">
          {ARTIFACTS.map((a) => (
            <Link key={a.id} className="btn btn-ghost btn-sm" to={`/artifact/${a.demoCode}`}>
              {a.demoCode}
            </Link>
          ))}
          <Link className="btn btn-gold btn-sm" to="/">{tr('common.home')}</Link>
        </div>
      </div>
    );
  }

  const intro = ARTIFACT_INTRO_AUDIO[artifact.id];
  const introFile = intro && isMediaReady(intro.file) ? intro.file : null;
  const introReady = lang === 'en' && introFile !== null;
  const introText = lang === 'ar' ? artifact.descriptionAr : lang === 'fr' ? artifact.descriptionFr : artifact.descriptionEn;

  const related = ARTIFACTS.filter((a) => artifact.relatedIds.includes(a.id));
  const total = totalStoryDuration(artifact);

  return (
    <div>
      <div className="detail-hero">
        <figure style={{ margin: 0 }}>
          <img
            src={assetUrl(artifact.image.src)}
            alt={imgAlt(artifact.image, lang)}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <figcaption style={{ padding: '10px 16px', fontSize: 12.5, color: 'var(--text-dim)', borderTop: '1px solid var(--line)' }}>
            {artPhotoNote(artifact, lang) ?? imgAlt(artifact.image, lang)}
            <br />📷 {photoCredit(artifact.image.src)}
          </figcaption>
        </figure>
        <div className="detail-copy">
          <span className="badge">{tr('artifact.demoBadge')}</span>
          <h1>{artName(artifact, lang)}</h1>
          <p className="tagline">{artTagline(artifact, lang)}</p>
          <div style={{ margin: '10px 0' }}><LanguageSwitcher /></div>
          <p className="prose">{artDescription(artifact, lang)}</p>
          <NarrationPlayer
            label={artName(artifact, lang)}
            audioFile={introReady ? introFile : null}
            audioReady={introReady}
            ttsText={introText}
          />
          <dl className="kv">
            <dt>{tr('artifact.period')}</dt><dd>{lang === 'ar' ? artifact.periodAr : artifact.periodEn}</dd>
            <dt>{tr('artifact.qr')}</dt><dd><code dir="ltr">{artifact.qrCode} · {artifact.demoCode}</code></dd>
            <dt>{tr('player.chapters')}</dt>
            <dd>{artifact.chapters.length} · {fmtTime(total)} {tr('artifact.minWatch')}</dd>
          </dl>
          <div className="cta-row">
            <Link className="btn btn-gold" to={`/artifact/${artifact.id}/story`}>▶ {tr('artifact.watch')}</Link>
            <Link className="btn btn-ghost" to={`/artifact/${artifact.id}/facts`}>{tr('artifact.facts')}</Link>
          </div>
        </div>
      </div>

      <section className="section editorial">
        <div className="section-head"><h2>{tr('artifact.why')}</h2></div>
        <p className="prose">{artSignificance(artifact, lang)}</p>
        {lang === 'fr' && <p><span className="badge">EN · {tr('facts.fallback')}</span></p>}
      </section>

      <section className="section editorial">
        <div className="section-head"><h2>{tr('facts.context')}</h2></div>
        <p className="prose">{artContext(artifact, lang)}</p>
      </section>

      {related.length > 0 && (
        <section className="section" aria-label={tr('artifact.related')}>
          <div className="section-head"><h2>{tr('artifact.related')}</h2></div>
          <div className="card-grid">
            {related.map((r) => (
              <article className="artifact-card" key={r.id}>
                <img src={assetUrl(r.image.src)} alt={imgAlt(r.image, lang)} loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="artifact-card-body">
                  <h3>{artName(r, lang)}</h3>
                  <p>{artTagline(r, lang)}</p>
                  <Link className="btn btn-ghost btn-sm" to={`/artifact/${r.id}`}>{tr('artifact.openRelated')}</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="back-row">
        <Link className="btn btn-ghost btn-sm" to="/explore">← {tr('common.back')}</Link>
        <Link className="btn btn-ghost btn-sm" to="/scan">{tr('nav.scan')}</Link>
        <Link className="btn btn-ghost btn-sm" to="/print">🖨 {tr('print.printBtn')}</Link>
      </div>
    </div>
  );
}
