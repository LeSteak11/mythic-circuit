# Stage 0.1 Completion Report — Product Specification & Repository Foundation

**From:** Developer · **Date:** 2026-08-19 · **Stage status:** COMPLETE, awaiting PM review
**Brief:** `STAGE_0.1_DEVELOPER_BRIEF.md`

---

## 1. What was built, per ticket

### Ticket 1 — Scaffold the repo ✅

- Vite 6 + React 18 + TypeScript (strict) at repo root; `.git` and `ai-communication-docs/` untouched.
- TypeScript is strict-plus: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`, `noFallthroughCasesInSwitch` (see `tsconfig.app.json` / `tsconfig.node.json`).
- ESLint 9 (flat config) + typescript-eslint + react-hooks/react-refresh plugins + Prettier (with `eslint-config-prettier` so they don't fight).
- `.gitignore` covering node_modules, dist, coverage, logs, editor files.
- npm scripts: `dev`, `build`, `preview`, `test`, `lint`, `typecheck`, `validate:content`, `format`.

### Ticket 2 — Directory structure ✅

- Created `src/engine/`, `src/content/`, `src/services/`, `src/state/`, `src/ui/`, `src/assets/placeholder/` per plan §5, each with a README.md stating its boundary rules and which stage fills it in.
- Engine-isolation lint rules in `eslint.config.js`, scoped to `src/engine/**`:
  - `no-restricted-imports`: bans `react`, `react-dom`, and any import path containing `ui/` or `state/`.
  - `no-restricted-globals`: bans `window`, `document`, `localStorage`, `sessionStorage`, `navigator`, `fetch`.
- **Demonstrated failing** (evidence in §4.5 below), then the violation file was removed.

### Ticket 3 — Content schemas ✅

- `src/content/schemas.ts`: Zod schemas + inferred TS types for CreatureDefinition, AbilityDefinition, CardVariant, Pack, OpponentLineup, RewardTable, and the SaveFile envelope (schemaVersion only, per brief). Closed enums for the 4 elements, 3 rarities, 7 triggers, 8 effects, and a planning-level target list. All object schemas are `.strict()` (unknown keys rejected).
- Cross-field rules encoded: pack `raritySlotTable` length must equal `slotCount`; opponent lineups are exactly 5 creature ids with no duplicates.
- Fixtures under `src/content/data/`: 3 creatures + 3 abilities (one per target archetype: guardian / scavenger / trigger-tempo) + 2 card variants, all `PH_`-named.

### Ticket 4 — Content validator ✅

- Pure validation logic in `src/content/validateContent.ts` (no Node/DOM APIs, unit-testable); file-loading CLI in `scripts/validate-content.ts`, wired to `npm run validate:content`.
- Loads **all** JSON under `src/content/data/`, maps filename → schema, rejects unknown filenames, checks unique ids, and enforces referential integrity (creature→ability, variant→creature, creature→evolvesFrom, variant→manifest entry). Also validates `src/assets/manifest.json`. Exits nonzero with readable `[file] message` errors.
- Tests: passing run against shipped data + intentionally-failing fixture (`src/content/__fixtures__/invalid-creatures.json` — kept outside `data/` so the CLI never reads it) asserting specific error messages. CLI-level failure also demonstrated live (§4.4).

### Ticket 5 — Asset manifest contract ✅

- `src/assets/manifest.json` mapping **variantId → { art, frame } paths** (per brief wording), validated by `src/assets/manifestSchema.ts` (Zod).
- Loader stub `src/assets/loadManifest.ts`: `loadAssetManifest()` (parse-on-load, cached), `getVariantAssets(variantId)`, `resolveAssetUrl(path)`.
- 3 placeholder SVGs under `src/assets/placeholder/` (2 art gradients + 1 card frame), each visually labeled `PLACEHOLDER`.
- `src/assets/README.md` documents the zero-code art-swap workflow for Creative, step by step.

### Ticket 6 — App shell ✅

- Minimal React shell: "Mythic Circuit" header, keyboard-navigable nav with visible focus states and active-route highlighting, six routes (Home `/`, Collection `/collection`, Circuit Builder `/circuit`, Battle `/battle`, Packs `/packs`, Settings `/settings`), each an empty placeholder screen. CSS Modules + CSS custom properties (`src/ui/global.css`), plain and readable only.
- Smoke tests: shell renders title + nav; each of the six routes renders its screen (7 UI tests).

### Ticket 7 — Root README ✅

- Setup, full script table, directory map, links to the design reference and plan docs, and the owner-commits-manually working agreement.

## 2. Implementation details worth knowing

- **Two TS projects** (Vite convention): `tsconfig.app.json` (src, DOM libs) and `tsconfig.node.json` (vite.config + `scripts/` + the three pure src modules the validator CLI imports). `npm run typecheck` = `tsc -b` over both.
- **Validator split** (pure logic vs. CLI wrapper) keeps `src/content/` free of Node APIs — the same module can later run inside the app if we ever want load-time validation.
- **Content ids vs. names:** ids are kebab-case and stable (`creature-ember-guardian-01`); display names carry the `PH_` placeholder convention (`PH_EMBER_GUARDIAN_01`). The schema enforces id shape; the PH_ prefix is convention, enforced at review (matches the plan's intent that Creative renames without id churn).
- **Ability targets** are a planning-level enum; Stage 0.2 will pin down per-effect target legality (e.g. `scavenge` only makes sense with `self`). Schemas are expected to tighten then.
- Save-file envelope is schemaVersion-only by explicit brief instruction; payload lands in Stage 0.4.

## 3. Dependencies (flagging per brief §Out of scope)

Beyond the confirmed stack (React 18, TypeScript, Vite, Vitest + RTL, Zod, ESLint, Prettier), these are in the tree and **flagged for PM awareness**:

| Package | Why |
|---|---|
| `react-router-dom@7` | Client-side routing for the shell (ticket 6). Started on v6, **upgraded to v7** because `npm audit` reported two moderate advisories against all of v6 (GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg). Our usage (BrowserRouter/Routes/NavLink) is identical across v6/v7; audit is now clean (0 vulnerabilities). |
| `tsx` (dev) | Runs the TypeScript validator CLI (`validate:content`) without a build step. |
| `@types/node`, `jsdom`, `globals`, `@eslint/js`, `typescript-eslint`, eslint react plugins, `eslint-config-prettier` (dev) | Standard tooling support for the confirmed stack. |

**Not installed:** Zustand (confirmed for the stack, but nothing in Stage 0.1 uses state stores — installing it unused would violate "nothing extra"; it comes in with Stage 0.3's stores). Playwright likewise deferred until the 0.3 browser-verification requirement.

## 4. Verification output

### 4.1 `npm run typecheck` — PASS (exit 0)

```
> tsc -b
(no output — clean)
```

### 4.2 `npm run lint` — PASS (exit 0)

```
> eslint .
(no output — clean)
```

### 4.3 `npm test` — PASS (exit 0, 18/18)

```
✓ src/assets/loadManifest.test.ts (3 tests) 6ms
✓ src/content/validateContent.test.ts (8 tests) 9ms
✓ src/ui/App.test.tsx (7 tests) 173ms

Test Files  3 passed (3)
     Tests  18 passed (18)
```

### 4.4 `npm run validate:content` — PASS (exit 0), and failing case demonstrated

Passing run:

```
Content validation passed: 3 content file(s) + asset manifest are valid.
  abilities.json: 3 entries
  card-variants.json: 2 entries
  creatures.json: 3 entries
```

Bad-fixture demonstration (invalid fixture temporarily swapped in as `creatures.json`, then restored — exit code 1):

```
Content validation FAILED with 7 error(s):

  [creatures.json] entry 0 → name: Required
  [creatures.json] entry 0 → element: Invalid enum value. Expected 'ember' | 'volt' | 'tide' | 'verdant', received 'shadow'
  [creatures.json] entry 0 → power: Number must be greater than 0
  [creatures.json] duplicate id "creature-dupe-01"
  [creatures.json] creature "creature-dupe-01" references unknown abilityId "ability-does-not-exist"
  [card-variants.json] variant "variant-ember-guardian-01-standard" references unknown creatureId "creature-ember-guardian-01"
  [card-variants.json] variant "variant-tide-scavenger-01-standard" references unknown creatureId "creature-tide-scavenger-01"
```

(Restored data re-validated clean immediately after.)

### 4.5 Engine-isolation lint rule — demonstrated failing, then removed

A temporary `src/engine/lint-violation-demo.ts` importing React + `../ui/App` and touching `document`/`localStorage` produced (exit code 1):

```
src\engine\lint-violation-demo.ts
  2:1   error  'react' import is restricted ... src/engine/ must not import React. The engine is pure TypeScript   no-restricted-imports
  3:1   error  '../ui/App' import is restricted ... src/engine/ must not import from src/ui/ or src/state/         no-restricted-imports
  6:14  error  Unexpected use of 'document'. src/engine/ must not touch the DOM                                    no-restricted-globals
  7:38  error  Unexpected use of 'localStorage'. src/engine/ must not touch browser storage                        no-restricted-globals

✖ 4 problems (4 errors, 0 warnings)
```

The file was deleted; lint is clean again (exit 0).

### 4.6 `npm run build` — PASS (exit 0)

```
✓ 46 modules transformed.
dist/index.html                 0.40 kB
dist/assets/index-*.css         0.94 kB
dist/assets/index-*.js        183.49 kB │ gzip: 60.25 kB
```

### 4.7 `npm audit` — 0 vulnerabilities (after router v7 upgrade).

## 5. Browser checks

Dev server (`npm run dev`, port 5173) checked in-browser: all six routes reachable both by **direct URL** and by **clicking the nav** (client-side routing confirmed — content swaps without a page load); active nav item highlights per route; **zero console errors** across all routes.

Screenshots (1280×800, captured against the final code) in `ai-communication-docs/phase-0/reports/screenshots/`:

- `stage-0.1-home.png` · `stage-0.1-collection.png` · `stage-0.1-circuit-builder.png` · `stage-0.1-battle.png` · `stage-0.1-packs.png` · `stage-0.1-settings.png`

## 6. Deviations from the plan

- None architectural. Two judgment calls, both flagged above: react-router-dom v7 instead of v6 (security advisories), and Zustand deliberately not installed until a stage uses it.
- The manifest maps `variantId → {art, frame}` per the brief's ticket 5 wording; CardVariant's `artRef`/`frameRef` fields (plan §6) are retained as logical art identity labels. If the PM prefers dropping one of the two, it's a small Stage 0.2+ data tweak.

## 7. Known issues

- None functional. All checks green, audit clean.
- `.claude/launch.json` was added (dev-tooling convenience for launching the dev server during agent verification). Harmless; say the word if you'd rather it be gitignored.

## 8. Deferred / uncertain items

- **Ability target legality** per effect — deliberately loose at planning level; tightens in Stage 0.2 (may adjust fixture data).
- **PH_ name prefix** is convention + review-enforced, not schema-enforced — happy to add a schema regex if the PM wants it hard-enforced.
- **Zustand & Playwright** installs deferred to the stages that first use them (0.3).
- Frame placeholder is one shared `frame-standard.svg`; per-rarity frames arrive with real card treatment work.

---

## Commit text

Per owner request, the ready-to-paste commit title/description was delivered in the dev-session chat rather than in this document.
