# Mythic Circuit — Stage 0.3 Developer Brief

**Issued by:** Project Manager · **Date:** 2026-08-19 · **Status:** AUTHORIZED  
**Stage:** 0.3 — Playable battle presentation and Circuit builder  
**You are authorized for this stage ONLY. Stop when it is done and file the completion report.**

## Project-wide working agreement

1. Work only this authorized stage. Do not begin collection, packs, progression, saves, runs, final content, or Stage 0.4 work.
2. The Owner commits manually through GitHub Desktop. **Never run `git commit` or `git push`.**
3. When complete, write `ai-communication-docs/phase-0/reports/STAGE_0.3_COMPLETION_REPORT.md` with delivery by ticket, implementation decisions, full verification output, browser checks, screenshot paths, known issues, and deferred work.
4. End that report with a ready-to-paste commit block titled `Phase 0 / Stage 0.3 — <summary>`, then stop and await PM gate review.

## Context

Stages 0.1 and 0.2 are accepted. The repository has a React/TypeScript/Vite shell, validated placeholder content, an asset-manifest boundary, and a deterministic headless engine with a typed event log. Read these before implementation:

- `ai-communication-docs/phase-0/MYTHIC_CIRCUIT_GAME_DESIGN_REFERENCE.md` v1.1 — rules source of truth, including Stage 0.2 resolution semantics
- `ai-communication-docs/phase-0/reports/STAGE_0.2_GATE_REVIEW.md` — accepted decisions and playback notes
- `src/engine/README.md` and exported API in `src/engine/index.ts`
- `src/ui/README.md` and `src/assets/README.md` — UI and asset boundaries

This stage makes the existing test roster playable from **Circuit Builder → Battle playback → Result**. It uses temporary content and has no collection ownership or persistence.

## Confirmed decisions — do not revisit

React 18 + strict TypeScript + Vite · CSS Modules + CSS custom properties · Zustand for ephemeral app state (authorized to install now; no persistence middleware) · Vitest/React Testing Library · Playwright for browser verification (authorized to install now) · desktop-first at 1024px and wider · engine event log is the sole playback source · `runBattle` executes once per match, never once per animation frame · same lineup + seed produces the same result · simultaneous exchanges must look simultaneous · all 13 current event types, including `guard`, require a visible/readable representation · placeholder names and assets remain clearly temporary.

## Tickets — implement in order

### Ticket 1 — UI dependencies, state boundary, and test harness

- Add Zustand and a small store under `src/state/` for only the temporary Circuit, selected opponent, and current `BattleResult`/playback session.
- Do not persist the store. Refresh may reset this stage's data.
- Add Playwright as a dev dependency, a minimal config, a `test:e2e` npm script, and Chromium-based smoke coverage. Keep Vitest for component/unit tests.
- Update the relevant boundary READMEs. UI/state may import the public engine API; it must not import private engine modules.

### Ticket 2 — Runtime content catalog and reusable creature card

- Add a typed runtime content adapter that validates/loads the existing creatures, abilities, variants, and asset manifest once, outside presentation components. Components must not parse raw JSON independently.
- Build one reusable card component used by both builder and battle views. It must show: placeholder name, Power, current/max Vitality when in battle, element in text plus a non-color cue, rarity, and the fully interpolated ability description.
- Resolve variant art/frame through the asset loader only. Never hard-code asset file paths in UI code.
- All 12 current creatures must remain usable. For a creature without a Stage 0.2 card variant, render an obvious accessible `PLACEHOLDER — ART PENDING` treatment; do not invent final art or add final-content scope.
- Card styling must use CSS custom properties/tokens so Creative can restyle the template without rebuilding its structure.

### Ticket 3 — Circuit Builder

Replace the `/circuit` shell with a functional temporary builder:

- Show all 12 representative creatures; collection ownership does not apply yet.
- Let the player add exactly five unique creature identities to ordered slots 1–5, remove them, and reorder them.
- Support pointer drag/reorder **and** explicit keyboard-accessible Move Forward / Move Back controls. Drag cannot be the only route.
- Prevent or clearly reject duplicates and overfilling. Use `validateLineup()` for final legality and surface readable validation messages.
- Clearly identify slot 1 as the front and slot 5 as the rear.
- Provide Reset and a primary `Battle this Circuit` action. The battle action remains disabled until the Circuit is legal.

### Ticket 4 — Temporary opponent selection and battle setup

- Provide three clearly labeled temporary opponents based on the accepted guardian-wall, scavenger-snowball, and trigger-tempo representative lineups. Keep lineup definitions centralized as temporary data, not embedded across components.
- Show the selected opponent's ordered Circuit before battle.
- Starting a battle calls `runBattle` exactly once with the player's ordered Circuit, selected opponent, validated abilities, and a fixed/documented seed. Store the resulting immutable event log for playback, then navigate to `/battle`.
- Direct navigation to `/battle` with no prepared match must show a friendly empty state linking back to the builder, not throw.

### Ticket 5 — Event-log playback model

- Implement a tested pure playback reducer/controller that reconstructs display state by applying `BattleEvent`s. It must never rerun combat rules or infer a different result.
- Cover every current event type: `battle_start`, `round_start`, `trigger_fired`, `attack`, `damage`, `heal`, `buff`, `shield`, `guard`, `summon`, `defeat`, `compression`, and `battle_end`.
- Convert the engine's two attack declarations plus their two damage applications into one presentation frame for a simultaneous front-line exchange. Preserve the raw engine log unchanged.
- Track displayed lineup order, current Vitality/Power, shield/guard charges, summons, defeats, current round, active source/targets, and readable log text.
- Keep playback timing/config separate from engine state so 1×, 2×, pause, step, and skip never change the outcome.

### Ticket 6 — Battle presentation and controls

Replace the `/battle` shell with readable playback driven by Ticket 5:

- Render both ordered Circuits with the front slots facing each other and clear player/opponent labels.
- Provide Play/Pause, Next, 1×, 2×, Skip to Result, and Replay controls with clear selected/disabled states.
- Visually and textually represent targeting, simultaneous attacks, element multiplier, damage, healing, Power/Vitality buffs, shield blocks/charges, guard arming/redirection, summons, defeat, compression, triggers, round changes, and the final outcome.
- Keep a persistent battle text log alongside the board. The log must make cause attribution understandable (attack versus named ability/trigger) and remain available after skipping.
- Animation may be simple CSS movement/highlights/fades, but state changes must be readable and must not depend on animation alone.

### Ticket 7 — Result state and replay loop

- On `battle_end`, show a result panel with winner/outcome, round count, defeats per side, and a short trigger/effect activity summary derived from the event log.
- Include `Edit Circuit` (back to builder) and `Replay Battle` actions.
- Draw outcomes must be labeled clearly while still showing that the engine awards them to the player. Do not add run wins/losses or rewards.

### Ticket 8 — Accessibility, responsive baseline, and Creative asset spec

- All builder and playback controls must work by keyboard with visible focus states and meaningful accessible names.
- Never communicate element, rarity, target, damage, healing, or outcome through color alone.
- Respect `prefers-reduced-motion`; reduced-motion playback may replace movement with immediate state changes plus highlights/log updates.
- At 1024px width, the builder and battle board must remain usable with no horizontal page overflow. Larger desktop layouts should use the available space cleanly. Mobile design is not required.
- Create `ai-communication-docs/phase-0/CREATIVE_ASSET_DELIVERY_SPEC.md`, aligned with the implemented card component. Pin and document:
  - card/frame master canvas: **1024×1432** (same ratio as the 512×716 working frame)
  - creature-art source: **1024×1024**, designed for a square crop; critical subject matter within the central 80%
  - frame/foil overlays: transparent PNG/WebP or SVG at the card master ratio
  - element/rarity/trigger icons: SVG preferred, or transparent PNG at 128×128 with critical marks inside a 96×96 safe area
  - sRGB color, transparency expectations, file naming, recommended file-size limits, safe zones matching the actual stat/name/ability overlays, and the manifest replacement workflow
- Include either a labeled diagram or a screenshot with overlaid safe zones in the spec so Creative can use it without reading code.

### Ticket 9 — Automated tests, browser verification, and documentation

Add focused tests for:

- card stat/ability rendering and missing-art fallback
- builder add/remove, duplicate prevention, five-card validation, and accessible reordering
- opponent selection and one-time battle creation
- pure playback state for every event type, including guard redirection, shield block, summon, compression, and simultaneous exchange grouping
- 1×/2× selection, pause/next, skip-to-result, replay, and direct `/battle` empty state
- result summary and draw-as-player-win wording
- one Playwright builder → choose opponent → battle → skip/result → return-to-builder workflow

Update the root/UI/state/assets documentation for the implemented flow, controls, test commands, and asset contract.

## Definition of done

- A player can build and reorder a legal temporary five-creature Circuit, choose any of three opponents, and start a deterministic battle.
- Battle playback is driven only by the stored engine event log and works at 1×, 2×, step, and skip.
- Every event type has a visible and textual representation; simultaneous attacks are not presented as misleading sequential turns.
- The result screen reports outcome and summary and allows replay/edit.
- The flow works by keyboard, respects reduced motion, uses non-color cues, and is usable at 1024px+.
- The Creative asset delivery spec exists and matches the card implementation.
- Existing engine/content behavior remains green and no Stage 0.4 functionality is present.

## Required verification and evidence

Run and include the full results in the completion report:

```text
npm run typecheck
npm run lint
npm test
npm run validate:content
npm run sim:archetypes
npm run build
npm run test:e2e
```

Browser-check at 1440×900 and 1024×768. Verify keyboard-only builder and playback use, 1×/2×/pause/next, mid-battle state, skip/result, replay, direct `/battle` empty state, reduced-motion behavior, no page-level horizontal overflow, and no console errors.

Store and reference at minimum these screenshots in the report:

- `ai-communication-docs/phase-0/reports/screenshots/stage-0.3-builder.png` — legal five-card Circuit plus opponent selection
- `ai-communication-docs/phase-0/reports/screenshots/stage-0.3-battle.png` — mid-battle simultaneous exchange/effect feedback and text log
- `ai-communication-docs/phase-0/reports/screenshots/stage-0.3-result.png` — final result and summary
- `ai-communication-docs/phase-0/reports/screenshots/stage-0.3-1024.png` — usable 1024px layout
- the safe-zone diagram/screenshot referenced by `CREATIVE_ASSET_DELIVERY_SPEC.md`

List any event representation that is primarily textual rather than animated. Browser evidence is mandatory at this gate.

## Out of scope — do not touch

Collection ownership or collection screen implementation · packs or pack opening · Embers/currency/ledger · run structure, rewards, or opponent difficulty progression · onboarding · localStorage, save schema payload, or persistence · three saved Circuit slots · final creature names/art/card design · roster expansion beyond the 12 representative creatures · balance changes · new or changed combat rules/triggers/effects/elements · evolution/family mechanics · sound · mobile layout · backend/accounts/PvP · Zustand persistence middleware.

If UI work exposes a probable engine defect, document a minimal reproduction and stop for PM direction before changing accepted combat semantics.

## Completion report

Write `ai-communication-docs/phase-0/reports/STAGE_0.3_COMPLETION_REPORT.md` with all standard sections, a per-event representation table, automated outputs, browser-check table, screenshot paths, the Creative spec reference, known issues, and deferred items. End the file with:

```text
COMMIT TITLE:
Phase 0 / Stage 0.3 — <short summary>

COMMIT DESCRIPTION:
<delivery grouped by ticket, verification results, and documented limitations>
```

Then **STOP**. Do not begin Stage 0.4.
