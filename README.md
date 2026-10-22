# Vigie cards

Two dashboard cards for Home Assistant, companions of the
[Vigie](https://github.com/ovander/ha-vigie) integration, in one download:

- **Vigie traffic map** (`custom:vigie-traffic-card`): every AIS target around your boat on
  one map, threats highlighted with their closest point of approach, range rings and the
  anchor watch;
- **Vigie anchor watch** (`custom:vigie-anchor-card`): the anchor watch in the cockpit, with
  the distance against the radius, the alarm, the swing circle and the drop / raise /
  radius buttons ([Anchor card](#anchor-card)).

> **Status: beta (P6, P7).** The traffic map and its visual editor work, checked in Home
> Assistant 2026.2.3 with Vigie's bench scenarios and with map tiles in the owner's lab;
> the anchor card works, configured in YAML (swing track and editor next). The on-board
> checks are still to do.

## Traffic map: what it shows

- **Your boat**, oriented on its heading (else its course), with a course vector of
  `vector_minutes`, and range rings. Under the map: its position in degrees and minutes,
  SOG, COG and heading, and whether the position is current; tap the boat for the same
  details. When the GPS position is lost, the line says since when and the boat stays drawn,
  faded, where it was last seen.
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
  0.3.0-beta.1 or later (its `targets` rows carry `heading` and `threat`).

## Installation (HACS)

1. HACS → ⋮ → Custom repositories → `https://github.com/ovander/ha-vigie-card`, category
   *Dashboard*.
2. Download *Vigie cards* (turn on beta versions while only pre-releases exist). One
   file holds both cards.
3. Reload the browser (Cmd/Ctrl+Shift+R).

The browser's console shows `VIGIE-CARD <version>` once the file is loaded: the version to
give when asking for help.

## Traffic map: configuration

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

## Anchor card

A second card in the same download, for the anchor watch in the cockpit:

- the watch's state in large type: *Watching*, *Waiting for position*, or in red
  *Dragging* / *Position lost* with the time it started;
- the distance to the anchor against the radius (`32 / 50 m`) and a gauge, amber from
  80 % of the radius, red outside;
- the bearing to the anchor, the largest distance since the drop and the time at anchor;
- a small map centred on the anchor, with the swing circle and your boat;
- your boat's position, SOG, COG and heading, as on the traffic map;
- three buttons: **Drop anchor here** (at the boat's GPS position, with the current
  radius), **Raise anchor** (only after a confirmation: one tap never stops the watch), and
  the radius **−** / **+** by 5 m.

These buttons are the only actions either card takes, through Home Assistant; the traffic
map never changes anything. To drop the anchor at a position read on the chartplotter,
use Vigie's `vigie.drop_anchor` action instead.

The card makes **no sound**: browsers block it and screens sleep. What wakes the crew is
Vigie's anchor alarm automation sending a critical notification to the phone (see Vigie's
README).

```yaml
type: custom:vigie-anchor-card
switch: switch.garnet_anchor_watch      # required; the other entities follow its name
# distance: sensor.garnet_anchor_distance
# alarm: binary_sensor.garnet_anchor_alarm
# radius: number.garnet_anchor_radius
# own: device_tracker.garnet
height: 260px
tiles: https://tile.openstreetmap.org/{z}/{x}/{y}.png
# overlay: https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png
```

The swing track and the visual editor for this card come in the next version.

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
