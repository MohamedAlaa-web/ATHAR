import { useMemo, type PointerEvent } from 'react';
import type { CrowdLevels } from '../../crowd/types';
import {
  MUSEUM,
  MUSEUM_HEIGHT_M,
  MUSEUM_WIDTH_M,
  floorLabel,
  museumArtifactById,
  walkableRects,
  type FloorId
} from '../../data/museum';
import { snapToWalkable } from '../../positioning/core/mapMatching';
import { useNav } from '../NavProvider';
import { navT } from '../i18n';

interface Props {
  floor: FloorId;
  showTruth?: boolean;
  showBeacons?: boolean;
  showRoute?: boolean;
  /** When provided, halls are tinted by the crowd tier of the hall. */
  crowdLevels?: CrowdLevels;
  onMapTap?: (point: { x: number; y: number; floor: FloorId }) => void;
  onArtifactTap?: (artifactId: string) => void;
  className?: string;
}

const PAD = 1.2;

/* Paper, ink, lapis, carnelian, ochre — the whole signage palette. */
const PAPER = '#F2F1EC';
const HALL_PAPER = ['#E5E4DE', '#DFDED7', '#D9D8D1'];
const INK = '#1C2128';
const INK_SOFT = '#4A5058';
const LAPIS = '#2A4BA0';
const CARNELIAN = '#B4382B';
const OCHRE = '#8F5A10';

const HALL_TONE: Record<string, number> = {
  'hall-a': 0,
  corridor: 1,
  'hall-b': 0,
  'hall-c': 2,
  stair: 1,
  'upper-hall': 2
};

export function FloorMap({
  floor,
  showTruth = false,
  showBeacons = false,
  showRoute = true,
  crowdLevels,
  onMapTap,
  onArtifactTap,
  className = ''
}: Props) {
  const { estimate, truth, route, closedHalls, lang, artifactPosition, targetId } = useNav();
  const halls = MUSEUM.halls.filter((h) => h.floor === floor);
  const floorRects = walkableRects(floor);

  const routePoints = useMemo(() => {
    if (!route?.ok || !showRoute) return [] as Array<{ x: number; y: number }>;
    return route.points.filter((p) => p.floor === floor).map((p) => ({ x: p.x, y: p.y }));
  }, [floor, route, showRoute]);

  const targetArtifact = targetId ? museumArtifactById(targetId) : null;
  const targetPosition = targetArtifact ? artifactPosition(targetArtifact.id) : null;

  const nearestId = useMemo(() => {
    if (!estimate) return null;
    let best: { id: string; d: number } | null = null;
    for (const artifact of MUSEUM.artifacts) {
      if (artifact.floor !== floor) continue;
      const p = artifactPosition(artifact.id);
      if (!p) continue;
      const d = Math.hypot(p.x - estimate.x, p.y - estimate.y);
      if (!best || d < best.d) best = { id: artifact.id, d };
    }
    return best?.id ?? null;
  }, [artifactPosition, estimate, floor]);

  const screenPoint = (x: number, y: number) => ({ x, y: MUSEUM_HEIGHT_M - y });

  const handleTap = (e: PointerEvent<SVGSVGElement>) => {
    if (!onMapTap) return;
    const svg = e.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const local = point.matrixTransform(matrix.inverse());
    const raw = { x: local.x, y: MUSEUM_HEIGHT_M - local.y };
    if (raw.x < -2 || raw.x > MUSEUM_WIDTH_M + 2 || raw.y < -2 || raw.y > MUSEUM_HEIGHT_M + 2) return;
    const snapped = snapToWalkable(raw, floorRects);
    if (snapped.distanceM > 8) return;
    onMapTap({ x: Math.round(snapped.position.x * 10) / 10, y: Math.round(snapped.position.y * 10) / 10, floor });
  };

  const est = estimate && estimate.floor === floor ? screenPoint(estimate.x, estimate.y) : null;
  const truthPoint = showTruth && truth && truth.floor === floor ? screenPoint(truth.x, truth.y) : null;
  const targetSvg = targetPosition && targetPosition.floor === floor ? screenPoint(targetPosition.x, targetPosition.y) : null;
  const routeSvg = routePoints.map((p) => screenPoint(p.x, p.y));
  const nextTurn = route?.ok
    ? route.instructions.find((instruction) => instruction.kind !== 'start' && instruction.kind !== 'arrive' && instruction.at.floor === floor)
    : null;

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${MUSEUM_WIDTH_M + PAD * 2} ${MUSEUM_HEIGHT_M + PAD * 2}`}
      className={`block w-full select-none ${className}`}
      role="img"
      aria-label={`${navT(lang, 'map.title')} — ${floorLabel(floor, lang)}`}
      onClick={handleTap}
      style={{ touchAction: 'manipulation', cursor: onMapTap ? 'crosshair' : 'default' }}
    >
      <defs>
        <pattern id="navClosed" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="1.6" height="1.6" fill="rgba(180,56,43,0.10)" />
          <line x1="0" y1="0" x2="0" y2="1.6" stroke="rgba(180,56,43,0.45)" strokeWidth="0.2" />
        </pattern>
      </defs>

      <rect
        x={0}
        y={0}
        width={MUSEUM_WIDTH_M}
        height={MUSEUM_HEIGHT_M}
        rx={0.4}
        fill={PAPER}
        stroke={INK}
        strokeOpacity={0.55}
        strokeWidth={0.14}
      />

      {halls.map((h) => {
        const closed = closedHalls.includes(h.id);
        const fill = HALL_PAPER[HALL_TONE[h.id] ?? 0];
        return h.rects.map((rect, index) => (
          <rect
            key={`${h.id}-${index}`}
            x={rect.x}
            y={MUSEUM_HEIGHT_M - rect.y - rect.h}
            width={rect.w}
            height={rect.h}
            fill={closed ? 'url(#navClosed)' : fill}
            stroke={closed ? CARNELIAN : INK}
            strokeOpacity={closed ? 0.9 : 1}
            strokeWidth={0.16}
          />
        ));
      })}

      {/* Crowd overlay: an ochre tint per hall, drawn over the paper so the
          walls, doors and labels stay readable. Numbers come from the source. */}
      {crowdLevels &&
        halls.map((h) => {
          if (closedHalls.includes(h.id)) return null;
          const tier = crowdLevels[h.id] ?? 0;
          if (tier === 0) return null;
          const fill = tier === 2 ? 'rgba(168,106,18,0.26)' : 'rgba(168,106,18,0.12)';
          return h.rects.map((rect, index) => (
            <rect
              key={`crowd-${h.id}-${index}`}
              x={rect.x}
              y={MUSEUM_HEIGHT_M - rect.y - rect.h}
              width={rect.w}
              height={rect.h}
              fill={fill}
              pointerEvents="none"
            />
          ));
        })}

      {/* Door gaps: short breaks in the wall line, drawn in paper. */}
      {floor === 'ground' &&
        [
          { x: 20, y: 15, w: 1.4, h: 0.5 },
          { x: 31, y: 12.55, w: 2.4, h: 0.5 },
          { x: 44, y: 15, w: 1.4, h: 0.5 },
          { x: 34, y: 17, w: 2.4, h: 0.5 }
        ].map((door, i) => (
          <rect
            key={`door${i}`}
            x={door.x - door.w / 2}
            y={MUSEUM_HEIGHT_M - door.y - door.h / 2}
            width={door.w}
            height={door.h}
            fill={PAPER}
            pointerEvents="none"
          />
        ))}

      {MUSEUM.obstacles.map((o) => (
        <rect
          key={o.id}
          x={o.x}
          y={MUSEUM_HEIGHT_M - o.y - o.h}
          width={o.w}
          height={o.h}
          fill="none"
          stroke={INK}
          strokeOpacity={0.45}
          strokeWidth={0.1}
          pointerEvents="none"
        />
      ))}

      {/* The grand staircase, drawn as treads rather than decoration. */}
      {floor === 'ground' && (
        <g pointerEvents="none" stroke={INK_SOFT} strokeWidth={0.08} opacity={0.8}>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={31} y1={MUSEUM_HEIGHT_M - (18.2 + i * 1.1)} x2={37} y2={MUSEUM_HEIGHT_M - (18.2 + i * 1.1)} />
          ))}
          <line x1={31} y1={MUSEUM_HEIGHT_M - 17.6} x2={31} y2={MUSEUM_HEIGHT_M - 22.4} />
          <line x1={37} y1={MUSEUM_HEIGHT_M - 17.6} x2={37} y2={MUSEUM_HEIGHT_M - 22.4} />
        </g>
      )}

      {halls.map((h) => {
        const closed = closedHalls.includes(h.id);
        const p = screenPoint(h.labelAt.x, h.labelAt.y);
        return (
          <g key={`label-${h.id}`} pointerEvents="none">
            <text x={p.x} y={p.y} textAnchor="middle" fontSize={1.3} fill={closed ? CARNELIAN : INK} fontWeight={600} opacity={closed ? 1 : 0.82}>
              {h.name[lang]}
            </text>
            {closed && (
              <text x={p.x} y={p.y + 1.7} textAnchor="middle" fontSize={0.95} fill={CARNELIAN}>
                {navT(lang, 'admin.closed')}
              </text>
            )}
          </g>
        );
      })}

      {showBeacons &&
        MUSEUM.beacons
          .filter((b) => b.floor === floor)
          .map((beacon) => {
            const p = screenPoint(beacon.x, beacon.y);
            return (
              <g key={beacon.id} pointerEvents="none">
                <circle cx={p.x} cy={p.y} r={0.5} fill="none" stroke={INK_SOFT} strokeWidth={0.07} strokeDasharray="0.14 0.12" />
                <circle cx={p.x} cy={p.y} r={0.18} fill={INK_SOFT} />
                <text x={p.x} y={p.y - 0.85} textAnchor="middle" fontSize={0.7} fill={INK_SOFT}>
                  {beacon.label}
                </text>
              </g>
            );
          })}

      {routeSvg.length > 1 && (
        <>
          <polyline
            points={routeSvg.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={0.66}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
          <polyline
            points={routeSvg.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={LAPIS}
            strokeWidth={0.36}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        </>
      )}

      {nextTurn && (
        <circle
          cx={nextTurn.at.x}
          cy={MUSEUM_HEIGHT_M - nextTurn.at.y}
          r={0.42}
          fill={LAPIS}
          stroke="#FFFFFF"
          strokeWidth={0.1}
          pointerEvents="none"
        />
      )}

      {MUSEUM.artifacts
        .filter((artifact) => artifact.floor === floor)
        .map((artifact) => {
          const position = artifactPosition(artifact.id);
          if (!position) return null;
          const p = screenPoint(position.x, position.y);
          const isTarget = artifact.id === targetId;
          const isNearest = artifact.id === nearestId && !isTarget;
          const r = isTarget ? 0.62 : 0.42;
          return (
            <g
              key={artifact.id}
              className="cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                onArtifactTap?.(artifact.id);
              }}
            >
              <title>{`${artifact.name[lang]} · ${artifact.qrId}`}</title>
              <rect
                x={p.x - r}
                y={p.y - r}
                width={r * 2}
                height={r * 2}
                rx={0.08}
                fill={isTarget ? CARNELIAN : isNearest ? LAPIS : '#FFFFFF'}
                stroke={isTarget ? CARNELIAN : INK}
                strokeOpacity={isTarget ? 1 : 0.85}
                strokeWidth={0.11}
              />
              <text
                x={p.x}
                y={p.y + 0.22}
                textAnchor="middle"
                fontSize={0.44}
                fill={isTarget || isNearest ? '#FFFFFF' : INK}
                fontWeight={600}
                pointerEvents="none"
              >
                {artifact.short[lang].slice(0, 2)}
              </text>
            </g>
          );
        })}

      {targetSvg && (
        <g pointerEvents="none">
          <circle cx={targetSvg.x} cy={targetSvg.y} r={1.15} fill="none" stroke={CARNELIAN} strokeWidth={0.12} />
          <circle cx={targetSvg.x} cy={targetSvg.y} r={0.2} fill={CARNELIAN} />
        </g>
      )}

      {est && estimate && (
        <g pointerEvents="none">
          <circle
            cx={est.x}
            cy={est.y}
            r={Math.max(0.9, estimate.accuracyRadiusM)}
            fill="rgba(42,75,160,0.12)"
            stroke="rgba(42,75,160,0.45)"
            strokeWidth={0.08}
            strokeDasharray="0.2 0.16"
          />
          <circle cx={est.x} cy={est.y} r={0.34} fill={LAPIS} stroke="#FFFFFF" strokeWidth={0.12} />
        </g>
      )}

      {truthPoint && (
        <g pointerEvents="none">
          <circle cx={truthPoint.x} cy={truthPoint.y} r={0.42} fill="none" stroke={OCHRE} strokeWidth={0.1} strokeDasharray="0.12 0.1" />
          <line x1={truthPoint.x - 0.26} y1={truthPoint.y} x2={truthPoint.x + 0.26} y2={truthPoint.y} stroke={OCHRE} strokeWidth={0.08} />
          <line x1={truthPoint.x} y1={truthPoint.y - 0.26} x2={truthPoint.x} y2={truthPoint.y + 0.26} stroke={OCHRE} strokeWidth={0.08} />
          <text x={truthPoint.x} y={truthPoint.y + 1.15} textAnchor="middle" fontSize={0.66} fill={OCHRE}>
            truth
          </text>
        </g>
      )}

      <g transform={`translate(1.2 1.15)`} pointerEvents="none" stroke={INK_SOFT} fill={INK_SOFT}>
        <line x1={0} y1={0} x2={5} y2={0} strokeWidth={0.12} />
        <line x1={0} y1={-0.25} x2={0} y2={0.25} strokeWidth={0.1} />
        <line x1={5} y1={-0.25} x2={5} y2={0.25} strokeWidth={0.1} />
        <text x={2.5} y={0.85} textAnchor="middle" fontSize={0.65} stroke="none">
          5 m
        </text>
      </g>
    </svg>
  );
}
