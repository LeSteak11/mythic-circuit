# src/state/

Zustand stores wiring services and the engine to the UI.

## Current stores

- `matchStore.ts` — ephemeral Stage 0.3 match state: the temporary Circuit under construction, selected opponent, and the current prepared match (immutable `BattleResult` + seed). `startBattle()` calls `runBattle` **exactly once** per match; playback only ever reads the stored event log. Deliberately not persisted — refresh resets it (persistence arrives in Stage 0.4).

## Boundary rules

- Stores may import the **public engine API** (`src/engine/index.ts`) and the content catalog (`src/content/catalog.ts`) — never private engine modules and never raw JSON.
- Game rules live in `src/engine/`, persistence (future) in `src/services/` — never here.
- `src/engine/` must never import from this directory (lint-enforced).
- No Zustand persistence middleware until the stage that authorizes saves.
