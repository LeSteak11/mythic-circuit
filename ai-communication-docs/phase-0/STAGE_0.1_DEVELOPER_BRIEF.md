# Mythic Circuit — Stage 0.1 Developer Brief

**Issued by:** Project Manager · **Date:** 2026-08-19 · **Status:** AUTHORIZED
**Stage:** 0.1 — Product specification and repository foundation
**You are authorized for this stage ONLY. Stop when it is done and file a completion report.**

## Project-wide working agreement (applies to EVERY stage of this project)

1. **One stage at a time.** Work only the stage authorized by the current PM brief. Never start the next stage — the PM issues its brief after accepting your report.
2. **Completion report is a file, not just chat.** When a stage is done, write `ai-communication-docs/phase-0/reports/STAGE_<X.X>_COMPLETION_REPORT.md` (create the folder if missing) containing: what was built per ticket, implementation details worth knowing, test/lint/typecheck output, browser checks + screenshot references, known issues, deferred or uncertain items. This file is what the PM reviews.
3. **Commit text for the owner, every stage.** The owner commits manually through GitHub Desktop — you never run `git commit` or `git push`. End every completion report with a **ready-to-paste commit block**:

   ```
   COMMIT TITLE:
   Phase 0 / Stage <X.X> — <short summary>

   COMMIT DESCRIPTION:
   <what changed, grouped by ticket, in plain language>
   ```

   Keep the title format identical every stage so the repo history stays organized by phase and stage.
4. **Stop and wait.** After the report file and commit block are delivered, stop. Ask nothing of the next stage; the PM will review and either request corrections or issue the next brief.

## Context

Mythic Circuit is an original creature-collecting auto-battler: open packs, collect creatures, build an ordered five-creature "Circuit," watch deterministic auto-battles in 7-win/3-loss runs. Desktop web, fully local, no backend. Reference docs live in `ai-communication-docs/phase-0/`: read `MYTHIC_CIRCUIT_GAME_DESIGN_REFERENCE.md` (game rules) and `MYTHIC_CIRCUIT_PHASE_0_DETAILED_PLAN.md` (architecture, §5–6) before starting. This stage builds the foundation only — **no gameplay logic, no battle engine, no UI beyond a shell.**

## Confirmed decisions (do not revisit)

React 18 + TypeScript (strict) + Vite · Vitest + React Testing Library · Zod for content schemas · Zustand for state · CSS Modules + custom properties · localStorage persistence (later stage) · engine will live in `src/engine/` as pure TS with zero DOM/React imports · all content data-driven JSON · owner commits manually via GitHub Desktop — **never run `git commit`**.

## Tickets (in order)

1. **Scaffold the repo.** Vite + React + TS strict at repo root (repo already has `.git` and `ai-communication-docs/` — don't disturb them). Add `.gitignore`, ESLint + Prettier, npm scripts: `dev`, `build`, `test`, `lint`, `typecheck`, `validate:content`.
2. **Directory structure.** Create `src/engine/`, `src/content/`, `src/services/`, `src/state/`, `src/ui/`, `src/assets/placeholder/` per plan §5, each with a short README.md stating its boundary rules. Add an ESLint rule (e.g. import restriction) that fails if `src/engine/` imports from `src/ui/`, `src/state/`, or React/DOM.
3. **Content schemas.** Zod schemas + TS types for: CreatureDefinition, AbilityDefinition, CardVariant, Pack, OpponentLineup, RewardTable, SaveFile envelope (schemaVersion only for now) — fields per plan §6. Include 2–3 example creatures/abilities as JSON fixtures using `PH_` placeholder naming (e.g. `PH_EMBER_GUARDIAN_01`).
4. **Content validator.** `validate:content` script that loads all JSON under `src/content/data/`, validates against schemas, exits nonzero with readable errors on failure. Add passing + intentionally-failing fixture tests.
5. **Asset manifest contract.** `src/assets/manifest.json` mapping variantId → art/frame paths, with a Zod schema, a loader stub, and 2 placeholder images (simple generated gradients, clearly labeled placeholder). Document in `src/assets/README.md` how Creative swaps in real art with zero code changes.
6. **App shell.** Minimal React shell with client-side routing and empty placeholder screens: Home, Collection, Circuit Builder, Battle, Packs, Settings. Bare navigation, "Mythic Circuit" title, no game logic. One smoke test that the shell renders and routes.
7. **Root README.** Setup (`npm install`, `npm run dev`), all scripts, directory map, link to the design reference and plan docs.

## Definition of done

- Fresh clone: `npm install && npm run dev` serves the shell; all six routes reachable.
- `npm run lint`, `typecheck`, `test`, `validate:content` all pass; engine-isolation lint rule demonstrably fails when violated (show evidence, then remove the violation).
- Example fixtures validate; the bad fixture is rejected with a clear error.
- No gameplay logic, no battle code, no persistence beyond stubs. Nothing outside this brief.

## Verification requirements

Run all four scripts and include output. Browser-check the shell (each route) and include screenshots. Note any deviation from the plan's architecture with rationale.

## Out of scope — do not touch

Battle engine or any combat logic · real creature roster · pack opening · saves/localStorage · currency · animations · styling beyond a plain readable shell · sound · any dependency not listed without flagging it in your report first.

## Completion report

Follow the project-wide working agreement above: write `ai-communication-docs/phase-0/reports/STAGE_0.1_COMPLETION_REPORT.md` with all required sections, ending with the ready-to-paste commit block (title: `Phase 0 / Stage 0.1 — ...`). Then STOP and await the Stage 0.2 brief.
