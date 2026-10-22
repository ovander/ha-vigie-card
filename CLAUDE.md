# CLAUDE.md — ha-vigie-card

Standing instructions for Claude Code in this repository.

## Sources of truth

The cards are components C-12 (traffic map) and C-13 (anchor card) of Vigie. Their
specification and tests live in the Vigie repository and win over this code:

- SPEC `docs/HA-SAIL-SPEC-001.md` §9.7 (decisions OD-29…OD-33) and §9.8 (OD-34…OD-38) in
  `ovander/ha-vigie`;
- TEST `docs/HA-SAIL-TEST-001.md` §3.8 (U-CARD), §3.9 (U-ACARD), §4.7 (F-CARD), §4.8
  (F-ACARD), E-08, E-09.

Work packages, issues and milestones (P6) are tracked in `ovander/ha-vigie`; PRs here
reference them as `ovander/ha-vigie#N`. Spec or test changes go to the Vigie repository
in the same work package.

## Hard rules

- **Clean room.** No code from other map cards unless permissively licensed and credited.
- **Not a navigation display.** No feature that suggests otherwise (charts, routes, depths).
- **Read only, with one exception (SPEC OD-35).** The traffic card calls no service. The
  anchor card may call exactly `switch.turn_on`, `switch.turn_off` (after a confirmation in
  the card) and `number.set_value` on its configured entities, nothing else (F-ACARD-10).
  The anchor card also reads the own tracker's history (`history/history_during_period`,
  read only, OD-36). No connection of the cards' own besides map tiles.
- **Never weaken a gate**: no skipped test without an issue, no `@ts-ignore` without a
  one-line justification.

## Conventions

- TypeScript strict, Lit (no decorators: `static properties`), Leaflet from WP22.
- Pure logic (geometry, styles, configuration, strings) in modules without DOM, unit-tested
  with Vitest (U-CARD); rendering tested in a browser (F-CARD).
- Every user-visible string in English and French (`src/i18n.ts`).
- Tests carry the TEST ID in their name (`U-CARD-06 …`).
- Gate before every push, identical to CI: `npm run check`, then commit `dist/` (CI fails
  when the committed build differs from the sources).
- Branches `feat/…`, `fix/…`, `docs/…`; Conventional Commits; PRs to `main`, never push to
  `main`. Release: tag `vX.Y.Z` (pre-release `vX.Y.Z-beta.N`), owner's call.
