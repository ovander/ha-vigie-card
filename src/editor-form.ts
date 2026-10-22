/**
 * The card editor's form (SPEC §9.7; TEST F-CARD-08): Home Assistant `ha-form` schema and the
 * conversion between the YAML configuration and the form. Pure, no DOM: unit-tested.
 *
 * The YAML keeps only what the user set; range rings are typed as "0.5, 1, 2".
 */

export type Config = Record<string, unknown>;

const vigie = (domain: string) => ({ entity: { domain, integration: "vigie" } });

/** The form, in Home Assistant's `ha-form` schema format. */
export const SCHEMA = [
  { name: "entity", required: true, selector: vigie("sensor") },
  { name: "own", required: true, selector: vigie("device_tracker") },
  { name: "collision_risk", selector: vigie("binary_sensor") },
  { name: "anchor", selector: vigie("sensor") },
  { name: "title", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "vector_minutes",
        selector: { number: { min: 1, max: 60, step: 1, mode: "box", unit_of_measurement: "min" } },
      },
      { name: "label_zoom", selector: { number: { min: 1, max: 19, step: 1, mode: "box" } } },
      { name: "rings_nm", selector: { text: {} } },
      { name: "height", selector: { text: {} } },
    ],
  },
  { name: "tiles", selector: { text: {} } },
  { name: "overlay", selector: { text: {} } },
] as const;

/** Every option a form edits (F-CARD-08, F-ACARD-11: all of them). */
export function schemaNames(schema: readonly unknown[] = SCHEMA): string[] {
  const names: string[] = [];
  const walk = (items: readonly { name: string; schema?: readonly unknown[] }[]) => {
    for (const item of items) {
      if (item.schema) walk(item.schema as never);
      else names.push(item.name);
    }
  };
  walk(schema as never);
  return names;
}

/** YAML configuration → form data (rings as text). */
export function toFormData(config: Config): Config {
  const data: Config = { ...config };
  delete data.type;
  if (Array.isArray(config.rings_nm)) data.rings_nm = config.rings_nm.join(", ");
  return data;
}

/**
 * Form data → YAML configuration: only the keys the user set, rings parsed back to a list
 * ("" is no ring at all). Not validated here: the card's `setConfig` names a wrong field.
 */
export function fromFormData(data: Config, type = "custom:vigie-traffic-card"): Config {
  const config: Config = { type };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (key === "rings_nm" && typeof value === "string") {
      const parts = value.split(/[,;\s]+/).filter((p) => p !== "");
      config.rings_nm = parts.map(Number); // decimal point: a comma separates rings
    } else if (value === "" && key !== "rings_nm") {
      continue; // a cleared optional field goes back to its default
    } else {
      config[key] = value;
    }
  }
  return config;
}

