# Changelog

All notable changes to this project are documented here. Format: Keep a Changelog;
versioning: SemVer.

## [Unreleased]

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

[Unreleased]: https://github.com/ovander/ha-vigie-card/compare/v0.1.0-beta.1...HEAD
[0.1.0-beta.1]: https://github.com/ovander/ha-vigie-card/releases/tag/v0.1.0-beta.1
