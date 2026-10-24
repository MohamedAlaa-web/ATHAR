import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNav } from '../NavProvider';
import { navT } from '../i18n';
import { BleSource, QrSource } from '../../positioning/core/sources';
import { CrosshairIcon, PauseIcon, PlayIcon, QrIcon } from '../components/Icons';

function Toggle({
  checked,
  onChange,
  label,
  note
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  note?: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-start justify-between gap-4 py-3 text-start">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {note && <span className="mt-0.5 block text-micro leading-relaxed text-ink-muted">{note}</span>}
      </span>
      <span
        role="switch"
        aria-checked={checked}
        className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition ${
          checked ? 'border-rule bg-lapis' : 'border-rule bg-stone-100'
        }`}
      >
        <span className={`h-5 w-5 rounded-full bg-stone transition ${checked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

export function SettingsPage() {
  const {
    lang,
    setLang,
    settings,
    setAccessible,
    setLowPower,
    setCrowd,
    setAvoidCrowded,
    mode,
    simulationRunning,
    motionRunning,
    motionStatus,
    motionHeading,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    startMotion,
    stopMotion,
    activateManual,
    resetDemo,
    clearNavigation
  } = useNav();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  const qrStatus = useMemo(() => new QrSource().status(), []);
  const bleStatus = useMemo(() => new BleSource().status(), []);
  /* The sensor layer reports in English for the device-check diagnostics; the
     Settings summary is part of the Arabic UI, so it gets its own copy. */
  const qrStatusAr = qrStatus.available
    ? 'الكاميرا وفك ترميز QR متاحان؛ تُفتح الكاميرا أثناء المسح فقط.'
    : qrStatus.reason === 'insecure-context'
      ? 'تحتاج الكاميرا إلى HTTPS أو localhost.'
      : 'لا توجد واجهة كاميرا في هذا المتصفح.';
  const bleStatusAr = bleStatus.available
    ? 'جسر BLE أصلي موصول — القراءة مسؤولية الجسر.'
    : 'Bluetooth في المتصفح لا يفحص الإعلانات ولا يعطي RSSI. BLE الحقيقي يحتاج بناءً أصليًا (Capacitor/CoreBluetooth). المحاكي هو مسار BLE الوحيد العامل في هذا العرض.';

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    clearNavigation();
    resetDemo();
    setLang('ar');
    navigate('/onboarding', { replace: true });
  };

  const motionLabel = (() => {
    if (motionRunning) return navT(lang, 'settings.motionActive');
    if (motionStatus?.reason === 'permission-denied') return navT(lang, 'settings.motionDenied');
    if (motionStatus?.reason === 'not-supported' || motionStatus?.reason === 'insecure-context') {
      return navT(lang, 'settings.motionUnsupported');
    }
    if (motionStatus?.reason === 'no-events') return navT(lang, 'settings.motionNoEvents');
    return motionStatus?.detail ?? (lang === 'ar' ? 'لم يبدأ بعد.' : 'Not started.');
  })();

  return (
    <div className="space-y-4 px-4 pt-5 pb-3">
      <div>
        <h1 className="text-lg text-ink">{navT(lang, 'settings.title')}</h1>
      </div>

      <section className="border-t border-rule pt-4">
        <h2 className="section-title">{navT(lang, 'settings.language')}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['ar', 'en'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={lang === value}
              onClick={() => setLang(value)}
              className={`rounded-sm border px-4 py-3 text-sm font-semibold ${
                lang === value ? 'border-rule bg-lapis/10 text-lapis' : 'border-rule text-ink-soft'
              }`}
            >
              {value === 'ar' ? navT(lang, 'settings.arabic') : navT(lang, 'settings.english')}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-rule pt-4">
        <h2 className="section-title">{navT(lang, 'settings.navigation')}</h2>
        <div className="mt-1 divide-y divide-rule">
          <Toggle
            checked={settings.accessible}
            onChange={setAccessible}
            label={navT(lang, 'settings.accessible')}
            note={navT(lang, 'settings.accessibleNote')}
          />
          <Toggle
            checked={settings.lowPower}
            onChange={setLowPower}
            label={navT(lang, 'settings.lowPower')}
            note={navT(lang, 'settings.lowPowerNote')}
          />
          <Toggle
            checked={settings.avoidCrowded}
            onChange={setAvoidCrowded}
            label={navT(lang, 'settings.avoidCrowd')}
            note={navT(lang, 'settings.avoidCrowdNote')}
          />
        </div>
      </section>

      <section className="border-t border-rule pt-4">
        <h2 className="section-title">{navT(lang, 'settings.source')}</h2>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">
          {lang === 'ar'
            ? 'تُشغَّل الحساسات فقط أثناء التتبع. أوقفها من هنا في أي وقت.'
            : 'Sensors run only while tracking. Stop them here at any time.'}
        </p>

        <div className="mt-3 space-y-2">
          <div className="rounded-sm border border-rule bg-stone-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-ink">{navT(lang, 'settings.sourceSim')}</p>
                <p className="text-micro text-ink-muted">
                  {navT(lang, 'settings.simulated')} — 1 Hz{settings.lowPower ? ' / 0.5 Hz' : ''}
                </p>
              </div>
              <span className={`ui-chip ${simulationRunning ? 'border-malachite text-malachite' : ''}`}>
                {simulationRunning
                  ? lang === 'ar' ? '● نشط' : '● live'
                  : mode === 'sim'
                    ? lang === 'ar' ? 'موقوف مؤقتًا' : 'paused'
                    : lang === 'ar' ? 'متوقف' : 'idle'}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => (simulationRunning ? pauseSimulation() : resumeSimulation())}
                className="ui-btn-secondary py-2 text-xs"
              >
                {simulationRunning ? <PauseIcon width={14} height={14} /> : <PlayIcon width={14} height={14} />}
                {simulationRunning ? navT(lang, 'map.pause') : navT(lang, 'settings.startSource')}
              </button>
              <button type="button" onClick={startSimulation} className="ui-btn-secondary py-2 text-xs">
                {navT(lang, 'map.startDemo')}
              </button>
            </div>
          </div>

          <div className="rounded-sm border border-rule bg-stone-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-ink">{navT(lang, 'settings.sourceMotion')}</p>
                <p className="text-micro text-ink-muted">{navT(lang, 'settings.live')}</p>
              </div>
              <span className={`ui-chip ${motionRunning ? 'border-malachite text-malachite' : ''}`}>
                {motionRunning
                  ? lang === 'ar' ? '● نشط' : '● live'
                  : lang === 'ar' ? 'متوقف' : 'idle'}
              </span>
            </div>
            <p className="mt-2 text-micro leading-relaxed text-ink-muted">{motionLabel}</p>
            {motionRunning && motionHeading === 'relative' && (
              <p className="mt-1 text-micro text-ochre">{navT(lang, 'settings.motionRelative')}</p>
            )}
            <button
              type="button"
              onClick={() => (motionRunning ? stopMotion() : startMotion())}
              className="ui-btn-secondary mt-2 w-full py-2 text-xs"
            >
              {motionRunning ? navT(lang, 'settings.stopSource') : navT(lang, 'settings.startSource')}
            </button>
          </div>

          <div className="rounded-sm border border-rule bg-stone-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-ink">{navT(lang, 'settings.sourceManual')}</p>
                <p className="text-micro text-ink-muted">{navT(lang, 'onboard.tapMapNote')}</p>
              </div>
              <CrosshairIcon width={18} height={18} className="text-ink-soft" />
            </div>
            <button
              type="button"
              onClick={() => {
                activateManual();
                navigate('/map');
              }}
              className="ui-btn-secondary mt-2 w-full py-2 text-xs"
            >
              {navT(lang, 'map.manualHint')}
            </button>
          </div>

          <Link to="/qr" className="flex items-center justify-between rounded-sm border border-rule bg-stone-100 p-3">
            <span>
              <span className="block text-xs font-semibold text-ink">{navT(lang, 'settings.sourceQr')}</span>
              <span className="block text-micro text-ink-muted">
                {lang === 'ar' ? qrStatusAr : qrStatus.detail}
              </span>
            </span>
            <QrIcon width={18} height={18} className="text-ink-soft" />
          </Link>
        </div>
      </section>

      <section className="border-t border-rule pt-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="section-title">{navT(lang, 'settings.simulation')}</h2>
          <span className="ui-chip py-0.5 text-micro">{navT(lang, 'crowd.simulated')}</span>
        </div>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'settings.crowdNote')}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['low', 'medium', 'high'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setCrowd(level)}
              className={`min-h-11 rounded-sm border px-2 py-2 text-xs font-semibold ${
                settings.crowd === level ? 'border-rule bg-lapis text-white' : 'border-rule text-ink-soft'
              }`}
            >
              {lang === 'ar'
                ? { low: 'منخفض', medium: 'متوسط', high: 'مرتفع' }[level]
                : { low: 'Low', medium: 'Medium', high: 'High' }[level]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-sm border border-carnelian/25 bg-carnelian/[0.06] p-4">
        <h2 className="text-xs font-semibold text-carnelian">{navT(lang, 'settings.bleStub')}</h2>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'settings.bleStubBody')}</p>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {lang === 'ar' ? bleStatusAr : bleStatus.detail}
        </p>
      </section>

      <section className="border-t border-rule pt-4">
        <h2 className="section-title">{navT(lang, 'settings.plan')}</h2>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'settings.planNote')}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to="/plan" className="flex min-h-11 items-center justify-between rounded-sm border border-rule bg-stone-100 px-3 text-xs font-semibold text-ink">
            {navT(lang, 'plan.open')}
          </Link>
          <Link to="/rewards" className="flex min-h-11 items-center justify-between rounded-sm border border-rule bg-stone-100 px-3 text-xs font-semibold text-ink">
            {navT(lang, 'settings.rewards')}
          </Link>
        </div>
      </section>

      <section className="border-t border-rule pt-4">
        <h2 className="section-title">{navT(lang, 'settings.deviceCheck')}</h2>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'settings.deviceCheckNote')}</p>
        <Link
          to="/device-check"
          className="mt-3 flex items-center justify-between rounded-sm border border-rule bg-stone-100 p-3"
        >
          <span className="block text-xs font-semibold text-ink">{navT(lang, 'deviceCheck.title')}</span>
          <span className="ui-chip py-0.5 text-micro">
            {lang === 'ar' ? 'كاميرا، QR، حركة' : 'camera, QR, motion'}
          </span>
        </Link>
      </section>

      <section className="border-t border-rule pt-4">
        <h2 className="section-title">{navT(lang, 'settings.privacy')}</h2>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'settings.privacyBody')}</p>
      </section>

      <section className="border-t border-rule pt-4">
        <h2 className="section-title">{navT(lang, 'settings.about')}</h2>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'settings.aboutBody')}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-micro">
          {import.meta.env.VITE_DEMO_BUILD !== '1' && (
            <>
              <Link to="/explore" className="ui-chip">legacy museum tour</Link>
              <Link to="/positioning" className="ui-chip">legacy positioning demo</Link>
            </>
          )}
        </div>
      </section>

      <section className="border-t border-rule pt-4">
        <h2 className="section-title text-carnelian">{navT(lang, 'settings.reset')}</h2>
        <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'settings.resetNote')}</p>
        <button type="button" onClick={reset} className={`mt-3 min-h-11 w-full rounded-sm border px-4 py-2.5 text-sm font-semibold ${confirmReset ? 'border-carnelian bg-carnelian/20 text-carnelian' : 'border-carnelian/30 text-carnelian'}`}>
          {confirmReset ? (lang === 'ar' ? 'اضغط مرة أخرى للتأكيد' : 'Tap again to confirm') : navT(lang, 'settings.reset')}
        </button>
        {confirmReset && (
          <button type="button" onClick={() => setConfirmReset(false)} className="mt-2 w-full py-1 text-micro text-ink-muted">
            {navT(lang, 'common.cancel')}
          </button>
        )}
      </section>

      <p className="pb-2 text-center text-micro leading-relaxed text-ink-muted">
        {lang === 'ar'
          ? `أثر ATHAR — نموذج جامعي ${new Date().getFullYear()} — بلا حسابات، بلا تتبع`
          : `ATHAR — university prototype ${new Date().getFullYear()} — no accounts, no tracking`}
      </p>
    </div>
  );
}
