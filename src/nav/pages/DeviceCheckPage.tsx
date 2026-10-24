import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { useNav } from '../NavProvider';
import { navT } from '../i18n';
import { useQrCamera } from '../hooks/useQrCamera';
import { MUSEUM, qrTarget } from '../../data/museum';
import { QrImage } from '../components/QrImage';
import { MotionSource } from '../../positioning/core/sources';
import { BackIcon, CrosshairIcon, QrIcon } from '../components/Icons';

const DEMO_PAYLOAD = `ATHAR:${MUSEUM.entrance.qrId}`;

type CheckState = 'untested' | 'waiting' | 'pass' | 'fail' | 'info';
interface Check {
  state: CheckState;
  note?: string;
}

const UNTESTED: Check = { state: 'untested' };

const TONE: Record<CheckState, string> = {
  pass: 'border-malachite bg-malachite/10 text-malachite',
  fail: 'border-carnelian/40 bg-carnelian/10 text-carnelian',
  waiting: 'border-rule bg-lapis/10 text-lapis',
  info: 'border-lapis/30 bg-lapis/10 text-lapis',
  untested: 'border-rule bg-stone-100 text-ink-muted'
};

function CheckRow({
  lang,
  label,
  check,
  children
}: {
  lang: 'ar' | 'en';
  label: string;
  check: Check;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-rule bg-stone-100 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-ink">{label}</p>
        <span className={`ui-chip shrink-0 ${TONE[check.state]}`}>
          {check.state === 'pass' ? '✓ ' : check.state === 'fail' ? '✕ ' : ''}
          {navT(lang, `deviceCheck.status.${check.state}`)}
        </span>
      </div>
      {check.note && (
        <p className="mt-1 break-words text-micro leading-relaxed text-ink-muted" dir="auto">
          {check.note}
        </p>
      )}
      {children}
    </div>
  );
}

interface MotionReadout {
  events: number;
  orientation: number;
  steps: number;
  heading: number;
  reliability: 'absolute' | 'relative' | 'unknown';
}

const EMPTY_READOUT: MotionReadout = { events: 0, orientation: 0, steps: 0, heading: 0, reliability: 'unknown' };

const readMotion = (source: MotionSource): MotionReadout => ({
  events: source.eventCount,
  orientation: source.orientationEventCount,
  steps: source.stepCount,
  heading: source.headingDegrees,
  reliability: source.headingReliability
});

export function DeviceCheckPage() {
  const { lang } = useNav();
  const [cameraDecode, setCameraDecode] = useState<Check>(UNTESTED);
  const [cameraEverGranted, setCameraEverGranted] = useState(false);
  const [qrSelfTest, setQrSelfTest] = useState<Check>(UNTESTED);
  const camera = useQrCamera({
    onDecode: useCallback((raw: string) => {
      setCameraDecode(qrTarget(raw) ? { state: 'pass', note: raw } : { state: 'fail', note: raw });
    }, [])
  });

  const [motion, setMotion] = useState<Check>(UNTESTED);
  const [ios, setIos] = useState<Check>({ state: 'untested' });
  const [readout, setReadout] = useState<MotionReadout>(EMPTY_READOUT);
  const [testing, setTesting] = useState(false);
  const sourceRef = useRef<MotionSource | null>(null);

  const hasMotionApi = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  const hasOrientationApi = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  const secureContext = typeof window === 'undefined' ? false : window.isSecureContext !== false;
  const hasIosPermissionApi =
    typeof window !== 'undefined' &&
    (typeof (window as unknown as { DeviceMotionEvent?: { requestPermission?: unknown } }).DeviceMotionEvent
      ?.requestPermission === 'function' ||
      typeof (window as unknown as { DeviceOrientationEvent?: { requestPermission?: unknown } })
        .DeviceOrientationEvent?.requestPermission === 'function');

  useEffect(() => {
    if (camera.state === 'scanning') setCameraEverGranted(true);
  }, [camera.state]);

  useEffect(() => () => sourceRef.current?.stop(), []);

  useEffect(() => {
    if (!testing) return;
    const timer = window.setInterval(() => {
      const source = sourceRef.current;
      if (source) setReadout(readMotion(source));
    }, 500);
    return () => window.clearInterval(timer);
  }, [testing]);

  const cameraCheck: Check =
    camera.state === 'denied'
      ? { state: 'fail', note: `${navT(lang, 'deviceCheck.cameraDenied')} (${camera.errorDetail || 'NotAllowedError'})` }
      : camera.state === 'unavailable'
        ? {
            state: 'fail',
            note:
              camera.errorDetail === 'insecure-context'
                ? navT(lang, 'deviceCheck.cameraUnsupported')
                : `${navT(lang, 'deviceCheck.cameraUnsupported')} (${camera.errorDetail || 'getUserMedia'})`
          }
        : camera.state === 'error'
          ? { state: 'fail', note: `${navT(lang, 'deviceCheck.cameraError')} (${camera.errorDetail || 'Error'})` }
          : camera.state === 'scanning'
            ? {
                state: 'pass',
                note: `${navT(lang, 'deviceCheck.cameraGranted')} · ${camera.frames} ${navT(lang, 'deviceCheck.frames')}`
              }
            : camera.state === 'starting'
              ? { state: 'waiting', note: navT(lang, 'deviceCheck.cameraWaiting') }
              : cameraEverGranted
                ? { state: 'pass', note: navT(lang, 'deviceCheck.cameraGranted') }
                : UNTESTED;

  const liveCamera = camera.state === 'scanning' || camera.state === 'starting';

  const runQrSelfTest = async () => {
    setQrSelfTest({ state: 'waiting' });
    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, DEMO_PAYLOAD, {
        width: 320,
        margin: 2,
        color: { dark: '#0B1017', light: '#F4EFE6' }
      });
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('no-2d-context');
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
      setQrSelfTest(
        decoded?.data === DEMO_PAYLOAD
          ? { state: 'pass', note: `${image.width}×${image.height} · ${DEMO_PAYLOAD}` }
          : { state: 'fail', note: decoded?.data ? decoded.data : `jsQR → no payload` }
      );
    } catch (error) {
      setQrSelfTest({ state: 'fail', note: error instanceof Error ? error.message : String(error) });
    }
  };

  const iosCheck: Check = !hasIosPermissionApi
    ? { state: 'info', note: navT(lang, 'deviceCheck.iosNotApplicable') }
    : ios;

  const startSensors = async () => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    setReadout(EMPTY_READOUT);
    setTesting(false);
    setIos(hasIosPermissionApi ? { state: 'waiting' } : { state: 'info', note: navT(lang, 'deviceCheck.iosNotApplicable') });
    if (!hasMotionApi) {
      setMotion({ state: 'fail', note: navT(lang, 'deviceCheck.apiMissing') });
      return;
    }
    setMotion({ state: 'waiting' });
    const source = new MotionSource({
      strideM: 0.68,
      /* Steps are read from the source by the polling readout; the test does
       * not feed them into the positioning engine. */
      onStep: () => {},
      onStatus: (status) => {
        if (status.reason === 'permission-required') setIos({ state: 'waiting', note: status.detail });
        if (status.reason === 'permission-denied') setIos({ state: 'fail', note: status.detail });
      }
    });
    sourceRef.current = source;
    const started = await source.start();
    setReadout(readMotion(source));
    if (started) {
      setMotion({ state: 'pass', note: `${readMotion(source).events} ${navT(lang, 'deviceCheck.events')}` });
      setTesting(true);
      if (hasIosPermissionApi) {
        const denied = source.orientationPermissionResult === 'denied';
        setIos({ state: denied ? 'fail' : 'pass', note: navT(lang, denied ? 'deviceCheck.iosDenied' : 'deviceCheck.iosGranted') });
      }
      return;
    }
    const status = source.status();
    setMotion({ state: 'fail', note: status.detail });
    setTesting(false);
    if (hasIosPermissionApi && status.reason === 'permission-denied') {
      setIos({ state: 'fail', note: status.detail });
    }
  };

  const stopSensors = () => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    setTesting(false);
  };

  const headingLabel =
    readout.reliability === 'unknown'
      ? navT(lang, 'deviceCheck.noHeading')
      : `${readout.heading.toFixed(0)}° · ${navT(
          lang,
          readout.reliability === 'absolute' ? 'deviceCheck.headingAbsolute' : 'deviceCheck.headingRelative'
        )}`;

  return (
    <div className="space-y-4 px-4 pt-5 pb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label text-lapis">{navT(lang, 'settings.deviceCheck')}</p>
          <h1 className="mt-1 text-lg text-ink">{navT(lang, 'deviceCheck.title')}</h1>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-rule bg-lapis/10 text-ink-soft">
          <CrosshairIcon />
        </span>
      </div>
      <p className="text-xs leading-relaxed text-ink-muted">{navT(lang, 'deviceCheck.sub')}</p>

      <section className="border-t border-rule pt-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="section-title">{navT(lang, 'deviceCheck.camera')}</h2>
          <span className={`ui-chip ${TONE[cameraCheck.state]}`}>{navT(lang, `deviceCheck.status.${cameraCheck.state}`)}</span>
        </div>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'deviceCheck.cameraBody')}</p>

        <div className="relative mt-3 overflow-hidden rounded-sm border border-rule bg-[#070B10]">
          <video
            ref={camera.videoRef}
            muted
            playsInline
            aria-label="Camera test preview"
            className={`aspect-video w-full object-cover ${liveCamera ? 'block' : 'hidden'}`}
          />
          {!liveCamera && (
            <div className="flex aspect-video items-center justify-center p-4">
              <div className="rounded-sm bg-stone-100 p-2">
                <QrImage code={MUSEUM.entrance.qrId} size={180} />
              </div>
            </div>
          )}
          <span className="absolute bottom-2 start-2 rounded-full border border-rule bg-surface/90 px-2 py-0.5 text-micro text-ink-soft">
            {liveCamera
              ? `${navT(lang, 'qr.scanning')} · ${camera.frames} ${navT(lang, 'deviceCheck.frames')}`
              : navT(lang, 'deviceCheck.demoCode')}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => (liveCamera ? camera.stop() : camera.start())}
            className="ui-btn-secondary py-2 text-xs"
          >
            {liveCamera ? navT(lang, 'deviceCheck.closeCamera') : navT(lang, 'deviceCheck.openCamera')}
          </button>
          <div className="flex items-center gap-2 text-micro text-ink-muted">
            <QrIcon width={16} height={16} className="shrink-0 text-ink-soft" />
            <span>{navT(lang, 'deviceCheck.cameraDecodeWaiting')}</span>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <CheckRow lang={lang} label={navT(lang, 'deviceCheck.cameraPermission')} check={cameraCheck} />
        </div>
      </section>

      <section className="border-t border-rule pt-4">
        <h2 className="section-title">{navT(lang, 'deviceCheck.qr')}</h2>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'deviceCheck.qrBody')}</p>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-sm border border-rule bg-stone-100 p-2.5">
          <span className="min-w-0">
            <span className="block text-micro text-ink-muted">{navT(lang, 'deviceCheck.demoCode')}</span>
            <span className="block break-all num text-micro text-ink-soft" dir="ltr">
              {DEMO_PAYLOAD}
            </span>
          </span>
          <button type="button" onClick={runQrSelfTest} className="ui-btn-secondary shrink-0 px-3 py-1.5 text-micro">
            {navT(lang, 'deviceCheck.runSelfTest')}
          </button>
        </div>
        <div className="mt-2 space-y-2">
          <CheckRow
            lang={lang}
            label={navT(lang, 'deviceCheck.demoCode')}
            check={
              qrSelfTest.state === 'pass'
                ? { state: 'pass', note: `${navT(lang, 'deviceCheck.selfTestPass')} ${qrSelfTest.note ?? ''}` }
                : qrSelfTest.state === 'fail'
                  ? { state: 'fail', note: `${navT(lang, 'deviceCheck.selfTestFail')} ${qrSelfTest.note ?? ''}` }
                  : qrSelfTest.state === 'waiting'
                    ? { state: 'waiting' }
                    : { state: 'untested', note: navT(lang, 'deviceCheck.selfTestNote') }
            }
          />
          <CheckRow
            lang={lang}
            label={navT(lang, 'deviceCheck.cameraDecode')}
            check={
              cameraDecode.state === 'pass'
                ? { state: 'pass', note: `${navT(lang, 'deviceCheck.cameraDecodePass')} ${cameraDecode.note ?? ''}` }
                : cameraDecode.state === 'fail'
                  ? { state: 'fail', note: `${navT(lang, 'deviceCheck.cameraDecodeFail')} ${cameraDecode.note ?? ''}` }
                  : { state: liveCamera ? 'waiting' : 'untested', note: liveCamera ? undefined : navT(lang, 'deviceCheck.cameraDecodeWaiting') }
            }
          />
        </div>
      </section>

      <section className="border-t border-rule pt-4">
        <h2 className="section-title">{navT(lang, 'deviceCheck.motion')}</h2>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'deviceCheck.motionBody')}</p>

        <div className="mt-3 grid gap-2 text-micro sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 rounded-sm border border-rule p-2.5">
            <span className="text-ink-muted">{navT(lang, 'deviceCheck.api')}</span>
            <span className={hasMotionApi ? 'text-ink-soft' : 'text-carnelian'}>
              {hasMotionApi ? navT(lang, 'deviceCheck.status.info') : navT(lang, 'deviceCheck.status.fail')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-sm border border-rule p-2.5">
            <span className="text-ink-muted">{navT(lang, 'deviceCheck.secureContext')}</span>
            <span className={secureContext ? 'text-malachite' : 'text-carnelian'}>
              {secureContext ? navT(lang, 'deviceCheck.secureYes') : navT(lang, 'deviceCheck.secureNo')}
            </span>
          </div>
        </div>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">
          {hasMotionApi ? navT(lang, 'deviceCheck.apiPresent') : navT(lang, 'deviceCheck.apiMissing')}
          {hasOrientationApi ? '' : ` · ${navT(lang, 'deviceCheck.noHeading')}`}
        </p>

        <div className="mt-3 space-y-2">
          <CheckRow lang={lang} label={navT(lang, 'deviceCheck.iosPermission')} check={iosCheck} />
          <CheckRow
            lang={lang}
            label={navT(lang, 'deviceCheck.runSensors')}
            check={
              motion.state === 'pass'
                ? { state: 'pass', note: `${navT(lang, 'deviceCheck.motionPass')} ${motion.note ?? ''}` }
                : motion.state === 'fail'
                  ? { state: 'fail', note: navT(lang, 'deviceCheck.motionFail') }
                  : motion.state === 'waiting'
                    ? { state: 'waiting' }
                    : UNTESTED
            }
          />
          {motion.state === 'fail' && (
            <p className="px-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'deviceCheck.motionNoHardware')}</p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { label: navT(lang, 'deviceCheck.events'), value: String(readout.events) },
            { label: navT(lang, 'deviceCheck.orientationEvents'), value: String(readout.orientation) },
            { label: navT(lang, 'deviceCheck.steps'), value: String(readout.steps) },
            { label: navT(lang, 'deviceCheck.heading'), value: headingLabel }
          ].map((item) => (
            <div key={item.label} className="rounded-sm border border-rule bg-stone-100 p-2.5">
              <p className="text-micro text-ink-muted">{item.label}</p>
              <p className="mt-0.5 num text-sm text-ink" dir="ltr">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-micro leading-relaxed text-ink-muted">{navT(lang, 'deviceCheck.walkHint')}</p>

        <button
          type="button"
          onClick={() => (testing ? stopSensors() : startSensors())}
          className={`mt-3 w-full py-2.5 text-xs ${testing ? 'ui-btn-secondary' : 'ui-btn-primary'}`}
        >
          {testing ? navT(lang, 'deviceCheck.stopSensors') : navT(lang, 'deviceCheck.runSensors')}
        </button>
      </section>

      <p className="border-s-2 border-ochre px-3 py-1.5 text-micro leading-relaxed text-ochre">
        {navT(lang, 'deviceCheck.never')}
      </p>

      <Link to="/settings" className="ui-btn-secondary w-full">
        <BackIcon width={16} height={16} />
        {navT(lang, 'deviceCheck.back')}
      </Link>
    </div>
  );
}
