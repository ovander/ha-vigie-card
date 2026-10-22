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
