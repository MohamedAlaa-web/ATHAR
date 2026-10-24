import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { MUSEUM } from '../../data/museum';

/* Every payload the app accepts through the scanner (see qrTarget):
 * ATHAR:<code> for the entrance, each hall and every artifact. */
interface PrintTarget {
  key: string;
  kind: 'entrance' | 'hall' | 'artifact';
  code: string;
  ar: string;
  en: string;
}

const TARGETS: PrintTarget[] = [
  {
    key: 'entrance',
    kind: 'entrance',
    code: MUSEUM.entrance.qrId,
    ar: MUSEUM.entrance.label.ar,
    en: MUSEUM.entrance.label.en
  },
  ...MUSEUM.halls.map((hall) => ({
    key: hall.id,
    kind: 'hall' as const,
    code: hall.qrId,
    ar: hall.name.ar,
    en: hall.name.en
  })),
  ...MUSEUM.artifacts.map((artifact) => ({
    key: artifact.id,
    kind: 'artifact' as const,
    code: artifact.qrId,
    ar: artifact.name.ar,
    en: artifact.name.en
  }))
];

const KIND_LABEL: Record<PrintTarget['kind'], { ar: string; en: string }> = {
  entrance: { ar: 'مدخل', en: 'Entrance' },
  hall: { ar: 'قاعة', en: 'Hall' },
  artifact: { ar: 'قطعة', en: 'Artifact' }
};

/** 6 codes per A4 page: 2 columns × 3 rows. */
const PER_PAGE = 6;
const A4_W = 794;
const A4_H = 1123;

function pagesOf<T>(items: T[]): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += PER_PAGE) pages.push(items.slice(i, i + PER_PAGE));
  return pages;
}

function QrPrintCard({ target }: { target: PrintTarget }) {
  const [src, setSrc] = useState('');
  const payload = `ATHAR:${target.code}`;

  useEffect(() => {
    let live = true;
    /* 900 px shown at 48 mm is ≈ 476 dpi — far above what jsQR needs
     * from a phone camera pointed at a printed sheet. */
    QRCode.toDataURL(payload, {
      width: 900,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' }
    })
      .then((url) => {
        if (live) setSrc(url);
      })
      .catch(() => {
        if (live) setSrc('');
      });
    return () => {
      live = false;
    };
  }, [payload]);

  const kind = KIND_LABEL[target.kind];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5mm',
        border: '0.25mm solid #D5D3CB',
        borderRadius: '2mm',
        padding: '3mm',
        textAlign: 'center',
        breakInside: 'avoid'
      }}
    >
      <p style={{ fontSize: '2.8mm', color: '#5E646B', margin: 0 }}>
        {kind.ar} / {kind.en}
      </p>
      <p dir="rtl" style={{ fontSize: '4.8mm', fontWeight: 600, color: '#1C2128', margin: 0 }}>
        {target.ar}
      </p>
      <p style={{ fontSize: '3.4mm', color: '#4A5058', margin: 0 }}>{target.en}</p>
      {src ? (
        <img src={src} alt={payload} width={330} height={330} style={{ width: '48mm', height: '48mm' }} />
      ) : (
        <div style={{ width: '48mm', height: '48mm', border: '0.25mm dashed #D5D3CB' }} />
      )}
      <p dir="ltr" style={{ fontSize: '2.8mm', color: '#5E646B', margin: 0 }}>
        {payload}
      </p>
    </div>
  );
}

export function PrintQrPage() {
  const pages = pagesOf(TARGETS);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    /* Give the generated images a tick to paint before printing. */
    const timer = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  /* The sheet is A4 at 100 %; on a phone it is scaled down to fit the width,
   * so the operator can check it without horizontal scrolling. */
  useEffect(() => {
    const fit = () => {
      const available = Math.min(window.innerWidth, document.documentElement.clientWidth) - 24;
      setScale(Math.max(0.25, Math.min(1, available / A4_W)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div className="print-qr-root" style={{ minHeight: '100dvh', background: '#E9E8E3', padding: '12px' }}>
      {/* Scoped to this route: @page A4 applies only while #/print-qr is
          mounted, so the legacy #/print sheet keeps its own page setup. */}
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          body { background: #fff !important; }
          .print-qr-root { background: #fff !important; padding: 0 !important; }
          .print-qr-frame { width: auto !important; height: auto !important; overflow: visible !important; }
          .print-qr-page {
            position: static !important;
            transform: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            break-after: page;
          }
          .print-qr-page:last-of-type { break-after: auto; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: A4_W, margin: '0 auto 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p dir="rtl" style={{ color: '#1C2128', fontSize: 17, fontWeight: 600, margin: 0 }}>
              ورقة رموز QR للطباعة
            </p>
            <p style={{ color: '#4A5058', fontSize: 15, margin: '2px 0 0' }}>Printable QR sheet</p>
            <p dir="rtl" style={{ color: '#5E646B', fontSize: 13, marginTop: 6, maxWidth: '48ch' }}>
              {TARGETS.length} رمزًا يقبلها الماسح: المدخل و{MUSEUM.halls.length} قاعات
              و{MUSEUM.artifacts.length} قطع. {pages.length} صفحات A4، ستة رموز في الصفحة،
              اطبع بمقياس 100٪. كل رمز معنون بالعربية والإنجليزية.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!ready}
              style={{
                background: '#1C2128',
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 6,
                padding: '10px 18px',
                minHeight: 44
              }}
            >
              طباعة / Print
            </button>
            <Link
              to="/map"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
                color: '#2A4BA0',
                fontSize: 13,
                textAlign: 'center'
              }}
            >
              خريطة / Map
            </Link>
          </div>
        </div>
      </div>

      {pages.map((page, index) => (
        <div
          key={index}
          className="print-qr-frame"
          style={{
            position: 'relative',
            width: A4_W * scale,
            height: A4_H * scale,
            margin: '0 auto 16px',
            overflow: 'hidden'
          }}
        >
          <section
            className="print-qr-page"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: A4_W,
              height: A4_H,
              padding: '12mm',
              background: '#FFFFFF',
              borderRadius: 2,
              boxShadow: '0 1px 0 rgba(28,33,40,0.10), 0 18px 36px -28px rgba(28,33,40,0.55)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: 'repeat(3, 1fr)',
              gap: '6mm',
              boxSizing: 'border-box',
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}
          >
            {page.map((target) => (
              <QrPrintCard key={target.key} target={target} />
            ))}
          </section>
        </div>
      ))}
    </div>
  );
}
