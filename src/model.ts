/**
 * What the card reads from Home Assistant (SPEC HA-SAIL-SPEC-001 §9.7, OD-31): the
 * `targets` rows of `sensor.<boat>_ais_targets`, the own boat's tracker and the anchor
 * watch. Pure functions over plain state objects, no DOM.
 */

export interface HassState {
  state: string;
  attributes: Record<string, unknown>;
  /** ISO time of the last state change (Home Assistant sends it with every state). */
  last_changed?: string;
}

/** One row of the `targets` attribute (Vigie SPEC §9.2). */
export interface TargetRow {
  mmsi: number;
  name: string | null;
  class: string;
  lat: number;
  lon: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  distance_nm: number | null;
  age_s: number | null;
  cpa_nm: number | null;
  tcpa_min: number | null;
  ship_type: string | null;
  length_m: number | null;
  threat: boolean;
}

export interface OwnBoat {
  lat: number;
  lon: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
}

export interface Anchor {
  lat: number;
  lon: number;
  radius_m: number;
  alarm: boolean;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const usable = (s?: HassState): s is HassState =>
  s !== undefined && s.state !== "unavailable" && s.state !== "unknown";

/** Rows with a position; anything malformed is skipped, never drawn wrongly. */
export function targetRows(sensor?: HassState): TargetRow[] {
  if (!usable(sensor)) return [];
  const raw = sensor.attributes.targets;
  if (!Array.isArray(raw)) return [];
  const rows: TargetRow[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const mmsi = num(r?.mmsi);
    const lat = num(r?.lat);
    const lon = num(r?.lon);
    if (mmsi === null || lat === null || lon === null) continue;
    rows.push({
      mmsi,
      name: str(r.name),
      class: str(r.class) ?? "A",
      lat,
      lon,
      sog: num(r.sog),
      cog: num(r.cog),
      heading: num(r.heading),
      distance_nm: num(r.distance_nm),
      age_s: num(r.age_s),
      cpa_nm: num(r.cpa_nm),
      tcpa_min: num(r.tcpa_min),
      ship_type: str(r.ship_type),
      length_m: num(r.length_m),
      threat: r.threat === true,
    });
  }
  return rows;
}

export function ownBoat(tracker?: HassState): OwnBoat | null {
  if (!usable(tracker)) return null;
  const a = tracker.attributes;
  const lat = num(a.latitude);
  const lon = num(a.longitude);
  if (lat === null || lon === null) return null;
  return { lat, lon, sog: num(a.sog), cog: num(a.cog), heading: num(a.heading) };
}

/**
 * The boat's prefix in Vigie's entity IDs: `sensor.garnet_anchor_distance` → `garnet`.
 * The anchor's switch and alarm are found from it.
 */
export function anchorEntities(distanceEntity: string): { watch: string; alarm: string } | null {
  const m = /^sensor\.(.+)_anchor_distance$/.exec(distanceEntity);
  if (!m) return null;
  return { watch: `switch.${m[1]}_anchor_watch`, alarm: `binary_sensor.${m[1]}_anchor_alarm` };
}

/**
 * The anchor point and radius while the watch is on: from the distance sensor, or from the
 * switch when the distance is unavailable (no own position), so an alarm never hides it.
 */
export function anchorOf(
  distance?: HassState,
  watch?: HassState,
  alarm?: HassState,
): Anchor | null {
  const on = alarm?.state === "on";
  if (usable(distance)) {
    const a = distance.attributes;
    const lat = num(a.latitude);
    const lon = num(a.longitude);
    const radius = num(a.radius_m);
    if (lat !== null && lon !== null && radius !== null) return { lat, lon, radius_m: radius, alarm: on };
  }
  if (watch?.state === "on") {
    const a = watch.attributes;
    const lat = num(a.anchor_latitude);
    const lon = num(a.anchor_longitude);
    const radius = num(a.radius_m);
    if (lat !== null && lon !== null && radius !== null) return { lat, lon, radius_m: radius, alarm: on };
  }
  return null;
}
