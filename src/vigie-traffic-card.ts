/**
 * `custom:vigie-traffic-card` — AIS traffic map for the Vigie integration
 * (SPEC HA-SAIL-SPEC-001 §9.7, component C-12).
 *
 * Draws the own boat, every target of `sensor.<boat>_ais_targets` (the 50 nearest),
 * threats with their CPA point, range rings and the anchor watch. An aid to awareness,
 * not a navigation display.
 */

import leafletCss from "leaflet/dist/leaflet.css?raw";
import { css, html, LitElement, nothing, type PropertyValues, unsafeCSS } from "lit";

import { type VigieTrafficCardConfig, validateConfig } from "./config";
import { EDITOR_TAG } from "./editor";
import { localeTag, localize } from "./i18n";
import { type Anchor, anchorEntities, anchorOf, type HassState, type OwnBoat, ownBoat, targetRows } from "./model";
import { positionState } from "./own";
import { ownLine, ownLineStyles } from "./own-line";
import { type MapView, TrafficMap } from "./map";

export const CARD_TAG = "vigie-traffic-card";
export const VERSION = "0.0.0-dev";

export type { HassState };
/** The part of Home Assistant's `hass` object the card reads. */
export interface Hass {
  states: Record<string, HassState | undefined>;
  locale?: { language?: string; time_format?: string };
  language?: string;
}

export class VigieTrafficCard extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
    _follow: { state: true },
  };

  hass?: Hass;
  private _config?: VigieTrafficCardConfig;
  private _follow = true;
  /** The last own position seen, shown faded while the position is lost (#77). */
  private _lastOwn: OwnBoat | null = null;
  private _map?: TrafficMap;
  private _resize?: ResizeObserver;
  /** The state objects last drawn: Home Assistant replaces an object when it changes. */
  private _drawn: unknown[] = [];

  /** Called by Home Assistant with the YAML configuration; throws on an invalid one. */
  setConfig(config: unknown): void {
    const next = validateConfig(config);
    if (this._map && JSON.stringify(next) !== JSON.stringify(this._config)) {
      this._map.remove(); // a new configuration builds a new map
      this._map = undefined;
      this._drawn = [];
    }
    this._config = next;
  }

  getCardSize(): number {
    return 8;
  }

  /** The visual editor (F-CARD-08). */
  static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TAG);
  }

  /** Configuration proposed when the card is added from the card picker. */
  static getStubConfig(hass?: Hass): Record<string, string> {
    const ids = Object.keys(hass?.states ?? {});
    const entity = ids.find((id) => id.startsWith("sensor.") && id.endsWith("_ais_targets"));
    const boat = entity?.slice("sensor.".length, -"_ais_targets".length);
    return {
      entity: entity ?? "sensor.boat_ais_targets",
      own: boat ? `device_tracker.${boat}` : "device_tracker.boat",
    };
  }

  /** The Leaflet map, for tests and diagnostics. */
  get trafficMap(): TrafficMap | undefined {
    return this._map;
  }

  private get _language(): string | undefined {
    return localeTag(this.hass?.locale, this.hass?.language);
  }

  private _states(): (HassState | undefined)[] {
    const c = this._config!;
    const s = this.hass!.states;
    const anchor = c.anchor ? anchorEntities(c.anchor) : null;
    return [
      s[c.entity],
      s[c.own],
      c.collision_risk ? s[c.collision_risk] : undefined,
      c.anchor ? s[c.anchor] : undefined,
      anchor ? s[anchor.watch] : undefined,
      anchor ? s[anchor.alarm] : undefined,
    ];
  }

  private _viewOf(states: (HassState | undefined)[]): MapView {
    const [targets, own, , distance, watch, alarm] = states;
    const anchor: Anchor | null = this._config!.anchor ? anchorOf(distance, watch, alarm) : null;
    return {
      own: ownBoat(own),
      lastOwn: this._lastOwn,
      ownState: positionState(own),
      targets: targetRows(targets),
      anchor,
    };
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    const own = this._config && this.hass ? ownBoat(this.hass.states[this._config.own]) : null;
    if (own) this._lastOwn = own;
  }

  protected override render() {
    if (!this._config || !this.hass) return nothing;
    const lang = this._language;
    const sensor = this.hass.states[this._config.entity];
    if (!sensor) {
      return html`<ha-card .header=${this._config.title}>
        <div class="message warning">
          ${localize(lang, "no_targets_entity", { entity: this._config.entity })}
        </div>
      </ha-card>`;
    }
    const tracker = this.hass.states[this._config.own];
    const ownKnown = ownBoat(tracker) !== null;
    const shown = ownBoat(tracker) ?? this._lastOwn;
    const risk = this._config.collision_risk
      ? this.hass.states[this._config.collision_risk]?.state === "on"
      : false;
    return html`<ha-card .header=${this._config.title} class=${risk ? "risk" : ""}>
      <div class="wrapper">
        <div id="map" style="height: ${this._config.height}"></div>
        ${this._follow || !ownKnown
          ? nothing
          : html`<button class="recenter" title=${localize(lang, "recenter")}
              aria-label=${localize(lang, "recenter")} @click=${() => this._map?.setFollow(true)}>
              <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor"
                d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.94 3A8.99 8.99 0 0 0 13 3.06V1h-2v2.06A8.99 8.99 0 0 0 3.06 11H1v2h2.06A8.99 8.99 0 0 0 11 20.94V23h2v-2.06A8.99 8.99 0 0 0 20.94 13H23v-2h-2.06ZM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"/></svg>
            </button>`}
      </div>
      ${ownLine(lang, shown, tracker)}
      <div class="status">
        <span class="count">${localize(lang, "targets", { count: sensor.state })}</span>
        ${ownKnown
          ? nothing
          : html`<span class="warning">${localize(lang, "no_own_position")}</span>`}
      </div>
    </ha-card>`;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (!this._config || !this.hass) return;
    const container = this.renderRoot.querySelector<HTMLElement>("#map");
    if (!container) return;
    if (!this._map || this._map.map.getContainer() !== container) {
      this._map?.remove();
      this._map = new TrafficMap(
        container,
        this._config,
        () => this._language,
        (follow) => (this._follow = follow),
      );
      this._resize?.disconnect();
      this._resize = new ResizeObserver(() => this._map?.invalidateSize());
      this._resize.observe(container);
      this._drawn = [];
    }
    const states = this._states();
    if (states.length === this._drawn.length && states.every((s, i) => s === this._drawn[i])) return;
    this._drawn = states;
    this._map.update(this._viewOf(states));
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
      ha-card.risk {
        box-shadow: inset 0 0 0 3px var(--error-color, #d32f2f);
      }
      .wrapper {
        position: relative;
      }
      #map {
        width: 100%;
        background: var(--secondary-background-color, #e0e0e0);
        z-index: 0;
      }
      .recenter {
        position: absolute;
        right: 10px;
        top: 10px;
        z-index: 1000;
        width: 34px;
        height: 34px;
        border: 2px solid rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        background: #fff;
        color: #333;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .status {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        padding: 6px 16px 10px;
        color: var(--secondary-text-color);
      }
      .message {
        padding: 16px;
      }
      .warning {
        color: var(--warning-color, #f57c00);
      }
      .vigie-target,
      .vigie-own,
      .vigie-anchor {
        background: none;
        border: none;
      }
      .vigie-label {
        font-size: 11px;
        padding: 1px 4px;
      }
      .vigie-label-threat {
        color: #b71c1c;
        font-weight: 600;
      }
      .vigie-details table {
        border-collapse: collapse;
        margin-top: 4px;
      }
      .vigie-details td {
        padding: 1px 8px 1px 0;
      }
      .vigie-details-threat {
        margin-top: 4px;
        color: #b71c1c;
        font-weight: 600;
      }
    `,
  ];
}

if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, VigieTrafficCard);
}

// Card picker entry
interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
}
const registry = window as unknown as { customCards?: CustomCardEntry[] };
registry.customCards = registry.customCards ?? [];
if (!registry.customCards.some((c) => c.type === CARD_TAG)) {
  registry.customCards.push({
    type: CARD_TAG,
    name: "Vigie traffic map",
    description: "AIS targets, threats and the anchor around your boat (Vigie integration).",
    preview: true,
    documentationURL: "https://github.com/ovander/ha-vigie-card",
  });
}
