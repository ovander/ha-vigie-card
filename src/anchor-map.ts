/**
 * The anchor card's map (SPEC HA-SAIL-SPEC-001 §9.8): north-up, the swing circle filling it,
 * the anchor, and the own boat (faded at its last position while the position is lost).
 * Watch off: centred on the boat.
 */

import * as L from "leaflet";

import { swingBounds } from "./anchor-model";
import { addTiles, anchorIcon, ownDetails, ownIcon } from "./map";
import type { Anchor, OwnBoat } from "./model";
import type { PositionState } from "./own";
import { COLORS } from "./style";

export interface AnchorMapView {
  anchor: Anchor | null;
  /** The swing track since the drop (OD-36), oldest first. */
  track: [number, number][];
  /** A proposed new centre for the circle, drawn dashed until confirmed (OD-39). */
  preview?: { lat: number; lon: number; radius_m: number } | null;
  own: OwnBoat | null;
  lastOwn: OwnBoat | null;
  ownState: PositionState;
}

/** Zoom of the map while the watch is off: the boat and its surroundings. */
const OFF_ZOOM = 17;

export class AnchorMap {
  readonly map: L.Map;
  private readonly anchorLayer = L.layerGroup();
  private readonly trackLayer = L.layerGroup();
  private readonly previewLayer = L.layerGroup();
  private picking: ((lat: number, lon: number) => void) | null = null;
  private readonly ownLayer = L.layerGroup();
  private view: AnchorMapView = { anchor: null, track: [], own: null, lastOwn: null, ownState: { current: true, since: null } };
  /** What the view was last fitted to: refitted only when the anchor or radius changes. */
  private fittedTo: string | null = null;
  private ownOpen = false;
  private redrawing = false;

  constructor(
    container: HTMLElement,
    tiles: string,
    overlay: string | undefined,
    private readonly language: () => string | undefined,
  ) {
    this.map = L.map(container, { zoomControl: true, attributionControl: true, fadeAnimation: false });
    addTiles(this.map, tiles, overlay);
    this.anchorLayer.addTo(this.map);
    this.trackLayer.addTo(this.map);
    this.previewLayer.addTo(this.map);
    this.map.on("click", (e: L.LeafletMouseEvent) => this.picking?.(e.latlng.lat, e.latlng.lng));
    this.ownLayer.addTo(this.map);
    this.map.setView([0, 0], 2);
    this.map.on("popupopen", () => (this.ownOpen = true));
    this.map.on("popupclose", () => {
      if (!this.redrawing) this.ownOpen = false;
    });
  }

  update(view: AnchorMapView): void {
    this.view = view;
    this.drawAnchor();
    this.drawTrack();
    this.drawPreview();
    this.drawOwn();
    this.fit();
  }

  invalidateSize(): void {
    this.map.invalidateSize({ animate: false });
    this.fit();
  }

  remove(): void {
    this.map.remove();
  }

  /** Waits for a size: a fit on a 0 px map gives the widest zoom (E-08 pre-run). */
  private fit(): void {
    const size = this.map.getSize();
    if (size.x === 0 || size.y === 0) return;
    const { anchor } = this.view;
    const boat = this.view.own ?? this.view.lastOwn;
    if (anchor) {
      // The circle; and the boat when it is out of it, so a dragging boat stays in view
      // (E-09 pre-run: it was cut at the map's edge)
      const bounds = L.latLngBounds(swingBounds(anchor.lat, anchor.lon, anchor.radius_m));
      if (boat && !bounds.contains([boat.lat, boat.lon])) bounds.extend([boat.lat, boat.lon]);
      const key = bounds.toBBoxString();
      if (key === this.fittedTo) return;
      this.map.fitBounds(bounds, { animate: false, padding: [16, 16] });
      this.fittedTo = key;
    } else if (boat) {
      const zoom = this.fittedTo === "own" ? this.map.getZoom() : OFF_ZOOM;
      this.map.setView([boat.lat, boat.lon], zoom, { animate: false });
      this.fittedTo = "own";
    }
  }

  /** Points of the swing track drawn, for tests and diagnostics. */
  get trackLength(): number {
    return this.view.track.length;
  }

  /** While set, a tap on the map gives the point to `pick` (moving the anchor by hand). */
  setPicking(pick: ((lat: number, lon: number) => void) | null): void {
    this.picking = pick;
    this.map.getContainer().style.cursor = pick ? "crosshair" : "";
  }

  private drawPreview(): void {
    this.previewLayer.clearLayers();
    const p = this.view.preview;
    if (!p) return;
    this.previewLayer.addLayer(
      L.circle([p.lat, p.lon], {
        radius: p.radius_m,
        color: COLORS.anchor,
        weight: 2,
        dashArray: "6 6",
        fill: false,
        interactive: false,
        className: "vigie-anchor-preview",
      }),
    );
    this.previewLayer.addLayer(L.marker([p.lat, p.lon], { icon: anchorIcon(false), interactive: false, opacity: 0.6 }));
  }

  private drawTrack(): void {
    this.trackLayer.clearLayers();
    if (this.view.track.length < 2) return;
    this.trackLayer.addLayer(
      L.polyline(this.view.track, {
        color: COLORS.own,
        weight: 1.5,
        opacity: 0.6,
        interactive: false,
        className: "vigie-track",
      }),
    );
  }

  private drawAnchor(): void {
    this.anchorLayer.clearLayers();
    const anchor = this.view.anchor;
    if (!anchor) return;
    const color = anchor.alarm ? COLORS.anchorAlarm : COLORS.anchor;
    this.anchorLayer.addLayer(
      L.circle([anchor.lat, anchor.lon], {
        radius: anchor.radius_m,
        color,
        weight: anchor.alarm ? 3 : 2,
        fillOpacity: 0.08,
        interactive: false,
        className: anchor.alarm ? "vigie-anchor-circle vigie-anchor-alarm" : "vigie-anchor-circle",
      }),
    );
    this.anchorLayer.addLayer(L.marker([anchor.lat, anchor.lon], { icon: anchorIcon(anchor.alarm), interactive: false }));
  }

  private drawOwn(): void {
    this.redrawing = true;
    this.ownLayer.clearLayers();
    const own = this.view.own ?? this.view.lastOwn;
    if (own) {
      const lost = this.view.own === null;
      const marker = L.marker([own.lat, own.lon], { icon: ownIcon(own, lost), zIndexOffset: 1000, opacity: lost ? 0.4 : 1 });
      marker.bindPopup(() => ownDetails(this.language(), own, this.view.ownState), { className: "vigie-popup" });
      this.ownLayer.addLayer(marker);
      if (this.ownOpen) marker.openPopup();
    }
    this.redrawing = false;
  }
}
