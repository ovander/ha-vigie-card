/**
 * What the anchor card shows (SPEC HA-SAIL-SPEC-001 §9.8; TEST U-ACARD-01…03, 05, 07).
 * Pure functions over plain state objects, no DOM.
 */

import { displace, type LatLon, METRES_PER_NM } from "./geo";
import { type Anchor, anchorOf, type HassState } from "./model";

export type AnchorStatus = "off" | "watching" | "waiting" | "dragging" | "position_lost";

const usable = (s?: HassState): s is HassState =>
  s !== undefined && s.state !== "unavailable" && s.state !== "unknown";
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const numeric = (s?: HassState): number | null => {
  if (!usable(s)) return null;
  const v = Number(s.state);
  return Number.isFinite(v) ? v : null;
};
const date = (v: unknown): Date | null => {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * The status line. Never *watching* while the alarm is on or the position is unknown; an
 * alarm with an unknown reason shows as dragging (the safe side).
 */
export function statusOf(watch?: HassState, alarm?: HassState, distance?: HassState): AnchorStatus {
  if (watch?.state !== "on") return "off";
  if (alarm?.state === "on") return alarm.attributes.reason === "no_position" ? "position_lost" : "dragging";
  return numeric(distance) === null ? "waiting" : "watching";
}

export type GaugeLevel = "normal" | "amber" | "red" | "none";

/** Distance against radius: amber from 80 %, red outside (on the circle is inside, §8.4). */
export function gauge(distance: number | null, radius: number): { fraction: number | null; level: GaugeLevel } {
  if (distance === null || radius <= 0) return { fraction: null, level: "none" };
  const fraction = distance / radius;
  const level = distance > radius ? "red" : fraction >= 0.8 ? "amber" : "normal";
  return { fraction, level };
}

export interface RadiusLimits {
  min: number;
  max: number;
  step: number;
}

/** The next radius one step up (+1) or down (−1), within the limits; null at a limit. */
export function radiusStep(value: number, limits: RadiusLimits, direction: 1 | -1): number | null {
  if (direction > 0 ? value >= limits.max : value <= limits.min) return null;
  const next = value + direction * limits.step;
  return Math.min(limits.max, Math.max(limits.min, next));
}

/** South-west and north-east corners of the anchor ± the radius. */
export function swingBounds(lat: number, lon: number, radiusM: number): [LatLon, LatLon] {
  const nm = radiusM / METRES_PER_NM;
  return [displace(lat, lon, -nm, -nm), displace(lat, lon, nm, nm)];
}

/** `< 1 min`, `45 min`, `2 h 05`. */
export function timeAtAnchor(armedAt: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - armedAt.getTime()) / 60_000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

/** Everything the card shows about the watch, read from Vigie's entities. */
export interface AnchorReading {
  status: AnchorStatus;
  /** The anchor point and radius while armed (also while the distance is unavailable). */
  anchor: Anchor | null;
  distanceM: number | null;
  bearing: number | null;
  maxM: number | null;
  armedAt: Date | null;
  /** When the alarm turned on. */
  alarmSince: Date | null;
  radius: { value: number | null } & RadiusLimits;
}

export function readAnchor(
  watch?: HassState,
  alarm?: HassState,
  distance?: HassState,
  radius?: HassState,
): AnchorReading {
  const status = statusOf(watch, alarm, distance);
  const armed = status !== "off";
  const d = usable(distance) ? distance.attributes : {};
  const r = radius?.attributes ?? {};
  return {
    status,
    anchor: armed ? anchorOf(distance, watch, alarm) : null,
    distanceM: armed ? numeric(distance) : null,
    bearing: armed ? num(d.bearing_to_anchor) : null,
    maxM: armed ? num(d.max_distance_m) : null,
    armedAt: armed ? date(watch?.attributes.armed_at) : null,
    alarmSince: alarm?.state === "on" ? date(alarm.last_changed) : null,
    radius: {
      value: numeric(radius),
      min: num(r.min) ?? 10,
      max: num(r.max) ?? 500,
      step: num(r.step) ?? 5,
    },
  };
}

/** One point of the swing track; `t` in ms since the epoch. */
export interface TrackPoint {
  t: number;
  lat: number;
  lon: number;
}

/** At most this many points are drawn (SPEC §9.8). */
export const MAX_TRACK_POINTS = 500;

/** Where the track starts: the drop, or `hours` back when the drop is older. */
function trackStart(armedAt: Date, hours: number, now: Date): number {
  return Math.max(armedAt.getTime(), now.getTime() - hours * 3_600_000);
}

/**
 * The request for Home Assistant's history of the own tracker (OD-36), read only; null
 * when the track is off (`track_hours: 0`).
 */
export function historyRequest(entity: string, armedAt: Date, hours: number, now: Date) {
  if (hours <= 0) return null;
  return {
    type: "history/history_during_period",
    start_time: new Date(trackStart(armedAt, hours, now)).toISOString(),
    entity_ids: [entity],
    minimal_response: false,
    no_attributes: false,
    significant_changes_only: false,
  };
}

/** Evenly spaced points, first and last kept. */
export function thin(points: TrackPoint[], max = MAX_TRACK_POINTS): TrackPoint[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

/**
 * The swing track from a history answer (`{entity: [{s, a, lu}]}`, Home Assistant's compressed
 * format): positions since the drop and within `hours`, in time order, thinned.
 */
export function trackFrom(history: unknown, entity: string, armedAt: Date, hours: number, now: Date): TrackPoint[] {
  const rows = (history as Record<string, unknown> | null)?.[entity];
  if (!Array.isArray(rows)) return [];
  const start = trackStart(armedAt, hours, now);
  const points: TrackPoint[] = [];
  for (const row of rows as { a?: Record<string, unknown>; lu?: unknown; lc?: unknown }[]) {
    const seconds = num(row?.lu) ?? num(row?.lc);
    const lat = num(row?.a?.latitude);
    const lon = num(row?.a?.longitude);
    if (seconds === null || lat === null || lon === null) continue;
    const t = seconds * 1000;
    if (t >= start) points.push({ t, lat, lon });
  }
  points.sort((a, b) => a.t - b.t);
  return thin(points);
}
