// F-ACARD-01…10 (TEST HA-SAIL-TEST-001 §4.8): the anchor card in headless Chromium,
// with states recorded from Vigie on the `anchor-drag` preset (test/fixtures). The fake
// `hass` records every service call. Tiles are a blank data URL: no network.
import { afterEach, describe, expect, it } from "vitest";

import { ANCHOR_CARD_TAG, type AnchorHass, VigieAnchorCard } from "../../src/vigie-anchor-card";
import type { HassState } from "../../src/model";
import moments from "../fixtures/anchor-drag.json";

const BLANK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const CONFIG = { type: "custom:vigie-anchor-card", switch: "switch.garnet_anchor_watch", tiles: `${BLANK}#{z}/{x}/{y}` };
type States = Record<string, HassState | undefined>;
type Moment = Exclude<keyof typeof moments, "history">;
interface Call {
  domain: string;
  service: string;
  data?: Record<string, unknown>;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const cards: VigieAnchorCard[] = [];
const allCalls: Call[] = [];
const allMessages: Record<string, unknown>[] = [];

/** The recorded history, shifted so its last point is a minute ago. */
function recentHistory() {
  const rows = clone(moments.history["device_tracker.garnet"]) as { lu: number }[];
  const shift = Date.now() / 1000 - 60 - rows[rows.length - 1].lu;
  for (const row of rows) row.lu += shift;
  return { "device_tracker.garnet": rows };
}

/** States of a recorded moment, with the switch armed `minutes` ago. */
function at(moment: Moment, minutes = 125): States {
  const states = clone(moments[moment]) as States;
  const watch = states["switch.garnet_anchor_watch"]!;
  if (watch.state === "on") {
    watch.attributes.armed_at = new Date(Date.now() - minutes * 60_000).toISOString();
  }
  return states;
}

function hass(states: States, language = "en", refuse?: string) {
  const calls: Call[] = [];
  const messages: Record<string, unknown>[] = [];
  const h: AnchorHass = {
    callWS: async <T>(message: Record<string, unknown>) => {
      messages.push(message);
      allMessages.push(message);
      return recentHistory() as T;
    },
    states,
    locale: { language },
    callService: async (domain, service, data) => {
      const call = { domain, service, data };
      calls.push(call);
      allCalls.push(call);
      if (refuse) throw new Error(refuse);
    },
  };
  return { h, calls, messages };
}

async function settle(card: VigieAnchorCard) {
  await card.updateComplete;
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await card.updateComplete;
}

async function mount(states: States, language = "en", refuse?: string, config: object = CONFIG) {
  const { h, calls, messages } = hass(states, language, refuse);
  const card = document.createElement(ANCHOR_CARD_TAG) as VigieAnchorCard;
  card.style.display = "block";
  card.style.width = "400px";
  card.setConfig(config);
  card.hass = h;
  document.body.appendChild(card);
  cards.push(card);
  await settle(card);
  await new Promise((r) => setTimeout(r, 0)); // the history answer
  await settle(card);
  return { card, calls, messages };
}

const one = (card: VigieAnchorCard, selector: string) => card.shadowRoot!.querySelector<HTMLElement>(selector);
const all = (card: VigieAnchorCard, selector: string) => [...card.shadowRoot!.querySelectorAll<HTMLElement>(selector)];
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

afterEach(() => {
  for (const card of cards.splice(0)) card.remove();
});

describe("F-ACARD", () => {
  it("F-ACARD-01 armed, swinging: status, distance against radius, details, map, own boat", async () => {
    const { card, calls } = await mount(at("swinging"));
    expect(text(one(card, ".status"))).toBe("Watching");
    expect(text(one(card, ".reading"))).toBe("32 / 50 m");
    expect(one(card, ".gauge")!.className).toContain("level-normal");
    const details = text(one(card, ".details"));
    for (const part of ["Bearing to anchor 353°", "Largest distance 38.5 m", "At anchor for 2 h 05"]) {
      expect(details).toContain(part);
    }
    expect(all(card, ".vigie-anchor")).toHaveLength(1);
    expect(all(card, "path.vigie-anchor-circle")).toHaveLength(1);
    expect(all(card, ".vigie-own")).toHaveLength(1);
    // The swing circle fills the map
    const map = card.anchorMap!.map;
    const bounds = map.getBounds();
    expect(bounds.contains([43.5 + 0.00045, 7.25])).toBe(true);
    expect(map.getZoom()).toBeGreaterThanOrEqual(16);
    for (const tile of all(card, "img.leaflet-tile")) {
      expect(tile.getAttribute("referrerpolicy")).toBe("strict-origin-when-cross-origin");
    }
    const own = text(one(card, ".vigie-own-line"));
    for (const part of ["43° 29.983′ N", "7° 15.003′ E", "SOG 0.0 kn", "Position current"]) {
      expect(own).toContain(part);
    }
    one(card, ".vigie-own")!.click();
    await settle(card);
    expect(text(one(card, ".vigie-details"))).toContain("Position (dd)43.499712, 7.250052");
    expect(calls).toHaveLength(0); // reading never calls a service
  });

  it("F-ACARD-02 drag alarm: red with its start time", async () => {
    const states = at("dragging");
    states["binary_sensor.garnet_anchor_alarm"]!.last_changed = "2026-10-22T14:05:00+00:00";
    const { card } = await mount(states);
    const time = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(
      new Date("2026-10-22T14:05:00Z"),
    );
    expect(text(one(card, ".status"))).toBe(`Dragging since ${time}`);
    expect(one(card, ".status")!.className).toContain("alarm");
    expect(text(one(card, ".reading"))).toBe("55 / 50 m");
    expect(one(card, ".gauge")!.className).toContain("level-red");
    expect(all(card, "path.vigie-anchor-circle.vigie-anchor-alarm")).toHaveLength(1);
  });

  it("F-ACARD-03 position lost: no distance, last position faded, own line says since when", async () => {
    const { card } = await mount(at("swinging"));
    const lost = at("position-lost");
    lost["device_tracker.garnet"]!.last_changed = "2026-10-22T14:05:00+00:00";
    card.hass = hass(lost).h;
    await settle(card);
    expect(text(one(card, ".status"))).toContain("Position lost");
    expect(one(card, ".status")!.className).toContain("alarm");
    expect(text(one(card, ".reading"))).toBe("— / 50 m");
    expect(all(card, ".vigie-own")).toHaveLength(0);
    expect(all(card, ".vigie-own-lost")).toHaveLength(1);
    expect(all(card, ".vigie-anchor")).toHaveLength(1); // the anchor from the switch
    expect(text(one(card, ".vigie-own-line"))).toContain("Position lost since");
  });

  it("F-ACARD-03 waiting for a position is never shown like Watching", async () => {
    const { card } = await mount(at("waiting"));
    expect(text(one(card, ".status"))).toBe("Waiting for position");
    expect(one(card, ".status")!.className).toContain("waiting");
    expect(one(card, ".status")!.className).not.toContain("watching");
  });

  it("F-ACARD-04 watch off: drop the anchor here; disabled without own position", async () => {
    const { card, calls } = await mount(at("off"));
    expect(text(one(card, ".status"))).toBe("Anchor watch off");
    expect(one(card, ".raise")).toBeNull();
    one(card, ".drop")!.click();
    await settle(card);
    expect(calls).toEqual([{ domain: "switch", service: "turn_on", data: { entity_id: "switch.garnet_anchor_watch" } }]);

    const blind = at("off");
    blind["device_tracker.garnet"] = { state: "unavailable", attributes: {} };
    const second = await mount(blind);
    const drop = one(second.card, ".drop") as HTMLButtonElement;
    expect(drop.disabled).toBe(true);
    expect(text(one(second.card, ".controls"))).toContain("No GPS position");
    drop.click();
    await settle(second.card);
    expect(second.calls).toHaveLength(0);
  });

  it("F-ACARD-05 raise only after a confirmation naming the boat", async () => {
    const states = at("swinging");
    states["device_tracker.garnet"]!.attributes.friendly_name = "Garnet";
    const { card, calls } = await mount(states);
    one(card, ".raise")!.click();
    await settle(card);
    expect(text(one(card, ".confirm"))).toContain("Stop the anchor watch of Garnet?");
    expect(calls).toHaveLength(0);
    one(card, ".confirm .cancel")!.click();
    await settle(card);
    expect(one(card, ".confirm")).toBeNull();
    expect(calls).toHaveLength(0);
    one(card, ".raise")!.click();
    await settle(card);
    one(card, ".confirm .stop")!.click();
    await settle(card);
    expect(calls).toEqual([{ domain: "switch", service: "turn_off", data: { entity_id: "switch.garnet_anchor_watch" } }]);
    expect(one(card, ".confirm")).toBeNull();
  });

  it("F-ACARD-06 radius by its step, disabled at the limits", async () => {
    const { card, calls } = await mount(at("swinging"));
    one(card, ".radius-up")!.click();
    await settle(card);
    expect(calls).toEqual([{ domain: "number", service: "set_value", data: { entity_id: "number.garnet_anchor_radius", value: 55 } }]);
    for (const [value, button] of [["500.0", ".radius-up"], ["10.0", ".radius-down"]] as const) {
      const states = at("swinging");
      states["number.garnet_anchor_radius"]!.state = value;
      const other = await mount(states);
      expect((one(other.card, button) as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("F-ACARD-07 swing track: one history request since the drop, then live points", async () => {
    const states = at("swinging", 10);
    const { card, messages } = await mount(states);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      type: "history/history_during_period",
      entity_ids: ["device_tracker.garnet"],
      start_time: states["switch.garnet_anchor_watch"]!.attributes.armed_at,
    });
    const recorded = moments.history["device_tracker.garnet"].length;
    expect(card.anchorMap!.trackLength).toBe(recorded);
    expect(all(card, "path.vigie-track")).toHaveLength(1);

    const moved = clone(states);
    const own = moved["device_tracker.garnet"]!;
    own.attributes = { ...own.attributes, latitude: (own.attributes.latitude as number) + 0.0001 };
    card.hass = hass(moved).h;
    await settle(card);
    expect(card.anchorMap!.trackLength).toBe(recorded + 1);
    expect(messages).toHaveLength(1); // no new request: the hass object changed, not the drop

    const off = await mount(at("swinging", 10), "en", undefined, { ...CONFIG, track_hours: 0 });
    expect(off.messages).toHaveLength(0);
    expect(all(off.card, "path.vigie-track")).toHaveLength(0);
  });

  it("F-ACARD-08 a refused call shows Home Assistant's message, nothing else changes", async () => {
    const { card, calls } = await mount(at("swinging"), "en", "Radius out of range");
    one(card, ".radius-up")!.click();
    await settle(card);
    await new Promise((r) => setTimeout(r, 0));
    await settle(card);
    expect(calls).toHaveLength(1);
    expect(text(one(card, ".error"))).toBe("Refused: Radius out of range");
    expect(text(one(card, ".reading"))).toBe("32 / 50 m");
    expect(text(one(card, ".status"))).toBe("Watching");
  });

  it("F-ACARD-09 French", async () => {
    const { card } = await mount(at("dragging"), "fr");
    expect(text(one(card, ".status"))).toContain("Dérapage");
    const details = text(one(card, ".details"));
    expect(details).toContain("Distance maximale 55,4 m");
    expect(details).toContain("Au mouillage depuis 2 h 05");
    expect(text(one(card, ".controls"))).toContain("Lever l'ancre");
    expect(one(card, ".radius-up")!.getAttribute("aria-label")).toBe("Agrandir le rayon");
    expect(text(one(card, ".vigie-own-line"))).toContain("Vitesse fond 0,5 nd");
  });

  it("shows a configuration error when the switch does not exist", async () => {
    const states = at("swinging");
    delete states["switch.garnet_anchor_watch"];
    const { card } = await mount(states);
    expect(text(one(card, ".message"))).toContain("switch.garnet_anchor_watch not found");
  });
});

describe("F-ACARD-10 calls", () => {
  it("F-ACARD-10 only the three calls of SPEC §9.8, on the configured entities, and the history request", () => {
    // Runs after the tests above (same file, in order): every call they made
    const allowed = new Set([
      "switch.turn_on switch.garnet_anchor_watch",
      "switch.turn_off switch.garnet_anchor_watch",
      "number.set_value number.garnet_anchor_radius",
    ]);
    expect(allCalls.length).toBeGreaterThanOrEqual(4);
    // The only other message: the read-only history request for the own tracker (OD-36)
    expect(allMessages.length).toBeGreaterThan(0);
    for (const message of allMessages) {
      expect(message.type).toBe("history/history_during_period");
      expect(message.entity_ids).toEqual(["device_tracker.garnet"]);
    }
    for (const call of allCalls) {
      expect(allowed, JSON.stringify(call)).toContain(`${call.domain}.${call.service} ${call.data?.entity_id}`);
      expect(Object.keys(call.data ?? {}).every((k) => k === "entity_id" || k === "value")).toBe(true);
    }
  });
});
