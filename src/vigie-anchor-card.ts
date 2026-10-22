/**
 * `custom:vigie-anchor-card` — the anchor watch in the cockpit, for the Vigie integration
 * (SPEC HA-SAIL-SPEC-001 §9.8, component C-13).
 *
 * Distance against the radius, the alarm and its reason, a small map with the swing circle,
 * and three controls: drop here, raise (after a confirmation), radius by its step. These
 * are the only service calls of either card (OD-35). An aid only: the alert that wakes the
 * crew is the phone notification, not this card.
 */

import leafletCss from "leaflet/dist/leaflet.css?raw";
import { css, html, LitElement, nothing, type PropertyValues, unsafeCSS } from "lit";

import { type VigieAnchorCardConfig, validateAnchorConfig } from "./anchor-config";
import { AnchorMap, type AnchorMapView } from "./anchor-map";
import {
  type AnchorReading,
  gauge,
  historyRequest,
  radiusStep,
  readAnchor,
  thin,
  timeAtAnchor,
  type TrackPoint,
  trackFrom,
} from "./anchor-model";
import { ANCHOR_EDITOR_TAG } from "./editor";
import { formatNumber, localize, type StringKey } from "./i18n";
import { type HassState, type OwnBoat, ownBoat } from "./model";
import { formatTime, positionState } from "./own";
import { ownLine, ownLineStyles } from "./own-line";

export const ANCHOR_CARD_TAG = "vigie-anchor-card";

/** The part of Home Assistant's `hass` object the anchor card uses. */
export interface AnchorHass {
  states: Record<string, HassState | undefined>;
  locale?: { language?: string };
  language?: string;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<unknown>;
  /** Home Assistant's WebSocket call; the card only reads the own tracker's history (OD-36). */
  callWS?<T>(message: Record<string, unknown>): Promise<T>;
}

export class VigieAnchorCard extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
    _confirming: { state: true },
    _error: { state: true },
  };

  hass?: AnchorHass;
  private _config?: VigieAnchorCardConfig;
  private _confirming = false;
  private _error: string | null = null;
  private _lastOwn: OwnBoat | null = null;
  /** The swing track, for the drop it was loaded for (its `armed_at`). */
  private _track: TrackPoint[] = [];
  private _trackFor: string | null = null;
  private _trackLoaded = false;
  private _trackTracker?: HassState;
  private _map?: AnchorMap;
  private _resize?: ResizeObserver;
  private _drawn: unknown[] = [];

  setConfig(config: unknown): void {
    const next = validateAnchorConfig(config);
    if (this._map && JSON.stringify(next) !== JSON.stringify(this._config)) {
      this._map.remove();
      this._map = undefined;
      this._drawn = [];
    }
    this._config = next;
  }

  getCardSize(): number {
    return 7;
  }

  /** The visual editor (F-ACARD-11). */
  static getConfigElement(): HTMLElement {
    return document.createElement(ANCHOR_EDITOR_TAG);
  }

  /** Configuration proposed when the card is added from the card picker. */
  static getStubConfig(hass?: { states?: Record<string, unknown> }): Record<string, string> {
    const ids = Object.keys(hass?.states ?? {});
    const watch = ids.find((id) => /^switch\..+_anchor_watch$/.test(id));
    return { switch: watch ?? "switch.boat_anchor_watch" };
  }

  /** The Leaflet map, for tests and diagnostics. */
  get anchorMap(): AnchorMap | undefined {
    return this._map;
  }

  private get _language(): string | undefined {
    return this.hass?.locale?.language ?? this.hass?.language;
  }

  private _states(): (HassState | undefined)[] {
    const c = this._config!;
    const s = this.hass!.states;
    return [s[c.switch], s[c.alarm], s[c.distance], s[c.radius], s[c.own]];
  }

  private _reading(): AnchorReading {
    const [watch, alarm, distance, radius] = this._states();
    return readAnchor(watch, alarm, distance, radius);
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    const own = this._config && this.hass ? ownBoat(this.hass.states[this._config.own]) : null;
    if (own) this._lastOwn = own;
    if (changed.has("hass") && this._reading().status === "off") this._confirming = false;
  }

  /** One of the three calls of SPEC §9.8; a refusal is shown, nothing else changes. */
  private async _call(domain: "switch" | "number", service: string, data: Record<string, unknown>) {
    this._error = null;
    try {
      await this.hass!.callService(domain, service, data);
    } catch (err) {
      const message = (err as { message?: unknown })?.message;
      this._error = localize(this._language, "anchor_card.refused", {
        message: typeof message === "string" ? message : String(err),
      });
    }
  }

  private _drop(): void {
    void this._call("switch", "turn_on", { entity_id: this._config!.switch });
  }

  private _raise(): void {
    this._confirming = false;
    void this._call("switch", "turn_off", { entity_id: this._config!.switch });
  }

  private _setRadius(value: number): void {
    void this._call("number", "set_value", { entity_id: this._config!.radius, value });
  }

  private _boatName(): string {
    const c = this._config!;
    const name = this.hass!.states[c.own]?.attributes.friendly_name;
    if (typeof name === "string" && name !== "") return name;
    return /^switch\.(.+)_anchor_watch$/.exec(c.switch)?.[1] ?? c.switch;
  }

  protected override render() {
    if (!this._config || !this.hass) return nothing;
    const lang = this._language;
    const t = (key: StringKey, values?: Record<string, string | number>) => localize(lang, key, values);
    const c = this._config;
    if (!this.hass.states[c.switch]) {
      return html`<ha-card .header=${c.title}>
        <div class="message warning">${t("anchor_card.missing", { entity: c.switch })}</div>
      </ha-card>`;
    }
    const r = this._reading();
    const armed = r.status !== "off";
    const alarm = r.status === "dragging" || r.status === "position_lost";
    const radiusM = r.anchor?.radius_m ?? r.radius.value;
    const g = radiusM === null ? gauge(null, 1) : gauge(r.distanceM, radiusM);
    const tracker = this.hass.states[c.own];
    const own = ownBoat(tracker);
    const since = r.alarmSince ? ` ${t("anchor_card.since", { time: formatTime(lang, r.alarmSince) })}` : "";
    const metres = (v: number, digits = 0) => `${formatNumber(lang, v, digits)} ${t("unit_m")}`;
    const down = r.radius.value === null ? null : radiusStep(r.radius.value, r.radius, -1);
    const up = r.radius.value === null ? null : radiusStep(r.radius.value, r.radius, 1);
    return html`<ha-card .header=${c.title} class=${alarm ? "alarm" : ""}>
      <div class="status status-${r.status} ${alarm ? "alarm" : ""}">
        ${t(`anchor_card.${r.status}` as StringKey)}${since}
      </div>
      ${armed
        ? html`<div class="reading">
              <span class="distance">${r.distanceM === null ? "—" : formatNumber(lang, r.distanceM, 0)}</span> /
              <span class="radius">${radiusM === null ? "—" : metres(radiusM)}</span>
            </div>
            <div class="gauge level-${g.level}">
              <div class="fill" style="width: ${Math.min(g.fraction ?? 0, 1) * 100}%"></div>
            </div>
            <div class="details">
              ${r.bearing === null
                ? nothing
                : html`<span>${t("anchor_card.bearing")} ${formatNumber(lang, r.bearing, 0)}°</span>`}
              ${r.maxM === null ? nothing : html`<span>${t("anchor_card.max")} ${metres(r.maxM, 1)}</span>`}
              ${r.armedAt === null
                ? nothing
                : html`<span>${t("anchor_card.time")} ${timeAtAnchor(r.armedAt, new Date())}</span>`}
            </div>`
        : nothing}
      <div id="map" style="height: ${c.height}"></div>
      ${ownLine(lang, own ?? this._lastOwn, tracker)}
      <div class="controls">
        ${armed
          ? html`<div class="radius-control">
                <button class="radius-down" aria-label=${t("anchor_card.radius_down")} title=${t("anchor_card.radius_down")}
                  ?disabled=${down === null} @click=${() => down !== null && this._setRadius(down)}>−</button>
                <span>${t("anchor_card.radius")} ${r.radius.value === null ? "—" : metres(r.radius.value)}</span>
                <button class="radius-up" aria-label=${t("anchor_card.radius_up")} title=${t("anchor_card.radius_up")}
                  ?disabled=${up === null} @click=${() => up !== null && this._setRadius(up)}>+</button>
              </div>
              <button class="raise" @click=${() => (this._confirming = true)}>${t("anchor_card.raise")}</button>`
          : html`<button class="drop" ?disabled=${own === null} @click=${() => own !== null && this._drop()}>
                ${t("anchor_card.drop")}
              </button>
              ${own === null ? html`<span class="hint">${t("anchor_card.no_position")}</span>` : nothing}`}
      </div>
      ${this._confirming && armed
        ? html`<div class="confirm" role="alertdialog">
            <span>${t("anchor_card.raise_confirm", { boat: this._boatName() })}</span>
            <button class="cancel" @click=${() => (this._confirming = false)}>${t("anchor_card.cancel")}</button>
            <button class="stop" @click=${() => this._raise()}>${t("anchor_card.confirm")}</button>
          </div>`
        : nothing}
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
    </ha-card>`;
  }

  /**
   * The swing track (OD-36): one history request per drop, then the positions seen live.
   * Watch off, track off or a new drop: the track starts again.
   */
  private _syncTrack(): void {
    const c = this._config!;
    const r = this._reading();
    const armedAt = this.hass!.states[c.switch]?.attributes.armed_at;
    if (r.status === "off" || r.armedAt === null || c.track_hours <= 0 || typeof armedAt !== "string") {
      this._track = [];
      this._trackFor = null;
      return;
    }
    const tracker = this.hass!.states[c.own];
    if (armedAt !== this._trackFor) {
      this._trackFor = armedAt;
      this._track = [];
      this._trackLoaded = false;
      const since = r.armedAt;
      const request = historyRequest(c.own, since, c.track_hours, new Date());
      if (!request || !this.hass!.callWS) return;
      this.hass!.callWS<unknown>(request).then(
        (history) => {
          if (this._trackFor !== armedAt) return; // a newer drop
          this._track = trackFrom(history, c.own, since, c.track_hours, new Date());
          this._trackLoaded = true;
          this._trackTracker = this.hass?.states[c.own];
          this._map?.update(this._view());
        },
        () => (this._trackLoaded = true), // no history (recorder off): the live points only
      );
      return;
    }
    if (!this._trackLoaded || tracker === this._trackTracker) return;
    this._trackTracker = tracker;
    const own = ownBoat(tracker);
    const last = this._track[this._track.length - 1];
    if (own && (!last || last.lat !== own.lat || last.lon !== own.lon)) {
      this._track = thin([...this._track, { t: Date.now(), lat: own.lat, lon: own.lon }]);
    }
  }

  private _view(): AnchorMapView {
    const tracker = this.hass!.states[this._config!.own];
    return {
      anchor: this._reading().anchor,
      track: this._track.map((p) => [p.lat, p.lon]),
      own: ownBoat(tracker),
      lastOwn: this._lastOwn,
      ownState: positionState(tracker),
    };
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (!this._config || !this.hass) return;
    const container = this.renderRoot.querySelector<HTMLElement>("#map");
    if (!container) return;
    if (!this._map || this._map.map.getContainer() !== container) {
      this._map?.remove();
      this._map = new AnchorMap(container, this._config.tiles, this._config.overlay, () => this._language);
      this._resize?.disconnect();
      this._resize = new ResizeObserver(() => this._map?.invalidateSize());
      this._resize.observe(container);
      this._drawn = [];
    }
    this._syncTrack();
    const states = this._states();
    if (states.length === this._drawn.length && states.every((s, i) => s === this._drawn[i])) return;
    this._drawn = states;
    this._map.update(this._view());
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resize?.disconnect();
    this._resize = undefined;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const container = this.renderRoot?.querySelector?.<HTMLElement>("#map");
    if (this._map && container) {
      this._resize = new ResizeObserver(() => this._map?.invalidateSize());
      this._resize.observe(container);
    }
  }

  static override styles = [
    unsafeCSS(leafletCss),
    ownLineStyles,
    css`
      ha-card {
        overflow: hidden;
      }
      ha-card.alarm {
        box-shadow: inset 0 0 0 4px var(--error-color, #d32f2f);
      }
      .status {
        padding: 14px 16px 4px;
        font-size: 1.4em;
        font-weight: 600;
      }
      .status-watching {
        color: var(--success-color, #2e7d32);
      }
      .status-waiting {
        color: var(--warning-color, #f57c00);
      }
      .status-off {
        color: var(--secondary-text-color);
      }
      .status.alarm {
        color: var(--error-color, #d32f2f);
      }
      .reading {
        padding: 0 16px;
        font-size: 2.6em;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        line-height: 1.2;
      }
      .reading .radius {
        font-size: 0.55em;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .gauge {
        margin: 6px 16px;
        height: 10px;
        border-radius: 5px;
        background: var(--divider-color, #e0e0e0);
        overflow: hidden;
      }
      .gauge .fill {
        height: 100%;
        background: var(--success-color, #2e7d32);
      }
      .gauge.level-amber .fill {
        background: var(--warning-color, #f57c00);
      }
      .gauge.level-red .fill {
        background: var(--error-color, #d32f2f);
      }
      .details {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 14px;
        padding: 2px 16px 10px;
        color: var(--secondary-text-color);
      }
      #map {
        width: 100%;
        background: var(--secondary-background-color, #e0e0e0);
        z-index: 0;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px 16px;
        padding: 12px 16px 16px;
      }
      .radius-control {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1.1em;
      }
      button {
        min-width: 48px;
        min-height: 48px;
        padding: 0 16px;
        border: none;
        border-radius: 8px;
        font-size: 1.1em;
        font-weight: 600;
        cursor: pointer;
        background: var(--primary-color, #1565c0);
        color: var(--text-primary-color, #fff);
      }
      button:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .raise,
      .stop {
        background: var(--error-color, #d32f2f);
      }
      .cancel {
        background: var(--secondary-background-color, #e0e0e0);
        color: var(--primary-text-color, #212121);
      }
      .confirm {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin: 0 16px 16px;
        padding: 12px;
        border-radius: 8px;
        background: var(--secondary-background-color, #f5f5f5);
        font-weight: 600;
      }
      .hint,
      .warning {
        color: var(--warning-color, #f57c00);
      }
      .error {
        margin: 0 16px 16px;
        color: var(--error-color, #d32f2f);
      }
      .message {
        padding: 16px;
      }
      .vigie-own,
      .vigie-anchor {
        background: none;
        border: none;
      }
    `,
  ];
}

if (!customElements.get(ANCHOR_CARD_TAG)) {
  customElements.define(ANCHOR_CARD_TAG, VigieAnchorCard);
}

interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
}
const registry = window as unknown as { customCards?: CustomCardEntry[] };
registry.customCards = registry.customCards ?? [];
if (!registry.customCards.some((card) => card.type === ANCHOR_CARD_TAG)) {
  registry.customCards.push({
    type: ANCHOR_CARD_TAG,
    name: "Vigie anchor watch",
    description: "Distance to the anchor, alarm, swing circle and controls (Vigie integration).",
    preview: true,
    documentationURL: "https://github.com/ovander/ha-vigie-card",
  });
}
