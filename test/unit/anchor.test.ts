// U-ACARD-01…03, 05…08: the anchor card's logic (TEST HA-SAIL-TEST-001 §3.9), hand values
import { describe, expect, it } from "vitest";

import { ConfigError } from "../../src/config";
import { validateAnchorConfig } from "../../src/anchor-config";
import { gauge, radiusStep, statusOf, swingBounds, timeAtAnchor } from "../../src/anchor-model";
import { localize, STRINGS } from "../../src/i18n";
import type { HassState } from "../../src/model";

const on = (attributes: Record<string, unknown> = {}): HassState => ({ state: "on", attributes });
const off: HassState = { state: "off", attributes: {} };
const metres = (m: number): HassState => ({ state: String(m), attributes: {} });
const unavailable: HassState = { state: "unavailable", attributes: {} };

describe("U-ACARD-01 distance gauge", () => {
  it("fills to distance / radius: amber from 80 %, red outside", () => {
    expect(gauge(32, 50)).toEqual({ fraction: 0.64, level: "normal" });
    expect(gauge(41, 50)).toEqual({ fraction: 0.82, level: "amber" });
    expect(gauge(50, 50)).toEqual({ fraction: 1, level: "amber" }); // on the circle is inside
    expect(gauge(51, 50)).toEqual({ fraction: 1.02, level: "red" });
    expect(gauge(null, 50)).toEqual({ fraction: null, level: "none" });
  });
});

describe("U-ACARD-02 status", () => {
  it("never looks like Watching while the alarm is on or the position unknown", () => {
    expect(statusOf(off, off, unavailable)).toBe("off");
    expect(statusOf(on(), off, metres(32))).toBe("watching");
    expect(statusOf(on(), on({ reason: "drag" }), metres(55))).toBe("dragging");
    expect(statusOf(on(), on({ reason: "no_position" }), unavailable)).toBe("position_lost");
    expect(statusOf(on(), off, unavailable)).toBe("waiting");
    expect(statusOf(undefined, undefined, undefined)).toBe("off");
  });
});

describe("U-ACARD-03 radius step", () => {
  const limits = { min: 10, max: 500, step: 5 };
  it("moves by the step within the limits, disabled at a limit", () => {
    expect(radiusStep(50, limits, +1)).toBe(55);
    expect(radiusStep(50, limits, -1)).toBe(45);
    expect(radiusStep(497, limits, +1)).toBe(500);
    expect(radiusStep(500, limits, +1)).toBeNull();
    expect(radiusStep(10, limits, -1)).toBeNull();
  });
});

describe("U-ACARD-05 map bounds", () => {
  it("is the anchor ± the radius (spherical geometry of U-CARD-01)", () => {
    const [[south, west], [north, east]] = swingBounds(43.5, 7.25, 50);
    expect(north - 43.5).toBeCloseTo(0.000449964, 8);
    expect(43.5 - south).toBeCloseTo(0.000449964, 8);
    expect(east - 7.25).toBeCloseTo(0.00062032, 8);
    expect(7.25 - west).toBeCloseTo(0.00062032, 8);
  });
});

describe("U-ACARD-06 configuration", () => {
  it("needs the switch", () => {
    expect(() => validateAnchorConfig({})).toThrow(ConfigError);
    expect(() => validateAnchorConfig({})).toThrow(/^switch:/);
  });

  it("derives the other entities from the switch's boat name", () => {
    const c = validateAnchorConfig({ switch: "switch.garnet_anchor_watch" });
    expect(c.distance).toBe("sensor.garnet_anchor_distance");
    expect(c.alarm).toBe("binary_sensor.garnet_anchor_alarm");
    expect(c.radius).toBe("number.garnet_anchor_radius");
    expect(c.own).toBe("device_tracker.garnet");
    expect(c.track_hours).toBe(6);
  });

  it("names the first missing entity when it cannot derive them", () => {
    expect(() => validateAnchorConfig({ switch: "switch.watch" })).toThrow(/^distance:/);
    expect(() =>
      validateAnchorConfig({ switch: "switch.watch", distance: "sensor.d", alarm: "binary_sensor.a" }),
    ).toThrow(/^radius:/);
  });

  it("refuses a negative track length", () => {
    expect(() =>
      validateAnchorConfig({ switch: "switch.garnet_anchor_watch", track_hours: -1 }),
    ).toThrow(/^track_hours:/);
    expect(validateAnchorConfig({ switch: "switch.garnet_anchor_watch", track_hours: 0 }).track_hours).toBe(0);
  });
});

describe("U-ACARD-07 time at anchor", () => {
  const armed = new Date("2026-10-22T10:00:00Z");
  const later = (s: number) => new Date(armed.getTime() + s * 1000);
  it("in hours and minutes", () => {
    expect(timeAtAnchor(armed, later(59))).toBe("< 1 min");
    expect(timeAtAnchor(armed, later(45 * 60))).toBe("45 min");
    expect(timeAtAnchor(armed, later(2 * 3600 + 5 * 60))).toBe("2 h 05");
    expect(timeAtAnchor(armed, later(26 * 3600))).toBe("26 h 00");
  });
});

describe("U-ACARD-08 translations", () => {
  it("has every anchor card string in English and French", () => {
    const keys = Object.keys(STRINGS.en).filter((k) => k.startsWith("anchor_card."));
    expect(keys.length).toBeGreaterThan(10);
    for (const key of keys) {
      expect(STRINGS.fr[key as keyof typeof STRINGS.fr], key).toBeTruthy();
    }
    for (const status of ["off", "watching", "waiting", "dragging", "position_lost"]) {
      expect(localize("fr", `anchor_card.${status}` as keyof typeof STRINGS.en)).not.toContain("anchor_card.");
    }
  });
});
