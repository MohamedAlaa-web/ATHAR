import { Link } from 'react-router-dom';
import { ARTIFACTS } from '../data/artifacts';
import { useLang } from '../i18n/LanguageContext';
import { artName } from '../i18n/content';

export function NotFoundPage() {
  const { lang, tr } = useLang();
  return (
    <div style={{ paddingTop: 48, textAlign: 'center' }}>
      <p className="kicker">404</p>
      <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 40 }}>{tr('qr.invalid')}</h1>
      <p className="prose" style={{ maxWidth: '60ch', marginInline: 'auto' }}>{tr('scan.manual')}</p>
      <div className="back-row" style={{ justifyContent: 'center' }}>
        {ARTIFACTS.map((a) => (
          <Link key={a.id} className="btn btn-ghost btn-sm" to={`/artifact/${a.demoCode}`}>
            {a.demoCode} · {artName(a, lang)}
          </Link>
        ))}
        <Link className="btn btn-gold btn-sm" to="/">{tr('common.home')}</Link>
      </div>
    </div>
  );
}
