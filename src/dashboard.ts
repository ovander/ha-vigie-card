/**
 * The ready-made Vigie dashboard (SPEC HA-SAIL-SPEC-001 §9.9, OD-40; TEST U-DASH). Pure.
 *
 * Finds every Vigie boat in Home Assistant's entity registry (platform `vigie`, the
 * entities' translation keys, grouped by device), so renamed entity IDs still work; without
 * the registry, by Vigie's default entity IDs. Each boat becomes one view with the traffic
 * map and the anchor card, configured with that boat's entities.
 */

import { languageOf, localize } from "./i18n";

export const TRAFFIC_CARD_TYPE = "custom:vigie-traffic-card";
export const ANCHOR_CARD_TYPE = "custom:vigie-anchor-card";

/** The part of Home Assistant's `hass` object the strategy reads. */
export interface DashboardHass {
  states: Record<string, unknown>;
  entities?: Record<
    string,
    { device_id?: string | null; platform?: string; translation_key?: string | null } | undefined
  >;
  devices?: Record<string, { name?: string | null; name_by_user?: string | null } | undefined>;
  locale?: { language?: string };
  language?: string;
}

/** One boat's entities, as the two cards need them. */
export interface Boat {
  name: string;
  targets?: string;
  own?: string;
  collision_risk?: string;
  anchor_distance?: string;
  anchor_watch?: string;
  anchor_alarm?: string;
  anchor_radius?: string;
}

/** Vigie's translation key of each entity the cards use. */
const KEYS: Record<string, keyof Omit<Boat, "name">> = {
  "sensor.ais_targets": "targets",
  "device_tracker.position": "own",
  "binary_sensor.collision_risk": "collision_risk",
  "sensor.anchor_distance": "anchor_distance",
  "switch.anchor_watch": "anchor_watch",
  "binary_sensor.anchor_alarm": "anchor_alarm",
  "number.anchor_radius": "anchor_radius",
};

/** Every Vigie boat, sorted by name. */
export function findBoats(hass: DashboardHass): Boat[] {
  const registry = Object.entries(hass.entities ?? {});
  const boats = registry.some(([, e]) => e?.platform === "vigie")
    ? fromRegistry(hass)
    : fromStates(hass);
  return boats
    .filter((b) => b.targets !== undefined || b.anchor_watch !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function fromRegistry(hass: DashboardHass): Boat[] {
  const byDevice = new Map<string, Boat>();
  for (const [id, entry] of Object.entries(hass.entities ?? {})) {
    if (entry?.platform !== "vigie" || !entry.device_id || !entry.translation_key) continue;
    const key = KEYS[`${id.split(".")[0]}.${entry.translation_key}`];
    if (!key) continue;
    let boat = byDevice.get(entry.device_id);
    if (!boat) {
      const device = hass.devices?.[entry.device_id];
      boat = { name: device?.name_by_user || device?.name || entry.device_id };
      byDevice.set(entry.device_id, boat);
    }
    boat[key] = id;
  }
  return [...byDevice.values()];
}

/** Vigie's default IDs: `sensor.<boat>_ais_targets`, `switch.<boat>_anchor_watch`… */
function fromStates(hass: DashboardHass): Boat[] {
  const ids = new Set(Object.keys(hass.states));
  const slugs = new Set<string>();
  for (const id of ids) {
    const m = /^(?:sensor\.(.+)_ais_targets|switch\.(.+)_anchor_watch)$/.exec(id);
    if (m) slugs.add(m[1] ?? m[2]);
  }
  const has = (id: string) => (ids.has(id) ? id : undefined);
  return [...slugs].map((slug) => {
    const own = has(`device_tracker.${slug}`);
    const state = own ? (hass.states[own] as { attributes?: { friendly_name?: unknown } }) : undefined;
    const friendly = state?.attributes?.friendly_name;
    return {
      name: typeof friendly === "string" && friendly ? friendly : slug,
      targets: has(`sensor.${slug}_ais_targets`),
      own,
      collision_risk: has(`binary_sensor.${slug}_collision_risk`),
      anchor_distance: has(`sensor.${slug}_anchor_distance`),
      anchor_watch: has(`switch.${slug}_anchor_watch`),
      anchor_alarm: has(`binary_sensor.${slug}_anchor_alarm`),
      anchor_radius: has(`number.${slug}_anchor_radius`),
    };
  });
}

/** The strategy's own options: `boat` limits the dashboard to the boat of that name. */
export interface StrategyConfig {
  type?: string;
  boat?: string;
}

type Card = Record<string, unknown>;
type View = Record<string, unknown>;

function compact(card: Record<string, unknown>): Card {
  return Object.fromEntries(Object.entries(card).filter(([, v]) => v !== undefined));
}

/** A URL path for a boat's view: `Garnet II` → `garnet-ii`. */
export function viewPath(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "vigie";
}

/** One boat's view: the traffic map over two columns, the anchor card in the third (stacked on a phone). */
export function boatView(boat: Boat, hass: DashboardHass): View {
  const lang = languageOf(hass.locale?.language ?? hass.language);
  const sections: Card[] = [];
  if (boat.targets && boat.own) {
    sections.push({
      type: "grid",
      column_span: 2,
      cards: [
        { type: "heading", heading: localize(lang, "dashboard.traffic"), icon: "mdi:radar" },
        compact({
          type: TRAFFIC_CARD_TYPE,
          entity: boat.targets,
          own: boat.own,
          collision_risk: boat.collision_risk,
          anchor: boat.anchor_distance,
          height: "480px",
          grid_options: { columns: "full" },
        }),
      ],
    });
  }
  if (boat.anchor_watch) {
    sections.push({
      type: "grid",
      cards: [
        { type: "heading", heading: localize(lang, "dashboard.anchor"), icon: "mdi:anchor" },
        compact({
          type: ANCHOR_CARD_TYPE,
          switch: boat.anchor_watch,
          distance: boat.anchor_distance,
          alarm: boat.anchor_alarm,
          radius: boat.anchor_radius,
          own: boat.own,
          grid_options: { columns: "full" },
        }),
      ],
    });
  }
  return {
    title: boat.name,
    path: viewPath(boat.name),
    icon: "mdi:sail-boat",
    type: "sections",
    max_columns: 3,
    sections,
  };
}

/** Shown instead of the maps when no Vigie boat matches. */
function emptyView(hass: DashboardHass, boat: string | undefined): View {
  const lang = languageOf(hass.locale?.language ?? hass.language);
  const content = boat
    ? localize(lang, "dashboard.no_such_boat", { boat })
    : localize(lang, "dashboard.no_boat");
  return {
    title: "Vigie",
    path: "vigie",
    icon: "mdi:sail-boat",
    type: "sections",
    sections: [{ type: "grid", cards: [{ type: "markdown", content }] }],
  };
}

function boatsOf(config: StrategyConfig, hass: DashboardHass): Boat[] {
  const boats = findBoats(hass);
  if (!config.boat) return boats;
  const wanted = config.boat.trim().toLowerCase();
  return boats.filter((b) => b.name.toLowerCase() === wanted || viewPath(b.name) === wanted);
}

/** The dashboard: one view per boat (`strategy: {type: custom:vigie}`). */
export function dashboardConfig(config: StrategyConfig, hass: DashboardHass): { title: string; views: View[] } {
  const boats = boatsOf(config, hass);
  return {
    title: "Vigie",
    views: boats.length ? boats.map((b) => boatView(b, hass)) : [emptyView(hass, config.boat)],
  };
}

/** One view, for an existing dashboard (`views: [{strategy: {type: custom:vigie}}]`). */
export function viewConfig(config: StrategyConfig, hass: DashboardHass): View {
  const boat = boatsOf(config, hass)[0];
  return boat ? boatView(boat, hass) : emptyView(hass, config.boat);
}
