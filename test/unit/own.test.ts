// U-CARD-08: the own boat's position in degrees and minutes (TEST HA-SAIL-TEST-001 §3.8, #77)
import { describe, expect, it } from "vitest";

import { formatDecimal, formatPosition, positionState } from "../../src/own";

describe("U-CARD-08 position in degrees and minutes", () => {
  it("formats north/east and south/west, in the user's locale", () => {
    expect(formatPosition("en", 43.5, 7.25)).toEqual(["43° 30.000′ N", "7° 15.000′ E"]);
    expect(formatPosition("fr", 43.5, 7.25)).toEqual(["43° 30,000′ N", "7° 15,000′ E"]);
    expect(formatPosition("en", -33.856, -151.2153)).toEqual(["33° 51.360′ S", "151° 12.918′ W"]);
    expect(formatPosition("en", 43.50049833, 7.25)[0]).toBe("43° 30.030′ N");
  });

  it("carries rounded minutes into the degrees, never 60′", () => {
    expect(formatPosition("en", 43.9999999, 0)).toEqual(["44° 00.000′ N", "0° 00.000′ E"]);
  });
});

describe("U-CARD-08 position in decimal degrees", () => {
  it("signed, point and six decimals, whatever the language: pastes into charting apps", () => {
    expect(formatDecimal(43.501916666666666, 7.25)).toBe("43.501917, 7.250000");
    expect(formatDecimal(-33.856, -151.2153)).toBe("-33.856000, -151.215300");
    expect(formatDecimal(0, -0.0000001)).toBe("0.000000, 0.000000"); // never "-0.000000"
  });
});

describe("position state (SPEC §9.7, #77)", () => {
  it("is current while the tracker is available, else lost since its last change", () => {
    const tracker = { state: "not_home", attributes: { latitude: 43.5, longitude: 7.25 } };
    expect(positionState(tracker)).toEqual({ current: true, since: null });
    const lost = { state: "unavailable", attributes: {}, last_changed: "2026-10-22T14:05:00+00:00" };
    expect(positionState(lost)).toEqual({ current: false, since: new Date("2026-10-22T14:05:00Z") });
    expect(positionState(undefined)).toEqual({ current: false, since: null });
    expect(positionState({ state: "unavailable", attributes: {}, last_changed: "nonsense" })).toEqual({
      current: false,
      since: null,
    });
  });
});
