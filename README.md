# Vigie cards

Two dashboard cards for Home Assistant, companions of the
[Vigie](https://github.com/ovander/ha-vigie) integration, in one download:

- **Vigie traffic map** (`custom:vigie-traffic-card`): every AIS target around your boat on
  one map, threats highlighted with their closest point of approach, range rings and the
  anchor watch;
- **Vigie anchor watch** (`custom:vigie-anchor-card`): the anchor watch in the cockpit, with
  the distance against the radius, the alarm, the swing circle and the drop / raise /
  radius buttons ([Anchor card](#anchor-card));
- **a ready-made Vigie dashboard** with both, for your boat, from two lines to paste
  ([way A](#3-put-the-maps-on-a-dashboard)).

> **Status: beta (P6, P7).** The traffic map and its visual editor work, checked in Home
> Assistant 2026.2.3 with Vigie's bench scenarios and with map tiles in the owner's lab;
> the anchor card works, with its swing track and visual editor; the ready-made dashboard
> works (from 0.2.0-beta.4). The on-board checks are still to do.

## Traffic map: what it shows

- **Your boat**, oriented on its heading (else its course), with a course vector of
  `vector_minutes`, and range rings. Under the map: its position in degrees and minutes,
  SOG, COG and heading, and whether the position is current; tap the boat for the same
  details, with the position also in decimal degrees (`43.501917, 7.250000`, ready to paste
  into a charting app or Vigie's `vigie.drop_anchor`). When the GPS position is lost, the line says since when and the boat stays drawn,
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

- Home Assistant 2026.2.0 or later, with [HACS](https://hacs.xyz) installed.
- [Vigie](https://github.com/ovander/ha-vigie) 0.3.0-beta.1 or later, set up with your
  boat (*Settings → Devices & services* lists **Vigie** with your boat under it);
  0.4.0-beta.1 or later for the anchor card's *Recenter* and *Move the anchor*.

## Installation, step by step

Vigie (the integration) and Vigie cards (this dashboard part) are **two separate
downloads** in HACS. Install Vigie first, following its README.

### 1. Download Vigie cards with HACS

1. Open **HACS** in Home Assistant's sidebar.
2. Top right, **⋮ → Custom repositories**.
3. *Repository*: `https://github.com/ovander/ha-vigie-card`; *Type*: **Dashboard** (not
   *Integration*). Click **Add**, then close the window.
4. In HACS's search box, type **Vigie cards** and open it.
5. Click **Download** (bottom right). Vigie cards only has beta versions for now: if the
   window offers an older version than the
   [latest release](https://github.com/ovander/ha-vigie-card/releases), turn on
   *Show beta versions* and pick the newest `v…-beta.…`. Click **Download**.
6. Reload the page **without the cache**: Ctrl+Shift+R (Windows, Linux) or Cmd+Shift+R
   (Mac). In the phone app: *Settings → Companion app → Debugging → Reset frontend cache*,
   then close and reopen the app.

You do not need to restart Home Assistant: the cards are a file the browser loads. HACS adds
that file to the dashboards' resources by itself (step 2 checks it).

### 2. Check that the file is loaded (optional)

*Settings → Dashboards → ⋮ (top right) → Resources* lists
`/hacsfiles/ha-vigie-card/vigie-traffic-card.js`, type *JavaScript module*. If the
*Resources* entry is missing from the ⋮ menu, turn on *Advanced mode* in your user
profile (click your name, bottom left). If the line is missing, add it with
**+ Add resource**, then reload as in step 1.6.

### 3. Put the maps on a dashboard

Pick one of three ways. The first is the simplest.

**A. The ready-made Vigie dashboard (two lines to paste).** It finds your boat by
itself: nothing to rename.

1. *Settings → Dashboards → **+ Add dashboard** → New dashboard from scratch*. Title:
   `Vigie`; icon: `mdi:sail-boat`. Click **Create**.
2. Open **Vigie** in the sidebar. Click the **pencil** (top right), then
   **⋮ → Raw configuration editor**.
3. Delete everything in the editor and paste:

   ```yaml
   strategy:
     type: custom:vigie
   ```

4. Click **Save**, then the **×** (top left).

The dashboard shows your boat: the traffic map and, beside it (under it on a phone), the
anchor card. With several boats there is one tab per boat; to keep a single one, add a
line `boat: Garnet` (your boat's name) under `type: custom:vigie`.

The dashboard rebuilds itself on every load, so it follows Vigie: there is nothing to
maintain. To change a card yourself (its height, the tiles, a sea-mark overlay), click the
pencil, then **⋮ → Take control**: Home Assistant turns the generated cards into an
ordinary dashboard that you edit like any other, and that no longer rebuilds itself.

**B. A Vigie tab in a dashboard you already have.** Open that dashboard, click the
pencil, then **⋮ → Raw configuration editor**, and add at the end of `views:` (keep the
two-space indentation of the other views):

```yaml
  - title: Boat
    path: boat
    icon: mdi:sail-boat
    strategy:
      type: custom:vigie
```

**C. Card by card.** On any dashboard, click the pencil, then **+ Add card**, type
**Vigie** in the search box and choose *Vigie traffic map* or *Vigie anchor watch*. The
editor fills in your boat's entities; click **Save**. The configuration of each card is
below.

### Troubleshooting

| What you see | What to do |
|---|---|
| *Vigie traffic map* is not in the card list, or a red box `Custom element doesn't exist: vigie-traffic-card` (or `…-anchor-card`, or `custom:vigie` on a dashboard) | The browser has not loaded the file: check step 2, then reload without the cache (step 1.6). On a phone, reset the app's frontend cache |
| HACS shows no *Vigie cards* | The custom repository was added with the wrong type: remove it in *Custom repositories* and add it again with type **Dashboard** |
| The dashboard says *No Vigie boat found* | Vigie is not set up yet, or not loaded: check *Settings → Devices & services → Vigie*, then reload the dashboard |
| `Entity sensor.….ais_targets not found` in a card | The entity names differ from the example: use the visual editor (pencil on the card), which lists your boat's entities, or way A |
| Grey map with the boat and targets drawn | The map tiles cannot be loaded (no internet on board): the picture is still right, only the background is missing |
| Empty map, `Own position unknown` | Vigie has no GPS position yet: check the receiver, or the replay on the bench |

The browser's console (F12) shows `VIGIE-CARD <version>` once the file is loaded: give that
version when asking for help.

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

- the watch's state in large type: *Watching*, *Waiting for position* or *Outside the
  circle* (before the alarm's 20 s delay ends), or in red
  *Dragging* / *Position lost* with the time it started;
- the distance to the anchor against the radius (`32 / 50 m`) and a gauge, amber from
  80 % of the radius, red outside;
- the bearing to the anchor, the largest distance since the drop and the time at anchor;
- a small map centred on the anchor, with the swing circle, your boat and its swing track
  since the drop (from Home Assistant's history, so it survives a page reload; at most
  `track_hours`, 6 by default);
- your boat's position, SOG, COG and heading, as on the traffic map;
- three buttons: **Drop anchor here** (at the boat's GPS position, with the current
  radius), **Raise anchor** (only after a confirmation: one tap never stops the watch), and
  the radius **−** / **+** by 5 m;
- two buttons to put the circle where the anchor really is (the boat has dropped back by
  the time the watch is on): **Recenter**, after 10 minutes at anchor, on the centre of the
  swing track; **Move the anchor**, by tapping the map. Both draw the new circle dashed and
  ask before changing anything; the time at anchor and the radius are kept. Disabled while
  the alarm is on. Needs Vigie 0.4.0-beta.1 or later.

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
track_hours: 6                          # swing track drawn, hours; 0 for none
tiles: https://tile.openstreetmap.org/{z}/{x}/{y}.png
# overlay: https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png
```

Or add it from the dashboard editor (*Vigie anchor watch*): its visual editor picks the
switch, and the other entities follow. The swing track needs Home Assistant's recorder
(on by default) to keep your boat's positions.

## Development

```bash
npm ci
npx playwright install chromium   # browser tests and smoke test
npm run check    # typecheck, unit + browser tests, build → dist/vigie-traffic-card.js, smoke
```

`dist/vigie-traffic-card.js` is committed (HACS installs it from the repository until a
release carries it): rebuild and commit it with every source change; CI checks it.

Specification: [HA-SAIL-SPEC-001 §9.7–§9.9](https://github.com/ovander/ha-vigie/blob/main/docs/HA-SAIL-SPEC-001.md)
and tests [HA-SAIL-TEST-001 §3.8–§3.10, §4.7–§4.9](https://github.com/ovander/ha-vigie/blob/main/docs/HA-SAIL-TEST-001.md)
in the Vigie repository.

## License

Apache-2.0. Leaflet (BSD-2-Clause) and Lit (BSD-3-Clause) are bundled in the release file
(about 195 KB, mostly Leaflet).
