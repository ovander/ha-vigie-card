/**
 * How each target looks (SPEC §9.7 drawing rules; TEST U-CARD-03…05). Pure, no DOM.
 */

import type { OwnBoat, TargetRow } from "./model";

/** Below this speed a vessel has no meaningful course: drawn as a circle. */
export const MIN_SOG_KN = 0.5;
/** Older reports are drawn faded. */
export const STALE_S = 180;

export const COLORS = {
  threat: "#d32f2f",
  classA: "#263238",
  classB: "#78909c",
  own: "#1565c0",
  anchor: "#1565c0",
  anchorAlarm: "#d32f2f",
  ring: "#1565c0",
} as const;

export interface SymbolSpec {
  shape: "triangle" | "circle";
  /** Degrees true, for triangles. */
  rotation: number | null;
}

/** Oriented on heading, else COG; a circle when stopped or with no direction. */
export function symbolFor(v: Pick<TargetRow | OwnBoat, "sog" | "cog" | "heading">): SymbolSpec {
  if (v.sog !== null && v.sog < MIN_SOG_KN) return { shape: "circle", rotation: null };
  const direction = v.heading ?? v.cog;
  if (direction === null) return { shape: "circle", rotation: null };
  return { shape: "triangle", rotation: direction };
}

export interface TargetStyle {
  color: string;
  opacity: number;
  kind: "threat" | "class-a" | "class-b";
  stale: boolean;
}

export function styleFor(row: TargetRow): TargetStyle {
  const stale = row.age_s !== null && row.age_s > STALE_S;
  const kind = row.threat ? "threat" : row.class === "B" ? "class-b" : "class-a";
  const color = row.threat ? COLORS.threat : row.class === "B" ? COLORS.classB : COLORS.classA;
  return { color, opacity: stale ? 0.4 : 1, kind, stale };
}

export function labelFor(row: TargetRow): string {
  return row.name ?? String(row.mmsi);
}

/** Threats are always labelled; other targets from the configured zoom. */
export function showLabel(row: TargetRow, zoom: number, labelZoom: number): boolean {
  return row.threat || zoom >= labelZoom;
}

/** Whether a course vector is drawn (moving, with a course). */
export function hasVector(v: Pick<TargetRow | OwnBoat, "sog" | "cog">): boolean {
  return v.sog !== null && v.sog >= MIN_SOG_KN && v.cog !== null;
}
