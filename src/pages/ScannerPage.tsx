import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ARTIFACTS, getArtifactByCode } from '../data/artifacts';
import { useLang } from '../i18n/LanguageContext';
import { artName } from '../i18n/content';
import { DemoQR } from '../components/DemoQR';

export function ScannerPage() {
  const { lang, tr } = useLang();
  const navigate = useNavigate();
  const [code, setCode] = useState(ARTIFACTS[0].demoCode);
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => stopCamera(), []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    setCameraError(false);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
    } catch {
      setCameraError(true);
    }
  };

  const simulate = () => {
    if (phase === 'scanning') return;
    setPhase('scanning');
    window.setTimeout(() => {
      const found = getArtifactByCode(code);
      setPhase(found ? 'success' : 'error');
    }, 1500);
  };

  const found = getArtifactByCode(code);

  return (
    <div>
      <section style={{ paddingTop: 28 }}>
        <p className="kicker">{tr('nav.scan')}</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,4vw,44px)', margin: '6px 0' }}>{tr('scan.title')}</h1>
        <p className="prose" style={{ maxWidth: '70ch' }}>{tr('scan.sub')}</p>
      </section>

      <div className="scanner-wrap">
        <div className={`viewfinder ${phase === 'scanning' ? 'scanning' : ''}`} aria-label={tr('scan.title')}>
          {cameraOn && <video ref={videoRef} muted playsInline aria-label="Camera preview" />}
          {!cameraOn && <video ref={videoRef} muted playsInline style={{ display: 'none' }} />}
          <div className="scan-frame" aria-hidden="true">
            <span className="corner tl" /><span className="corner tr" />
            <span className="corner bl" /><span className="corner br" />
            <DemoQR code={code} />
            <div className="scan-laser" />
          </div>
        </div>

        <div className="panel">
          <h2>{phase === 'scanning' ? tr('scan.scanning') : phase === 'success' ? tr('scan.success') : tr('scan.title')}</h2>
          <p className="muted">{tr('scan.instructions')}</p>

          <div className="field">
            <label htmlFor="demo-code">{tr('scan.pickCode')}</label>
            <select id="demo-code" className="select" value={code} onChange={(e) => { setCode(e.target.value); setPhase('idle'); }}>
              {ARTIFACTS.map((a) => (
                <option key={a.id} value={a.demoCode}>
                  {a.demoCode} — {artName(a, lang)}
                </option>
              ))}
            </select>
          </div>

          <div className="cta-row" style={{ marginTop: 4 }}>
            <button className="btn btn-gold" onClick={simulate} disabled={phase === 'scanning'}>
              {phase === 'scanning' ? tr('scan.scanning') : tr('scan.simulate')}
            </button>
            {!cameraOn
              ? <button className="btn btn-ghost btn-sm" onClick={startCamera}>◉ {tr('scan.camera')}</button>
              : <button className="btn btn-ghost btn-sm" onClick={stopCamera}>{tr('scan.cameraOff')}</button>}
          </div>
          {cameraOn && <p className="muted" role="status">● {tr('scan.cameraOn')}</p>}
          {cameraError && <p className="muted" role="alert">⚠ {tr('scan.cameraError')}</p>}

          {phase === 'success' && found && (
            <div className="success-box" role="status">
              <strong>✓ {found.demoCode}</strong>
              <p style={{ margin: '6px 0 12px' }}>{artName(found, lang)}</p>
              <button className="btn btn-gold btn-sm" onClick={() => navigate(`/artifact/${found.id}`)}>
                {tr('scan.openArtifact')} →
              </button>
            </div>
          )}
          {phase === 'error' && (
            <div className="success-box" role="alert" style={{ borderColor: '#b0564e' }}>
              <p style={{ margin: 0 }}>⚠ {tr('common.notFound')} ({code})</p>
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
      </div>
    </div>
  );
}
