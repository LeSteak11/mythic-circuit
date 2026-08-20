# src/services/

Application services — **lands in Stage 0.4**: save/load (versioned schema), the Embers currency ledger, pack generation, and the run manager.

## Boundary rules

- Services are plain TypeScript modules — no React imports. UI reaches services only through `src/state/` stores.
- **Every** currency mutation goes through the single ledger service (the future monetization seam). No other module touches the Embers balance.
- Persistence (localStorage) is owned here; save data always carries a `schemaVersion` (envelope schema in `src/content/schemas.ts`).
