import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrImage({ code, size = 190 }: { code: string; size?: number }) {
  const [src, setSrc] = useState('');
  const payload = `ATHAR:${code}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(payload, {
      width: size * 2,
      margin: 2,
      color: { dark: '#0B1017', light: '#F4EFE6' }
    })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc('');
      });
    return () => {
      active = false;
    };
  }, [payload, size]);

  if (!src) {
    return <div style={{ width: size, height: size }} className="grid place-items-center rounded-xl bg-stone-100 text-xs text-ink">…</div>;
  }
  return <img src={src} width={size} height={size} alt={`QR ${payload}`} className="rounded-xl" />;
}
