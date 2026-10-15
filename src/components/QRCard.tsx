import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { currentArtifactUrl } from '../config';
import type { Artifact } from '../data/artifacts';
import { useLang } from '../i18n/LanguageContext';
import { artName } from '../i18n/content';

/** Genuinely generated QR code encoding this server's real artifact URL
 *  (never a hardcoded or fake destination). */
export function QRCard({ artifact, size = 200 }: { artifact: Artifact; size?: number }) {
  const { lang } = useLang();
  const [dataUrl, setDataUrl] = useState<string>('');
  const url = currentArtifactUrl(artifact.demoCode);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(url, { width: size * 2, margin: 2 })
      .then((d) => { if (live) setDataUrl(d); })
      .catch(() => { if (live) setDataUrl(''); });
    return () => { live = false; };
  }, [url, size]);

  return (
    <figure className="qr-card" style={{ margin: 0 }}>
      {dataUrl
        ? <img src={dataUrl} alt={`QR code for ${artName(artifact, lang)}`} width={size} height={size} />
        : <div style={{ width: size, height: size, display: 'grid', placeItems: 'center' }} className="muted">…</div>}
      <figcaption className="muted" dir="ltr" style={{ fontSize: 12, wordBreak: 'break-all' }}>{url}</figcaption>
    </figure>
  );
}
