# CLAUDE.md — ha-vigie-card

Standing instructions for Claude Code in this repository.

## Sources of truth

The card is component C-12 of Vigie. Its specification and tests live in the Vigie
repository and win over this code:

- SPEC `docs/HA-SAIL-SPEC-001.md` §9.7 (decisions OD-29…OD-33) in `ovander/ha-vigie`;
- TEST `docs/HA-SAIL-TEST-001.md` §3.8 (U-CARD), §4.7 (F-CARD), E-08.

Work packages, issues and milestones (P6) are tracked in `ovander/ha-vigie`; PRs here
reference them as `ovander/ha-vigie#N`. Spec or test changes go to the Vigie repository
in the same work package.

## Hard rules

- **Clean room.** No code from other map cards unless permissively licensed and credited.
- **Not a navigation display.** No feature that suggests otherwise (charts, routes, depths).
- **Read only.** The card reads Home Assistant states; it calls no service, opens no
  connection of its own besides map tiles.
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
