// U-CARD-03…05: symbol, style, label (TEST HA-SAIL-TEST-001 §3.8)
import { describe, expect, it } from "vitest";

import type { TargetRow } from "../../src/model";
import { COLORS, hasVector, labelFor, showLabel, styleFor, symbolFor } from "../../src/style";

function row(over: Partial<TargetRow>): TargetRow {
  return {
    mmsi: 235000001,
    name: null,
    class: "A",
    lat: 0,
    lon: 0,
    sog: 6,
    cog: 90,
    heading: null,
    distance_nm: 1,
    age_s: 10,
    cpa_nm: null,
    tcpa_min: null,
    ship_type: null,
    length_m: null,
    threat: false,
    ...over,
  };
}

describe("U-CARD-03 symbol", () => {
  it("heading first, then COG, else a circle; a circle when slower than 0.5 kn", () => {
    expect(symbolFor(row({ heading: 85, cog: 90 }))).toEqual({ shape: "triangle", rotation: 85 });
    expect(symbolFor(row({ heading: null, cog: 90 }))).toEqual({ shape: "triangle", rotation: 90 });
    expect(symbolFor(row({ heading: null, cog: null }))).toEqual({ shape: "circle", rotation: null });
    expect(symbolFor(row({ sog: 0.3, heading: 85 }))).toEqual({ shape: "circle", rotation: null });
  });

  it("vectors only when moving with a course", () => {
    expect(hasVector(row({}))).toBe(true);
    expect(hasVector(row({ sog: 0.3 }))).toBe(false);
    expect(hasVector(row({ cog: null }))).toBe(false);
    expect(hasVector(row({ sog: null }))).toBe(false);
  });
});

describe("U-CARD-04 style", () => {
  it("threat red, Class A dark, Class B lighter, stale faded", () => {
    expect(styleFor(row({ threat: true }))).toMatchObject({ color: COLORS.threat, kind: "threat" });
    expect(styleFor(row({ class: "A" }))).toMatchObject({ color: COLORS.classA, opacity: 1 });
    expect(styleFor(row({ class: "B" }))).toMatchObject({ color: COLORS.classB, kind: "class-b" });
    expect(styleFor(row({ age_s: 200 }))).toMatchObject({ opacity: 0.4, stale: true });
    expect(styleFor(row({ age_s: 180 })).stale).toBe(false);
    expect(styleFor(row({ threat: true, class: "B", age_s: 200 }))).toMatchObject({
      color: COLORS.threat,
      stale: true,
    });
  });
});

describe("U-CARD-05 label", () => {
  it("name, else MMSI", () => {
    expect(labelFor(row({ name: "CARGO ONE" }))).toBe("CARGO ONE");
    expect(labelFor(row({ name: null }))).toBe("235000001");
  });

  it("threats always labelled, others from the configured zoom", () => {
    expect(showLabel(row({ threat: true }), 8, 13)).toBe(true);
    expect(showLabel(row({}), 12, 13)).toBe(false);
    expect(showLabel(row({}), 13, 13)).toBe(true);
  });
});
