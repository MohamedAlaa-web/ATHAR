import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Artifact } from '../data/artifacts';
import { assetUrl, fmtTime, locateChapter, prefersReducedMotion } from '../utils/helpers';
import { useLang } from '../i18n/LanguageContext';
import { chapNarration, chapTitle, imgAlt, ttsLocale } from '../i18n/content';
import { totalStoryDuration } from '../data/artifacts';

interface Props {
  artifact: Artifact;
  startChapter?: number;
}

/** Cinematic storyboard player: timed stills + narration + captions. Clearly labelled as prototype. */
export function CinematicPlayer({ artifact, startChapter = 0 }: Props) {
  const { lang, tr } = useLang();
  const total = totalStoryDuration(artifact);
  const durations = useMemo(() => artifact.chapters.map((c) => c.durationSec), [artifact]);
  const [elapsed, setElapsed] = useState(() => durations.slice(0, startChapter).reduce((a, b) => a + b, 0));
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [captions, setCaptions] = useState(true);
  const [finished, setFinished] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const loc = locateChapter(durations, Math.min(elapsed, total - 0.01));
  const chapter = artifact.chapters[loc.index];
  const narration = chapNarration(chapter, lang);
  const title = chapTitle(chapter, lang);
  const reconNote = lang === 'ar' ? chapter.reconstructionNoteAr : chapter.reconstructionNoteEn;

  const speak = useCallback((text: string) => {
    try {
      if (muted || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = ttsLocale(lang);
      u.volume = volume;
      u.rate = 0.98;
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }, [muted, volume, lang]);

  useEffect(() => {
    if (playing && !prefersReducedMotion()) speak(narration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.index, lang]);

  useEffect(() => {
    if (!playing) return;
    if (prefersReducedMotion()) return;
    timerRef.current = window.setInterval(() => {
      setElapsed((e) => {
        const n = e + 0.25;
        if (n >= total) {
          setPlaying(false);
          setFinished(true);
          try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
          return total;
        }
        return n;
      });
    }, 250);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [playing, total]);

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }, []);

  const seek = (sec: number) => {
    setElapsed(Math.max(0, Math.min(total, sec)));
    setFinished(false);
  };
  const jumpChapter = (i: number) => {
    const start = durations.slice(0, i).reduce((a, b) => a + b, 0);
    seek(start + 0.01);
    setPlaying(true);
  };
  const togglePlay = () => {
    if (finished) { seek(0); setPlaying(true); return; }
    setPlaying((p) => {
      if (p) { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }
      return !p;
    });
  };
  const fullscreen = () => {
    try { stageRef.current?.requestFullscreen?.(); } catch { /* ignore */ }
  };

  return (
    <div>
      <p className="badge" role="note">◉ {tr('player.prototype')}</p>
      <div className="player">
        <div className="stage" ref={stageRef} role="region" aria-label={title}>
          <img
            key={chapter.id}
            className="cross"
            src={assetUrl(chapter.image.src)}
            alt={imgAlt(chapter.image, lang)}
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
          />
          <div className="letterbox" />
          <div className="chapter-flag">
            <span aria-hidden="true">🎞</span>
            <span>{title}</span>
            {reconNote && <span className="muted">· {tr('player.reconstruction')}</span>}
          </div>
          {captions && (
            <div className="caption-bar" aria-live="polite">{narration}</div>
          )}
        </div>
        {captions && (
          <div className="caption-below" aria-live="polite">{narration}</div>
        )}
        <div className="transport">
          <div className="progress">
            <span className="time">{fmtTime(elapsed)}</span>
            <input
              type="range" min={0} max={total} step={0.5} value={elapsed}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label={`${title} timeline`}
            />
            <span className="time">{fmtTime(total)}</span>
          </div>
          <div className="controls">
            <button className="icon-btn primary" onClick={togglePlay} aria-pressed={playing}>
              {playing ? `⏸ ${tr('player.pause')}` : `▶ ${tr('player.play')}`}
            </button>
            <button className="icon-btn" onClick={() => { seek(0); setPlaying(true); }}>↺ {tr('player.restart')}</button>
            <button className="icon-btn" onClick={() => setMuted((m) => !m)} aria-pressed={muted}>
              {muted ? `🔇 ${tr('player.unmute')}` : `🔊 ${tr('player.mute')}`}
            </button>
            <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {tr('common.volume')}
              <input
                type="range" min={0} max={1} step={0.05} value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label={tr('common.volume')} style={{ accentColor: '#c6a15b' }}
              />
            </label>
            <button className="icon-btn" onClick={() => setCaptions((c) => !c)} aria-pressed={captions}>
              CC · {captions ? tr('player.captionsOn') : tr('player.captionsOff')}
            </button>
            <button className="icon-btn" onClick={fullscreen}>⛶ {tr('player.fullscreen')}</button>
          </div>
        </div>
      </div>

      <section className="section" aria-label={tr('player.chapters')}>
        <div className="section-head"><h2>{tr('player.chapters')}</h2></div>
        <div className="chapter-list" role="list">
          {artifact.chapters.map((c, i) => (
            <button
              key={c.id} role="listitem" className="chapter-item"
              aria-current={i === loc.index ? 'true' : 'false'}
              onClick={() => jumpChapter(i)}
            >
              <img src={assetUrl(c.image.src)} alt="" loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span>
                <h4>{chapTitle(c, lang)} · {fmtTime(c.durationSec)}</h4>
                <p>{chapNarration(c, lang).slice(0, 110)}…</p>
              </span>
              <span aria-hidden="true" style={{ color: '#c6a15b', fontWeight: 800 }}>{i === loc.index ? '●' : '○'}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="back-row">
        <Link className="btn btn-ghost" to={`/artifact/${artifact.id}`}>{tr('player.back')}</Link>
        <Link className="btn btn-gold" to={`/artifact/${artifact.id}/facts`}>{tr('player.facts')}</Link>
      </div>
    </div>
  );
}
