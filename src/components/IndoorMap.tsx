import { useMemo, type PointerEvent } from 'react';
import type { FusedEstimate, Position2D, RoomConfig } from '../positioning/types';
import { toSvg } from '../positioning/room';
import type { Lang } from '../data/artifacts';
import { tx } from '../i18n/content';

interface Props {
  room: RoomConfig;
  estimate: FusedEstimate;
  truth?: Position2D | null;
  trail?: Position2D[];
  selectedArtifactId?: string | null;
  lang: Lang;
  onPickTarget?: (p: Position2D) => void;
}

const PAD = 0.9;

const ART_LABEL: Record<string, [string, string, string]> = {
  'royal-mummy': ['Mummy', 'المومياء', 'Momie'],
  'painted-coffin': ['Coffin', 'التابوت', 'Cercueil'],
  'royal-statue': ['Statue', 'التمثال', 'Statue']
};

/** Accessible 2D floor map. All geometry is in metres; y flips once here. */
export function IndoorMap({ room, estimate, truth, trail = [], selectedArtifactId, lang, onPickTarget }: Props) {
  const vb = { x: -PAD, y: -PAD, w: room.widthM + PAD * 2, h: room.heightM + PAD * 2 };

  const grid = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; major: boolean }> = [];
    const step = room.gridStepM;
    for (let x = 0; x <= room.widthM + 0.001; x += step) {
      lines.push({ x1: x, y1: 0, x2: x, y2: room.heightM, major: Math.abs(x % 2) < 0.001 });
    }
    for (let y = 0; y <= room.heightM + 0.001; y += step) {
      lines.push({ x1: 0, y1: y, x2: room.widthM, y2: y, major: Math.abs(y % 2) < 0.001 });
    }
    return lines;
  }, [room]);

  const floorY = (y: number) => room.heightM - y;

  const handleClick = (e: PointerEvent<SVGSVGElement>) => {
    if (!onPickTarget) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / vb.w, rect.height / vb.h);
    const offsetX = (rect.width - vb.w * scale) / 2;
    const offsetY = (rect.height - vb.h * scale) / 2;
    const userX = (e.clientX - rect.left - offsetX) / scale + vb.x;
    const userY = (e.clientY - rect.top - offsetY) / scale + vb.y;
    const x = Math.min(room.widthM, Math.max(0, userX));
    const y = Math.min(room.heightM, Math.max(0, floorY(userY)));
    onPickTarget({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  };

  const est = estimate.position ? toSvg(room, estimate.position) : null;
  const truthSvg = truth ? toSvg(room, truth) : null;
  const trailPoints = trail.map((p) => toSvg(room, p));

  return (
    <svg
      className="map-svg indoor-map"
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      role="img"
      aria-label={tx(lang, 'Indoor room map with visitor estimate', 'خريطة الغرفة الداخلية مع تقدير موقع الزائر', 'Plan de la salle avec position estimée')}
      onClick={handleClick}
      style={{ cursor: onPickTarget ? 'crosshair' : 'default' }}
    >
      <defs>
        <pattern id="obstacle" width="0.24" height="0.24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="0.24" height="0.24" fill="rgba(169,173,179,0.10)" />
          <line x1="0" y1="0" x2="0" y2="0.24" stroke="rgba(169,173,179,0.45)" strokeWidth="0.05" />
        </pattern>
        <radialGradient id="accuracyFade">
          <stop offset="60%" stopColor="rgba(198,161,91,0.18)" />
          <stop offset="100%" stopColor="rgba(198,161,91,0.02)" />
        </radialGradient>
      </defs>

      <rect x={0} y={0} width={room.widthM} height={room.heightM} fill="#0c1117" stroke="rgba(198,161,91,0.55)" strokeWidth={0.06} rx={0.15} />

      {grid.map((l, i) => (
        <line
          key={`g${i}`}
          x1={l.x1}
          y1={floorY(l.y1)}
          x2={l.x2}
          y2={floorY(l.y2)}
          stroke={l.major ? 'rgba(244,239,230,0.10)' : 'rgba(244,239,230,0.05)'}
          strokeWidth={l.major ? 0.025 : 0.015}
        />
      ))}

      {room.obstacles.map((o) => (
        <rect
          key={o.id}
          x={o.x}
          y={floorY(o.y + o.heightM)}
          width={o.widthM}
          height={o.heightM}
          fill="url(#obstacle)"
          stroke="rgba(169,173,179,0.4)"
          strokeWidth={0.03}
          rx={0.05}
        />
      ))}

      {trailPoints.length > 1 && (
        <polyline
          points={trailPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="rgba(198,161,91,0.35)"
          strokeWidth={0.05}
          strokeDasharray="0.12 0.12"
        />
      )}

      {est && (
        <>
          {estimate.accuracyM != null && (
            <circle cx={est.x} cy={est.y} r={Math.max(0.6, estimate.accuracyM)} fill="url(#accuracyFade)" stroke="rgba(198,161,91,0.45)" strokeWidth={0.02} strokeDasharray="0.1 0.1" />
          )}
          <circle cx={est.x} cy={est.y} r={0.22} fill={estimate.status === 'uncertain' ? '#b0564e' : '#c6a15b'} stroke="#101820" strokeWidth={0.05} />
          <circle className="estimate-pulse" cx={est.x} cy={est.y} r={0.4} fill="none" stroke={estimate.status === 'uncertain' ? '#b0564e' : '#c6a15b'} strokeWidth={0.03} opacity={0.6} />
        </>
      )}

      {truthSvg && (
        <>
          <circle cx={truthSvg.x} cy={truthSvg.y} r={0.17} fill="none" stroke="#f4efe6" strokeWidth={0.04} strokeDasharray="0.06 0.05" />
          <line x1={truthSvg.x - 0.3} y1={truthSvg.y} x2={truthSvg.x + 0.3} y2={truthSvg.y} stroke="#f4efe6" strokeWidth={0.02} opacity={0.5} />
          <line x1={truthSvg.x} y1={truthSvg.y - 0.3} x2={truthSvg.x} y2={truthSvg.y + 0.3} stroke="#f4efe6" strokeWidth={0.02} opacity={0.5} />
        </>
      )}

      {room.devices.map((d) => {
        const p = toSvg(room, d.position);
        return (
          <g key={d.id} className={`device device-${d.kind}`}>
            {d.kind === 'ble' && (
              <>
                <circle cx={p.x} cy={p.y} r={0.34} fill="none" stroke="rgba(112,168,255,0.35)" strokeWidth={0.02} />
                <circle cx={p.x} cy={p.y} r={0.22} fill="none" stroke="rgba(112,168,255,0.55)" strokeWidth={0.02} />
              </>
            )}
            {d.kind === 'wifi' ? (
              <path d={`M ${p.x} ${p.y - 0.16} L ${p.x + 0.16} ${p.y + 0.14} L ${p.x - 0.16} ${p.y + 0.14} Z`} fill="#70a8ff" stroke="#101820" strokeWidth={0.03} />
            ) : (
              <circle cx={p.x} cy={p.y} r={0.11} fill="#70a8ff" stroke="#101820" strokeWidth={0.03} />
            )}
            <text x={p.x} y={p.y - 0.45} textAnchor="middle" fontSize={0.24} fill="#a9adb3">{d.label}</text>
          </g>
        );
      })}

      {room.artifacts.map((a) => {
        const p = toSvg(room, a.position);
        const label = ART_LABEL[a.id] ? tx(lang, ...ART_LABEL[a.id]) : a.label;
        const selected = selectedArtifactId === a.id;
        return (
          <g key={a.id} className={`artifact-marker ${selected ? 'selected' : ''}`}>
            <rect x={p.x - 0.2} y={p.y - 0.2} width={0.4} height={0.4} rx={0.05} fill={selected ? '#c6a15b' : '#101820'} stroke="#c6a15b" strokeWidth={0.05} />
            <text x={p.x} y={p.y + 0.58} textAnchor="middle" fontSize={0.26} fill={selected ? '#f4efe6' : '#a9adb3'}>{label}</text>
          </g>
        );
      })}

      <g transform={`translate(0.1 ${room.heightM - 0.35})`}>
        <line x1={0} y1={0} x2={1} y2={0} stroke="#f4efe6" strokeWidth={0.05} />
        <line x1={0} y1={-0.1} x2={0} y2={0.1} stroke="#f4efe6" strokeWidth={0.05} />
        <line x1={1} y1={-0.1} x2={1} y2={0.1} stroke="#f4efe6" strokeWidth={0.05} />
        <text x={1.15} y={0.09} fontSize={0.24} fill="#a9adb3">1 m</text>
      </g>
    </svg>
  );
}
