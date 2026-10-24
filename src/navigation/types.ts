import type { FloorId, Localized, MuseumGraph, MuseumPathPoint } from '../data/museum';

export interface RoutePoint extends MuseumPathPoint {
  /** Present for graph nodes, absent for the exact start/target point. */
  nodeId?: string;
}

export type InstructionKind =
  | 'start'
  | 'left'
  | 'right'
  | 'slight-left'
  | 'slight-right'
  | 'uturn'
  | 'stairs-up'
  | 'stairs-down'
  | 'arrive';

export interface RouteInstruction {
  kind: InstructionKind;
  /** Index into `RouteResult.points`. */
  pathIndex: number;
  /** Walking distance from the previous maneuver to this one. */
  distanceM: number;
  turnDeg: number | null;
  at: RoutePoint;
  /** Pre-rendered short label in both languages. */
  label: Localized;
}

export type RouteFailure =
  | 'no-start'
  | 'no-target'
  | 'target-closed'
  | 'stairs-only'
  | 'closed'
  | 'no-route';

export interface RouteResult {
  ok: boolean;
  reason: RouteFailure | null;
  request: {
    from: MuseumPathPoint;
    to: MuseumPathPoint;
    targetArtifactId: string | null;
    targetHallId: string | null;
    avoidStairs: boolean;
    closedHalls: string[];
  };
  points: RoutePoint[];
  instructions: RouteInstruction[];
  totalDistanceM: number;
  floors: FloorId[];
  computeMs: number;
  /** 0 means perfectly on the line. */
  maxDeviationM: number;
}

export interface RouteOptions {
  graph?: MuseumGraph;
  avoidStairs?: boolean;
  closedHalls?: string[];
  targetArtifactId?: string | null;
  /** Hall membership lets "hall closed" reject inside targets instead of routing to the door. */
  targetHallId?: string | null;
  fromHallId?: string | null;
  /** Optional clock injection for deterministic performance tests. */
  now?: () => number;
  /**
   * Crowd-aware routing: each edge is multiplied by (1 + alpha * tier) of the
   * hall it enters. Omit it (or pass alpha 0) for the plain shortest path.
   */
  crowd?: { levels: Record<string, 0 | 1 | 2>; alpha?: number };
}

export interface InstructionSet {
  instructions: RouteInstruction[];
  totalDistanceM: number;
}

export interface RouteProgress {
  arrived: boolean;
  nearestPointIndex: number;
  instruction: RouteInstruction | null;
  distanceToManeuverM: number;
  distanceToTargetM: number;
  offRouteM: number;
}
