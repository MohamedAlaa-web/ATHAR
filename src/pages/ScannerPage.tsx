import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ARTIFACTS, getArtifact, getArtifactByCode } from '../data/artifacts';
import { useLang } from '../i18n/LanguageContext';
import { artName } from '../i18n/content';
import { DemoQR } from '../components/DemoQR';
import { useQrScanner } from '../hooks/useQrScanner';
import { resolveQrPayload, type QrResolution } from '../qr/payload';

type Phase = 'idle' | 'success' | 'invalid';

const LAST_SCAN_KEY = 'athar-last-scan';

function storeScan(raw: string, artifactId: string, live: boolean): void {
  try {
    sessionStorage.setItem(
      LAST_SCAN_KEY,
      JSON.stringify({ raw, artifactId, live, timestamp: Date.now() })
    );
  } catch {
    /* private mode — the scan still works for this page */
  }
}

/** A real camera scan is never mixed with the simulated fallback. */
export function ScannerPage() {
  const { lang, tr } = useLang();
  const navigate = useNavigate();
  const [code, setCode] = useState(ARTIFACTS[0].demoCode);
  const [phase, setPhase] = useState<Phase>('idle');
  const [demoRunning, setDemoRunning] = useState(false);
  const [result, setResult] = useState<QrResolution | null>(null);
  const [lastScanLive, setLastScanLive] = useState(false);
  const timerRef = useRef<number | null>(null);

  const handleDecodeRef = useRef<(raw: string) => void>(() => {});
  const scanner = useQrScanner({ onDecode: (raw) => handleDecodeRef.current(raw) });

  const handleDecode = useCallback(
    (raw: string) => {
      const resolved = resolveQrPayload(raw);
      setResult(resolved);
      setLastScanLive(true);
      scanner.stop();
      if (resolved.artifactId) {
        setPhase('success');
        storeScan(resolved.raw, resolved.artifactId, true);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => navigate(`/artifact/${resolved.artifactId}`), 1200);
      } else {
        setPhase('invalid');
      }
    },
    [navigate, scanner]
  );
  handleDecodeRef.current = handleDecode;

  const runDemo = () => {
    if (demoRunning) return;
    setDemoRunning(true);
    setPhase('idle');
    setResult(null);
    window.setTimeout(() => {
      const found = getArtifactByCode(code);
      const resolved: QrResolution = {
        raw: code,
        code: found?.demoCode ?? code,
        artifactId: found?.id ?? null,
        form: found ? 'plain-code' : 'unknown'
      };
      setResult(resolved);
      setLastScanLive(false);
      setDemoRunning(false);
      setPhase(found ? 'success' : 'invalid');
      if (found) storeScan(resolved.raw, found.id, false);
    }, 900);
  };

  const successArtifact = result?.artifactId ? getArtifact(result.artifactId) : undefined;
  const live = scanner.state === 'scanning';

  return (
    <div>
      <section style={{ paddingTop: 28 }}>
        <p className="kicker">{tr('nav.scan')}</p>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(30px,4vw,44px)', margin: '6px 0' }}>
          {tr('scan.title')}
        </h1>
        <p className="prose" style={{ maxWidth: '70ch' }}>{tr('scan.sub')}</p>
      </section>

      <div className="scanner-wrap">
        <div className={`viewfinder ${live ? 'scanning' : ''}`} aria-label={tr('scan.title')}>
          <video
            ref={scanner.videoRef}
            muted
            playsInline
            aria-label="Camera preview"
            style={live ? undefined : { display: 'none' }}
          />
          {!live && <DemoQR code={code} />}
          <div className="scan-frame" aria-hidden="true">
            <span className="corner tl" /><span className="corner tr" />
            <span className="corner bl" /><span className="corner br" />
            <div className="scan-laser" />
          </div>
          <span className={`scan-mode ${live ? 'live' : 'sim'}`} role="status">
            {live ? `● ${tr('scan.liveBadge')}` : tr('scan.simBadge')}
          </span>
        </div>

        <div className="panel">
          <h2>
            {demoRunning || scanner.state === 'starting'
              ? tr('scan.scanning')
              : phase === 'success'
                ? tr('scan.success')
                : tr('scan.title')}
          </h2>
          <p className="muted">{tr('scan.instructions')}</p>

          <div className="cta-row" style={{ marginTop: 4 }}>
            {live ? (
              <button className="btn btn-ghost" onClick={scanner.stop}>■ {tr('scan.cameraOff')}</button>
            ) : (
              <button className="btn btn-gold" onClick={() => scanner.start()} disabled={scanner.state === 'starting'}>
                ◉ {scanner.state === 'starting' ? tr('scan.starting') : tr('scan.camera')}
              </button>
            )}
          </div>
          {live && <p className="muted" role="status">● {tr('scan.cameraOn')}</p>}
          {scanner.state === 'denied' && <p className="muted" role="alert">⚠ {tr('scan.denied')}</p>}
          {scanner.state === 'unavailable' && (
            <p className="muted" role="alert">
              ⚠ {scanner.errorDetail === 'insecure-context' ? tr('scan.insecure') : tr('scan.unavailable')}
            </p>
          )}
          {scanner.state === 'error' && <p className="muted" role="alert">⚠ {tr('scan.cameraError')}</p>}

          <div className="field" style={{ marginTop: 18 }}>
            <label htmlFor="demo-code">{tr('scan.pickCode')}</label>
            <select
              id="demo-code"
              className="select"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setPhase('idle');
                setResult(null);
              }}
            >
              {ARTIFACTS.map((a) => (
                <option key={a.id} value={a.demoCode}>
                  {a.demoCode} — {artName(a, lang)}
                </option>
              ))}
            </select>
          </div>
          <div className="cta-row" style={{ marginTop: 0 }}>
            <button className="btn btn-ghost" onClick={runDemo} disabled={demoRunning}>
              {demoRunning ? tr('scan.scanning') : `▷ ${tr('scan.simulate')}`}
            </button>
          </div>
          <p className="muted" style={{ marginTop: 10 }}>{tr('scan.demoNote')}</p>

          {phase === 'success' && successArtifact && (
            <div className="success-box" role="status">
              <strong>
                {lastScanLive ? tr('scan.liveBadge') : tr('scan.simBadge')} · ✓ {successArtifact.demoCode}
              </strong>
              <p style={{ margin: '6px 0 4px' }}>{artName(successArtifact, lang)}</p>
              <p className="muted" dir="ltr" style={{ margin: '0 0 12px', wordBreak: 'break-all' }}>
                {tr('scan.decoded')}: {result?.raw}
              </p>
              <button className="btn btn-gold btn-sm" onClick={() => navigate(`/artifact/${successArtifact.id}`)}>
                {tr('scan.openArtifact')} →
              </button>
            </div>
          )}
          {phase === 'invalid' && (
            <div className="success-box" role="alert" style={{ borderColor: '#b0564e' }}>
              <p style={{ margin: '0 0 6px' }}>⚠ {tr('scan.invalidPayload')}</p>
              <p className="muted" dir="ltr" style={{ margin: 0, wordBreak: 'break-all' }}>{result?.raw}</p>
            </div>
          )}

          <div className="field" style={{ marginTop: 18 }}>
            <label>{tr('scan.manual')}</label>
            {ARTIFACTS.map((a) => (
              <Link key={a.id} className="btn btn-ghost btn-sm" to={`/artifact/${a.id}`}>
                {artName(a, lang)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="back-row">
        <Link className="btn btn-ghost btn-sm" to="/">← {tr('common.home')}</Link>
        <Link className="btn btn-ghost btn-sm" to="/print">{tr('print.title')}</Link>
      </div>
    </div>
  );
}
