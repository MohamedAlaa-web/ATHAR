import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, QrCode } from 'lucide-react';
import { useNav } from '../NavProvider';
import { navT } from '../i18n';
import { MUSEUM, hallById, museumArtifactById } from '../../data/museum';
import { useQrCamera } from '../hooks/useQrCamera';
import { QrImage } from '../components/QrImage';

interface ScanResult {
  raw: string;
  ok: boolean;
  kind: 'artifact' | 'entrance' | 'hall' | null;
  artifactId: string | null;
  hallId: string | null;
  realCamera: boolean;
}

export function QrPage() {
  const { lang, confirmQr } = useNav();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = params.get('entrance')
    ? MUSEUM.entrance.qrId
    : (params.get('artifact') && museumArtifactById(params.get('artifact')!)?.qrId) || MUSEUM.entrance.qrId;
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleDecode = useCallback(
    (raw: string) => {
      const applied = confirmQr(raw);
      setResult({ raw, ...applied, realCamera: true });
    },
    [confirmQr]
  );
  const camera = useQrCamera({ onDecode: handleDecode });
  const live = camera.state === 'scanning' || camera.state === 'starting';
  const stopCamera = camera.stop;

  useEffect(() => () => stopCamera(), [stopCamera]);

  const useDemoCode = () => {
    const raw = `ATHAR:${code}`;
    const applied = confirmQr(raw);
    setResult({ raw, ...applied, realCamera: false });
  };

  const selectedArtifact = museumArtifactById(result?.artifactId ?? '') ?? null;
  const selectedHall = result?.hallId ? hallById(result.hallId) : null;
  const resolved = result?.ok
    ? result.kind === 'entrance'
      ? navT(lang, 'qr.entrance')
      : result.kind === 'hall'
        ? selectedHall?.name[lang] ?? result.hallId
        : selectedArtifact?.name[lang] ?? result.artifactId
    : null;

  return (
    <div className="px-4 pb-4 pt-4">
      <h1 className="text-lg leading-tight text-ink">{navT(lang, 'qr.title')}</h1>
      <p className="mt-1 max-w-[42ch] text-xs leading-relaxed text-ink-soft">{navT(lang, 'qr.sub')}</p>

      <div className="relative mt-4 overflow-hidden rounded-sm border border-rule bg-ink">
        <video
          ref={camera.videoRef}
          muted
          playsInline
          aria-label="QR camera preview"
          className={`aspect-square w-full object-cover ${live ? 'block' : 'hidden'}`}
        />
        {!live && (
          <div className="flex aspect-square items-center justify-center p-8">
            <div className="rounded-sm bg-white p-3">
              <QrImage code={code} size={176} />
            </div>
          </div>
        )}

        {/* Corner marks only: no frame colour, no glow. */}
        <div className="pointer-events-none absolute inset-5" aria-hidden="true">
          {[
            'start-0 top-0 border-s-2 border-t-2',
            'end-0 top-0 border-e-2 border-t-2',
            'start-0 bottom-0 border-s-2 border-b-2',
            'end-0 bottom-0 border-e-2 border-b-2'
          ].map((cls) => (
            <span key={cls} className={`absolute h-7 w-7 border-white/70 ${cls}`} />
          ))}
        </div>

        <span
          className={`absolute bottom-2 start-2 rounded-sm px-2 py-1 text-micro font-medium ${
            live ? 'bg-malachite text-white' : 'bg-white/85 text-ink'
          }`}
        >
          {live
            ? navT(lang, 'qr.scanning')
            : `${navT(lang, 'artifact.placeholder')} — ${camera.frames} ${navT(lang, 'deviceCheck.frames')}`}
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {live ? (
          <button type="button" onClick={camera.stop} className="ui-btn-secondary">
            {navT(lang, 'qr.stop')}
          </button>
        ) : (
          <button type="button" onClick={() => camera.start()} disabled={camera.state === 'starting'} className="ui-btn-primary">
            <QrCode size={17} strokeWidth={1.8} />
            {navT(lang, 'qr.camera')}
          </button>
        )}
        <button type="button" onClick={useDemoCode} className="ui-btn-secondary">
          {navT(lang, 'qr.scan')}
          <span className="text-xs font-normal text-ink-muted">({navT(lang, 'common.placeholder')})</span>
        </button>
      </div>

      {camera.state === 'denied' && <p className="mt-2 text-xs text-carnelian">{navT(lang, 'qr.cameraDenied')}</p>}
      {camera.state === 'unavailable' && (
        <p className="mt-2 text-xs text-carnelian">
          {camera.errorDetail === 'insecure-context' ? navT(lang, 'qr.cameraInsecure') : navT(lang, 'qr.cameraUnavailable')}
        </p>
      )}
      {camera.state === 'error' && <p className="mt-2 text-xs text-carnelian">{navT(lang, 'qr.cameraUnavailable')}</p>}

      {result && (
        <section className="mt-4 border-t border-rule pt-3" role="status">
          <p className={`text-sm font-semibold ${result.ok ? 'text-malachite' : 'text-carnelian'}`}>
            {result.ok ? navT(lang, 'qr.applied') : navT(lang, 'qr.invalid')}
          </p>
          {resolved && <p className="mt-0.5 text-sm text-ink">{resolved}</p>}
          <p className="mt-1 break-all text-micro text-ink-muted" dir="ltr">
            {navT(lang, 'qr.decoded')}: {result.raw} ({result.realCamera ? 'camera' : 'demo code'})
          </p>
          <div className="mt-3 flex gap-2">
            {result.kind === 'artifact' && result.artifactId ? (
              <Link to={`/item/${result.artifactId}`} className="ui-btn-primary flex-1">
                {navT(lang, 'qr.openArtifact')}
              </Link>
            ) : (
              <button type="button" onClick={() => navigate('/map')} className="ui-btn-primary flex-1">
                {navT(lang, 'qr.back')}
              </button>
            )}
            <button type="button" onClick={() => setResult(null)} className="ui-btn-secondary flex-1">
              {navT(lang, 'common.retry')}
            </button>
          </div>
        </section>
      )}

      <section className="mt-5">
        <h2 className="section-title">{navT(lang, 'qr.demoCodes')}</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          {lang === 'ar'
            ? 'الرموز مولّدة فعليًا وتُقرأ بالكاميرا. اختيار الرمز هنا يختبر المسار بدون كاميرا ويُوسم بوضوح.'
            : 'These are genuinely generated QR codes. Picking one tests the positioning reset without a camera and is labelled as a demo code.'}
        </p>

        <ul className="mt-2 divide-y divide-rule border-y border-rule">
          <li>
            <button
              type="button"
              onClick={() => setCode(MUSEUM.entrance.qrId)}
              aria-pressed={code === MUSEUM.entrance.qrId}
              className="flex min-h-11 w-full items-center justify-between gap-3 text-start"
            >
              <span className="text-sm text-ink">{navT(lang, 'qr.entrance')}</span>
              <span className="flex items-center gap-2">
                <span className="num text-micro text-ink-muted" dir="ltr">{MUSEUM.entrance.qrId}</span>
                {code === MUSEUM.entrance.qrId && <Check size={16} className="text-lapis" />}
              </span>
            </button>
          </li>
          {MUSEUM.artifacts.map((artifact) => (
            <li key={artifact.id}>
              <button
                type="button"
                onClick={() => setCode(artifact.qrId)}
                aria-pressed={code === artifact.qrId}
                className="flex min-h-11 w-full items-center justify-between gap-3 text-start"
              >
                <span className="truncate text-sm text-ink">{artifact.name[lang]}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="num text-micro text-ink-muted" dir="ltr">{artifact.qrId}</span>
                  {code === artifact.qrId && <Check size={16} className="text-lapis" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4">
        <Link to="/map" className="ui-btn-secondary w-full">
          {navT(lang, 'qr.back')}
        </Link>
      </div>
    </div>
  );
}
