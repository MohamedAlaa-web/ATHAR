import { MUSEUM, walkableRects } from '../../data/museum';
import type { EngineMap } from './types';

/** The engine map is derived from the same editable JSON as the UI and graph. */
export const MUSEUM_ENGINE_MAP: EngineMap = {
  beacons: MUSEUM.beacons.map((b) => ({
    id: b.id,
    floor: b.floor,
    x: b.x,
    y: b.y,
    txPower: b.txPower,
    pathLoss: b.pathLoss
  })),
  halls: MUSEUM.halls.map((h) => ({
    id: h.id,
    floor: h.floor,
    rects: h.rects.map((r) => ({ ...r }))
  })),
  rects: {
    ground: walkableRects('ground'),
    upper: walkableRects('upper')
  }
};
