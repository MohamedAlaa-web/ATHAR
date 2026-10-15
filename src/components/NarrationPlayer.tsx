import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '../data/artifacts';
import { useLang } from '../i18n/LanguageContext';
import { ttsLocale } from '../i18n/content';
import { assetUrl, fmtTime } from '../utils/helpers';

interface Props {
  label: string;
  /** Local asset path (e.g. media/audio/....mp3) or null when no studio track exists. */
  audioFile: string | null;
  audioReady: boolean;
  /** Text used for the explicitly labeled synthetic preview fallback. */
  ttsText: string;
}

/**
 * Narration player. Plays a real studio audio file when one exists;
 * otherwise offers an explicitly labeled synthetic-voice preview
 * (browser speech synthesis) — never misrepresented as a recording.
 * Never autoplays; stops cleanly on unmount or language change.
 */
export function NarrationPlayer({ label, audioFile, audioReady, ttsText }: Props) {
  const { lang, tr } = useLang();
  const l: Lang = lang;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [error, setError] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const stopPreview = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    setPreviewing(false);
  }, []);

  // Stop everything when language or track changes (no overlap, no autoplay).
  useEffect(() => {
    setPlaying(false);
    setElapsed(0);
    setError(false);
    stopPreview();
    audioRef.current?.pause();
  }, [audioFile, l, stopPreview]);

  useEffect(() => () => {
    audioRef.current?.pause();
    stopPreview();
  }, [stopPreview]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const toggleAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play().catch(() => setError(true));
  };

  const startPreview = () => {
    try {
      if (!('speechSynthesis' in window)) { setError(true); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(ttsText);
      u.lang = ttsLocale(l);
      u.volume = volume;
      u.rate = 0.98;
      u.onend = () => setPreviewing(false);
      u.onerror = () => { setPreviewing(false); setError(true); };
      window.speechSynthesis.speak(u);
      setPreviewing(true);
      setError(false);
    } catch {
      setError(true);
    }
  };

  if (audioReady && audioFile) {
    return (
      <div className="narr-player" role="region" aria-label={`${tr('audio.listen')}: ${label}`}>
        <span className="badge">🔊 {tr('audio.studioBadge')}</span>
        <audio
          ref={audioRef}
          src={assetUrl(audioFile)}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setElapsed((e.target as HTMLAudioElement).currentTime)}
          onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || 0)}
          onError={() => setError(true)}
        />
        <div className="controls" style={{ marginTop: 8 }}>
          <button className="icon-btn primary" onClick={toggleAudio} aria-pressed={playing}>
            {playing ? `⏸ ${tr('player.pause')}` : `▶ ${tr('audio.listen')}`}
          </button>
          <button
            className="icon-btn"
            onClick={() => { const el = audioRef.current; if (el) { el.currentTime = 0; el.play().catch(() => setError(true)); } }}
          >
            ↺ {tr('audio.replay')}
          </button>
          <span className="time">{fmtTime(elapsed)} / {fmtTime(duration)}</span>
          <input
            type="range" min={0} max={Math.max(duration, 0.01)} step={0.1} value={Math.min(elapsed, duration)}
            onChange={(e) => { const el = audioRef.current; if (el) el.currentTime = Number(e.target.value); }}
            aria-label={label} style={{ accentColor: '#c6a15b', flex: 1, minWidth: 120 }}
          />
          <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {tr('common.volume')}
            <input type="range" min={0} max={1} step={0.05} value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label={tr('common.volume')} style={{ accentColor: '#c6a15b' }} />
          </label>
        </div>
        {error && <p className="muted" role="alert">⚠ {tr('audio.error')} <button className="icon-btn" onClick={() => { setError(false); toggleAudio(); }}>{tr('common.retry')}</button></p>}
      </div>
    );
  }

  return (
    <div className="narr-player" role="region" aria-label={`${tr('audio.listen')}: ${label}`}>
      <span className="badge">🤖 {tr('audio.previewBadge')}</span>
      <p className="muted" style={{ margin: '8px 0' }}>{tr('audio.previewNote')}</p>
      <div className="controls">
        {!previewing
          ? <button className="icon-btn primary" onClick={startPreview}>▶ {tr('audio.listen')}</button>
          : <button className="icon-btn" onClick={stopPreview}>⏹ {tr('player.pause')}</button>}
        <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {tr('common.volume')}
          <input type="range" min={0} max={1} step={0.05} value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label={tr('common.volume')} style={{ accentColor: '#c6a15b' }} />
        </label>
      </div>
      {error && <p className="muted" role="alert">⚠ {tr('audio.error')}</p>}
    </div>
  );
}
