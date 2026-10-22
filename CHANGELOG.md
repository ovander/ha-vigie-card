# Changelog

All notable changes to this project are documented here. Format: Keep a Changelog;
versioning: SemVer.

## [Unreleased]

### Added
- Visual editor (ovander/ha-vigie#67, WP23): Home Assistant form with Vigie entity
  pickers, every option editable, labels and help in English and French; the YAML keeps
  only what you set (F-CARD-08).
- The traffic map (ovander/ha-vigie#65, WP22), Leaflet bundled: own boat with course
  vector and range rings; every target oriented on heading or course, coloured by class,
  faded when stale; threats in red with their CPA line, point and label; the anchor and
  its swing circle (red on alarm, shown from the switch when the distance is unavailable);
  details on tap; follow mode with a re-centre button; ship types in English and French.
  AIS names only ever rendered as text. Tests U-CARD-01…05 and F-CARD-01…07, 09 (headless
  Chromium) against states recorded from Vigie, and a smoke test of the built file.

### Fixed
- Found by the E-08 bench pre-run in Home Assistant 2026.2.3 (ovander/ha-vigie#67):
  - the map opened at world zoom with every boat on one spot: Home Assistant lays the card
    out after its first states, and the view was fitted on a 0 px map; it now waits for
    the map to have a size;
  - labels faded out and in at every update (Leaflet fade animation, now off);
  - an open details popup was pushed out of view by follow mode; the view now stays still
    while a popup is open;
  - numbers now use the user's locale (0,45 NM in French), as Home Assistant does;
  - the visual editor was blank: `ha-form` asks for a label for its layout grid too.
- Card skeleton (ovander/ha-vigie#64, WP21): `custom:vigie-traffic-card` registered in the
  card picker, configuration validated with the field named in the error (U-CARD-06),
  English and French strings (U-CARD-07), target count and own-position notice; CI
  (typecheck, tests, build, HACS validation) and a release workflow that attaches
  `vigie-traffic-card.js` to each release.
