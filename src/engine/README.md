# src/engine/

Deterministic battle simulation. **Pure TypeScript — no DOM, no React, no I/O.**

## Overview

- `rng.ts` — mulberry32 seeded PRNG (`createRng(seed)`) + `shuffled()`. All engine randomness flows through an injected `Rng`, never `Math.random`. (MVP combat consumes no randomness — battles are fully determined by the lineups; the RNG is part of the contract for future content.)
- `config.ts` — `BattleConfig`: element wheel (data, not code), advantage/disadvantage multipliers (×1.5 / ×0.75), round cap (200 → draw). `elementMultiplier()`.
- `abilityRules.ts` — the pinned per-effect target legality table + effect/trigger requirements. The content schema imports this, so illegal ability data is rejected at validation time.
- `types.ts` — runtime types: `CreatureInstance` (current Power/Vitality, shield & guard charges), `BattleState`, `BattleResult`, typed lineup errors.
- `events.ts` — the typed `BattleEvent` union. The ordered event log is the contract between engine and UI: every state change is an event with cause attribution. Playback and explanations consume the log without re-simulating.
- `lineup.ts` — `validateLineup()`: exactly 5, no duplicate identities, all references resolvable; returns typed errors, never throws.
- `battle.ts` — `runBattle(input, config?)`: battle-start phase, then rounds of simultaneous front exchanges with before/after-attack triggers, death processing, compression, and end-of-round triggers. See the file-top comment for the exact resolution model (corpse-until-checkpoint, FIFO trigger queue, front-most-first player-first ordering).

Public API is re-exported from `index.ts`.

## Determinism

Same lineups + same seed = identical event log, verified by a 1,000-battle double-run harness in `battle.test.ts`. Termination is guaranteed by the round cap (a capped battle is a draw, and draws count as a player win).

## Archetype simulation

```
npm run sim:archetypes
```

Pits the three archetype lineups (guardian wall / scavenger snowball / trigger tempo) against each other and in mirrors across many seeded slot-order shuffles, printing a win-rate table. Because battles are deterministic, the seed drives lineup _ordering_ samples — the table shows whether the archetypes are strategically distinct, not final balance.

## Boundary rules

- **Never** imports React, react-dom, or anything from `src/ui/` or `src/state/`.
- **Never** touches the DOM, browser storage, or the network. No `window`, `document`, `localStorage`, `fetch`.
- Imports from `src/content/schemas.ts` are **type-only** — the engine does no file I/O and receives all definitions as parameters.
- Communicates outward only through the event log and result snapshots.

These rules are enforced by ESLint (`no-restricted-imports` / `no-restricted-globals` for `src/engine/**` in `eslint.config.js`) — violations fail `npm run lint`.
