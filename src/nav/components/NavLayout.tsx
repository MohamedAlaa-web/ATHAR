import { useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ChevronLeft, Map, QrCode, Search, Settings } from 'lucide-react';
import { useNav } from '../NavProvider';
import { navT } from '../i18n';

const items = [
  { to: '/map', key: 'nav.map', Icon: Map },
  { to: '/search', key: 'nav.search', Icon: Search },
  { to: '/qr', key: 'nav.scan', Icon: QrCode },
  { to: '/settings', key: 'nav.settings', Icon: Settings }
];

export function NavHeader({ title, back = false, bare = false }: { title?: string; back?: boolean; bare?: boolean }) {
  const { lang, setLang } = useNav();
  const navigate = useNavigate();
  const taps = useRef<number[]>([]);

  const onWordmark = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3500), now];
    if (taps.current.length >= 7) {
      taps.current = [];
      navigate('/debug');
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-surface px-4 safe-top">
      <div className="flex min-h-14 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          {back && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="-ms-2 grid h-11 w-11 shrink-0 place-items-center rounded-sm text-ink-soft hover:bg-stone-100"
              aria-label={navT(lang, 'common.back')}
            >
              <ChevronLeft size={20} strokeWidth={1.6} className="rtl:rotate-180" />
            </button>
          )}
          {!bare && (
            <button type="button" onClick={onWordmark} className="flex min-h-11 min-w-0 flex-col justify-center text-start" aria-label="ATHAR">
              <span className="block truncate text-sm font-semibold text-ink">
                أثر <span className="text-ink-muted">ATHAR</span>
              </span>
              <span className="block truncate text-xs leading-tight text-ink-muted">
                {title ?? navT(lang, 'brand.tagline')}
              </span>
            </button>
          )}
          {bare && title && <span className="truncate text-sm font-semibold text-ink">{title}</span>}
        </div>

        <div className="flex shrink-0 items-center rounded-sm border border-rule" role="group" aria-label="Language">
          {(['ar', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={lang === code}
              onClick={() => setLang(code)}
              className={`min-h-11 min-w-11 px-3 text-xs font-medium ${
                lang === code ? 'bg-ink text-white' : 'text-ink-soft hover:bg-stone-100'
              }`}
            >
              {code === 'ar' ? 'عربي' : 'EN'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export function NavLayout() {
  const { lang } = useNav();
  return (
    <div className="h-dvh bg-stone">
      <div className="mx-auto flex h-dvh w-full max-w-[560px] flex-col bg-stone md:my-4 md:h-[calc(100dvh-2rem)] md:border md:border-rule">
        <NavHeader />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-20">
          <Outlet />
        </main>
        <nav className="fixed bottom-0 z-40 w-full max-w-[560px] border-t border-rule bg-surface md:sticky md:bottom-0">
          <div className="safe-bottom grid grid-cols-4 px-1 pt-1">
            {items.map(({ to, key, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex min-h-12 flex-col items-center justify-center gap-1 rounded-sm py-1.5 text-micro font-medium ${
                    isActive ? 'text-ink' : 'text-ink-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2 : 1.5} aria-hidden="true" />
                    <span>{navT(lang, key)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
