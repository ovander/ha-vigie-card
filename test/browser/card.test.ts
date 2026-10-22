// F-CARD-01…07, 09 (TEST HA-SAIL-TEST-001 §4.7): the card rendered in headless Chromium
// with states recorded from Vigie (test/fixtures, written by Vigie's own tests). Tiles are
// a blank data URL: no network.
import { afterEach, describe, expect, it } from "vitest";

import { CARD_TAG, type Hass, type HassState, VigieTrafficCard } from "../../src/vigie-traffic-card";
import multiTarget from "../fixtures/multi-target.json";
import namedTraffic from "../fixtures/named-traffic.json";

const BLANK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const CONFIG = {
  type: "custom:vigie-traffic-card",
  entity: "sensor.garnet_ais_targets",
  own: "device_tracker.garnet",
  collision_risk: "binary_sensor.garnet_collision_risk",
  anchor: "sensor.garnet_anchor_distance",
  tiles: `${BLANK}#{z}/{x}/{y}`,
};
type States = Record<string, HassState | undefined>;
const MOVING = (
  multiTarget["sensor.garnet_ais_targets"].attributes.targets as { sog: number | null }[]
).filter((r) => r.sog !== null && r.sog >= 0.5).length;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const cards: VigieTrafficCard[] = [];

function hass(states: States, language = "en"): Hass {
  return { states, locale: { language } };
}

async function settle(card: VigieTrafficCard) {
  await card.updateComplete;
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

async function mount(states: States, config: object = CONFIG, language = "en") {
  const card = document.createElement(CARD_TAG) as VigieTrafficCard;
  card.style.display = "block";
  card.style.width = "600px";
  card.setConfig(config);
  card.hass = hass(states, language);
  document.body.appendChild(card);
  cards.push(card);
  await settle(card);
  return card;
}

const all = (card: VigieTrafficCard, selector: string) =>
  [...card.shadowRoot!.querySelectorAll<HTMLElement>(selector)];
const text = (card: VigieTrafficCard) => (card.shadowRoot!.textContent ?? "").replace(/\s+/g, " ");

afterEach(() => {
  for (const card of cards.splice(0)) card.remove();
});

describe("card skeleton", () => {
  it("is registered as a custom element and in the card picker", () => {
    expect(customElements.get(CARD_TAG)).toBe(VigieTrafficCard);
    const picker = (window as unknown as { customCards: { type: string }[] }).customCards;
    expect(picker.filter((c) => c.type === CARD_TAG)).toHaveLength(1);
  });

  it("refuses an invalid configuration, names a missing entity, proposes a configuration", async () => {
    const card = document.createElement(CARD_TAG) as VigieTrafficCard;
    expect(() => card.setConfig({ own: "device_tracker.garnet" })).toThrow(/entity/);
    expect(text(await mount({}))).toContain("sensor.garnet_ais_targets not found");
    const h = hass({ "sensor.jade_ais_targets": { state: "0", attributes: {} } });
    expect(VigieTrafficCard.getStubConfig(h)).toEqual({
      entity: "sensor.jade_ais_targets",
      own: "device_tracker.jade",
    });
  });
});

describe("F-CARD", () => {
  it("F-CARD-01 multi-target: one marker per row, own boat, rings at 0.5/1/2 NM", async () => {
    expect(MOVING).toBe(3);
    const card = await mount(clone(multiTarget));
    expect(all(card, ".vigie-target")).toHaveLength(4);
    expect(all(card, ".vigie-own")).toHaveLength(1);
    expect(all(card, "path.vigie-ring")).toHaveLength(3);
    expect(text(card)).toContain("4 AIS targets");
    // A vector for the own boat and every moving target (the anchored one has none)
    expect(all(card, "path.vigie-vector")).toHaveLength(MOVING + 1);
  });

  it("F-CARD-02 threats: red, CPA line and point, label with CPA and TCPA", async () => {
    const card = await mount(clone(multiTarget));
    expect(all(card, ".vigie-threat")).toHaveLength(2);
    expect(all(card, "path.vigie-cpa")).toHaveLength(2);
    expect(all(card, "path.vigie-cpa-point")).toHaveLength(2);
    const labels = all(card, ".vigie-label-threat").map((l) => l.textContent);
    expect(labels).toContain("235000002: CPA 0.45 NM in 2.7 min");
    expect(labels).toContain("235000001: CPA 0.00 NM in 8.7 min");
    expect(card.shadowRoot!.querySelector("ha-card")!.classList.contains("risk")).toBe(true);
  });

  it("F-CARD-03 named traffic: ship names, MMSI without a name", async () => {
    const card = await mount(clone(namedTraffic), { ...CONFIG, label_zoom: 1 });
    const labels = all(card, ".vigie-label").map((l) => l.textContent ?? "");
    expect(labels.some((l) => l.startsWith("CARGO ONE: CPA"))).toBe(true);
    expect(labels).toEqual(expect.arrayContaining(["ALBATROS", "ALBATROS TENDER", "235000014"]));
  });

  it("F-CARD-04 new states move the markers on the same map", async () => {
    const states = clone(multiTarget) as States;
    const card = await mount(states);
    const map = card.trafficMap;
    const before = all(card, ".vigie-target").map((m) => m.style.transform);
    const moved = clone(multiTarget) as States;
    const sensor = moved["sensor.garnet_ais_targets"]!;
    for (const row of sensor.attributes.targets as { lat: number }[]) row.lat += 0.002;
    card.hass = hass(moved);
    await settle(card);
    expect(card.trafficMap).toBe(map);
    const after = all(card, ".vigie-target").map((m) => m.style.transform);
    expect(after).toHaveLength(4);
    expect(after).not.toEqual(before);
  });

  it("F-CARD-05 own position unavailable: targets only, no rings or own vector, message", async () => {
    const states = clone(multiTarget) as States;
    states["device_tracker.garnet"] = { state: "unavailable", attributes: {} };
    const card = await mount(states);
    expect(all(card, ".vigie-target")).toHaveLength(4);
    expect(all(card, ".vigie-own")).toHaveLength(0);
    expect(all(card, "path.vigie-ring")).toHaveLength(0);
    expect(all(card, "path.vigie-vector")).toHaveLength(MOVING); // the targets' own vectors
    expect(text(card)).toContain("Own position unknown");
  });

  it("F-CARD-06 anchor and swing circle, red while the alarm is on", async () => {
    const states = clone(multiTarget) as States;
    const card = await mount(states);
    expect(all(card, ".vigie-anchor")).toHaveLength(1);
    expect(all(card, "path.vigie-anchor-circle")).toHaveLength(1);
    expect(all(card, "path.vigie-anchor-alarm")).toHaveLength(0);
    const alarmed = clone(multiTarget) as States;
    alarmed["binary_sensor.garnet_anchor_alarm"] = { state: "on", attributes: { reason: "drag" } };
    card.hass = hass(alarmed);
    await settle(card);
    expect(all(card, "path.vigie-anchor-alarm")).toHaveLength(1);
    expect(all(card, ".vigie-anchor.vigie-anchor-alarm")).toHaveLength(1);
  });

  it("F-CARD-06 anchor from the switch while the distance is unavailable", async () => {
    const states = clone(multiTarget) as States;
    states["sensor.garnet_anchor_distance"] = { state: "unavailable", attributes: {} };
    states["switch.garnet_anchor_watch"] = {
      state: "on",
      attributes: { anchor_latitude: 43.5, anchor_longitude: 7.25, radius_m: 50 },
    };
    states["binary_sensor.garnet_anchor_alarm"] = { state: "on", attributes: { reason: "no_position" } };
    const card = await mount(states);
    expect(all(card, "path.vigie-anchor-alarm")).toHaveLength(1);
  });

  it("F-CARD-07 tapping a target opens its details", async () => {
    const card = await mount(clone(namedTraffic));
    const cargo = all(card, ".vigie-threat")[0];
    cargo.click();
    await settle(card);
    const details = card.shadowRoot!.querySelector(".vigie-details")!;
    const content = (details.textContent ?? "").replace(/\s+/g, " ");
    for (const part of ["CARGO ONE", "MMSI235000011", "Ship typeCargo", "Length180 m", "SOG12.0 kn",
      "COG270°", "CPA0.45 NM", "TCPA14.7 min", "Collision risk"]) {
      expect(content).toContain(part);
    }
  });

  it("F-CARD-09 French", async () => {
    const card = await mount(clone(namedTraffic), CONFIG, "fr");
    expect(text(card)).toContain("4 cibles AIS");
    expect(all(card, ".vigie-label-threat")[0].textContent).toContain("dans 14.7 min");
    all(card, ".vigie-threat")[0].click();
    await settle(card);
    const content = card.shadowRoot!.querySelector(".vigie-details")!.textContent ?? "";
    expect(content).toContain("Vitesse fond");
    expect(content).toContain("Type de navire");
    expect(content).toContain("Risque de collision");
  });
});

describe("safety of untrusted AIS text", () => {
  it("shows a name containing HTML as text, never as markup", async () => {
    const states = clone(namedTraffic) as States;
    const rows = states["sensor.garnet_ais_targets"]!.attributes.targets as { name: string }[];
    rows[0].name = '<img src=x onerror="window.__pwned=1">';
    const card = await mount(states, { ...CONFIG, label_zoom: 1 });
    for (const marker of all(card, ".vigie-target")) marker.click();
    await settle(card);
    expect(card.shadowRoot!.querySelector("img[src='x']")).toBeNull();
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
    expect(all(card, ".vigie-label").some((l) => l.textContent?.includes("<img"))).toBe(true);
  });
});

describe("follow mode", () => {
  it("a manual pan stops following; the button brings the boat back", async () => {
    const card = await mount(clone(multiTarget));
    expect(card.shadowRoot!.querySelector(".recenter")).toBeNull();
    card.trafficMap!.setFollow(false);
    await settle(card);
    const button = card.shadowRoot!.querySelector<HTMLButtonElement>(".recenter")!;
    expect(button.title).toBe("Follow own boat");
    button.click();
    await settle(card);
    expect(card.trafficMap!.follow).toBe(true);
    expect(card.shadowRoot!.querySelector(".recenter")).toBeNull();
  });
});
