import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, QrCode } from 'lucide-react';
import { useNav } from '../NavProvider';
import { useRewards } from '../../rewards/RewardsContext';
import { DAILY_CAP } from '../../rewards/ledger';
import catalogue from '../../rewards/catalogue.json';
import { navT } from '../i18n';

const REWARD_LABELS: Array<{ id: string; cost: number; label: { ar: string; en: string } }> =
  catalogue.rewards;

export function RewardsPage() {
  const { lang } = useNav();
  const { state, badges, reset } = useRewards();
  const [confirmReset, setConfirmReset] = useState(false);

  const recent = [...state.history].reverse().slice(0, 10);

  return (
    <div className="min-h-0 flex-1">
      <main className="space-y-4 px-4 pb-8 pt-5">
        <section>
          <h1 className="text-lg text-ink">{navT(lang, 'rewards.title')}</h1>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{navT(lang, 'rewards.sub')}</p>
        </section>

        <section className="grid grid-cols-3 gap-2 border-y border-rule py-3">
          <div>
            <p className="label">{navT(lang, 'rewards.today')}</p>
            <p className="num mt-0.5 text-xl font-semibold text-ink">{state.todayPoints}</p>
          </div>
          <div>
            <p className="label">{navT(lang, 'rewards.total')}</p>
            <p className="num mt-0.5 text-xl font-semibold text-ink">{state.totalPoints}</p>
          </div>
          <div>
            <p className="label">{navT(lang, 'rewards.cap')}</p>
            <p className="num mt-0.5 text-xl font-semibold text-ink-soft">{DAILY_CAP}</p>
          </div>
        </section>

        <section>
          <h2 className="section-title">{navT(lang, 'rewards.badges')}</h2>
          <ul className="mt-2 divide-y divide-rule">
            {badges.map((badge) => (
              <li key={badge.id} className="flex items-start gap-3 py-2">
                <BadgeCheck
                  size={18}
                  className={`mt-0.5 shrink-0 ${badge.earned ? 'text-malachite' : 'text-rule'}`}
                  strokeWidth={1.6}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${badge.earned ? 'text-ink' : 'text-ink-muted'}`}>
                    {badge.label[lang]}
                  </p>
                  <p className="text-micro leading-relaxed text-ink-muted">{badge.detail[lang]}</p>
                </div>
                <span className="shrink-0 text-micro text-ink-muted">
                  {badge.earned ? navT(lang, 'rewards.earned') : navT(lang, 'rewards.locked')}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-rule pt-3">
          <h2 className="section-title">{navT(lang, 'rewards.history')}</h2>
          {recent.length === 0 ? (
            <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
              <QrCode size={15} className="mt-0.5 shrink-0" />
              <span>{navT(lang, 'rewards.empty')}</span>
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-rule">
              {recent.map((entry) => (
                <li key={`${entry.at}-${entry.reference}-${entry.kind}`} className="flex items-baseline justify-between gap-2 py-1.5">
                  <span className="min-w-0 truncate text-xs text-ink-soft">
                    {entry.kind === 'artifact-scan'
                      ? lang === 'ar'
                        ? 'مسح قطعة'
                        : 'Artifact scan'
                      : entry.kind === 'route-complete'
                        ? lang === 'ar'
                          ? 'جولة مكتملة'
                          : 'Visit completed'
                        : lang === 'ar'
                          ? 'قاعة هادئة'
                          : 'Quiet hall'}
                    <span className="ms-1 text-ink-muted" dir="ltr">
                      {new Date(entry.at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </span>
                  <span className="num shrink-0 text-xs font-semibold text-ink" dir="ltr">
                    +{entry.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-micro leading-relaxed text-ink-muted">{navT(lang, 'rewards.noSpeed')}</p>
          <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'rewards.quietRule')}</p>
        </section>

        <section className="border-t border-rule pt-3">
          <h2 className="section-title">{navT(lang, 'rewards.catalogue')}</h2>
          <p className="mt-1 text-micro leading-relaxed text-ink-muted">{navT(lang, 'rewards.catalogueNote')}</p>
          <ul className="mt-2 divide-y divide-rule">
            {REWARD_LABELS.map((reward) => {
              const affordable = state.totalPoints >= reward.cost;
              return (
                <li key={reward.id} className="flex items-baseline justify-between gap-3 py-2">
                  <span className={`text-sm ${affordable ? 'text-ink' : 'text-ink-muted'}`}>{reward.label[lang]}</span>
                  <span className="num shrink-0 text-xs text-ink-soft" dir="ltr">
                    {reward.cost} {navT(lang, 'rewards.cost')}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="border-t border-rule pt-3">
          <div className="flex items-center gap-2">
            <Link to="/qr" className="ui-btn-secondary flex-1 text-xs">
              <QrCode size={15} />
              {navT(lang, 'nav.scan')}
            </Link>
            <Link to="/plan" className="ui-btn-secondary flex-1 text-xs">
              {navT(lang, 'plan.open')}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true);
                return;
              }
              reset();
              setConfirmReset(false);
            }}
            className={`mt-3 min-h-11 w-full rounded-sm border px-4 text-sm font-semibold ${
              confirmReset ? 'border-carnelian bg-carnelian/20 text-carnelian' : 'border-carnelian/30 text-carnelian'
            }`}
          >
            {confirmReset ? navT(lang, 'rewards.resetConfirm') : navT(lang, 'rewards.reset')}
          </button>
        </section>
      </main>
    </div>
  );
}
