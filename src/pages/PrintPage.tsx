import { Link } from 'react-router-dom';
import { ARTIFACTS } from '../data/artifacts';
import { currentArtifactUrl } from '../config';
import { useLang } from '../i18n/LanguageContext';
import { artName } from '../i18n/content';
import { QRCard } from '../components/QRCard';

/** Printable demo QR cards. Codes encode this server's real current
 *  address (valid on this network); set VITE_DEPLOY_URL for production. */
export function PrintPage() {
  const { lang, tr } = useLang();
  return (
    <div style={{ paddingTop: 24 }} className="print-sheet">
      <p className="kicker">QR</p>
      <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(28px,4vw,40px)', margin: '4px 0' }}>
        {tr('print.title')}
      </h1>
      <p className="prose">{tr('print.sub')}</p>
      <p className="muted">⚠ {tr('print.demoUrlNote')}</p>
      <div className="no-print back-row">
        <button className="btn btn-gold btn-sm" onClick={() => window.print()}>🖨 {tr('print.printBtn')}</button>
        <Link className="btn btn-ghost btn-sm" to="/explore">← {tr('common.back')}</Link>
      </div>
      <div className="qr-grid">
        {ARTIFACTS.map((a) => (
          <div className="qr-sheet-card" key={a.id}>
            <p className="kicker" dir="ltr">{a.demoCode}</p>
            <h2 style={{ fontFamily: 'var(--font-sans)', margin: '4px 0 12px' }}>{artName(a, lang)}</h2>
            <QRCard artifact={a} size={220} />
            <p className="muted" style={{ marginTop: 10 }}>◉ {tr('print.scanMe')}</p>
            <p className="muted" dir="ltr" style={{ fontSize: 11, wordBreak: 'break-all' }}>{currentArtifactUrl(a.demoCode)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
