// U-CARD-01, U-CARD-02: vectors and CPA points (TEST HA-SAIL-TEST-001 §3.8), hand values
import { describe, expect, it } from "vitest";

import { cpaPoint, displace, vectorEnd } from "../../src/geo";
import type { TargetRow } from "../../src/model";

const LAT0 = 43.5;
const LON0 = 7.25;

function row(over: Partial<TargetRow>): TargetRow {
  return {
    mmsi: 235000001,
    name: null,
    class: "A",
    lat: LAT0,
    lon: LON0,
    sog: null,
    cog: null,
    heading: null,
    distance_nm: null,
    age_s: 0,
    cpa_nm: null,
    tcpa_min: null,
    ship_type: null,
    length_m: null,
    threat: false,
    ...over,
  };
}

describe("U-CARD-01 vector end point", () => {
  it("6 kn on 090° for 6 min is 0.6 NM east", () => {
    const [lat, lon] = vectorEnd(LAT0, LON0, 6, 90, 6);
    expect(lat).toBeCloseTo(LAT0, 9);
    expect(lon - LON0).toBeCloseTo(0.013786, 6); // 0.6 / (60 · cos 43.5°)
  });

  it("north is latitude only; 1 NM is 1/60°", () => {
    const [lat, lon] = vectorEnd(LAT0, LON0, 10, 0, 6);
    expect(lat - LAT0).toBeCloseTo(1 / 60, 12);
    expect(lon).toBeCloseTo(LON0, 12);
  });

  it("wraps longitude across 180°", () => {
    expect(displace(0, 179.99, 1, 0)[1]).toBeCloseTo(-179.99333, 5);
  });
});

describe("U-CARD-02 CPA point", () => {
  it("U-TRF-01 head-on: target 2 NM north, 6 kn on 180°, TCPA 10.0 min → 1 NM north", () => {
    const [lat, lon] = displace(LAT0, LON0, 0, 2);
    const point = cpaPoint(
      row({ lat, lon, sog: 6, cog: 180, threat: true, cpa_nm: 0, tcpa_min: 10 }),
    );
    expect(point).not.toBeNull();
    expect(point![0]).toBeCloseTo(LAT0 + 1 / 60, 9);
    expect(point![1]).toBeCloseTo(LON0, 9);
  });

  it("none for a non-threat, a past TCPA or no motion", () => {
    const base = { sog: 6, cog: 180, tcpa_min: 10 };
    expect(cpaPoint(row({ ...base, threat: false }))).toBeNull();
    expect(cpaPoint(row({ ...base, threat: true, tcpa_min: -1 }))).toBeNull();
    expect(cpaPoint(row({ ...base, threat: true, tcpa_min: null }))).toBeNull();
    expect(cpaPoint(row({ ...base, threat: true, cog: null }))).toBeNull();
  });
});
