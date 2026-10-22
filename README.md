# Vigie traffic card

AIS traffic map for Home Assistant, companion of the
[Vigie](https://github.com/ovander/ha-vigie) integration: every AIS target around your
boat on one map, threats highlighted with their closest point of approach, range rings and
the anchor watch.

> **Status: skeleton (P6, WP21).** The card installs, validates its configuration and shows
> the number of targets. The map itself comes in the next version.

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
npm run check    # typecheck, tests, build → dist/vigie-traffic-card.js
```

Specification: [HA-SAIL-SPEC-001 §9.7](https://github.com/ovander/ha-vigie/blob/main/docs/HA-SAIL-SPEC-001.md)
and tests [HA-SAIL-TEST-001 §3.8, §4.7](https://github.com/ovander/ha-vigie/blob/main/docs/HA-SAIL-TEST-001.md)
in the Vigie repository.

## License

Apache-2.0. Leaflet (BSD-2-Clause) and Lit (BSD-3-Clause) are bundled in the release file.
