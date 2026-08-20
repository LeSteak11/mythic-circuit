# src/content/

Game content as **data**: creatures, abilities, card variants, packs, opponent lineups, reward tables — plus the Zod schemas and validation that keep them honest.

## Boundary rules

- All content lives in JSON under `data/`, validated against the schemas in `schemas.ts`. Adding a creature = adding data (and assets), **never** code.
- `validateContent.ts` is pure (no Node/DOM APIs); the file-loading CLI wrapper lives in `scripts/validate-content.ts` (`npm run validate:content`).
- Creature **identity** (stats/ability) is separate from card **variant** (art/frame/foil). Variants reference creatures by id; art resolves through `src/assets/manifest.json`, never raw paths in content.
- Placeholder display names use the `PH_` prefix so nothing placeholder ships looking final.
- `__fixtures__/` holds intentionally invalid data for tests — the validator CLI never reads it.
