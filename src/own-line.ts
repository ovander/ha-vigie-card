/**
 * The own boat line under the map, shared by both cards (SPEC §9.7, §9.8, #77): position,
 * SOG, COG, heading, and whether the position is current or since when it is lost.
 */

import { css, html, nothing } from "lit";

import type { HassState, OwnBoat } from "./model";
import { ownLines, positionState, positionStateText } from "./own";

/** `shown` is the current position, else the last one the card saw (null: nothing to show). */
export function ownLine(lang: string | undefined, shown: OwnBoat | null, tracker?: HassState) {
  if (!shown) return nothing;
  const state = positionState(tracker);
  return html`<div class="vigie-own-line">
    ${ownLines(lang, shown).map(([label, value], i) => html`<span>${i === 0 ? value : `${label} ${value}`}</span>`)}
    <span class=${state.current ? "current" : "warning"}>${positionStateText(lang, state)}</span>
  </div>`;
}

export const ownLineStyles = css`
  .vigie-own-line {
    display: flex;
    gap: 4px 14px;
    flex-wrap: wrap;
    padding: 8px 16px 0;
    font-variant-numeric: tabular-nums;
  }
  .vigie-own-line .current {
    color: var(--secondary-text-color);
  }
  .vigie-own-line .warning {
    color: var(--warning-color, #f57c00);
  }
  .vigie-own-lost {
    background: none;
    border: none;
  }
  .vigie-details-position {
    margin-top: 4px;
    color: var(--secondary-text-color);
  }
`;
