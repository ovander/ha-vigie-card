/**
 * The anchor card's configuration (SPEC HA-SAIL-SPEC-001 §9.8; TEST U-ACARD-06). Pure.
 *
 * Only the watch switch is required: the other entities follow Vigie's names for the same
 * boat (`switch.garnet_anchor_watch` → `sensor.garnet_anchor_distance`…).
 */

import { ConfigError, DEFAULTS, entityOf, text } from "./config";

export interface VigieAnchorCardConfig {
  type: string;
  /** `switch.<boat>_anchor_watch` (required). */
  switch: string;
  distance: string;
  alarm: string;
  radius: string;
  own: string;
  title?: string;
  /** Height of the map, CSS length. */
  height: string;
  tiles: string;
  overlay?: string;
  /** Hours of swing track (WP26); 0 for none. */
  track_hours: number;
}

export const ANCHOR_DEFAULTS = { height: "260px", track_hours: 6 } as const;

/** Vigie's entity IDs for the boat of a watch switch; null when the name is not Vigie's. */
export function boatEntities(watch: string) {
  const m = /^switch\.(.+)_anchor_watch$/.exec(watch);
  if (!m) return null;
  const boat = m[1];
  return {
    distance: `sensor.${boat}_anchor_distance`,
    alarm: `binary_sensor.${boat}_anchor_alarm`,
    radius: `number.${boat}_anchor_radius`,
    own: `device_tracker.${boat}`,
  };
}

export function validateAnchorConfig(raw: unknown): VigieAnchorCardConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ConfigError("config", "must be a mapping");
  }
  const r = raw as Record<string, unknown>;
  const watch = entityOf(r, "switch", "switch", true)!;
  const derived = boatEntities(watch);
  // Without Vigie's naming, each entity must be given (the first missing one is named)
  const required = derived === null;
  const distance = entityOf(r, "distance", "sensor", required) ?? derived!.distance;
  const alarm = entityOf(r, "alarm", "binary_sensor", required) ?? derived!.alarm;
  const radius = entityOf(r, "radius", "number", required) ?? derived!.radius;
  const own = entityOf(r, "own", "device_tracker", required) ?? derived!.own;
  const hours = r.track_hours ?? ANCHOR_DEFAULTS.track_hours;
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours < 0) {
    throw new ConfigError("track_hours", "must be a number of hours, 0 or more");
  }
  const tiles = text(r, "tiles") ?? DEFAULTS.tiles;
  if (!tiles.includes("{z}") || !tiles.includes("{x}") || !tiles.includes("{y}")) {
    throw new ConfigError("tiles", "must contain {z}, {x} and {y}");
  }
  return {
    type: typeof r.type === "string" ? r.type : "custom:vigie-anchor-card",
    switch: watch,
    distance,
    alarm,
    radius,
    own,
    title: text(r, "title"),
    height: text(r, "height") ?? ANCHOR_DEFAULTS.height,
    tiles,
    overlay: text(r, "overlay"),
    track_hours: hours,
  };
}
