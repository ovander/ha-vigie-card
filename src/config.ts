/**
 * Card configuration and its validation (SPEC HA-SAIL-SPEC-001 §9.7; TEST U-CARD-06).
 *
 * Pure functions, no DOM: unit-tested without a browser.
 */

export interface VigieTrafficCardConfig {
  type: string;
  /** `sensor.<boat>_ais_targets`: its `targets` attribute is the traffic (required). */
  entity: string;
  /** `device_tracker.<boat>`: the own boat (required). */
  own: string;
  /** `binary_sensor.<boat>_collision_risk` (optional). */
  collision_risk?: string;
  /** `sensor.<boat>_anchor_distance`: anchor point and radius (optional). */
  anchor?: string;
  title?: string;
  /** Length of the course vectors, minutes. */
  vector_minutes: number;
  /** Range rings around the own boat, NM; empty for none. */
  rings_nm: number[];
  /** Zoom level from which every target is labelled (threats always are). */
  label_zoom: number;
  /** Height of the map, CSS length. */
  height: string;
  /** Tile URL template ({z}/{x}/{y}). */
  tiles: string;
  /** Optional overlay tile URL template, e.g. OpenSeaMap sea marks. */
  overlay?: string;
}

export const DEFAULTS = {
  vector_minutes: 6,
  rings_nm: [0.5, 1, 2],
  label_zoom: 13,
  height: "400px",
  tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
} as const;

/** A configuration error that names the field (shown by Home Assistant on the card). */
export class ConfigError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(`${field}: ${message}`);
    this.name = "ConfigError";
  }
}

function entityOf(raw: Record<string, unknown>, field: string, domain: string, required: boolean) {
  const value = raw[field];
  if (value === undefined || value === null || value === "") {
    if (required) throw new ConfigError(field, `required (a ${domain} entity ID)`);
    return undefined;
  }
  if (typeof value !== "string" || !value.startsWith(`${domain}.`)) {
    throw new ConfigError(field, `must be a ${domain} entity ID`);
  }
  return value;
}

function positiveNumber(raw: Record<string, unknown>, field: string, fallback: number): number {
  const value = raw[field] ?? fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new ConfigError(field, "must be a positive number");
  }
  return value;
}

function text(raw: Record<string, unknown>, field: string): string | undefined {
  const value = raw[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new ConfigError(field, "must be text");
  return value;
}

/** Validates a raw configuration and fills in the defaults; throws ConfigError. */
export function validateConfig(raw: unknown): VigieTrafficCardConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ConfigError("config", "must be a mapping");
  }
  const r = raw as Record<string, unknown>;
  const rings = r.rings_nm ?? DEFAULTS.rings_nm;
  if (
    !Array.isArray(rings) ||
    !rings.every((n) => typeof n === "number" && Number.isFinite(n) && n > 0)
  ) {
    throw new ConfigError("rings_nm", "must be a list of positive numbers (NM)");
  }
  const tiles = text(r, "tiles") ?? DEFAULTS.tiles;
  if (!tiles.includes("{z}") || !tiles.includes("{x}") || !tiles.includes("{y}")) {
    throw new ConfigError("tiles", "must contain {z}, {x} and {y}");
  }
  return {
    type: typeof r.type === "string" ? r.type : "custom:vigie-traffic-card",
    entity: entityOf(r, "entity", "sensor", true)!,
    own: entityOf(r, "own", "device_tracker", true)!,
    collision_risk: entityOf(r, "collision_risk", "binary_sensor", false),
    anchor: entityOf(r, "anchor", "sensor", false),
    title: text(r, "title"),
    vector_minutes: positiveNumber(r, "vector_minutes", DEFAULTS.vector_minutes),
    rings_nm: [...(rings as number[])].sort((a, b) => a - b),
    label_zoom: positiveNumber(r, "label_zoom", DEFAULTS.label_zoom),
    height: text(r, "height") ?? DEFAULTS.height,
    tiles,
    overlay: text(r, "overlay"),
  };
}
