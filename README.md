# Mythic Circuit

An original creature-collecting auto-battler for desktop web: open packs, collect creatures, arrange five of them into an ordered **Circuit**, and watch deterministic auto-battles in 7-win / 3-loss runs. Fully local — no backend, no accounts, no network calls.

**Status:** Phase 0, Stage 0.1 — repository foundation. App shell + content schemas only; no gameplay yet.

## Setup

Requires Node.js 20.19+ (developed on Node 22).

```
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`).

## Scripts

| Script                     | What it does                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`              | Start the Vite dev server                                                                    |
| `npm run build`            | Typecheck + production build to `dist/`                                                      |
| `npm run preview`          | Serve the production build locally                                                           |
| `npm test`                 | Run the Vitest suite once                                                                    |
| `npm run lint`             | ESLint (includes the engine-isolation rules)                                                 |
| `npm run typecheck`        | TypeScript project check (`tsc -b`)                                                          |
| `npm run validate:content` | Validate all JSON under `src/content/data/` + the asset manifest; exits nonzero on any error |
| `npm run format`           | Prettier over the repo                                                                       |

## Directory map

```
src/
  engine/      Pure-TS deterministic battle sim (Stage 0.2). No React/DOM — lint-enforced.
  content/     JSON game data + Zod schemas + pure validator. Content is data, never code.
  services/    Save/load, Embers ledger, pack generation, run manager (Stage 0.4).
  state/       Zustand stores wiring services to UI (Stage 0.3+).
  ui/          React screens & components; renders from event logs + snapshots only.
  assets/      Art manifest contract + placeholder art. See src/assets/README.md for
               how Creative swaps in real art with zero code changes.
scripts/       Node CLIs (content validator).
```

Each `src/` directory has a README stating its boundary rules.

## Design & planning docs

- [Game design reference](ai-communication-docs/phase-0/MYTHIC_CIRCUIT_GAME_DESIGN_REFERENCE.md) — rules of the game (wins over any conflicting doc)
- [Phase 0 detailed plan](ai-communication-docs/phase-0/MYTHIC_CIRCUIT_PHASE_0_DETAILED_PLAN.md) — architecture (§5), data models (§6), stage plan
- Stage briefs & completion reports: `ai-communication-docs/phase-0/`

## Working agreement

Work proceeds in PM-gated stages (currently 0.1 → 0.6). The repository owner commits manually via GitHub Desktop; automated agents never run `git commit` or `git push`.
