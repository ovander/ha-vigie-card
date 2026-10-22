/**
 * Visual editor of the card (SPEC HA-SAIL-SPEC-001 §9.7; TEST F-CARD-08), built on Home
 * Assistant's `ha-form`, so pickers and fields look like the rest of the dashboard editor.
 * The form itself (schema, YAML conversion) is in `editor-form.ts`.
 */

import { html, LitElement, nothing } from "lit";

import { type Config, fromFormData, SCHEMA, toFormData } from "./editor-form";
import { ANCHOR_SCHEMA, anchorFromFormData, anchorToFormData } from "./anchor-editor-form";
import { localize, type StringKey, STRINGS } from "./i18n";

export const EDITOR_TAG = "vigie-traffic-card-editor";
export const ANCHOR_EDITOR_TAG = "vigie-anchor-card-editor";

interface HassLike {
  locale?: { language?: string };
  language?: string;
}

/** One card's form: schema, label keys, fields with help, YAML conversion. */
interface Form {
  schema: readonly unknown[];
  prefix: "editor" | "anchor_editor";
  help: Set<string>;
  toForm(config: Config): Config;
  fromForm(data: Config, type?: string): Config;
}

const TRAFFIC_FORM: Form = {
  schema: SCHEMA,
  prefix: "editor",
  help: new Set(["rings_nm", "tiles", "overlay"]),
  toForm: toFormData,
  fromForm: fromFormData,
};

const ANCHOR_FORM: Form = {
  schema: ANCHOR_SCHEMA,
  prefix: "anchor_editor",
  help: new Set(["switch", "track_hours", "tiles", "overlay"]),
  toForm: anchorToFormData,
  fromForm: anchorFromFormData,
};

export class VigieTrafficCardEditor extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: HassLike;
  private _config?: Config;
  protected form: Form = TRAFFIC_FORM;

  setConfig(config: Config): void {
    this._config = config;
  }

  private get _lang(): string | undefined {
    return this.hass?.locale?.language ?? this.hass?.language;
  }

  /** Field labels; none for layout items such as the grid (name ""). */
  private _label = (item: { name: string }) => {
    const key = `${this.form.prefix}.${item.name}`;
    return key in STRINGS.en ? localize(this._lang, key as StringKey) : undefined;
  };

  private _helper = (item: { name: string }) => {
    return this.form.help.has(item.name)
      ? localize(this._lang, `${this.form.prefix}.${item.name}_help` as StringKey)
      : undefined;
  };

  private _changed(ev: CustomEvent<{ value: Config }>): void {
    ev.stopPropagation();
    const type = typeof this._config?.type === "string" ? this._config.type : undefined;
    this._config = this.form.fromForm(ev.detail.value, type);
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
      .data=${this.form.toForm(this._config)}
      .schema=${this.form.schema}
      .computeLabel=${this._label}
      .computeHelper=${this._helper}
      @value-changed=${this._changed}
    ></ha-form>`;
  }
}

/** The anchor card's editor (SPEC §9.8; TEST F-ACARD-11): the same element, its own form. */
export class VigieAnchorCardEditor extends VigieTrafficCardEditor {
  protected override form = ANCHOR_FORM;
}

if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, VigieTrafficCardEditor);
}
if (!customElements.get(ANCHOR_EDITOR_TAG)) {
  customElements.define(ANCHOR_EDITOR_TAG, VigieAnchorCardEditor);
}
