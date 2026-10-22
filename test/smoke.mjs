// Smoke test of the built file (dist/vigie-traffic-card.js), as Home Assistant loads it:
// a module script in a page, then both cards fed states recorded from Vigie. Catches what
// the unit and browser tests cannot: a bundling mistake (missing exports, CSS not inlined).
import { readFile } from "node:fs/promises";

import { chromium } from "playwright";

const states = JSON.parse(await readFile("test/fixtures/multi-target.json", "utf8"));
const anchor = JSON.parse(await readFile("test/fixtures/anchor-drag.json", "utf8")).swinging;
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.setContent("<!doctype html><html><body></body></html>");
await page.addScriptTag({ path: "dist/vigie-traffic-card.js", type: "module" });
const result = await page.evaluate(async ([s, a]) => {
  await customElements.whenDefined("vigie-traffic-card");
  const card = document.createElement("vigie-traffic-card");
  card.style.display = "block";
  card.style.width = "600px";
  card.setConfig({
    entity: "sensor.garnet_ais_targets",
    own: "device_tracker.garnet",
    anchor: "sensor.garnet_anchor_distance",
    tiles: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=#{z}/{x}/{y}",
  });
  card.hass = { states: s, locale: { language: "en" } };
  document.body.appendChild(card);
  await card.updateComplete;
  await new Promise((r) => requestAnimationFrame(r));
  const root = card.shadowRoot;
  const pane = root.querySelector(".leaflet-map-pane");
  return {
    targets: root.querySelectorAll(".vigie-target").length,
    own: root.querySelectorAll(".vigie-own").length,
    rings: root.querySelectorAll("path.vigie-ring").length,
    anchor: root.querySelectorAll(".vigie-anchor").length,
    // Leaflet's CSS reached the shadow root: panes are absolutely positioned
    leafletCss: pane ? getComputedStyle(pane).position : null,
    // The anchor card is in the same file
    anchorCard: await (async () => {
      await customElements.whenDefined("vigie-anchor-card");
      const ac = document.createElement("vigie-anchor-card");
      ac.style.display = "block";
      ac.style.width = "400px";
      ac.setConfig({ switch: "switch.garnet_anchor_watch", tiles: "data:image/png;base64,iVBORw0KGgo=#{z}/{x}/{y}" });
      ac.hass = { states: a, locale: { language: "en" }, callService: async () => {} };
      document.body.appendChild(ac);
      await ac.updateComplete;
      await new Promise((r) => requestAnimationFrame(r));
      const r = ac.shadowRoot;
      return [r.querySelectorAll(".vigie-anchor").length, r.querySelector(".status")?.textContent.trim()];
    })(),
  };
}, [states, anchor]);
await browser.close();
const expected = { targets: 4, own: 1, rings: 3, anchor: 1, leafletCss: "absolute", anchorCard: [1, "Watching"] };
const ok = JSON.stringify(result) === JSON.stringify(expected) && errors.length === 0;
console.log(ok ? "smoke: ok" : "smoke: FAILED", JSON.stringify(result), errors);
process.exit(ok ? 0 : 1);
