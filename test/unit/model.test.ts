// Reading Vigie's states (SPEC §9.7, OD-31), against states recorded from Vigie
import { describe, expect, it } from "vitest";

import { anchorEntities, anchorOf, ownBoat, targetRows } from "../../src/model";
import multiTarget from "../fixtures/multi-target.json";
import namedTraffic from "../fixtures/named-traffic.json";

describe("targets rows", () => {
  it("reads every row Vigie recorded, with heading and threat", () => {
    const rows = targetRows(multiTarget["sensor.garnet_ais_targets"]);
    expect(rows).toHaveLength(4);
    expect(rows.filter((r) => r.threat).map((r) => r.mmsi).sort()).toEqual([235000001, 235000002]);
    expect(rows.every((r) => "heading" in r)).toBe(true);
    const named = targetRows(namedTraffic["sensor.garnet_ais_targets"]).map((r) => r.name);
    expect(named).toContain("CARGO ONE");
  });

  it("skips rows without a position and unavailable sensors", () => {
    const sensor = {
      state: "2",
      attributes: { targets: [{ mmsi: 1, lat: null, lon: 2 }, { mmsi: 2, lat: 1, lon: 2 }, "x"] },
    };
    expect(targetRows(sensor).map((r) => r.mmsi)).toEqual([2]);
    expect(targetRows({ state: "unavailable", attributes: {} })).toEqual([]);
    expect(targetRows(undefined)).toEqual([]);
  });
});

describe("own boat and anchor", () => {
  it("own boat from the tracker; none when unavailable", () => {
    expect(ownBoat(multiTarget["device_tracker.garnet"])).toMatchObject({ sog: 6, cog: 0 });
    expect(ownBoat({ state: "unavailable", attributes: {} })).toBeNull();
  });

  it("anchor from the distance sensor, else from the switch while armed", () => {
    expect(anchorEntities("sensor.garnet_anchor_distance")).toEqual({
      watch: "switch.garnet_anchor_watch",
      alarm: "binary_sensor.garnet_anchor_alarm",
    });
    expect(anchorEntities("sensor.other")).toBeNull();
    const distance = multiTarget["sensor.garnet_anchor_distance"];
    expect(anchorOf(distance)).toEqual({ lat: 43.5, lon: 7.25, radius_m: 500, alarm: false });
    const watch = {
      state: "on",
      attributes: { anchor_latitude: 43.5, anchor_longitude: 7.25, radius_m: 50 },
    };
    const alarm = { state: "on", attributes: { reason: "no_position" } };
    expect(anchorOf({ state: "unavailable", attributes: {} }, watch, alarm)).toEqual({
      lat: 43.5,
      lon: 7.25,
      radius_m: 50,
      alarm: true,
    });
    expect(anchorOf(undefined, { state: "off", attributes: {} })).toBeNull();
  });
});
