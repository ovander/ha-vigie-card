// U-ACARD-09: where the anchor is, from the swing track (TEST §3.9, SPEC §9.8, OD-39)
import { describe, expect, it } from "vitest";

import { fitAnchor } from "../../src/anchor-fit";
import { displace, METRES_PER_NM } from "../../src/geo";

const LAT0 = 43.5;
const LON0 = 7.25;
const ARMED = Date.parse("2026-10-22T10:00:00Z");
const NOW = ARMED + 15 * 60_000;

/** A point `d` m from (LAT0, LON0) on a bearing, with the card's own geometry. */
function at(bearing: number, d: number, t = ARMED + 60_000) {
  const b = (bearing * Math.PI) / 180;
  const [lat, lon] = displace(LAT0, LON0, (d * Math.sin(b)) / METRES_PER_NM, (d * Math.cos(b)) / METRES_PER_NM);
  return { t, lat, lon };
}
const arc = (from: number, to: number, d = 30, step = 5) =>
  Array.from({ length: (to - from) / step + 1 }, (_, i) => at(from + i * step, d));
const metresBetween = (a: { lat: number; lon: number }, lat: number, lon: number) => {
  const dn = (a.lat - lat) * 60 * METRES_PER_NM;
  const de = (a.lon - lon) * 60 * METRES_PER_NM * Math.cos((lat * Math.PI) / 180);
  return Math.hypot(dn, de);
};

describe("U-ACARD-09 anchor from the swing", () => {
  it("finds the centre of a 120° arc of a 30 m circle", () => {
    const fit = fitAnchor(arc(0, 120), new Date(ARMED), new Date(NOW), 50);
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    expect(metresBetween(fit, LAT0, LON0)).toBeLessThan(0.01);
    expect(fit.radiusM).toBeCloseTo(30, 2);
    expect(fit.arcDeg).toBeCloseTo(120, 0);
  });

  it("stays within 3 m with ±3 m of noise over half a turn", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const noisy = arc(0, 180, 30, 2).map((p) => ({ ...p, lat: p.lat + (rand() * 3) / (60 * METRES_PER_NM), lon: p.lon + (rand() * 3) / (60 * METRES_PER_NM * Math.cos((LAT0 * Math.PI) / 180)) }));
    const fit = fitAnchor(noisy, new Date(ARMED), new Date(NOW), 50);
    expect(fit.ok && metresBetween(fit, LAT0, LON0)).toBeLessThan(3);
  });

  it("refuses too soon, too few points, too small an arc, or a circle wider than the watch", () => {
    expect(fitAnchor(arc(0, 120), new Date(ARMED), new Date(ARMED + 9 * 60_000), 50)).toMatchObject({ ok: false, reason: "too_soon" });
    expect(fitAnchor(arc(0, 40, 30, 5), new Date(ARMED), new Date(NOW), 50)).toMatchObject({ ok: false, reason: "too_few" });
    expect(fitAnchor(arc(0, 60, 30, 2), new Date(ARMED), new Date(NOW), 50)).toMatchObject({ ok: false, reason: "small_arc" });
    expect(fitAnchor(arc(0, 120, 80), new Date(ARMED), new Date(NOW), 50)).toMatchObject({ ok: false, reason: "implausible" });
  });
});
