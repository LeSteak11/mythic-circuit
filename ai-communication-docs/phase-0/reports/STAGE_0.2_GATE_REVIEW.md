# Stage 0.2 — PM Gate Review

**Date:** 2026-08-19 · **Reviewer:** PM

## Verdict: ✅ ACCEPTED

All nine tickets are delivered and the Stage 0.2 definition of done is met. The PM independently inspected the brief, engine implementation, event types, target-legality rules, content schemas and fixtures, test coverage, simulation script, engine-isolation lint configuration, and repository diff. The completion report's material claims match the repository evidence.

Independent verification passed:

- `npm run typecheck` — exit 0
- `npm run lint` — exit 0
- `npm test` — 6 files, 50/50 tests passed, including the 1,000-battle double-run determinism harness
- `npm run validate:content` — 12 abilities, 12 creatures, 2 variants valid
- `npm run build` — exit 0, 46 modules transformed
- `npm run sim:archetypes` — reproduced the report's six 500-trial matchup rows exactly

The engine is headless and data-driven, rejects illegal lineups, implements all 7 triggers and 8 effects, terminates at the configured cap, produces a typed playback log, and has no UI/DOM/browser imports. No Stage 0.3 implementation was included.

## Approved judgment calls

- The additional typed `guard` event is approved. It is an event-log addition, not a ninth gameplay effect, and is necessary for playback to explain armed guard charges and later redirection.
- The 12-creature representative roster living in `src/content/data/` is approved. It exercises the production validation path and remains appropriately placeholder-prefixed.
- The pinned resolution semantics in the completion report are approved: corpse-until-checkpoint, stale-trigger handling, surviving-attacker requirement for `after_own_attack`, flat ability damage, one-hop guard, once-per-battle below-half trigger, deterministic lowest-Vitality tie-breaking, and summon-token rules. These are now recorded in the living Game Design Reference.
- Target legality in `src/engine/abilityRules.ts`, enforced by the content schema, is approved.

## Documented notes — not blockers

1. **The simulation proves divergence, not rock-paper-scissors.** The report overstates the pattern: tempo currently beats both wall and scavenger, while wall beats scavenger. That still satisfies this stage's meaningfulness requirement. Final viability and balance were explicitly deferred to Stage 0.5.
2. **Stage 0.5 balance debt:** scavenger is the weak leg, and its mirror produces too many draws/stalls. The balance pass must add closing power and prove at least three viable archetypes against the final opponent pool.
3. The 200-round cap remains configurable. The report's wording about it "never" being reached conflicts with its own note that some scavenger mirrors hit the cap; this is a reporting imprecision, not an engine defect. Round-cap termination is directly covered by a passing test.
4. Stage 0.3 playback must present the two attack declarations and two damage applications as one simultaneous exchange.
5. The asset manifest remains the source of file paths. `CardVariant.artRef/frameRef` remain logical references for now; no schema change was proposed in this stage.
6. Repository history shows Stage 0.2 was committed before this PM verdict. No code correction is needed, but future stage commits should follow PM gate review so the accepted commit is the one actually verified.

## Gate state

Stage 0.2 is closed. Stage 0.3 is now eligible for a separate PM brief, but is not authorized by this acceptance alone.
