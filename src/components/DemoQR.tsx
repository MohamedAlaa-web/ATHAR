/** Decorative demo QR: clearly NOT a real machine-readable museum code. */
export function DemoQR({ code }: { code: string }) {
  const cells = usePattern(code);
  return (
    <div className="demo-qr" role="img" aria-label={`Demo QR placeholder for ${code}`}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        {/* finder squares */}
        <rect x="4" y="4" width="26" height="26" fill="none" stroke="#101820" strokeWidth="5" />
        <rect x="70" y="4" width="26" height="26" fill="none" stroke="#101820" strokeWidth="5" />
        <rect x="4" y="70" width="26" height="26" fill="none" stroke="#101820" strokeWidth="5" />
        <rect x="11" y="11" width="12" height="12" fill="#101820" />
        <rect x="77" y="11" width="12" height="12" fill="#101820" />
        <rect x="11" y="77" width="12" height="12" fill="#101820" />
        {cells.map((c, i) => (
          <rect key={i} x={c[0]} y={c[1]} width="5.4" height="5.4" fill={c[2] ? '#101820' : '#ffffff'} stroke="#101820" strokeWidth="0.4" />
        ))}
        <rect x="30" y="42" width="40" height="16" fill="#101820" />
        <text x="50" y="54" textAnchor="middle" fontSize="8" fill="#f4efe6" fontFamily="monospace">DEMO</text>
      </svg>
    </div>
  );
}

function usePattern(seed: string): Array<[number, number, boolean]> {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out: Array<[number, number, boolean]> = [];
  let s = h || 1234567;
  const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 2 ** 32; };
  for (let x = 36; x <= 62; x += 7) {
    for (let y = 36; y <= 62; y += 7) {
      if (x < 34 && y < 34) continue;
      out.push([x, y, rnd() > 0.45]);
    }
  }
  for (let i = 0; i < 40; i++) {
    out.push([36 + Math.floor(rnd() * 8) * 3.4, 8 + Math.floor(rnd() * 22) * 3.2, rnd() > 0.5]);
  }
  return out;
}
