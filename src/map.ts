/**
 * The Leaflet map inside the card (SPEC HA-SAIL-SPEC-001 §9.7 drawing rules).
 *
 * One map per card, created once; each update redraws the layers from the current states
 * (at most 50 targets every few seconds), keeping the view, the follow mode and an open
 * details popup. AIS names are untrusted text: they only ever reach the page as
 * `textContent`, never as HTML.
 */

import * as L from "leaflet";

import type { VigieTrafficCardConfig } from "./config";
import { cpaPoint, type LatLon, METRES_PER_NM, vectorEnd } from "./geo";
import { formatNumber, localize, shipType } from "./i18n";
import type { Anchor, OwnBoat, TargetRow } from "./model";
import { ownLines, type PositionState, positionStateText } from "./own";
import { COLORS, hasVector, labelFor, showLabel, styleFor, symbolFor } from "./style";

export interface MapView {
  own: OwnBoat | null;
  /** The last own position the card saw, drawn faded while the position is lost (#77). */
  lastOwn?: OwnBoat | null;
  ownState?: PositionState;
  targets: TargetRow[];
  anchor: Anchor | null;
}

const ICON = 22;

// Home Assistant's page sets the referrer policy to same-origin, so tile requests would
// leave without a Referer and OpenStreetMap's tile servers refuse those (tile usage
// policy). Send the page's origin only, never its path.
const TILE_REFERRER_POLICY = "strict-origin-when-cross-origin";

function svg(body: string, rotation: number | null): string {
  const turn = rotation === null ? "" : ` style="transform: rotate(${rotation}deg)"`;
  return `<svg viewBox="-11 -11 22 22" width="${ICON}" height="${ICON}"${turn}>${body}</svg>`;
}

function targetIcon(row: TargetRow): L.DivIcon {
  const style = styleFor(row);
  const symbol = symbolFor(row);
  const paint = `fill="${style.color}" fill-opacity="${style.opacity}" stroke="#fff" stroke-width="1.2"`;
  const body =
    symbol.shape === "triangle"
      ? `<path d="M0,-9 L6.5,8 L0,4.5 L-6.5,8 Z" ${paint}/>`
      : `<circle r="5" ${paint}/>`;
  const classes = ["vigie-target", `vigie-${style.kind}`, `vigie-${symbol.shape}`];
  if (style.stale) classes.push("vigie-stale");
  return L.divIcon({
    className: classes.join(" "),
    html: svg(body, symbol.rotation),
    iconSize: [ICON, ICON],
    iconAnchor: [ICON / 2, ICON / 2],
  });
}

function ownIcon(own: OwnBoat, lost = false): L.DivIcon {
  const symbol = symbolFor(own);
  const body =
    symbol.shape === "triangle"
      ? `<path d="M0,-10 C4,-5 5,2 4,9 L-4,9 C-5,2 -4,-5 0,-10 Z" fill="${COLORS.own}" stroke="#fff" stroke-width="1.5"/>`
      : `<circle r="6" fill="${COLORS.own}" stroke="#fff" stroke-width="1.5"/>`;
  return L.divIcon({
    className: lost ? "vigie-own-lost" : "vigie-own",
    html: svg(body, symbol.rotation),
    iconSize: [ICON, ICON],
    iconAnchor: [ICON / 2, ICON / 2],
  });
}

function anchorIcon(alarm: boolean): L.DivIcon {
  const color = alarm ? COLORS.anchorAlarm : COLORS.anchor;
  const body =
    `<g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round">` +
    `<circle cy="-7" r="2.2"/><path d="M0,-4.8 V8 M-4,-2 H4 M-7,2 C-6,7 -3,8 0,8 C3,8 6,7 7,2"/></g>`;
  return L.divIcon({
    className: alarm ? "vigie-anchor vigie-anchor-alarm" : "vigie-anchor",
    html: svg(body, null),
    iconSize: [ICON, ICON],
    iconAnchor: [ICON / 2, ICON / 2],
  });
}

export class TrafficMap {
  readonly map: L.Map;
  private readonly own = L.layerGroup();
  private readonly targets = L.layerGroup();
  private readonly rings = L.layerGroup();
  private readonly anchor = L.layerGroup();
  private view: MapView = { own: null, targets: [], anchor: null };
  private fitted = false;
  private followOwn = true;
  private openMmsi: number | null = null;
  private ownOpen = false;
  private redrawing = false;

  constructor(
    container: HTMLElement,
    private readonly config: VigieTrafficCardConfig,
    private readonly language: () => string | undefined,
    private readonly onFollowChange: (follow: boolean) => void = () => {},
  ) {
    // No fade: the layers are redrawn at every update, and fading labels would flicker
    // (closed tooltips otherwise linger 200 ms next to their replacements)
    this.map = L.map(container, { zoomControl: true, attributionControl: true, fadeAnimation: false });
    L.tileLayer(config.tiles, {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
      referrerPolicy: TILE_REFERRER_POLICY,
    }).addTo(this.map);
    if (config.overlay) {
      L.tileLayer(config.overlay, { maxZoom: 19, referrerPolicy: TILE_REFERRER_POLICY }).addTo(
        this.map,
      );
    }
    for (const layer of [this.rings, this.anchor, this.targets, this.own]) layer.addTo(this.map);
    this.map.setView([0, 0], 2);
    this.map.on("dragstart", () => this.setFollow(false));
    this.map.on("zoomend", () => this.drawTargets()); // labels depend on the zoom
    this.map.on("popupopen", (e: L.PopupEvent) => {
      const options = e.popup.options as { mmsi?: number; own?: boolean };
      if (options.mmsi !== undefined) this.openMmsi = options.mmsi;
      if (options.own) this.ownOpen = true;
    });
    this.map.on("popupclose", () => {
      if (this.redrawing) return;
      this.openMmsi = null;
      this.ownOpen = false;
      if (this.followOwn) this.center();
    });
  }

  get follow(): boolean {
    return this.followOwn;
  }

  setFollow(follow: boolean): void {
    if (follow === this.followOwn) return;
    this.followOwn = follow;
    this.onFollowChange(follow);
    if (follow) this.center();
  }

  update(view: MapView): void {
    this.view = view;
    this.drawOwn();
    this.drawRings();
    this.drawAnchor();
    this.drawTargets();
    if (!this.fitted) this.fit();
    else if (this.followOwn) this.center();
  }

  invalidateSize(): void {
    this.map.invalidateSize({ animate: false });
    if (!this.fitted) this.fit();
    else if (this.followOwn) this.center();
  }

  remove(): void {
    this.map.remove();
  }

  /**
   * The first view: the outer range ring around the own boat, else every target. Waits
   * until the map has a size: Home Assistant lays a card out after its first states, and
   * a fit on a 0 px map gives the widest zoom (found in the E-08 pre-run).
   */
  private fit(): void {
    const size = this.map.getSize();
    if (size.x === 0 || size.y === 0) return;
    const { own, targets } = this.view;
    if (own) {
      const radius = Math.max(...this.config.rings_nm, 1) * METRES_PER_NM;
      this.map.fitBounds(L.latLng(own.lat, own.lon).toBounds(2 * radius), { animate: false });
      this.fitted = true;
    } else if (targets.length) {
      this.map.fitBounds(L.latLngBounds(targets.map((t) => [t.lat, t.lon])), {
        animate: false,
        padding: [20, 20],
        maxZoom: 14,
      });
      this.fitted = true;
    }
  }

  /** Follow the own boat, except while a details popup is open (it would be pushed off view). */
  private center(): void {
    if (this.openMmsi !== null) return;
    const own = this.view.own;
    if (own) this.map.panTo([own.lat, own.lon], { animate: false });
  }

  private vector(from: LatLon, sog: number, cog: number, color: string, opacity: number) {
    const to = vectorEnd(from[0], from[1], sog, cog, this.config.vector_minutes);
    return L.polyline([from, to], { color, weight: 2, opacity, interactive: false, className: "vigie-vector" });
  }

  /** The own boat, tappable for its details (#77); faded where it was while its position is lost. */
  private drawOwn(): void {
    this.redrawing = true;
    this.own.clearLayers();
    const own = this.view.own ?? this.view.lastOwn ?? null;
    const lost = this.view.own === null && own !== null;
    if (own) {
      const at: LatLon = [own.lat, own.lon];
      if (!lost && hasVector(own)) {
        this.own.addLayer(this.vector(at, own.sog!, own.cog!, COLORS.own, 1));
      }
      const marker = L.marker(at, { icon: ownIcon(own, lost), zIndexOffset: 1000, opacity: lost ? 0.4 : 1 });
      marker.bindPopup(() => this.ownDetails(own), { own: true, className: "vigie-popup" } as L.PopupOptions);
      this.own.addLayer(marker);
      if (this.ownOpen) marker.openPopup();
    } else {
      this.ownOpen = false;
    }
    this.redrawing = false;
  }

  /** The own boat's details: position, SOG, COG, heading, position state; textContent only. */
  ownDetails(own: OwnBoat): HTMLElement {
    const lang = this.language();
    const box = document.createElement("div");
    box.className = "vigie-details vigie-details-own";
    const title = document.createElement("strong");
    title.textContent = localize(lang, "own_boat");
    box.appendChild(title);
    const table = document.createElement("table");
    for (const [label, value] of ownLines(lang, own)) {
      const tr = table.insertRow();
      tr.insertCell().textContent = label;
      tr.insertCell().textContent = value;
    }
    box.appendChild(table);
    const state = document.createElement("div");
    state.className = "vigie-details-position";
    state.textContent = positionStateText(lang, this.view.ownState ?? { current: true, since: null });
    box.appendChild(state);
    return box;
  }

  private drawRings(): void {
    this.rings.clearLayers();
    const own = this.view.own;
    if (!own) return;
    for (const nm of this.config.rings_nm) {
      this.rings.addLayer(
        L.circle([own.lat, own.lon], {
          radius: nm * METRES_PER_NM,
          color: COLORS.ring,
          weight: 1,
          opacity: 0.5,
          dashArray: "2 6",
          fill: false,
          interactive: false,
          className: "vigie-ring",
        }),
      );
    }
  }

  private drawAnchor(): void {
    this.anchor.clearLayers();
    const anchor = this.view.anchor;
    if (!anchor) return;
    const color = anchor.alarm ? COLORS.anchorAlarm : COLORS.anchor;
    this.anchor.addLayer(
      L.circle([anchor.lat, anchor.lon], {
        radius: anchor.radius_m,
        color,
        weight: anchor.alarm ? 3 : 1.5,
        fillOpacity: 0.06,
        interactive: false,
        className: anchor.alarm ? "vigie-anchor-circle vigie-anchor-alarm" : "vigie-anchor-circle",
      }),
    );
    const tip = document.createElement("span");
    tip.textContent = anchor.alarm
      ? localize(this.language(), "anchor_alarm")
      : localize(this.language(), "anchor", { radius: Math.round(anchor.radius_m) });
    this.anchor.addLayer(
      L.marker([anchor.lat, anchor.lon], { icon: anchorIcon(anchor.alarm) }).bindTooltip(tip),
    );
  }

  private drawTargets(): void {
    this.redrawing = true;
    this.targets.clearLayers();
    const zoom = this.map.getZoom();
    const lang = this.language();
    let reopen: L.Marker | null = null;
    for (const row of this.view.targets) {
      const at: LatLon = [row.lat, row.lon];
      const style = styleFor(row);
      if (hasVector(row)) {
        this.targets.addLayer(this.vector(at, row.sog!, row.cog!, style.color, style.opacity));
      }
      const cpa = cpaPoint(row);
      if (cpa) {
        this.targets.addLayer(
          L.polyline([at, cpa], {
            color: COLORS.threat,
            weight: 1.5,
            dashArray: "4 4",
            interactive: false,
            className: "vigie-cpa",
          }),
        );
        this.targets.addLayer(
          L.circleMarker(cpa, {
            radius: 4,
            color: COLORS.threat,
            fillOpacity: 0.8,
            interactive: false,
            className: "vigie-cpa-point",
          }),
        );
      }
      const marker = L.marker(at, { icon: targetIcon(row), riseOnHover: true, zIndexOffset: row.threat ? 500 : 0 });
      if (showLabel(row, zoom, this.config.label_zoom)) {
        const label = document.createElement("span");
        label.textContent =
          row.threat && row.cpa_nm !== null && row.tcpa_min !== null
            ? localize(lang, "threat_label", {
                name: labelFor(row),
                cpa: formatNumber(lang, row.cpa_nm, 2),
                tcpa: formatNumber(lang, row.tcpa_min, 1),
              })
            : labelFor(row);
        marker.bindTooltip(label, {
          permanent: true,
          direction: "right",
          offset: [10, 0],
          className: row.threat ? "vigie-label vigie-label-threat" : "vigie-label",
        });
      }
      const popupOptions = { mmsi: row.mmsi, className: "vigie-popup" } as L.PopupOptions;
      marker.bindPopup(() => this.details(row), popupOptions);
      this.targets.addLayer(marker);
      if (row.mmsi === this.openMmsi) reopen = marker;
    }
    if (reopen) reopen.openPopup();
    else this.openMmsi = null;
    this.redrawing = false;
  }

  /** The details shown when a target is tapped; built with textContent only. */
  details(row: TargetRow): HTMLElement {
    const lang = this.language();
    const t = (key: Parameters<typeof localize>[1]) => localize(lang, key);
    const fixed = (v: number | null, digits: number) =>
      v === null ? null : formatNumber(lang, v, digits);
    const box = document.createElement("div");
    box.className = "vigie-details";
    const title = document.createElement("strong");
    title.textContent = labelFor(row);
    box.appendChild(title);
    const lines: [string, string | null][] = [
      [t("mmsi"), String(row.mmsi)],
      [t("class"), row.class],
      [t("ship_type"), row.ship_type === null ? null : shipType(lang, row.ship_type)],
      [t("length"), row.length_m === null ? null : `${fixed(row.length_m, 0)} ${t("unit_m")}`],
      [t("sog"), fixed(row.sog, 1) && `${fixed(row.sog, 1)} ${t("unit_kn")}`],
      [t("cog"), fixed(row.cog, 0) && `${fixed(row.cog, 0)}°`],
      [t("heading"), row.heading === null ? null : `${row.heading}°`],
      [t("distance"), fixed(row.distance_nm, 2) && `${fixed(row.distance_nm, 2)} ${t("unit_nm")}`],
      [t("cpa"), fixed(row.cpa_nm, 2) && `${fixed(row.cpa_nm, 2)} ${t("unit_nm")}`],
      [t("tcpa"), fixed(row.tcpa_min, 1) && `${fixed(row.tcpa_min, 1)} ${t("unit_min")}`],
      [t("age"), row.age_s === null ? null : `${row.age_s} ${t("unit_s")}`],
    ];
    const table = document.createElement("table");
    for (const [label, value] of lines) {
      if (value === null) continue;
      const tr = table.insertRow();
      tr.insertCell().textContent = label;
      tr.insertCell().textContent = value;
    }
    box.appendChild(table);
    if (row.threat) {
      const risk = document.createElement("div");
      risk.className = "vigie-details-threat";
      risk.textContent = t("threat");
      box.appendChild(risk);
    }
    return box;
  }
}
