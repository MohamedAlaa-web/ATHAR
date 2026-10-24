import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getArtifact, getArtifactByCode } from '../data/artifacts';
import { chapterMedia, isMediaReady } from '../data/media';
import type { Lang3 } from '../data/media';
import { useLang } from '../i18n/LanguageContext';
import { artName, artTagline, chapNarration, chapTitle, imgAlt } from '../i18n/content';
import { assetUrl, fmtTime } from '../utils/helpers';
import { CinematicPlayer } from '../components/CinematicPlayer';
import { CinematicVideoPlayer } from '../components/CinematicVideoPlayer';
import type { SubTrack } from '../components/CinematicVideoPlayer';

export function StoryPlayerPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { lang, tr } = useLang();
  const artifact = id ? (getArtifact(id) ?? getArtifactByCode(id)) : undefined;

  if (!artifact) {
    return (
      <div style={{ paddingTop: 40 }}>
        <h1>{tr('qr.invalid')}</h1>
        <div className="back-row"><Link className="btn btn-gold btn-sm" to="/explore">{tr('explore.title')}</Link></div>
      </div>
    );
  }

  const idx = Math.max(0, Math.min(artifact.chapters.length - 1, Number(params.get('chapter') ?? 0) || 0));
  const chapter = artifact.chapters[idx];
  const media = chapterMedia(artifact.id, chapter.id);
  const videoFile = media && isMediaReady(media.video.file) ? media.video.file! : null;
  const subLang: Lang3 = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
  const tracks: SubTrack[] = media ? (['en', 'ar', 'fr'] as Lang3[]).map((l) => ({
    lang: l,
    label: l === 'en' ? 'English' : l === 'ar' ? 'العربية' : 'Français',
    src: isMediaReady(media.subtitles[l].file) ? media.subtitles[l].file : null
  })) : [];

  return (
    <div style={{ paddingTop: 24 }}>
      <p className="kicker">{artName(artifact, lang)}</p>
      <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(28px,4vw,42px)', margin: '4px 0' }}>
        {artTagline(artifact, lang)}
      </h1>

      {videoFile ? (
        <div>
          <p className="badge" role="note">🎬 {chapTitle(chapter, lang)}</p>
          <CinematicVideoPlayer
            key={`${chapter.id}-${lang}`}
            title={chapTitle(chapter, lang)}
            mp4={videoFile}
            poster={chapter.image.src}
            posterAlt={imgAlt(chapter.image, lang)}
            tracks={tracks}
            defaultLang={subLang}
          />
          <section className="section" aria-label={tr('player.chapters')}>
            <div className="section-head"><h2>{tr('player.chapters')}</h2></div>
            <div className="chapter-list" role="list">
              {artifact.chapters.map((c, i) => {
                const m = chapterMedia(artifact.id, c.id);
                const vf = m && isMediaReady(m.video.file) ? m.video.file : null;
                return (
                  <Link
                    key={c.id} role="listitem" className="chapter-item"
                    aria-current={i === idx ? 'true' : 'false'}
                    to={`/artifact/${artifact.id}/story?chapter=${i}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <img src={assetUrl(c.image.src)} alt="" loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span>
                      <h4>{chapTitle(c, lang)} {vf ? '' : `· ${tr('video.noVideo')}`}</h4>
                      <p>{chapNarration(c, lang).slice(0, 110)}…</p>
                    </span>
                    <span aria-hidden="true" style={{ color: '#c6a15b', fontWeight: 800 }}>{i === idx ? '●' : '○'}</span>
                  </Link>
                );
              })}
            </div>
          </section>
          <div className="back-row">
            <Link className="btn btn-ghost" to={`/artifact/${artifact.id}`}>{tr('player.back')}</Link>
            <Link className="btn btn-gold" to={`/artifact/${artifact.id}/facts`}>{tr('player.facts')}</Link>
          </div>
        </div>
      ) : (
        <div>
          <p className="badge" role="note">◉ {tr('video.noVideo')}</p>
          <CinematicPlayer key={`${artifact.id}-${lang}-${idx}`} artifact={artifact} startChapter={idx} />
        </div>
      )}
      <div className="back-row">
        <span className="muted">{fmtTime(0)} · {tr('video.subtitles')}: {tracks.filter((t) => t.src).map((t) => t.label).join(', ') || tr('video.off')}</span>
      </div>
    </div>
  );
}
