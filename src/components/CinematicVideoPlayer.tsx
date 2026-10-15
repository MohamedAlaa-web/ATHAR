import { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { assetUrl, fmtTime } from '../utils/helpers';
import type { Lang3 } from '../data/media';

export interface SubTrack {
  lang: Lang3;
  label: string;
  /** Local .vtt asset path or null when unavailable. */
  src: string | null;
}

interface Props {
  title: string;
  mp4: string;
  poster: string;
  posterAlt: string;
  tracks: SubTrack[];
  defaultLang: Lang3;
}

/** Genuine HTML-video player: play/pause, seek, volume, fullscreen,
 *  selectable WebVTT subtitles, replay, loading + error states. */
export function CinematicVideoPlayer({ title, mp4, poster, posterAlt, tracks, defaultLang }: Props) {
  const { tr } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sub, setSub] = useState<string>(defaultLang);
  const [cueText, setCueText] = useState('');

  const readCue = () => {
    const v = videoRef.current;
    if (!v) return;
    const track = Array.from(v.textTracks).find((t) => t.language === sub);
    // Self-correct: once cues arrive, prefer the custom overlay and silence
    // native rendering (avoids double captions). No cues → native stays.
    if (track && track.cues && track.cues.length > 0 && (track.mode as string) === 'showing') {
      try { track.mode = 'hidden'; } catch { /* ignore */ }
    }
    const active = track?.activeCues?.[0] as unknown as { text?: string } | undefined;
    setCueText(active?.text ?? '');
  };

  const available = tracks.filter((t) => t.src);

  useEffect(() => {
    setPlaying(false); setElapsed(0); setLoading(true); setError(false);
    setSub(defaultLang);
  }, [mp4, defaultLang]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    for (const track of Array.from(v.textTracks)) {
      try {
        if (track.language !== sub || sub === 'off') {
          track.mode = 'disabled';
        } else {
          // Custom styled overlay shows the cue; native rendering stays off
          // to avoid double captions. Falls back to native if cues missing.
          track.mode = track.cues && track.cues.length > 0 ? 'hidden' : 'showing';
        }
      } catch { /* ignore */ }
    }
    setCueText('');
  }, [sub, mp4]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) v.pause();
    else v.play().catch(() => setError(true));
  };

  return (
    <div className="player">
      <div className="stage" ref={stageRef}>
        <video
          ref={videoRef}
          src={assetUrl(mp4)}
          poster={assetUrl(poster)}
          aria-label={title}
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          onPlay={() => { setPlaying(true); setLoading(false); }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => { setElapsed((e.target as HTMLVideoElement).currentTime); readCue(); }}
          onSeeked={() => readCue()}
          onLoadedMetadata={(e) => { setDuration((e.target as HTMLVideoElement).duration || 0); setLoading(false); }}
          onWaiting={() => setLoading(true)}
          onPlaying={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onError={() => { setError(true); setLoading(false); }}
          onClick={toggle}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }}
        >
          {available.map((t) => (
            <track key={t.lang} kind="subtitles" src={assetUrl(t.src!)} srcLang={t.lang} label={t.label} default={t.lang === defaultLang} />
          ))}
        </video>
        {loading && !error && (
          <div className="caption-bar" role="status">{tr('common.loading')}</div>
        )}
        {!loading && !error && cueText && (
          <div className="caption-bar" aria-live="polite">{cueText}</div>
        )}
        {error && (
          <div className="caption-bar" role="alert">
            ⚠ {tr('audio.error')}{' '}
            <button className="icon-btn btn-sm" onClick={() => { setError(false); videoRef.current?.load(); }}>{tr('common.retry')}</button>
          </div>
        )}
        {!playing && !loading && !error && (
          <button
            onClick={toggle}
            aria-label={`${tr('player.play')}: ${title}`}
            style={{
              position: 'absolute', inset: 0, margin: 'auto', width: 84, height: 84, borderRadius: '50%',
              border: '2px solid var(--gold)', background: 'rgba(0,0,0,0.55)', color: 'var(--gold)',
              fontSize: 30, cursor: 'pointer'
            }}
          >
            ▶<span style={{ display: 'none' }}>{posterAlt}</span>
          </button>
        )}
      </div>
      {cueText && (
        <div className="caption-below" aria-live="polite">{cueText}</div>
      )}
      <div className="transport">
        <div className="progress">
          <span className="time">{fmtTime(elapsed)}</span>
          <input
            type="range" min={0} max={Math.max(duration, 0.01)} step={0.1}
            value={Math.min(elapsed, duration)}
            onChange={(e) => { const v = videoRef.current; if (v) v.currentTime = Number(e.target.value); }}
            aria-label={`${title} timeline`}
          />
          <span className="time">{fmtTime(duration)}</span>
        </div>
        <div className="controls">
          <button className="icon-btn primary" onClick={toggle} aria-pressed={playing}>
            {playing ? `⏸ ${tr('player.pause')}` : `▶ ${tr('player.play')}`}
          </button>
          <button className="icon-btn" onClick={() => { const v = videoRef.current; if (v) { v.currentTime = 0; v.play().catch(() => setError(true)); } }}>
            ↺ {tr('player.restart')}
          </button>
          <button className="icon-btn" onClick={() => setMuted((m) => !m)} aria-pressed={muted}>
            {muted ? `🔇 ${tr('player.unmute')}` : `🔊 ${tr('player.mute')}`}
          </button>
          <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {tr('common.volume')}
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
              aria-label={tr('common.volume')} style={{ accentColor: '#c6a15b' }} />
          </label>
          <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            CC · {tr('video.subtitles')}
            <select
              className="select" value={sub} style={{ width: 'auto', padding: '8px 10px' }}
              onChange={(e) => setSub(e.target.value)}
              aria-label={tr('video.subtitles')}
            >
              <option value="off">{tr('video.off')}</option>
              {available.map((t) => <option key={t.lang} value={t.lang}>{t.label}</option>)}
            </select>
          </label>
          <button className="icon-btn" onClick={() => { try { stageRef.current?.requestFullscreen?.(); } catch { /* ignore */ } }}>
            ⛶ {tr('player.fullscreen')}
          </button>
        </div>
      </div>
    </div>
  );
}
