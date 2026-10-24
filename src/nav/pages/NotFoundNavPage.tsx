import { Link } from 'react-router-dom';
import { useNav } from '../NavProvider';
import { navT } from '../i18n';

/* Rendered inside the navigation shell, so it is styled like every other
 * screen: stone paper, ink type, one lapis action. */
export function NotFoundPage() {
  const { lang } = useNav();

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl leading-snug text-ink">
        {lang === 'ar' ? 'لم نجد هذه الصفحة' : 'This page does not exist'}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        {lang === 'ar'
          ? 'رموز QR في المتحف تفتح الخريطة أو صفحة القطعة. اختر وجهة من الأسفل، أو افتح الخريطة والمس رمزًا.'
          : 'Museum QR codes open the map or an artifact page. Pick a destination below, or open the map and scan a code.'}
      </p>

      <div className="mt-5 grid gap-2">
        {[
          { to: '/map', label: navT(lang, 'nav.map') },
          { to: '/search', label: navT(lang, 'search.title') },
          { to: '/qr', label: navT(lang, 'nav.scan') }
        ].map((item) => (
          <Link key={item.to} to={item.to} className="ui-btn-secondary justify-between">
            {item.label}
            <span className="text-micro text-ink-muted">{item.to}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
