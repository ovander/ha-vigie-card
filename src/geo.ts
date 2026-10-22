/**
 * Local flat-earth geometry, the same approximation as Vigie's traffic logic (SPEC §8.1):
 * adequate for the few nautical miles a vector or a CPA spans. TEST U-CARD-01, U-CARD-02.
 */

import type { TargetRow } from "./model";

export const NM_PER_DEG_LAT = 60;
export const METRES_PER_NM = 1852;

export type LatLon = [number, number];

/** The point `eastNm`, `northNm` away from (lat, lon). */
export function displace(lat: number, lon: number, eastNm: number, northNm: number): LatLon {
  const newLat = lat + northNm / NM_PER_DEG_LAT;
  const newLon = lon + eastNm / (NM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return [newLat, ((newLon + 540) % 360) - 180];
}

/** Where a vessel at `sogKn` on `cogDeg` is after `minutes`. */
export function vectorEnd(
  lat: number,
  lon: number,
  sogKn: number,
  cogDeg: number,
  minutes: number,
): LatLon {
  const distance = (sogKn * minutes) / 60;
  const course = (cogDeg * Math.PI) / 180;
  return displace(lat, lon, distance * Math.sin(course), distance * Math.cos(course));
}

/**
 * The target's position at its closest point of approach (TCPA ahead along its course),
 * for threats; `null` without motion or a future TCPA.
 */
export function cpaPoint(row: TargetRow): LatLon | null {
  if (!row.threat || row.tcpa_min === null || row.tcpa_min < 0) return null;
  if (row.sog === null || row.cog === null) return null;
  return vectorEnd(row.lat, row.lon, row.sog, row.cog, row.tcpa_min);
}
