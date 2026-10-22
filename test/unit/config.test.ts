// U-CARD-06: configuration validation (TEST HA-SAIL-TEST-001 §3.8)
import { describe, expect, it } from "vitest";

import { ConfigError, DEFAULTS, validateConfig } from "../../src/config";

const MINIMAL = { entity: "sensor.garnet_ais_targets", own: "device_tracker.garnet" };

function errorField(raw: unknown): string {
  try {
    validateConfig(raw);
  } catch (err) {
    expect(err).toBeInstanceOf(ConfigError);
    return (err as ConfigError).field;
  }
  throw new Error("no error");
}

describe("U-CARD-06 configuration", () => {
  it("fills in the defaults", () => {
    const config = validateConfig(MINIMAL);
    expect(config).toMatchObject({
      ...MINIMAL,
      type: "custom:vigie-traffic-card",
      vector_minutes: 6,
      rings_nm: [0.5, 1, 2],
      label_zoom: 13,
      height: "400px",
      tiles: DEFAULTS.tiles,
    });
    expect(config.collision_risk).toBeUndefined();
    expect(config.anchor).toBeUndefined();
  });

  it("keeps the optional entities and options", () => {
    const config = validateConfig({
      ...MINIMAL,
      collision_risk: "binary_sensor.garnet_collision_risk",
      anchor: "sensor.garnet_anchor_distance",
      vector_minutes: 12,
      rings_nm: [2, 0.25],
      overlay: "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
      title: "Traffic",
    });
    expect(config.rings_nm).toEqual([0.25, 2]);
    expect(config.vector_minutes).toBe(12);
    expect(config.anchor).toBe("sensor.garnet_anchor_distance");
    expect(config.title).toBe("Traffic");
  });

  it("accepts no range rings", () => {
    expect(validateConfig({ ...MINIMAL, rings_nm: [] }).rings_nm).toEqual([]);
  });

  it.each([
    [{ own: "device_tracker.garnet" }, "entity"],
    [{ entity: "sensor.garnet_ais_targets" }, "own"],
    [{ ...MINIMAL, entity: "device_tracker.garnet" }, "entity"],
    [{ ...MINIMAL, own: "sensor.garnet" }, "own"],
    [{ ...MINIMAL, collision_risk: "sensor.x" }, "collision_risk"],
    [{ ...MINIMAL, vector_minutes: 0 }, "vector_minutes"],
    [{ ...MINIMAL, vector_minutes: -3 }, "vector_minutes"],
    [{ ...MINIMAL, vector_minutes: "6" }, "vector_minutes"],
    [{ ...MINIMAL, rings_nm: 1 }, "rings_nm"],
    [{ ...MINIMAL, rings_nm: [1, -1] }, "rings_nm"],
    [{ ...MINIMAL, tiles: "https://example.org/tile.png" }, "tiles"],
    [{ ...MINIMAL, height: 400 }, "height"],
    [null, "config"],
    [["entity"], "config"],
  ])("refuses %j, naming %s", (raw, field) => {
    expect(errorField(raw)).toBe(field);
  });
});
