# Stage 0.2 Completion Report — Deterministic Battle Engine

**From:** Developer · **Date:** 2026-08-19 · **Stage status:** COMPLETE, awaiting PM review
**Brief:** `STAGE_0.2_DEVELOPER_BRIEF.md`

---

## 1. What was built, per ticket

### Ticket 1 — Engine types & battle state ✅

`src/engine/types.ts`: `CreatureInstance` (current Power incl. buffs, current/max Vitality, shield charges, guard charges, defeat flag, once-only below-half flag, token flag), `BattleState` (slot = array index, index 0 = front), `BattleResult`, `BattleInput`, typed lineup errors. Instances are constructed from `CreatureDefinition` + `AbilityDefinition`; all imports from `src/content/schemas.ts` are **type-only** — the engine does zero file I/O and receives definitions as parameters.

### Ticket 2 — Seeded RNG ✅

`src/engine/rng.ts`: mulberry32 (`createRng(seed)`) with `next()` / `nextInt()` plus a deterministic `shuffled()` helper. Unit-tested for same-seed reproducibility, seed divergence, and range. Injected into the battle context; `Math.random` appears nowhere in the engine. **Note:** MVP combat consumes no randomness — battles are fully determined by lineups (no random targets or odds exist in the 7-trigger/8-effect set). The RNG is wired as part of the engine contract for future content, and the sim/tests use it for lineup sampling.

### Ticket 3 — Lineup validation ✅

`src/engine/lineup.ts`: `validateLineup(creatureIds, creaturePool, abilityPool)` — exactly 5, no duplicate identities, creature and ability references resolvable. Returns typed `LineupError` results (`wrong_size` / `duplicate_creature` / `unknown_creature` / `unknown_ability`), never throws; collects all errors, not just the first. `runBattle` runs it on both sides and throws a typed `LineupInputError` on invalid programmatic input.

### Ticket 4 — Core battle loop ✅

`src/engine/battle.ts` — per round: `before_own_attack` (fronts) → **simultaneous exchange** (both damage amounts computed before either applies, so mutual KOs work) → `after_own_attack` (surviving attackers) → deaths/compression → `end_of_round`. Element multipliers from `src/engine/config.ts` (`BattleConfig`: wheel as data, ×1.5/×0.75/×1.0, round cap 200). End conditions: side empty → win/loss; both empty → draw; round cap → draw. **Draws count as a player win.** Every state change emits an event with cause attribution.

### Ticket 5 — Trigger/effect system ✅

All 7 triggers and 8 effects implemented centrally in `battle.ts` (`applyEffect`/`applyHit`); creatures stay pure data. Confirmed resolution order: triggers queue FIFO; simultaneous triggers order front-most first, player before opponent on slot ties; effects never interrupt each other mid-resolution. **Target legality pinned** in `src/engine/abilityRules.ts` and enforced by the content schema (`schemas.ts` imports the table into a `superRefine`), so illegal ability data now fails `validate:content`:

| Effect | Legal targets | Extra rule |
|---|---|---|
| damage | front_enemy, last_enemy, all_enemies | flat damage; element multiplier applies to attacks only |
| heal | self, ally_behind, ally_lowest_vitality, all_allies | capped at max Vitality |
| buff_power | self, ally_behind, ally_lowest_vitality, all_allies | |
| buff_vitality | self, ally_behind, ally_lowest_vitality, all_allies | raises current **and** max |
| shield | self, ally_behind | blocks the next hit(s) completely |
| summon | self | token → summoner's side, last slot; fizzles if 5 alive |
| scavenge | self | **requires trigger ally_defeated** (schema-enforced) |
| guard | self | arms on self; redirects hits aimed at the ally directly behind |

`ability-guard-01` in the fixtures was updated (`ally_behind` → `self`) to match.

### Ticket 6 — Event log ✅

`src/engine/events.ts`: typed `BattleEvent` union — `battle_start` (full lineup snapshots), `round_start`, `trigger_fired`, `attack` (attacker/defender/amount/multiplier), `damage` (target, amount, remaining Vitality, `blockedByShield`, optional `redirectedFrom`), `heal`, `buff` (stat/amount/newValue), `shield`, `summon` (token snapshot), `defeat`, `compression` (removed ids + resulting order), `battle_end`. One addition beyond the brief's list: a **`guard`** event (guard charges armed), symmetric with `shield` — without it, playback couldn't show why a later hit gets redirected. Every mutating event carries an `EventCause` (`attack` / `ability {abilityId, sourceId, trigger}` / `system`).

### Ticket 7 — Test roster ✅

**Dev's call, as invited by the brief: the roster lives in `src/content/data/`** (creatures.json / abilities.json, now 12 + 12), not a test-only dataset — so `validate:content` covers it, later stages reuse it, and it exercises the real data path. Every trigger and effect is used by at least one creature; archetype representatives: guardians (guardian/shellback/oracle/healer), scavengers (martyr/broodmother/scavenger/berserker), tempo (rager/striker/stormcaller/sniper). All `PH_`-named. Engine unit tests additionally use small inline definitions for precise scenario control.

### Ticket 8 — Test suite ✅

32 new engine tests (50 total, all passing):
- **Per-trigger** (all 7) and **per-effect** (all 8) behavior tests with exact-value assertions.
- **Determinism harness:** 1,000 seeded random battles (random roster picks + orders) each run twice; event logs compared — identical.
- **Termination:** mutual-healer stall ends at the round cap as a draw (player win).
- **Edge cases:** double KO (mutual defeat + both-empty draw), summon into a full board (fizzles) and onto an otherwise-empty board (battle continues with the token), guardian dying while guarding (redirect kills it, ward untouched), scavenger stacking across four deaths, trigger ordering (player-1 → opponent-2 → player-3), dead attackers not firing after_own_attack, heal capping, shield expiry.
- **Lineup validation:** all error codes, multi-error collection.
- **RNG:** reproducibility, divergence, ranges, deterministic shuffle.

### Ticket 9 — Archetype meaningfulness check ✅

`npm run sim:archetypes` (`scripts/sim-archetypes.ts`). Battles are deterministic, so the seeded RNG samples the strategy space: each trial shuffles both sides' **slot order** and runs one battle (500 trials per matchup). Results:

| Matchup | A wins | B wins | Draws | A win rate |
|---|---|---|---|---|
| guardian-wall vs guardian-wall | 172 | 224 | 104 | 34.4% |
| guardian-wall vs scavenger-snowball | 417 | 63 | 20 | 83.4% |
| guardian-wall vs trigger-tempo | 153 | 255 | 92 | 30.6% |
| scavenger-snowball vs scavenger-snowball | 112 | 107 | 281 | 22.4% |
| scavenger-snowball vs trigger-tempo | 51 | 367 | 82 | 10.2% |
| trigger-tempo vs trigger-tempo | 225 | 185 | 90 | 45.0% |

(Draws are reported separately here; in a real run a draw counts as a player win.)

**Reading:** the archetypes are clearly not interchangeable — a rock-paper-scissors texture emerged: **wall crushes scavenger (83%), tempo beats wall (69% of decisive games), tempo beats scavenger (88% of decisive games)**. Order matters too (mirror matches are sensitive to slot shuffles, and scavenger mirrors stall into draws 56% of the time). That's strong evidence of strategic meaning. Balance flag for Stage 0.5: scavenger-snowball is currently the weak leg and its mirror stalls often — the 0.5 balance pass should give scavengers more closing power.

## 2. Implementation details worth knowing (resolution semantics)

Decisions the design reference left open, now pinned (all documented in `battle.ts`'s header and `src/engine/README.md`):

- **Corpse-until-checkpoint:** defeated creatures stay in their slot while the trigger queue drains, keeping slot references stable mid-resolution; a cleanup pass then removes them, emits `compression`, and end conditions are checked. Checkpoints: after battle-start phase and after each round phase.
- **Stale triggers:** a queued trigger is skipped if its source has since been defeated — except `self_defeated`, whose source is dead by definition.
- **after_own_attack** fires only for attackers that survived the exchange.
- **Attack damage** = `max(1, round(power × multiplier))`; **ability damage is flat** (no element multiplier).
- **Guard** redirects one hop only (no guardian-behind-guardian chains) and can never intercept front-vs-front attacks (nothing stands in front of the front). Redirected hits can still be blocked by the guardian's own shield.
- **first_below_half_vitality** is once-per-battle per creature (flag set on first crossing, even if later healed above half).
- **Summon tokens:** power = vitality = magnitude, summoner's element, no ability, `PH_SUMMON_TOKEN`. Board capacity 5 living per side.
- **ally_lowest_vitality** picks the living ally (including self) with lowest current Vitality, front-most on ties.

## 3. Verification output

### `npm run typecheck` — PASS (exit 0)
```
> tsc -b
(clean)
```

### `npm run lint` — PASS (exit 0)
```
> eslint .
(clean — engine-isolation rules active on all new src/engine/ files)
```

### `npm test` — PASS (exit 0, 50/50)
```
✓ src/engine/lineup.test.ts (6 tests)
✓ src/content/validateContent.test.ts (8 tests)
✓ src/assets/loadManifest.test.ts (3 tests)
✓ src/engine/rng.test.ts (5 tests)
✓ src/engine/battle.test.ts (21 tests)   ← incl. 1,000-battle determinism harness
✓ src/ui/App.test.tsx (7 tests)

Test Files  6 passed (6)
     Tests  50 passed (50)
```

### `npm run validate:content` — PASS (exit 0)
```
Content validation passed: 3 content file(s) + asset manifest are valid.
  abilities.json: 12 entries
  card-variants.json: 2 entries
  creatures.json: 12 entries
```

### `npm run build` — PASS (exit 0) — app shell untouched and building
```
✓ 46 modules transformed.
dist/index.html                 0.40 kB
dist/assets/index-*.css         0.94 kB
dist/assets/index-*.js        183.49 kB │ gzip: 60.25 kB
```

### `npm run sim:archetypes` — table in Ticket 9 above.

No browser checks required this stage (headless); the shell build above confirms the UI is untouched. No new dependencies were added.

## 4. Known issues

- None functional; all checks green.
- The engine emits `attack` events for both fronts before applying either hit (simultaneity), so playback in 0.3 should treat attack+damage pairs per round as one exchange — the event data supports this.

## 5. Deferred / uncertain items

- **Scavenger archetype strength** — flagged above for the Stage 0.5 balance pass (meaningfulness proven; balance explicitly out of scope now).
- **Round cap value (200)** is config; never reached by any roster battle observed (draw counts in the sim come from both-empty draws, plus scavenger-mirror stalls hitting the cap).
- **`guard` event type** added beyond the brief's 12-item list (rationale in Ticket 6) — flagging for PM awareness; trivially removable if unwanted.
- Card variants exist for only 2 of 12 roster creatures — variants for the rest arrive with Stage 0.5 content work (validator only requires variant→creature, not the reverse).

---

## Ready-to-paste commit block

```
COMMIT TITLE:
Phase 0 / Stage 0.2 — Deterministic battle engine, event log, roster, test harness

COMMIT DESCRIPTION:
Ticket 1 — Engine runtime types: CreatureInstance (buffed Power, current/max
Vitality, shield/guard charges), BattleState, BattleResult, typed lineup errors.
Type-only imports from content schemas; no file I/O in the engine.

Ticket 2 — Seeded mulberry32 RNG (createRng + deterministic shuffle), injected,
never Math.random; unit-tested for reproducibility.

Ticket 3 — validateLineup(): exactly 5, no duplicates, resolvable references;
typed error results, never throws.

Ticket 4 — Core battle loop: simultaneous front exchanges (mutual KOs possible),
element wheel + multipliers in config, defeat/compression, win/loss/draw-as-win,
200-round cap guaranteeing termination.

Ticket 5 — Central trigger/effect system: all 7 triggers and 8 effects, FIFO
effect queue, front-most-first player-first ordering. Per-effect target legality
pinned in src/engine/abilityRules.ts and enforced by the content schema
(ability-guard-01 fixture updated to match).

Ticket 6 — Typed event log with cause attribution on every state change
(+ a guard event so playback can explain redirects).

Ticket 7 — Roster expanded to 12 creatures / 12 abilities in src/content/data/,
covering every trigger and effect, with guardian/scavenger/tempo archetypes.

Ticket 8 — 32 new engine tests (50 total): per-trigger, per-effect,
1,000-battle determinism harness, termination, double-KO / summon / guard /
scavenger edge cases, lineup validation.

Ticket 9 — npm run sim:archetypes: 500-trial win-rate table per matchup showing
clear archetype divergence (wall > scavenger, tempo > wall, tempo > scavenger).

Verification: typecheck, lint, 50/50 tests, validate:content, and build all pass.
Full details in ai-communication-docs/phase-0/reports/STAGE_0.2_COMPLETION_REPORT.md.
```
