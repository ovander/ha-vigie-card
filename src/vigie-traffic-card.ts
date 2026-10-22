/**
 * `custom:vigie-traffic-card` — AIS traffic map for the Vigie integration
 * (SPEC HA-SAIL-SPEC-001 §9.7, component C-12).
 *
 * WP21: card skeleton (configuration, registration, translations). The map itself
 * (Leaflet, own boat, targets, threats, rings, anchor) comes in WP22.
 */

import { css, html, LitElement, nothing } from "lit";

import { type VigieTrafficCardConfig, validateConfig } from "./config";
import { localize } from "./i18n";

export const CARD_TAG = "vigie-traffic-card";
export const VERSION = "0.0.0-dev";

/** The part of Home Assistant's `hass` object the card reads. */
export interface HassState {
  state: string;
  attributes: Record<string, unknown>;
}
export interface Hass {
  states: Record<string, HassState | undefined>;
  locale?: { language?: string };
  language?: string;
}

export class VigieTrafficCard extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: Hass;
  private _config?: VigieTrafficCardConfig;

  /** Called by Home Assistant with the YAML configuration; throws on an invalid one. */
  setConfig(config: unknown): void {
    this._config = validateConfig(config);
  }

  getCardSize(): number {
    return 8;
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

  private get _language(): string | undefined {
    return this.hass?.locale?.language ?? this.hass?.language;
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
    const own = this.hass.states[this._config.own];
    const ownKnown = own !== undefined && typeof own.attributes.latitude === "number";
    return html`<ha-card .header=${this._config.title}>
      <div class="map" style="height: ${this._config.height}">
        <div class="count">${localize(lang, "targets", { count: sensor.state })}</div>
        <div class="message">${localize(lang, "map_coming")}</div>
      </div>
      ${ownKnown
        ? nothing
        : html`<div class="message warning">${localize(lang, "no_own_position")}</div>`}
    </ha-card>`;
  }

  static override styles = css`
    .map {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--secondary-background-color);
    }
    .count {
      font-size: 1.4em;
    }
    .message {
      padding: 8px 16px;
      color: var(--secondary-text-color);
    }
    .warning {
      color: var(--warning-color);
    }
  `;
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
    documentationURL: "https://github.com/ovander/ha-vigie-card",
  });
}
