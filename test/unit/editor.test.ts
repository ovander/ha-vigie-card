// F-CARD-08 (form half): every option editable, YAML round trip (TEST §4.7)
import { describe, expect, it } from "vitest";

import { validateConfig } from "../../src/config";
import { fromFormData, schemaNames, toFormData } from "../../src/editor-form";
import { STRINGS } from "../../src/i18n";

const FULL = {
  type: "custom:vigie-traffic-card",
  entity: "sensor.garnet_ais_targets",
  own: "device_tracker.garnet",
  collision_risk: "binary_sensor.garnet_collision_risk",
  anchor: "sensor.garnet_anchor_distance",
  title: "Traffic",
  vector_minutes: 12,
  label_zoom: 11,
  rings_nm: [0.5, 1, 2],
  height: "500px",
  tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  overlay: "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
};

describe("F-CARD-08 editor form", () => {
  it("edits every option of the card", () => {
    const options = Object.keys(validateConfig(FULL)).filter((k) => k !== "type");
    expect(schemaNames().sort()).toEqual(options.sort());
  });

  it("labels every field in English and French", () => {
    for (const name of schemaNames()) {
      expect(STRINGS.en, name).toHaveProperty(`editor.${name}`);
      expect(STRINGS.fr, name).toHaveProperty(`editor.${name}`);
    }
  });

  it("round-trips a full configuration", () => {
    const form = toFormData(FULL);
    expect(form.rings_nm).toBe("0.5, 1, 2");
    expect(form).not.toHaveProperty("type");
    expect(fromFormData(form)).toEqual(FULL);
  });

  it("keeps a minimal YAML minimal (no defaults written)", () => {
    const minimal = { type: "custom:vigie-traffic-card", entity: FULL.entity, own: FULL.own };
    expect(fromFormData(toFormData(minimal))).toEqual(minimal);
  });

  it("parses rings typed by hand; empty means none; a cleared field is dropped", () => {
    expect(fromFormData({ rings_nm: "1;2  0.5" }).rings_nm).toEqual([1, 2, 0.5]);
    expect(fromFormData({ rings_nm: "" }).rings_nm).toEqual([]);
    expect(fromFormData({ title: "", overlay: "" })).toEqual({ type: "custom:vigie-traffic-card" });
    // A wrong ring is passed on, and the card names the field
    const wrong = fromFormData({ ...toFormData(FULL), rings_nm: "1, x" });
    expect(() => validateConfig(wrong)).toThrow(/rings_nm/);
  });
});
