# Mythic Circuit — Stage 0.4 Developer Brief

**Issued by:** Project Manager · **Date:** 2026-08-19 · **Status:** AUTHORIZED  
**Stage:** 0.4 — Collection, packs, local progression, runs, and saves  
**You are authorized for this stage ONLY. Stop when it is done and file the completion report.**

## Project-wide working agreement

1. Work only this authorized stage. Do not begin Stage 0.5 roster expansion, balance, or Creative integration.
2. The Owner commits manually through GitHub Desktop. **Never run `git commit` or `git push`.**
3. Do not mix Developer, PM, or Creative work in one commit. Do not modify the Owner-managed root Creative Direction HTML.
4. When complete, write `ai-communication-docs/phase-0/reports/STAGE_0.4_COMPLETION_REPORT.md` with delivery by ticket, model/transaction decisions, full verification output, browser evidence, screenshots, known issues, and deferred work.
5. End the report with a ready-to-paste commit block titled `Phase 0 / Stage 0.4 — <summary>`, then stop for PM gate review.

## Context

Stages 0.1–0.3 are closed. The repository has validated content, a deterministic engine, a functional Circuit Builder, event-log battle playback, and results. Read before implementation:

- `ai-communication-docs/phase-0/MYTHIC_CIRCUIT_GAME_DESIGN_REFERENCE.md`
- `ai-communication-docs/phase-0/reports/STAGE_0.3_GATE_REVIEW.md`
- `src/engine/README.md`, `src/state/README.md`, `src/services/README.md`, `src/content/README.md`

This stage turns the Stage 0.3 battle sandbox into the complete local MVP progression loop:

**first launch → intro → starter pack → collection → saved Circuit → 7-win/3-loss run → Embers reward → standard pack → persistent progress → deliberate reset.**

All names, art, element labels, and economy terms remain placeholder content. The root Creative Direction document is reference material for later owner decisions, not authorization to integrate Creative work here.

## Confirmed product and economy decisions

- Fully local desktop web app; no backend, accounts, cloud, analytics, or network calls.
- Persistence uses versioned `localStorage` owned only by `src/services/`.
- Placeholder currency remains **Embers** in this stage.
- Players may keep **three saved Circuit slots**. Each slot may be incomplete, but only a legal five-identity Circuit may start/continue a battle.
- A run ends at **7 wins or 3 losses**. Both draw outcomes count as player wins.
- The Circuit may be edited between battles; each battle persists the exact player lineup snapshot it used.
- Standard pack cost: **100 Embers**.
- Standard pack size: **5 cards**.
- Fixed starter pack size: **8 unique creatures**, one copy each:
  - `creature-ember-guardian-01`
  - `creature-tide-scavenger-01`
  - `creature-volt-striker-01`
  - `creature-verdant-healer-01`
  - `creature-ember-rager-01`
  - `creature-tide-shellback-01`
  - `creature-volt-martyr-01`
  - `creature-verdant-broodmother-01`
- Run reward table (Embers by wins): **0→100, 1→110, 2→125, 3→140, 4→160, 5→185, 6→215, 7→250**. Every completed run therefore funds at least one standard pack during MVP testing.
- No bonus packs, crafting, duplicate conversion, daily rewards, premium packs, real money, or store UI.
- Standard-pack rarity weights by slot:

  | Slot | Common | Rare | Mythic |
  |---|---:|---:|---:|
  | 1 | 75 | 22 | 3 |
  | 2 | 75 | 22 | 3 |
  | 3 | 75 | 22 | 3 |
  | 4 | 60 | 34 | 6 |
  | 5 | 40 | 45 | 15 |

- Stage 0.4 has standard treatments only: variant weights **standard 100 / foil 0 / full-art 0**. Foils/full-art arrive in Stage 0.5.

## Required domain invariants

These are gate requirements, not implementation suggestions:

1. **No negative balance.** Every Embers mutation goes through one ledger service; no UI/store directly edits the balance.
2. **Ledger reconciliation.** Saved `embersBalance` must equal the signed sum of ledger entries. A mismatch is invalid save data, never silently repaired.
3. **Idempotent correlation ids.** A starter grant, pack purchase, or run reward with an already-used correlation id cannot apply twice.
4. **No pack reroll on refresh.** Purchase debit, generated contents, and collection acquisition are committed together before reveal. Reload resumes the same pending reveal.
5. **No reward duplication.** A run outcome is applied once and its terminal reward is credited once, even across refresh/back/navigation/repeated button activation.
6. **No loss dodging by refresh.** Once a battle starts, its lineup snapshots, seed, deterministic outcome, and applied run result are persisted together. Reload may restart playback, but cannot choose a new opponent or erase the result.
7. **Content references stay valid.** Collection entries, variants, Circuits, opponents, pending packs, and run snapshots reference known ids; invalid/impossible save state enters a typed recovery state instead of crashing or granting value.
8. **Reset is deliberate.** Reset clears the one app save and returns to first launch only after a two-step confirmation.

## Tickets — implement in order

### Ticket 1 — Content and persistent-domain schemas

Expand the Zod/TypeScript models needed for Stage 0.4. Keep content configuration separate from player save data.

Add validated `packs.json` and `reward-tables.json`. Refine `Pack` into a clean shape capable of expressing:

- one fixed, zero-cost starter pack with the eight ids above;
- one seeded random standard pack with the confirmed cost, slot rarity tables, and treatment weights.

Add enough obviously-placeholder standard `CardVariant` records and manifest mappings for all 12 current creature identities. A shared `PLACEHOLDER — ART PENDING` asset is acceptable; do not create final art. Every pack result must reference a real variant.

Add strict schemas/types for at least:

- `CollectionEntry`: `creatureId`, unique `ownedVariantIds`, `duplicateCount` (copies after the first), `firstAcquiredAt`.
- `LedgerEntry`: stable id, signed integer amount, resulting balance, reason, correlation id, timestamp.
- `SavedCircuit`: one of three stable slot ids, placeholder name, ordered `creatureIds` (0–5).
- `PendingPackOpening`: opening id, pack id, seed, exact results, reveal index/status.
- `RunState` and persisted current-battle snapshot.
- full `SaveFileV1` with `schemaVersion: 1`, timestamps, collection, three Circuits, active Circuit id, balance/history, onboarding state, optional pending pack, optional run, and minimal settings.

Schemas must reject duplicate collection/variant ids, illegal Circuit contents, impossible run counters/status combinations, invalid pack reveal indices, invalid ledger arithmetic, and bad references. Runtime cross-file/save referential validation may be a service layered on top of Zod.

### Ticket 2 — Save/load, migration boundary, and recovery

Implement plain TypeScript persistence under `src/services/` using one documented key, recommended `mythic-circuit.save`.

- Inject a storage adapter and clock/id/seed sources so services remain deterministic in tests.
- New install returns a valid default `SaveFileV1`; do not write until the first intentional state mutation.
- Save through one serialized root snapshot after every meaningful mutation.
- Parse and validate on load, including references and ledger reconciliation.
- Include an explicit migration registry/version switch even though v1 is the first full payload. Current-version round-trip must be lossless; unknown future versions must be rejected safely.
- Invalid JSON, schema, references, or reconciliation returns a typed recovery result. Preserve the bad raw value until the user deliberately resets; do not silently overwrite it.
- Surface a friendly recovery screen with the error category and a reset route. Never dump raw save contents into the UI or logs.
- Do not use Zustand persistence middleware as a substitute for this service boundary.

### Ticket 3 — Currency ledger and collection acquisition services

Implement services with no React imports:

- The ledger is the only authority allowed to grant or spend Embers.
- Transaction reasons must distinguish at least `run_reward` and `pack_purchase`; starter collection grant costs zero and should have its own idempotent acquisition correlation.
- Spending fails without mutation when funds are insufficient.
- Correlation ids make repeated commands return the already-applied result or a typed no-op, never a second mutation.
- Reconciliation validates every `balanceAfter`, final balance, integer amount, and nonnegative intermediate balance.
- Collection acquisition adds a first creature/variant, records first acquisition time, adds new variants without duplication, and increments `duplicateCount` for every copy after the first.
- Apply multi-card acquisitions atomically to an immutable save draft/snapshot; no partial pack credit.

Document the precise duplicate semantics in the completion report with examples.

### Ticket 4 — Seeded pack generation and first-time onboarding

Implement a deterministic pack service using the existing seeded RNG utilities (or an equally deterministic injected source), never `Math.random`.

- Same pack config + eligible content + seed produces identical ordered results.
- Random packs select a rarity by slot, then a valid creature/variant in that rarity. Duplicates are allowed.
- If a configured treatment has no eligible variant, fail validation/service preparation; do not silently substitute a different paid result.
- Buying a pack performs the 100-Ember debit, result generation, all collection acquisitions, and pending reveal creation as one saved mutation before navigation/reveal.
- Reveal state is presentation only: one card at a time plus Skip/Reveal All; changing reveal state cannot re-credit cards.
- Finishing reveal clears the pending opening. Reload during reveal resumes the same opening and reveal index.
- The starter pack uses the fixed eight unique results, costs zero, and can be granted exactly once per fresh save. Reset intentionally creates a new fresh save and therefore permits a new starter experience.

Build a brief first-launch introduction explaining collection, ordered Circuits, and 7-win/3-loss runs. The player must open/reveal the starter pack before normal navigation is unlocked; Settings/recovery remain reachable. Mark onboarding complete after the starter reveal finishes.

### Ticket 5 — Collection and pack-opening UI

Replace the Collection and Packs shells using the existing reusable card component:

**Collection**

- Show owned creature identities only, with owned/12 progress, total copies, duplicate count, and owned variant treatments.
- Support inspecting a card's full stats, ability, element, rarity, and variant list.
- Clearly label new/duplicate acquisitions during pack reveal. No crafting, selling, or trading.

**Packs**

- Show current Embers balance, standard-pack cost, affordability, and the pending reveal if one exists.
- A purchase button must be disabled and explained when funds are insufficient or a reveal is pending.
- Provide a readable sealed → reveal one-by-one → summary flow, keyboard controls, Skip/Reveal All, reduced-motion behavior, and no color-only rarity communication.
- A refresh at any reveal step must show the identical results and correct reveal progress.

The reveal may use restrained placeholder CSS motion; do not build final Creative styling or sound.

### Ticket 6 — Three persistent Circuit slots

Upgrade the Stage 0.3 builder from an all-roster ephemeral sandbox to saved collection-aware Circuits:

- Three stable slots: `circuit-1`, `circuit-2`, `circuit-3`, with placeholder display names `Circuit 1–3`.
- Only owned creature identities appear as selectable. Owning multiple copies never permits duplicate identities in one Circuit.
- Add/remove/reorder/switch-slot actions persist immediately through the save boundary. An incomplete slot may be saved.
- Clearly show which Circuit is active. Only a legal active five-creature Circuit may start or continue a battle.
- Preserve keyboard reordering, validation messages, front/rear labeling, pointer drag, and 1024px usability from Stage 0.3.
- A Circuit may be edited between run battles. An already-started battle continues to use its persisted lineup snapshot.

### Ticket 7 — Deterministic run manager and opponent progression

Implement a plain TypeScript run service and integrate it through state actions.

- Start only when there is no active run and the active Circuit is legal.
- Persist run id, seed, 0 wins, 0 losses, battle index, status, and current-battle state.
- Use the three curated opponent archetypes as the Stage 0.4 pool. Update only their placeholder `difficultyTier` metadata to **scavenger 1, guardian 2, tempo 3**; do not alter creature stats/abilities for difficulty.
- Deterministic schedule by current wins:
  - wins 0–1: tier 1
  - wins 2–4: tiers 1–2
  - wins 5–6: tiers 2–3
- Within eligible tiers, select deterministically from the run seed/battle index, avoid an immediate repeat when an alternative exists, and deterministically shuffle/rotate slot order for variation. Persist the chosen opponent id, exact ordered ids, and battle seed before playback. Refresh cannot select again.
- Starting a battle runs the engine once, stores the reproducible input snapshot and outcome, and applies that outcome to the run in the same persisted mutation. Hydration may rerun that exact snapshot once to rebuild playback; it must verify the outcome matches the saved outcome and never apply counters twice.
- `player_win`, `draw_both_empty`, and `draw_round_cap` increment wins. `opponent_win` increments losses.
- End at 7 wins or 3 losses. Apply the configured run reward exactly once through the ledger using a run-specific correlation id. No abandon/restart button while active.
- After a nonterminal result, the player may edit the Circuit, then continue to the next deterministic opponent.

### Ticket 8 — Home/run/battle progression UI

Turn Home into the progression dashboard:

- Embers balance, owned-creature count, active Circuit legality, and current run status.
- Primary action that correctly routes to starter reveal, Circuit Builder, Start Run, Continue Run, current battle playback, run completion, or Packs.
- During a run show wins toward 7, losses toward 3, opponent/battle index, and the three-loss limit in text/non-color cues.

Integrate the Stage 0.3 Battle screen with run snapshots:

- Keep all accepted playback behavior and controls.
- Reloading an in-progress/finished playback reconstructs the exact persisted battle; it may restart paused at frame 1.
- Result shows the updated run record. Nonterminal result offers `Edit Circuit` and `Continue Run`; terminal result shows run outcome and the exact Embers reward already credited, then routes Home/Packs.
- Repeated clicks, back/forward navigation, direct `/battle`, and refresh cannot increment counters or rewards again.
- Remove the Stage 0.3 manual opponent picker from the normal progression path. A development-only practice mode is not authorized.

### Ticket 9 — Settings, reset, accessibility, and documentation

Replace the Settings shell:

- Show save schema version and a concise local-only data explanation.
- Persist battle speed (1×/2×) as the only required setting and use it as the Battle screen default.
- Add `Reset all local data` with a two-step confirmation (confirmation panel/dialog plus explicit final action). After confirmation, clear only Mythic Circuit's save key, reset in-memory state, and return to first-launch onboarding.
- Reset must be keyboard operable, clearly destructive, and impossible through one accidental click.

Keep the Stage 0.3 accessibility/responsive baseline: keyboard operation, visible focus, non-color cues, reduced motion, readable status announcements, and no page-level horizontal overflow at 1024px. Update root/content/services/state/UI docs with the save key, schema version, domain boundaries, economy config, recovery behavior, and test commands.

### Ticket 10 — Automated tests, exploit suite, and browser evidence

Add focused unit/integration tests covering at minimum:

- Save v1 round-trip; default; typed corrupt/invalid/future-version recovery; reference validation; migration switch.
- Ledger grant/spend, insufficient funds, nonnegative intermediates, reconciliation mismatch, idempotent correlation.
- First acquisition, new variant, duplicate copies, atomic multi-acquisition.
- Starter grant exactly once, including reload during reveal.
- Pack determinism, per-slot rarity eligibility, debit/acquisition atomicity, insufficient funds, pending reveal resume, no reload reroll, no double acquisition.
- Three saved Circuits, owned-only selection, duplicate identity rejection, active-slot persistence, edit between battles.
- Deterministic opponent selection/order; no refresh reroll; same run seed reproducibility.
- Run 7-win and 3-loss termination, both draw outcomes as wins, applied outcome exactly once, terminal reward exactly once, no negative/duplicate reward.
- Tampered/impossible run state and ledger mismatch enter recovery instead of granting progress.
- Reset returns a clean first-launch state and touches no unrelated storage key.
- UI onboarding gates, pack controls, collection counts, run routing, refresh reconstruction, and terminal reward display.

Playwright must cover:

1. fresh first launch → intro → starter reveal → collection → build/save a legal Circuit → start a run → play/skip battles until terminal → reward credited → buy/reveal a standard pack;
2. reload during a pending pack reveal returns the identical contents/progress with no duplicate credit;
3. reload/back during a run battle preserves opponent/outcome and does not double-count the result or reward;
4. close/reopen simulation (new page/context using the same storage state) retains collection, Circuits, balance, and run state;
5. deliberate reset returns to onboarding while leaving an unrelated test storage key untouched;
6. 1440×900 and 1024×768 layouts, keyboard-only critical path, reduced motion, and zero console errors.

## Definition of done

- A fresh player can complete the full Stage 0.4 loop without developer intervention.
- Collection, three Circuits, Embers, ledger, pending pack, run, and settings survive reload with a valid versioned save.
- Ledger always reconciles; balance never goes negative; rewards and acquisitions cannot duplicate.
- Packs and run opponents cannot be rerolled or escaped through refresh/navigation.
- A legal owned Circuit can complete a deterministic 7-win/3-loss run, receive reward, and buy another pack.
- Reset is deliberate and returns to a clean onboarding state.
- All prior engine/playback behavior remains green; no Stage 0.5 content/balance/Creative work is included.

## Required verification and evidence

Run and include full results in the completion report:

```text
npm run typecheck
npm run lint
npm test
npm run validate:content
npm run sim:archetypes
npm run build
npm run test:e2e
```

The report must include:

- save-schema field table and storage key;
- ledger transaction/reconciliation table with at least one full run reward and pack purchase;
- starter/standard pack configuration and deterministic sample output;
- exploit matrix for reload reroll, duplicate reward, negative balance, repeated result application, tampered save, and reset isolation;
- run transition table demonstrating 7-win and 3-loss endings;
- browser-check table and console-error result;
- known issues/deferred work.

Store and reference at minimum:

- `reports/screenshots/stage-0.4-onboarding.png`
- `reports/screenshots/stage-0.4-starter-reveal.png`
- `reports/screenshots/stage-0.4-collection.png`
- `reports/screenshots/stage-0.4-circuits.png`
- `reports/screenshots/stage-0.4-run.png`
- `reports/screenshots/stage-0.4-standard-pack.png`
- `reports/screenshots/stage-0.4-reset.png`
- `reports/screenshots/stage-0.4-1024.png`

Paths above are relative to `ai-communication-docs/phase-0/`.

## Out of scope — do not touch

Final Creative names, element labels, rarity labels, icons, card redesign, or art · expansion beyond the 12 current creatures · final balance tuning · additional opponent archetypes · foils/full-art mechanics or odds · additional pack types/tiers · dynamic pack weighting based on collection · crafting/selling/trading · daily rewards/quests · battle pass · premium currency/store/real money · analytics/ads · backend/accounts/cloud · PvP/async player ghosts · evolution/family combat effects · sound · mobile layout · production anti-cheat/security claims.

Local save validation prevents accidental/exploit-prone state transitions; it is not security against a user intentionally editing their own browser storage.

## Completion report

Write `ai-communication-docs/phase-0/reports/STAGE_0.4_COMPLETION_REPORT.md` with every required table/evidence item above and the standard per-ticket delivery sections. End with:

```text
COMMIT TITLE:
Phase 0 / Stage 0.4 — <short summary>

COMMIT DESCRIPTION:
<delivery grouped by ticket, verification results, exploit protections, and documented limitations>
```

Then **STOP**. Do not begin Stage 0.5.
