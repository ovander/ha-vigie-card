/**
 * The own boat's position, speed, course and position state, as both cards show them
 * (SPEC HA-SAIL-SPEC-001 §9.7, §9.8, #77; TEST U-CARD-08). Pure, no DOM.
 */

import { formatNumber, localize } from "./i18n";
import type { HassState, OwnBoat } from "./model";

/** Degrees and minutes with three decimals, in the user's locale: `43° 30,000′ N`. */
function degreesMinutes(tag: string | undefined, value: number, positive: string, negative: string) {
  const abs = Math.abs(value);
  let degrees = Math.floor(abs);
  let thousandths = Math.round((abs - degrees) * 60_000);
  if (thousandths >= 60_000) {
    degrees += 1; // 59.9996′ rounds to 60.000′: carry it
    thousandths = 0;
  }
  const minutes = formatNumber(tag, thousandths / 1000, 3).padStart(6, "0");
  return `${degrees}° ${minutes}′ ${value < 0 ? negative : positive}`;
}

export function formatPosition(tag: string | undefined, lat: number, lon: number): [string, string] {
  return [degreesMinutes(tag, lat, "N", "S"), degreesMinutes(tag, lon, "E", "W")];
}

export interface PositionState {
  /** The tracker is available: its fix is younger than Vigie's staleness timeout (10 s). */
  current: boolean;
  /** When the position was lost (the tracker's last change), if known. */
  since: Date | null;
}

/**
 * Current or lost since: Vigie writes the tracker only after a 5 m move, so its update time
 * is not the age of the fix (SPEC §9.7).
 */
export function positionState(tracker?: HassState): PositionState {
  if (tracker && tracker.state !== "unavailable" && tracker.state !== "unknown") {
    return { current: true, since: null };
  }
  const since = tracker?.last_changed ? new Date(tracker.last_changed) : null;
  return { current: false, since: since && !Number.isNaN(since.getTime()) ? since : null };
}

/** Hours and minutes in the user's locale. */
export function formatTime(tag: string | undefined, date: Date): string {
  let locale = tag ?? "en";
  try {
    new Intl.DateTimeFormat(locale);
  } catch {
    locale = "en";
  }
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
}

/** *Position current*, or *position lost since HH:MM*. */
export function positionStateText(tag: string | undefined, state: PositionState): string {
  if (state.current) return localize(tag, "position_current");
  if (state.since === null) return localize(tag, "position_lost");
  return localize(tag, "position_lost_since", { time: formatTime(tag, state.since) });
}

/** Label and value pairs for the own boat: position, SOG, COG, heading (`—` when unknown). */
export function ownLines(tag: string | undefined, own: OwnBoat): [string, string][] {
  const t = (key: Parameters<typeof localize>[1]) => localize(tag, key);
  const dash = "—";
  return [
    [t("position"), formatPosition(tag, own.lat, own.lon).join(" ")],
    [t("sog"), own.sog === null ? dash : `${formatNumber(tag, own.sog, 1)} ${t("unit_kn")}`],
    [t("cog"), own.cog === null ? dash : `${formatNumber(tag, own.cog, 0)}°`],
    [t("heading"), own.heading === null ? dash : `${formatNumber(tag, own.heading, 0)}°`],
  ];
}
