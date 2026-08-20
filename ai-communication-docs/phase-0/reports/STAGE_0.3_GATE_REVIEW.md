# Stage 0.3 — PM Gate Review

**Date:** 2026-08-19 · **Reviewer:** PM

## Current verdict after re-review: ✅ ACCEPTED WITH DOCUMENTED DEBT

The required side-aware battle-log correction has been delivered and independently verified. Stage 0.3 is closed. The original gate finding and correction request remain below as the audit record.

## Initial verdict: ❌ CHANGES REQUIRED

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

At the initial review, Stage 0.3 remained open pending the correction below.

## Re-review — correction accepted

The PM inspected the corrected `sideAwareName()` implementation and the three requested focused tests. Creature references now include side and event-time slot, including after compression and during guard redirection. The engine event log and combat semantics remain untouched.

Independent re-verification passed:

- `npm run typecheck` — exit 0
- `npm run lint` — exit 0
- `npm test` — 12 files, 90/90 tests passed
- `npm run validate:content` — exit 0
- `npm run sim:archetypes` — unchanged accepted table
- `npm run build` — exit 0, 84 modules transformed
- `npm run test:e2e` — Chromium 4/4 passed

The refreshed battle evidence visibly distinguishes the mirror matchup: `Your PH_EMBER_GUARDIAN_01 (slot 1)` versus `Opponent PH_EMBER_GUARDIAN_01 (slot 1)` for the simultaneous exchange and both damage lines.

### Documented debt carried forward

1. **Commit attribution:** the `playback.ts` correction landed in Creative Director commit `d0251b1`, while its focused tests and correction report landed in `6baceca`. The code is correct, but the history is not stage-clean. Do not rewrite published history; keep future PM, Creative, and Developer commits separated and accurately labeled.
2. **Summon creation wording:** summon events identify the side and say `last slot`; later token references use side plus numeric event-time slot. Adding the numeric slot directly to the summon-creation line is a small Stage 0.6 readability polish, not a Stage 0.3 blocker.
3. The button-based ARIA radio-group improvement noted above remains Stage 0.6 accessibility polish.

Stage 0.3 is now closed. Stage 0.4 is eligible for a separate PM brief but is not authorized by this verdict alone.
