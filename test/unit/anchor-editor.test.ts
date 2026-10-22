// F-ACARD-11 (form half): every option editable, a one-line YAML round trips (TEST §4.8)
import { describe, expect, it } from "vitest";

import { validateAnchorConfig } from "../../src/anchor-config";
import { ANCHOR_SCHEMA, anchorFromFormData, anchorToFormData } from "../../src/anchor-editor-form";
import { schemaNames } from "../../src/editor-form";
import { STRINGS } from "../../src/i18n";

const FULL = {
  type: "custom:vigie-anchor-card",
  switch: "switch.garnet_anchor_watch",
  distance: "sensor.garnet_anchor_distance",
  alarm: "binary_sensor.garnet_anchor_alarm",
  radius: "number.garnet_anchor_radius",
  own: "device_tracker.garnet",
  title: "Anchor",
  height: "300px",
  tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  overlay: "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
  track_hours: 3,
};

describe("F-ACARD-11 anchor card editor form", () => {
  it("edits every option of the card", () => {
    const options = Object.keys(validateAnchorConfig(FULL)).filter((k) => k !== "type");
    expect(schemaNames(ANCHOR_SCHEMA).sort()).toEqual(options.sort());
  });

  it("labels every field in English and French", () => {
    for (const name of schemaNames(ANCHOR_SCHEMA)) {
      expect(STRINGS.en, name).toHaveProperty(`anchor_editor.${name}`);
      expect(STRINGS.fr, name).toHaveProperty(`anchor_editor.${name}`);
    }
  });

  it("round-trips a full configuration and a one-line one", () => {
    expect(anchorFromFormData(anchorToFormData(FULL))).toEqual(FULL);
    const oneLine = { type: "custom:vigie-anchor-card", switch: "switch.garnet_anchor_watch" };
    expect(anchorFromFormData(anchorToFormData(oneLine))).toEqual(oneLine);
  });

  it("drops a cleared field, so the card derives it again", () => {
    const form = { ...anchorToFormData(FULL), distance: "", title: "" };
    const back = anchorFromFormData(form);
    expect(back).not.toHaveProperty("distance");
    expect(validateAnchorConfig(back).distance).toBe("sensor.garnet_anchor_distance");
  });
});
