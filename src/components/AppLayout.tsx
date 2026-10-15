import { NavLink } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label="Language / اللغة / Langue">
      <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
      <button type="button" aria-pressed={lang === 'ar'} onClick={() => setLang('ar')}>عربي</button>
      <button type="button" aria-pressed={lang === 'fr'} onClick={() => setLang('fr')}>FR</button>
    </div>
  );
}

export function Header() {
  const { tr } = useLang();
  return (
    <>
      <div className="disclosure">{tr('brand.disclosure')}</div>
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="wordmark" aria-label="ATHAR home">
            <span className="wordmark-mark" aria-hidden="true">𓂀</span>
            <span>
              <span className="wordmark-name">ATHAR <span className="wordmark-ar">أثر</span></span>
              <span className="wordmark-tag">{tr('brand.tag')}</span>
            </span>
          </NavLink>
          <nav className="nav-links" aria-label="Primary">
            <NavLink to="/">{tr('nav.home')}</NavLink>
            <NavLink to="/scan">{tr('nav.scan')}</NavLink>
            <NavLink to="/explore">{tr('nav.explore')}</NavLink>
          </nav>
          <LanguageSwitcher />
        </div>
      </header>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { tr } = useLang();
  return (
    <div className="app-shell">
      <Header />
      <main className="container">{children}</main>
      <footer>
        <div className="container">{tr('footer.prototype')}</div>
      </footer>
    </div>
  );
}
