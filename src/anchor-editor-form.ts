/**
 * The anchor card editor's form (SPEC §9.8; TEST F-ACARD-11): Home Assistant `ha-form` schema
 * and the conversion between the YAML configuration and the form. Pure, no DOM.
 *
 * Only the switch is required; a cleared entity goes back to the one the card derives from
 * the switch's name.
 */

import type { Config } from "./editor-form";

const vigie = (domain: string) => ({ entity: { domain, integration: "vigie" } });

export const ANCHOR_SCHEMA = [
  { name: "switch", required: true, selector: vigie("switch") },
  { name: "distance", selector: vigie("sensor") },
  { name: "alarm", selector: vigie("binary_sensor") },
  { name: "radius", selector: vigie("number") },
  { name: "own", selector: vigie("device_tracker") },
  { name: "title", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "height", selector: { text: {} } },
      {
        name: "track_hours",
        selector: { number: { min: 0, max: 24, step: 1, mode: "box", unit_of_measurement: "h" } },
      },
    ],
  },
  { name: "tiles", selector: { text: {} } },
  { name: "overlay", selector: { text: {} } },
] as const;

export function anchorToFormData(config: Config): Config {
  const data: Config = { ...config };
  delete data.type;
  return data;
}

/** Only the keys the user set; a cleared field is dropped. Validated by the card's `setConfig`. */
export function anchorFromFormData(data: Config, type = "custom:vigie-anchor-card"): Config {
  const config: Config = { type };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === "") continue;
    config[key] = value;
  }
  return config;
}
