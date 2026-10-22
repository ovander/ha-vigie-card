/**
 * Visual editor of the card (SPEC HA-SAIL-SPEC-001 §9.7; TEST F-CARD-08), built on Home
 * Assistant's `ha-form`, so pickers and fields look like the rest of the dashboard editor.
 * The form itself (schema, YAML conversion) is in `editor-form.ts`.
 */

import { html, LitElement, nothing } from "lit";

import { type Config, fromFormData, SCHEMA, toFormData } from "./editor-form";
import { localize, type StringKey, STRINGS } from "./i18n";

export const EDITOR_TAG = "vigie-traffic-card-editor";

/** Fields with a help line under them. */
const HELP = new Set(["rings_nm", "tiles", "overlay"]);

interface HassLike {
  locale?: { language?: string };
  language?: string;
}

export class VigieTrafficCardEditor extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: HassLike;
  private _config?: Config;

  setConfig(config: Config): void {
    this._config = config;
  }

  private get _lang(): string | undefined {
    return this.hass?.locale?.language ?? this.hass?.language;
  }

  /** Field labels; none for layout items such as the grid (name ""). */
  private _label = (item: { name: string }) => {
    const key = `editor.${item.name}`;
    return key in STRINGS.en ? localize(this._lang, key as StringKey) : undefined;
  };

  private _helper = (item: { name: string }) => {
    return HELP.has(item.name)
      ? localize(this._lang, `editor.${item.name}_help` as StringKey)
      : undefined;
  };

  private _changed(ev: CustomEvent<{ value: Config }>): void {
    ev.stopPropagation();
    const type = typeof this._config?.type === "string" ? this._config.type : undefined;
    this._config = fromFormData(ev.detail.value, type);
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected override render() {
    if (!this._config) return nothing;
    return html`<ha-form
      .hass=${this.hass}
      .data=${toFormData(this._config)}
      .schema=${SCHEMA}
      .computeLabel=${this._label}
      .computeHelper=${this._helper}
      @value-changed=${this._changed}
    ></ha-form>`;
  }
}

if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, VigieTrafficCardEditor);
}
