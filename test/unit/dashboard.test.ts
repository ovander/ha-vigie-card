// U-DASH-01…05: the ready-made Vigie dashboard (TEST HA-SAIL-TEST-001 §3.10, SPEC §9.9)
import { describe, expect, it } from "vitest";

import { validateAnchorConfig } from "../../src/anchor-config";
import { validateConfig } from "../../src/config";
import {
  ANCHOR_CARD_TYPE,
  boatView,
  dashboardConfig,
  type DashboardHass,
  findBoats,
  TRAFFIC_CARD_TYPE,
  viewConfig,
  viewPath,
} from "../../src/dashboard";
import moments from "../fixtures/anchor-drag.json";
import traffic from "../fixtures/multi-target.json";

const vigie = (device: string, translation_key: string) => ({
  device_id: device,
  platform: "vigie",
  translation_key,
});

/** Two Vigie boats, one renamed by the user, a watched target and another integration. */
const REGISTRY: DashboardHass = {
  states: {},
  entities: {
    "sensor.garnet_ais_targets": vigie("d1", "ais_targets"),
    "device_tracker.garnet": vigie("d1", "position"),
    "binary_sensor.garnet_collision_risk": vigie("d1", "collision_risk"),
    "sensor.garnet_anchor_distance": vigie("d1", "anchor_distance"),
    "switch.garnet_anchor_watch": vigie("d1", "anchor_watch"),
    "binary_sensor.garnet_anchor_alarm": vigie("d1", "anchor_alarm"),
    "number.garnet_anchor_radius": vigie("d1", "anchor_radius"),
    "sensor.garnet_sog": vigie("d1", "sog"),
    "sensor.traffic": vigie("d2", "ais_targets"),
    "device_tracker.bateau": vigie("d2", "position"),
    "switch.mouillage": vigie("d2", "anchor_watch"),
    "device_tracker.ais_235000001": vigie("d3", "watched_target"),
    "sensor.kitchen_temperature": { device_id: "d9", platform: "zha", translation_key: "temperature" },
  },
  devices: {
    d1: { name: "Garnet", name_by_user: null },
    d2: { name: "Second boat", name_by_user: "Albatros" },
    d3: { name: "AIS 235000001" },
    d9: { name: "Kitchen" },
  },
};

describe("U-DASH-01 boats from the entity registry", () => {
  it("groups Vigie's entities by device, by translation key, renamed IDs included", () => {
    expect(findBoats(REGISTRY)).toEqual([
      {
        name: "Albatros",
        targets: "sensor.traffic",
        own: "device_tracker.bateau",
        anchor_watch: "switch.mouillage",
      },
      {
        name: "Garnet",
        targets: "sensor.garnet_ais_targets",
        own: "device_tracker.garnet",
        collision_risk: "binary_sensor.garnet_collision_risk",
        anchor_distance: "sensor.garnet_anchor_distance",
        anchor_watch: "switch.garnet_anchor_watch",
        anchor_alarm: "binary_sensor.garnet_anchor_alarm",
        anchor_radius: "number.garnet_anchor_radius",
      },
    ]);
  });
});

describe("U-DASH-02 boats from the states, without the registry", () => {
  it("finds Garnet by Vigie's default entity IDs", () => {
    const states = { ...traffic, ...moments.swinging, "sensor.other": {} };
    const [boat, ...rest] = findBoats({ states });
    expect(rest).toEqual([]);
    expect(boat).toMatchObject({
      targets: "sensor.garnet_ais_targets",
      own: "device_tracker.garnet",
      collision_risk: "binary_sensor.garnet_collision_risk",
      anchor_distance: "sensor.garnet_anchor_distance",
      anchor_watch: "switch.garnet_anchor_watch",
      anchor_alarm: "binary_sensor.garnet_anchor_alarm",
      anchor_radius: "number.garnet_anchor_radius",
    });
    // The recorded states carry no friendly name: the entity ID's boat part
    expect(boat.name).toBe("garnet");
  });

  it("names the boat after its tracker's friendly name", () => {
    const states = { "sensor.garnet_ais_targets": {}, "device_tracker.garnet": { attributes: { friendly_name: "Garnet" } } };
    expect(findBoats({ states }).map((b) => b.name)).toEqual(["Garnet"]);
  });

  it("finds nothing in a Home Assistant without Vigie", () => {
    expect(findBoats({ states: { "sun.sun": {} }, entities: {} })).toEqual([]);
  });
});

describe("U-DASH-03 one view per boat, with both cards", () => {
  it("configures the traffic map and the anchor card with the boat's entities", () => {
    const garnet = findBoats(REGISTRY)[1];
    const view = boatView(garnet, REGISTRY);
    expect(view).toMatchObject({ title: "Garnet", path: "garnet", type: "sections", max_columns: 3 });
    const [trafficSection, anchorSection] = view.sections as { cards: Record<string, unknown>[] }[];
    expect(trafficSection).toMatchObject({ type: "grid", column_span: 2 });
    expect(trafficSection.cards[0]).toMatchObject({ type: "heading", heading: "AIS traffic" });
    expect(trafficSection.cards[1]).toEqual({
      type: TRAFFIC_CARD_TYPE,
      entity: "sensor.garnet_ais_targets",
      own: "device_tracker.garnet",
      collision_risk: "binary_sensor.garnet_collision_risk",
      anchor: "sensor.garnet_anchor_distance",
      height: "480px",
      grid_options: { columns: "full" },
    });
    expect(anchorSection.cards[0]).toMatchObject({ type: "heading", heading: "Anchor watch" });
    expect(anchorSection.cards[1]).toEqual({
      type: ANCHOR_CARD_TYPE,
      switch: "switch.garnet_anchor_watch",
      distance: "sensor.garnet_anchor_distance",
      alarm: "binary_sensor.garnet_anchor_alarm",
      radius: "number.garnet_anchor_radius",
      own: "device_tracker.garnet",
      grid_options: { columns: "full" },
    });
    // Both cards accept what the dashboard gives them
    expect(() => validateConfig(trafficSection.cards[1])).not.toThrow();
    expect(() => validateAnchorConfig(anchorSection.cards[1])).not.toThrow();
  });

  it("leaves out what the boat lacks, and names sections in French", () => {
    const hass = { ...REGISTRY, locale: { language: "fr" } };
    const albatros = findBoats(hass)[0];
    const sections = boatView(albatros, hass).sections as { cards: Record<string, unknown>[] }[];
    expect(sections.map((s) => s.cards[0].heading)).toEqual(["Trafic AIS", "Veille au mouillage"]);
    expect(sections[0].cards[1]).not.toHaveProperty("collision_risk");
    expect(sections[0].cards[1]).not.toHaveProperty("anchor");
    // A renamed switch: the anchor card is given every entity it has, never a guessed one
    expect(sections[1].cards[1]).toEqual({
      type: ANCHOR_CARD_TYPE,
      switch: "switch.mouillage",
      own: "device_tracker.bateau",
      grid_options: { columns: "full" },
    });
  });

  it("makes a dashboard of every boat, in name order", () => {
    const dashboard = dashboardConfig({ type: "custom:vigie" }, REGISTRY);
    expect(dashboard.title).toBe("Vigie");
    expect(dashboard.views.map((v) => v.path)).toEqual(["albatros", "garnet"]);
  });
});

describe("U-DASH-04 no boat, or not the one asked for", () => {
  it("explains how to set Vigie up, in the user's language", () => {
    const empty = dashboardConfig({}, { states: {}, language: "fr" });
    expect(empty.views).toHaveLength(1);
    const card = (empty.views[0].sections as { cards: Record<string, unknown>[] }[])[0].cards[0];
    expect(card.type).toBe("markdown");
    expect(card.content).toContain("Aucun bateau Vigie");
  });

  it("names the boat it did not find", () => {
    const view = viewConfig({ boat: "Moana" }, REGISTRY);
    const card = (view.sections as { cards: Record<string, unknown>[] }[])[0].cards[0];
    expect(card.content).toContain("Moana");
  });
});

describe("U-DASH-05 the boat option and view paths", () => {
  it("keeps the boat asked for, by name or path, case aside", () => {
    expect(dashboardConfig({ boat: "garnet" }, REGISTRY).views.map((v) => v.title)).toEqual(["Garnet"]);
    expect(viewConfig({ boat: "ALBATROS" }, REGISTRY).title).toBe("Albatros");
    expect(viewConfig({}, REGISTRY).title).toBe("Albatros");
  });

  it("makes a URL path of any boat name", () => {
    expect(viewPath("Garnet II")).toBe("garnet-ii");
    expect(viewPath("Éole & Cie")).toBe("eole-cie");
    expect(viewPath("***")).toBe("vigie");
  });
});
