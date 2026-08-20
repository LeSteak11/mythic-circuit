# Mythic Circuit — Stage 0.2 Developer Brief

**Issued by:** Project Manager · **Date:** 2026-08-19 · **Status:** AUTHORIZED
**Stage:** 0.2 — Deterministic battle engine
**You are authorized for this stage ONLY. The project-wide working agreement from the Stage 0.1 brief remains in force — with one correction: the ready-to-paste commit block must appear INSIDE the completion report file (`ai-communication-docs/phase-0/reports/STAGE_0.2_COMPLETION_REPORT.md`), not only in chat.**

## Context

Stage 0.1 is ACCEPTED (see `reports/STAGE_0.1_GATE_REVIEW.md`). The repo has tooling, schemas, validator, asset contract, and app shell. This stage builds the **headless battle engine** in `src/engine/` — pure TypeScript, no DOM, no React, no UI work of any kind. The engine-isolation lint rules from 0.1 apply. Rules source of truth: `MYTHIC_CIRCUIT_GAME_DESIGN_REFERENCE.md` §3–§5 (battle resolution, elements, ability triggers/effects). This stage must prove battles are deterministic, explainable, and strategically meaningful **before** any battle UI exists.

## Confirmed decisions (do not revisit)

Simultaneous front-line exchanges (no Speed stat) · element wheel Ember→Volt→Tide→Verdant→Ember, ×1.5 advantage / ×0.75 disadvantage, multipliers in a config object · 7 triggers, 8 effects exactly as listed in the design reference — no additions · trigger resolution: front-most first, player side before opponent on ties, queued effects never interrupt mid-resolution · draw (both sides empty same round) counts as player win · all randomness through one injectable seeded RNG · battle output is an ordered, typed event log.

## Tickets (in order)

1. **Engine types & battle state.** Battle-side/creature-instance runtime types (current Vitality, Power incl. buffs, shield status, slot). Constructed from CreatureDefinitions + AbilityDefinitions (import types from `src/content/schemas.ts` — types only, no file I/O in the engine).
2. **Seeded RNG.** Small deterministic PRNG (e.g. mulberry32), injected into the battle, never `Math.random`. Unit-tested for reproducibility.
3. **Lineup validation.** `validateLineup()`: exactly 5 creatures, no duplicate creature ids, all references resolvable. Typed error results, not throws.
4. **Core battle loop.** Rounds of simultaneous front exchanges, element multipliers from config, defeat + compression, end conditions (win/loss/draw-as-win), hard round cap (e.g. 200 rounds → treat as draw) to guarantee termination. Emits events for every state change with cause attribution.
5. **Trigger/effect system.** Central rules engine implementing all 7 triggers and 8 effects with the confirmed resolution order. Effects are engine code keyed by effect id; creatures stay pure data. **Pin down per-effect target legality** (e.g. scavenge = self only) and update `schemas.ts` + fixtures accordingly — document the final legality table in the report.
6. **Event log.** Typed event union (battle start, round start, trigger fired, attack, damage, heal, buff, shield, summon, defeat, compression, battle end) — each event carries enough data (source, target, cause, values, slot positions) to drive playback and explanation later without re-simulating.
7. **Test roster.** ~10 test creatures (in `src/content/data/` or a test-only dataset — dev's call, state it in the report) covering every trigger and effect at least once, including guardian, scavenger, and trigger-tempo archetype representatives.
8. **Test suite.** Per-trigger and per-effect unit tests · determinism harness: run ≥1,000 seeded random battles twice, assert event logs identical · termination test (no infinite battles) · compression/ordering edge cases (double KO, summon into full/empty board, guardian dying while guarding, scavenger stacking) · lineup validation cases.
9. **Archetype meaningfulness check.** Script (`npm run sim:archetypes` or similar) pitting the three archetype lineups against each other and mirror matches across many seeds; output a small win-rate table. Goal is *evidence of meaningful differences*, not balance. Include the table in the report.

## Definition of done

- All of §Tickets complete; `lint`, `typecheck`, `test`, `validate:content` all pass; engine has zero UI/DOM imports (lint rule proves it).
- Determinism harness passes: identical logs on identical seeds.
- Every trigger and effect covered by at least one test and used by at least one test creature.
- Archetype sim shows the three archetypes are not interchangeable (win rates visibly diverge across matchups).
- No UI changes beyond none. No persistence. Repo runnable and documented (`src/engine/README.md` updated with engine overview + how to run the sim script).

## Verification requirements

Full command outputs in the report (typecheck, lint, test with counts, validate:content, archetype sim table). No browser checks required this stage (headless), but the app shell must still build and run untouched (`npm run build` output included).

## Out of scope — do not touch

Any UI/battle presentation · persistence/saves · packs/collection/currency · run structure (sequences of battles) · new triggers, effects, stats, or elements · balance tuning beyond the meaningfulness check · Zustand/Playwright installs.

## Completion report

`ai-communication-docs/phase-0/reports/STAGE_0.2_COMPLETION_REPORT.md`, all standard sections, target-legality table, archetype win-rate table, ending with the commit block (`Phase 0 / Stage 0.2 — ...`). Then STOP and await the Stage 0.3 brief.
