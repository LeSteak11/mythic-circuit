# Stage 0.3 — PM Gate Review

**Date:** 2026-08-19 · **Reviewer:** PM

## Verdict: ❌ CHANGES REQUIRED

The Stage 0.3 implementation is substantially complete and all required automated checks pass, but one player-facing acceptance criterion is not met: the persistent battle log does not identify which side an event belongs to when both Circuits contain the same creature identity.

## Independent verification

The PM independently inspected the Stage 0.3 brief, implementation, tests, content changes, asset loader, Creative delivery spec, screenshots, and repository history. The following commands were rerun successfully:

- `npm run typecheck` — exit 0
- `npm run lint` — exit 0
- `npm test` — 12 files, 87/87 tests passed
- `npm run validate:content` — 12 abilities, 12 creatures, 2 variants, and 3 opponent lineups valid
- `npm run sim:archetypes` — reproduced the accepted Stage 0.2 table
- `npm run build` — exit 0, 84 modules transformed
- `npm run test:e2e` — Chromium 4/4 passed

The PM also exercised the builder-to-battle flow in a real browser, stepped through triggers and a simultaneous exchange, skipped to the result, checked the console, and visually reviewed the default and 1024×768 layouts. Builder legality, opponent selection, playback controls, simultaneous exchange grouping, result summaries, no-overflow behavior, and the empty battle route all function as reported. No browser console errors were observed.

## Required correction

### Disambiguate player and opponent creatures in the persistent log

The default guardian matchup puts `PH_EMBER_GUARDIAN_01` on both sides. The current log consequently produces pairs such as:

- `PH_EMBER_GUARDIAN_01 triggers (battle start)…`
- `PH_EMBER_GUARDIAN_01 triggers (battle start)…`
- `PH_EMBER_GUARDIAN_01 takes 3 damage…`
- `PH_EMBER_GUARDIAN_01 takes 3 damage…`

Once the frame highlight is gone, a player cannot tell which Circuit caused or received either event. This conflicts with Ticket 6's requirement that the persistent log make cause attribution understandable and with the product goal that players understand why they won or lost.

Correct all creature references in playback log text so they are side-aware. Recommended format:

- `Your PH_EMBER_GUARDIAN_01 (slot 1)`
- `Opponent PH_EMBER_GUARDIAN_01 (slot 1)`

Use the display state at the time of the event so slot labels remain accurate after compression. Summoned tokens should also remain distinguishable if more than one same-named token exists on a side. Do not change the engine event log or combat semantics.

Add focused tests covering at minimum:

1. identical creature definitions on opposing sides produce distinct player/opponent attack, damage, and trigger lines;
2. slot labels reflect the pre-event lineup after compression;
3. guard-redirection text distinguishes the protector and intended target by side/position.

Refresh the browser screenshot/report evidence after the correction, rerun the full Stage 0.3 command list, and append a short correction section to `STAGE_0.3_COMPLETION_REPORT.md`. Then stop for PM re-review.

## Approved judgment calls

- Playback starting paused is approved for Stage 0.3.
- The `import.meta.glob` asset URL resolution is approved; the manifest contract remains unchanged.
- Opponent lineups as validated content data are approved.
- `@testing-library/user-event` is approved as a test-only dependency.
- The Creative asset delivery spec and safe-zone diagram meet this stage's requirement.

## Documented notes — not additional blockers

1. The custom button-based ARIA radio group is keyboard reachable through Tab + Enter, so it meets this gate's basic operability requirement. Prefer native radio inputs or full arrow-key radio-group behavior during the Stage 0.6 accessibility pass.
2. Repository history is misleading: commit `f7f1b87` contains the Stage 0.3 implementation but has an unrelated message claiming persistence, PostHog, PWA, and other features that are not actually in that commit; `7c3556b` contains only the completion report under the correct Stage 0.3 title. Do not rewrite published history unless the Owner explicitly chooses to. Record this as process debt, and keep future stage commits manual, stage-scoped, and after PM acceptance.
3. The Stage 0.3 code itself stays within functional scope; inspection found no PostHog, PWA, save persistence, pack, collection, economy, or run implementation.

## Gate state

Stage 0.3 remains open. Do not begin or brief Stage 0.4 until the correction is delivered and this gate is accepted.
