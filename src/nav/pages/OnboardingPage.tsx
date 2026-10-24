import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crosshair, Play, QrCode } from 'lucide-react';
import { useNav } from '../NavProvider';
import { navT } from '../i18n';
import { NavHeader } from '../components/NavLayout';

export function OnboardingPage() {
  const { lang, setLang, startTourAtEntrance, activateManual, completeOnboarding } = useNav();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const begin = async () => {
    setBusy(true);
    await startTourAtEntrance();
    completeOnboarding();
    navigate('/map', { replace: true });
  };

  const manual = () => {
    activateManual();
    completeOnboarding();
    navigate('/map', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-stone">
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col bg-stone md:my-4 md:min-h-[calc(100dvh-2rem)] md:border md:border-rule">
        <NavHeader />
        <main className="flex flex-1 flex-col px-5 pb-10 pt-6">
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-0.5 flex-1 ${i <= step ? 'bg-ink' : 'bg-rule'}`} />
            ))}
          </div>

          {step === 0 && (
            <section className="pt-10">
              <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true" className="text-ink">
                <path
                  d="M12 34 Q32 16 52 34 Q32 52 12 34 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <circle cx="32" cy="34" r="6" fill="currentColor" />
              </svg>
              <h1 className="mt-5 text-xl leading-tight text-ink">{navT(lang, 'onboard.step.language')}</h1>
              <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-ink-soft">{navT(lang, 'onboard.sub')}</p>

              <div className="mt-8 divide-y divide-rule border-y border-rule">
                <button
                  type="button"
                  onClick={() => setLang('ar')}
                  aria-pressed={lang === 'ar'}
                  className="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-start"
                >
                  <span>
                    <span className="block text-base font-semibold text-ink">العربية</span>
                    <span className="block text-xs text-ink-muted">لغة الواجهة الافتراضية</span>
                  </span>
                  {lang === 'ar' && <Check size={20} className="shrink-0 text-lapis" />}
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  aria-pressed={lang === 'en'}
                  className="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-start"
                >
                  <span>
                    <span className="block text-base font-semibold text-ink">English</span>
                    <span className="block text-xs text-ink-muted">
                      {lang === 'ar' ? 'بدّل في أي وقت داخل الخريطة' : 'Switch anytime inside the map'}
                    </span>
                  </span>
                  {lang === 'en' && <Check size={20} className="shrink-0 text-lapis" />}
                </button>
              </div>

              <p className="mt-6 text-micro leading-relaxed text-ink-muted">{navT(lang, 'onboard.placeholderNote')}</p>
            </section>
          )}

          {step === 1 && (
            <section className="pt-8">
              <h1 className="text-lg leading-snug text-ink">{navT(lang, 'onboard.privacy.title')}</h1>
              <ul className="mt-6 divide-y divide-rule border-y border-rule">
                {['onboard.privacy.1', 'onboard.privacy.2', 'onboard.privacy.3', 'onboard.privacy.4'].map((key) => (
                  <li key={key} className="flex gap-3 py-3">
                    <Check size={18} className="mt-0.5 shrink-0 text-malachite" />
                    <span className="text-sm leading-relaxed text-ink">{navT(lang, key)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <p className="text-xs font-semibold text-ink">{lang === 'ar' ? 'الأذونات' : 'Permissions'}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {lang === 'ar'
                    ? 'لا نطلب أي إذن عند البدء. الكاميرا تُطلب فقط عند الضغط على «مسح»، وحساسات الحركة فقط عند اختيار تتبع الهاتف.'
                    : 'Nothing is requested up front. The camera prompt appears only when you tap Scan; motion sensors only when you choose phone tracking.'}
                </p>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="pt-8">
              <h1 className="text-lg leading-snug text-ink">{navT(lang, 'onboard.enterMuseum')}</h1>
              <div className="mt-6 divide-y divide-rule border-y border-rule">
                <button
                  type="button"
                  onClick={begin}
                  disabled={busy}
                  className="flex min-h-20 w-full items-center gap-3 py-4 text-start"
                >
                  <Play size={22} className="shrink-0 text-lapis" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{navT(lang, 'onboard.startDemo')}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{navT(lang, 'onboard.startDemoNote')}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/qr?entrance=1')}
                  className="flex min-h-20 w-full items-center gap-3 py-4 text-start"
                >
                  <QrCode size={22} className="shrink-0 text-ink-soft" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{navT(lang, 'onboard.scanEntrance')}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{navT(lang, 'onboard.scanEntranceNote')}</span>
                  </span>
                </button>
                <button type="button" onClick={manual} className="flex min-h-20 w-full items-center gap-3 py-4 text-start">
                  <Crosshair size={22} className="shrink-0 text-ink-soft" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{navT(lang, 'onboard.tapMap')}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{navT(lang, 'onboard.tapMapNote')}</span>
                  </span>
                </button>
              </div>
              <p className="mt-5 text-micro leading-relaxed text-ink-muted">{navT(lang, 'onboard.placeholderNote')}</p>
            </section>
          )}

          <div className="mt-auto flex gap-2 pt-8">
            {step > 0 && (
              <button type="button" className="ui-btn-secondary flex-1" onClick={() => setStep((s) => s - 1)}>
                {navT(lang, 'common.back')}
              </button>
            )}
            {step < 2 && (
              <button type="button" className="ui-btn-primary flex-1" onClick={() => setStep((s) => s + 1)}>
                {navT(lang, 'common.next')}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
