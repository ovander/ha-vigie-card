# Changelog

All notable changes to this project are documented here. Format: Keep a Changelog;
versioning: SemVer.

## [Unreleased]

### Added
- Card skeleton (ovander/ha-vigie#64, WP21): `custom:vigie-traffic-card` registered in the
  card picker, configuration validated with the field named in the error (U-CARD-06),
  English and French strings (U-CARD-07), target count and own-position notice; CI
  (typecheck, tests, build, HACS validation) and a release workflow that attaches
  `vigie-traffic-card.js` to each release.
