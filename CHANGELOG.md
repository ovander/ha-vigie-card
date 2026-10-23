# Changelog

All notable changes to this project are documented here. Format: Keep a Changelog;
versioning: SemVer.

## [Unreleased]

## [0.2.0-beta.4] - 2026-10-23

A ready-made Vigie dashboard and an installation guide for newcomers to Home Assistant.
No change to either card. Works with Vigie 0.3.0-beta.1 or later (0.4.0-beta.1 for the
anchor card's *Recenter* and *Move the anchor*, as before).

### Added
- A ready-made **Vigie dashboard**: `strategy: {type: custom:vigie}` builds one view per
  Vigie boat with the traffic map and the anchor card, configured from Home Assistant's
  entity registry (renamed entities included); `boat` keeps one boat. Also as a single
  view in an existing dashboard. Two lines to paste, nothing to rename
  (ovander/ha-vigie#87).

### Changed
- README: installation step by step for newcomers to Home Assistant (HACS with the
  *Dashboard* type, beta versions, the resource check, the phone app's cache), three ways
  to put the maps on a dashboard, and a troubleshooting table (owner's lab finding,
  ovander/ha-vigie#87).

## [0.2.0-beta.3] - 2026-10-22

The anchor card grows up: swing track, visual editor, recentering the circle, and three
fixes from the bench pre-run in Home Assistant 2026.2.3. **Needs Vigie 0.4.0-beta.1 or
later** for *Recenter* and *Move the anchor*; everything else works with 0.3.0-beta.1.

### Added
- Anchor card: **Recenter** (on the centre of the swing, after 10 minutes at anchor) and
  **Move the anchor** (tap the map), with a dashed preview and a confirmation; the time at
  anchor and the radius are kept, disabled during an alarm. Needs Vigie with `keep_since` on
  `vigie.drop_anchor` (ovander/ha-vigie#81).
- Anchor card: the swing track since the drop, from Home Assistant's history of your boat
  (one read-only request per drop, then the positions seen live; at most `track_hours`,
  6 by default, and 500 points) (ovander/ha-vigie#80).
- Anchor card: visual editor; only the switch is needed, the other entities follow its name
  (ovander/ha-vigie#80).

### Fixed
- Anchor card, from the E-09 bench pre-run in Home Assistant 2026.2.3 (ovander/ha-vigie#80):
  - a dragging boat stays in view: the map takes in the boat when it leaves the circle;
  - *Outside the circle* (amber) during the alarm's confirmation delay, instead of a green
    *Watching* next to a red gauge;
  - times (*Dragging since…*, *position lost since…*) follow your 12/24 h setting in
    Home Assistant, not only the language.

## [0.2.0-beta.2] - 2026-10-22

Your boat's position in decimal degrees, and the released file carries its version again.
No change to the cards' configuration; needs Vigie 0.3.0-beta.1 or later, as before.

### Added
- Your boat's position also in decimal degrees (`43.501917, 7.250000`) in the details
  shown on tapping the boat, on both cards: signed, with a point, whatever the language, so
  it pastes into a charting app or `vigie.drop_anchor` (ovander/ha-vigie#77).

### Fixed
- The released file carries its version again: since both cards are bundled together
  (0.2.0-beta.1), the stamped version was dropped from the file as unused. It is now shown
  once in the browser's console (`VIGIE-CARD <version>`), and the release checks it.

### Changed
- HACS name *Vigie cards*, README for both cards; same repository and file name, nothing to
  change in an existing installation.

## [0.2.0-beta.1] - 2026-10-22

Adds the anchor card for the cockpit (Vigie phase P7) and your boat's position, speed and
course on both cards. Same single file and HACS download as before; needs Vigie
0.3.0-beta.1 or later, as before (no Vigie change). The anchor card's swing track and
visual editor come next: configure it in YAML for now.

### Added
- `custom:vigie-anchor-card`, in the same file (ovander/ha-vigie#76): the anchor watch in
  the cockpit. Status in large type, distance against the radius with a gauge, bearing,
  largest distance and time at anchor, a small map with the swing circle and your boat,
  and three buttons: drop the anchor here, raise it (after a confirmation), radius − / +.
  No sound: the alert is Vigie's phone notification. Swing track and visual editor next.
- Your boat's position (degrees and minutes), SOG, COG and heading in a line under the
  map and in details when you tap the boat, with whether the position is current or since
  when it is lost; the boat stays drawn, faded, at its last position (ovander/ha-vigie#77).

## [0.1.0-beta.2] - 2026-10-22

Fixes the map tiles in Home Assistant. Needs Vigie 0.3.0-beta.1 or later, as before.

### Fixed
- OpenStreetMap tiles were all replaced by a "403 — Access blocked" image in Home Assistant
  (ovander/ha-vigie#71): Home Assistant's page sends no `Referer` to other sites, and
  OpenStreetMap's tile servers refuse requests without one. The base map and the overlay
  now send the page's origin (never its path) with their tile requests.

## [0.1.0-beta.1] - 2026-10-22

First beta of the Vigie traffic card (Vigie phase P6): every AIS target around your boat on
one map. Needs [Vigie](https://github.com/ovander/ha-vigie) 0.3.0-beta.1 or later. Checked
in Home Assistant 2026.2.3 with Vigie's bench scenarios (plain background: no map tiles in
that sandbox); the check with real map tiles and on board is still to do.

### Added
- `custom:vigie-traffic-card` (ovander/ha-vigie#64, #65, #67), Leaflet bundled:
  - your boat with its course vector and range rings;
  - every target Vigie lists (the 50 nearest), oriented on heading or course, dark for
    Class A, grey for Class B, faded when the last report is older than 3 minutes;
  - threats in red with a dashed line to the point of closest approach and a label
    `NAME: CPA 0.45 NM in 2.7 min`; the card border turns red while `collision_risk` is on;
  - the anchor and its swing circle while the anchor watch is on, red on alarm;
  - details on tap (MMSI, class, ship type, length, SOG, COG, heading, distance, CPA,
    TCPA, age of the last report);
  - follow mode (stops when you pan, ⌖ to resume, paused while details are open);
  - English and French, numbers in your locale.
- Visual editor: Home Assistant form with Vigie entity pickers, every option, the YAML
  keeps only what you set.
- AIS names, which come from other vessels, are only ever shown as text.
- Tests: unit tests of the geometry and rules (hand-computed values), the card rendered in
  headless Chromium against states recorded from Vigie, a smoke test of the built file.
  Five problems found by the bench pre-run in Home Assistant were fixed before this
  release (first view at world zoom, label flicker, popup pushed out of view, decimal
  separator, blank editor), each covered by a test.

[Unreleased]: https://github.com/ovander/ha-vigie-card/compare/v0.2.0-beta.4...HEAD
[0.2.0-beta.4]: https://github.com/ovander/ha-vigie-card/compare/v0.2.0-beta.3...v0.2.0-beta.4
[0.2.0-beta.3]: https://github.com/ovander/ha-vigie-card/compare/v0.2.0-beta.2...v0.2.0-beta.3
[0.2.0-beta.2]: https://github.com/ovander/ha-vigie-card/compare/v0.2.0-beta.1...v0.2.0-beta.2
[0.2.0-beta.1]: https://github.com/ovander/ha-vigie-card/compare/v0.1.0-beta.2...v0.2.0-beta.1
[0.1.0-beta.2]: https://github.com/ovander/ha-vigie-card/compare/v0.1.0-beta.1...v0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/ovander/ha-vigie-card/releases/tag/v0.1.0-beta.1
