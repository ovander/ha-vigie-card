/**
 * Where the anchor is, from the swing track (SPEC HA-SAIL-SPEC-001 §9.8, OD-39 option A;
 * TEST U-ACARD-09). Pure, no DOM.
 *
 * At anchor the boat swings on a circle around the anchor (chain plus boat length), so the
 * centre of the circle that best fits the track is the anchor. Least-squares circle fit
 * (Kåsa: x² + y² + Dx + Ey + F = 0, linear in D, E, F) on a local plane in metres, good to
 * centimetres over a few hundred metres. A fit is only offered when the track is long
 * enough to trust it; otherwise the card offers to place the anchor by hand (option B).
 */

import { METRES_PER_NM, NM_PER_DEG_LAT } from "./geo";
import type { TrackPoint } from "./anchor-model";

/** Below these the fitted centre is not trusted (OD-39). */
export const MIN_MINUTES = 10;
export const MIN_POINTS = 20;
export const MIN_ARC_DEG = 90;
const MIN_RADIUS_M = 3;

export type FitResult =
  | { ok: true; lat: number; lon: number; radiusM: number; arcDeg: number }
  | { ok: false; reason: "too_soon" | "too_few" | "small_arc" | "implausible" };

const M_PER_DEG = NM_PER_DEG_LAT * METRES_PER_NM;

/** Solves the 3 × 3 system a·x = b (Cramer); null when singular. */
function solve3(a: number[][], b: number[]): number[] | null {
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(a);
  if (Math.abs(d) < 1e-9) return null;
  return [0, 1, 2].map((col) => det(a.map((row, i) => row.map((v, j) => (j === col ? b[i] : v)))) / d);
}

/** The part of a turn the points cover around (cx, cy), degrees: 360 minus the largest gap. */
function arcCovered(points: [number, number][], cx: number, cy: number): number {
  const angles = points.map(([x, y]) => (Math.atan2(y - cy, x - cx) * 180) / Math.PI).sort((a, b) => a - b);
  let gap = 360 - (angles[angles.length - 1] - angles[0]);
  for (let i = 1; i < angles.length; i++) gap = Math.max(gap, angles[i] - angles[i - 1]);
  return 360 - gap;
}

/**
 * The anchor from the track since the drop: refused before `MIN_MINUTES` at anchor, with
 * fewer than `MIN_POINTS`, over less than `MIN_ARC_DEG` of the circle, or when the fitted
 * swing circle is wider than the watch's radius (the boat could not have swung there).
 */
export function fitAnchor(track: TrackPoint[], armedAt: Date, now: Date, watchRadiusM: number): FitResult {
  if (now.getTime() - armedAt.getTime() < MIN_MINUTES * 60_000) return { ok: false, reason: "too_soon" };
  if (track.length < MIN_POINTS) return { ok: false, reason: "too_few" };
  const lat0 = track.reduce((s, p) => s + p.lat, 0) / track.length;
  const lon0 = track.reduce((s, p) => s + p.lon, 0) / track.length;
  const cos = Math.cos((lat0 * Math.PI) / 180);
  const xy = track.map((p): [number, number] => [(p.lon - lon0) * M_PER_DEG * cos, (p.lat - lat0) * M_PER_DEG]);
  // Normal equations of Σ (x² + y² + Dx + Ey + F)² → min
  const s = { xx: 0, xy: 0, yy: 0, x: 0, y: 0, n: xy.length, xz: 0, yz: 0, z: 0 };
  for (const [x, y] of xy) {
    const z = x * x + y * y;
    s.xx += x * x; s.xy += x * y; s.yy += y * y; s.x += x; s.y += y;
    s.xz += x * z; s.yz += y * z; s.z += z;
  }
  const sol = solve3(
    [[s.xx, s.xy, s.x], [s.xy, s.yy, s.y], [s.x, s.y, s.n]],
    [-s.xz, -s.yz, -s.z],
  );
  if (!sol) return { ok: false, reason: "small_arc" }; // all points on a line
  const [D, E, F] = sol;
  const cx = -D / 2;
  const cy = -E / 2;
  const radiusM = Math.sqrt(Math.max(cx * cx + cy * cy - F, 0));
  const arcDeg = arcCovered(xy, cx, cy);
  if (arcDeg < MIN_ARC_DEG) return { ok: false, reason: "small_arc" };
  if (radiusM < MIN_RADIUS_M || radiusM > watchRadiusM) return { ok: false, reason: "implausible" };
  return { ok: true, lat: lat0 + cy / M_PER_DEG, lon: lon0 + cx / (M_PER_DEG * cos), radiusM, arcDeg };
}

/** Metres between two nearby points (local plane). */
export function metresBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const cos = Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return Math.hypot((lat2 - lat1) * M_PER_DEG, (lon2 - lon1) * M_PER_DEG * cos);
}
