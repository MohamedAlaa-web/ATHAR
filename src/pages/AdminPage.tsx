import { Link } from 'react-router-dom';
import { ARTIFACTS } from '../data/artifacts';
import { ARTIFACT_INTRO_AUDIO, CHAPTER_MEDIA, isMediaReady } from '../data/media';
import type { MediaState } from '../data/media';
import { useLang } from '../i18n/LanguageContext';

const DOT: Record<MediaState, string> = {
  ready: '🟢', planned: '⚪', generating: '🟡', awaiting_review: '🟠', unavailable: '⚫', failed: '🔴'
};

/** Read-only dev board of media production states. Not linked from the UI. */
export function AdminPage() {
  const { tr } = useLang();
  return (
    <div style={{ paddingTop: 24 }}>
      <p className="kicker">DEV</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, margin: '4px 0' }}>{tr('admin.title')}</h1>
      <p className="muted">{tr('admin.sub')}</p>
      {ARTIFACTS.map((a) => (
        <section key={a.id} style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 20 }}>{a.demoCode} · {a.nameEn}</h2>
          <div className="facts-grid">
            {a.chapters.map((c) => {
              const m = CHAPTER_MEDIA.find((x) => x.key === `${a.id}/${c.id}`);
              if (!m) return null;
              const rows: Array<[string, string | null, MediaState, string]> = [
                ['audio EN', m.narration.en.file, isMediaReady(m.narration.en.file) ? 'ready' : m.narration.en.state, 'studio mp3'],
                ['audio AR/FR', null, 'unavailable', 'synthetic preview in-app'],
                ['subs EN/AR/FR', m.subtitles.en.file, isMediaReady(m.subtitles.en.file) ? 'ready' : m.subtitles.en.state, 'WebVTT'],
                ['video', m.video.file, isMediaReady(m.video.file) ? 'ready' : m.video.state, 'mp4']
              ];
              return (
                <div className="fact-card" key={c.id}>
                  <h3 dir="ltr" style={{ fontSize: 13 }}>{m.key}</h3>
                  {rows.map(([label, file, state, kind]) => (
                    <p key={label} className="muted" dir="ltr" style={{ fontSize: 12.5, margin: '4px 0' }}>
                      {DOT[state]} {label} · {state} · {kind}
                      {file ? <><br />{file}</> : null}
                    </p>
                  ))}
                </div>
              );
            })}
            <div className="fact-card">
              <h3 dir="ltr" style={{ fontSize: 13 }}>{a.id}/intro</h3>
              <p className="muted" dir="ltr" style={{ fontSize: 12.5 }}>
                {DOT[isMediaReady(ARTIFACT_INTRO_AUDIO[a.id]?.file) ? 'ready' : 'generating']} audio EN · description narration
                <br />{ARTIFACT_INTRO_AUDIO[a.id]?.file}
              </p>
            </div>
          </div>
        </section>
      ))}
      <div className="back-row">
        <Link className="btn btn-ghost btn-sm" to="/">← {tr('common.home')}</Link>
      </div>
    </div>
  );
}
