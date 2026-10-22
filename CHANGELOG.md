# Changelog

All notable changes to this project are documented here. Format: Keep a Changelog;
versioning: SemVer.

## [Unreleased]

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

[Unreleased]: https://github.com/ovander/ha-vigie-card/compare/v0.1.0-beta.2...HEAD
[0.1.0-beta.2]: https://github.com/ovander/ha-vigie-card/compare/v0.1.0-beta.1...v0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/ovander/ha-vigie-card/releases/tag/v0.1.0-beta.1
