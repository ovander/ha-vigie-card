# Changelog

All notable changes to this project are documented here. Format: Keep a Changelog;
versioning: SemVer.

## [Unreleased]

### Added
- The traffic map (ovander/ha-vigie#65, WP22), Leaflet bundled: own boat with course
  vector and range rings; every target oriented on heading or course, coloured by class,
  faded when stale; threats in red with their CPA line, point and label; the anchor and
  its swing circle (red on alarm, shown from the switch when the distance is unavailable);
  details on tap; follow mode with a re-centre button; ship types in English and French.
  AIS names only ever rendered as text. Tests U-CARD-01…05 and F-CARD-01…07, 09 (headless
  Chromium) against states recorded from Vigie, and a smoke test of the built file.
- Card skeleton (ovander/ha-vigie#64, WP21): `custom:vigie-traffic-card` registered in the
  card picker, configuration validated with the field named in the error (U-CARD-06),
  English and French strings (U-CARD-07), target count and own-position notice; CI
  (typecheck, tests, build, HACS validation) and a release workflow that attaches
  `vigie-traffic-card.js` to each release.
