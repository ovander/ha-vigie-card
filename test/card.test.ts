// Card skeleton (WP21): registration, setConfig, rendering from a fake `hass`
import { describe, expect, it } from "vitest";

import { CARD_TAG, type Hass, VigieTrafficCard } from "../src/vigie-traffic-card";

const CONFIG = {
  type: "custom:vigie-traffic-card",
  entity: "sensor.garnet_ais_targets",
  own: "device_tracker.garnet",
};

function hass(states: Hass["states"], language = "en"): Hass {
  return { states, locale: { language } };
}

async function render(h: Hass, config: unknown = CONFIG): Promise<string> {
  const card = document.createElement(CARD_TAG) as VigieTrafficCard;
  card.setConfig(config);
  card.hass = h;
  document.body.appendChild(card);
  await card.updateComplete;
  const text = card.shadowRoot?.textContent ?? "";
  card.remove();
  return text.replace(/\s+/g, " ");
}

describe("card skeleton", () => {
  it("is registered as a custom element and in the card picker", () => {
    expect(customElements.get(CARD_TAG)).toBe(VigieTrafficCard);
    const cards = (window as unknown as { customCards: { type: string }[] }).customCards;
    expect(cards.filter((c) => c.type === CARD_TAG)).toHaveLength(1);
  });

  it("refuses an invalid configuration", () => {
    const card = document.createElement(CARD_TAG) as VigieTrafficCard;
    expect(() => card.setConfig({ own: "device_tracker.garnet" })).toThrow(/entity/);
  });

  it("shows the target count, in French too", async () => {
    const states = {
      "sensor.garnet_ais_targets": { state: "4", attributes: { targets: [] } },
      "device_tracker.garnet": { state: "not_home", attributes: { latitude: 43.5, longitude: 7.25 } },
    };
    expect(await render(hass(states))).toContain("4 AIS targets");
    const fr = await render(hass(states, "fr"));
    expect(fr).toContain("4 cibles AIS");
    expect(fr).not.toContain("Position du bateau inconnue");
  });

  it("says when own position is unknown", async () => {
    const states = {
      "sensor.garnet_ais_targets": { state: "2", attributes: { targets: [] } },
      "device_tracker.garnet": { state: "unavailable", attributes: {} },
    };
    expect(await render(hass(states))).toContain("Own position unknown");
  });

  it("names the missing entity", async () => {
    expect(await render(hass({}))).toContain("sensor.garnet_ais_targets not found");
  });

  it("proposes a configuration from the boat's entities", () => {
    const h = hass({ "sensor.jade_ais_targets": { state: "0", attributes: {} } });
    expect(VigieTrafficCard.getStubConfig(h)).toEqual({
      entity: "sensor.jade_ais_targets",
      own: "device_tracker.jade",
    });
  });
});
