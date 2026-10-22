# Vigie traffic card

AIS traffic map for Home Assistant, companion of the
[Vigie](https://github.com/ovander/ha-vigie) integration: every AIS target around your
boat on one map, threats highlighted with their closest point of approach, range rings and
the anchor watch.

> **Status: beta (P6).** Map and visual editor work, checked in Home Assistant 2026.2.3
> with Vigie's bench scenarios; the on-board check is still to do.

## What it shows

- **Your boat**, oriented on its heading (else its course), with a course vector of
  `vector_minutes`, and range rings.
- **Every AIS target** Vigie lists (the 50 nearest): a triangle oriented on heading or
  course, with its vector; a circle when stopped or without a course. Dark for Class A,
  grey for Class B, faded when the last report is more than 3 minutes old.
- **Threats** in red, with a dashed line to the point of closest approach and a label
  `NAME: CPA 0.45 NM in 2.7 min`. The card border turns red while `collision_risk` is on.
- **The anchor** and its swing circle while the anchor watch is on, red when the alarm is.
- **Details** when you tap a target: MMSI, class, ship type, length, SOG, COG, heading,
  distance, CPA, TCPA, age of the last report.
- The map follows your boat; panning stops following, the ⌖ button resumes it. Names are
  shown on every target from `label_zoom`, always on threats. English and French.

Positions are those of Vigie's list, refreshed every 5 seconds; the card does not
extrapolate between refreshes.

## ⚠️ Safety

An aid to awareness on a dashboard, **not a navigation display**: no chart, no depths, a
picture refreshed every few seconds that stops when the browser sleeps. Keep a proper
lookout and use your chartplotter or charting software to navigate.

## Requirements

- Home Assistant 2026.2.0 or later, with [Vigie](https://github.com/ovander/ha-vigie)
  later than 0.2.0-beta.1 (its `targets` rows carry `heading` and `threat`).

## Installation (HACS)

1. HACS → ⋮ → Custom repositories → `https://github.com/ovander/ha-vigie-card`, category
   *Dashboard*.
2. Download *Vigie traffic card* (turn on beta versions while only pre-releases exist).
3. Reload the browser (Cmd/Ctrl+Shift+R).

## Configuration

Add the card from the dashboard editor (*Vigie traffic map*): the visual editor picks your
boat's entities. Or in YAML:

```yaml
type: custom:vigie-traffic-card
entity: sensor.garnet_ais_targets       # required
own: device_tracker.garnet               # required
collision_risk: binary_sensor.garnet_collision_risk
anchor: sensor.garnet_anchor_distance
vector_minutes: 6                        # course vectors, minutes
rings_nm: [0.5, 1, 2]                    # range rings, NM; [] for none
label_zoom: 13                           # label every target from this zoom
height: 400px
tiles: https://tile.openstreetmap.org/{z}/{x}/{y}.png
# overlay: https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png
```

Replace `garnet` with your boat's name as it appears in its entity IDs.

## Development

```bash
npm ci
npx playwright install chromium   # browser tests and smoke test
npm run check    # typecheck, unit + browser tests, build → dist/vigie-traffic-card.js, smoke
```

`dist/vigie-traffic-card.js` is committed (HACS installs it from the repository until a
release carries it): rebuild and commit it with every source change; CI checks it.

Specification: [HA-SAIL-SPEC-001 §9.7](https://github.com/ovander/ha-vigie/blob/main/docs/HA-SAIL-SPEC-001.md)
and tests [HA-SAIL-TEST-001 §3.8, §4.7](https://github.com/ovander/ha-vigie/blob/main/docs/HA-SAIL-TEST-001.md)
in the Vigie repository.

## License

Apache-2.0. Leaflet (BSD-2-Clause) and Lit (BSD-3-Clause) are bundled in the release file
(about 195 KB, mostly Leaflet).
