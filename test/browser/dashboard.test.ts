// F-DASH-01 (TEST HA-SAIL-TEST-001 §4.9): the ready-made dashboard in headless Chromium.
// Home Assistant finds `strategy: {type: custom:vigie}` as `ll-strategy-dashboard-vigie` and
// calls its `generate`; each card of the result is then built from its `type`, as HA does.
import { afterEach, describe, expect, it } from "vitest";

import "../../src/index";
import moments from "../fixtures/anchor-drag.json";
import traffic from "../fixtures/multi-target.json";

const BLANK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

interface Strategy {
  generate(config: object, hass: object): Promise<{ views: { sections: { cards: Record<string, unknown>[] }[] }[] }>;
}
interface Card extends HTMLElement {
  setConfig(config: object): void;
  hass: object;
  updateComplete: Promise<unknown>;
}

const shown: HTMLElement[] = [];
afterEach(() => shown.splice(0).forEach((e) => e.remove()));

describe("F-DASH-01 the Vigie dashboard strategy", () => {
  it("is registered for the dashboard and for a single view", () => {
    expect(customElements.get("ll-strategy-dashboard-vigie")).toBeDefined();
    expect(customElements.get("ll-strategy-view-vigie")).toBeDefined();
  });

  it("generates one view whose two cards draw Garnet", async () => {
    const states = { ...traffic, ...moments.swinging };
    const hass = { states, locale: { language: "en" }, callService: async () => {} };
    const strategy = customElements.get("ll-strategy-dashboard-vigie") as unknown as Strategy;
    const dashboard = await strategy.generate({ type: "custom:vigie" }, hass);
    expect(dashboard.views).toHaveLength(1);
    const cards = dashboard.views[0].sections.flatMap((s) => s.cards).filter((c) => c.type !== "heading");
    expect(cards.map((c) => c.type)).toEqual(["custom:vigie-traffic-card", "custom:vigie-anchor-card"]);
    for (const config of cards) {
      const card = document.createElement(String(config.type).slice("custom:".length)) as Card;
      card.style.display = "block";
      card.style.width = "500px";
      card.setConfig({ ...config, tiles: `${BLANK}#{z}/{x}/{y}` });
      card.hass = hass;
      document.body.appendChild(card);
      shown.push(card);
      await card.updateComplete;
      await new Promise((r) => requestAnimationFrame(r));
      // Each card draws the boat, and no "entity not found" warning
      expect(card.shadowRoot!.querySelectorAll(".vigie-own").length, String(config.type)).toBe(1);
      expect(card.shadowRoot!.textContent, String(config.type)).not.toMatch(/not found/);
    }
  });

  it("generates a view of its own for an existing dashboard", async () => {
    const strategy = customElements.get("ll-strategy-view-vigie") as unknown as {
      generate(config: object, hass: object): Promise<{ title: string; sections: unknown[] }>;
    };
    const view = await strategy.generate({}, { states: { ...traffic, ...moments.swinging } });
    expect(view.title).toBe("garnet");
    expect(view.sections).toHaveLength(2);
  });
});
