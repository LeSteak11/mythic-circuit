# Mythic Circuit — Detailed Phase 0 Plan

**Prepared by:** Project Manager
**For:** Owner / Creative Director
**Date:** 2026-08-19
**Status:** AWAITING OWNER APPROVAL — no developer brief will be issued until this plan is approved.

Decisions in this document are marked:
- ✅ **APPROVED** — already confirmed by the owner
- 🟡 **RECOMMENDED** — PM recommendation; approving this plan approves these unless the owner objects
- 🔴 **OWNER DECISION** — requires an explicit owner answer before the relevant stage begins (none block Stage 0.1)

---

## 1. Product definition and USP

**Mythic Circuit** is a desktop-web creature collector and asynchronous lineup auto-battler. Players open packs, collect original creatures, arrange five of them into an ordered **Circuit**, and watch battles resolve automatically against pre-built opponent lineups in short 7-win / 3-loss runs.

**USP:** The pack-opening and collection joy of a card game without the rules burden of playing one. Strategy lives entirely in *which five creatures* and *in what order* — battles explain themselves, losses invite one more lineup tweak.

## 2. Exact MVP player loop

1. First launch → brief intro → open **starter pack** (guaranteed viable starting roster).
2. Browse collection; inspect any card and understand its stats/ability at a glance.
3. Build and save a legal 5-creature Circuit (ordered slots 1–5, no duplicate creature identities).
4. Start a **run**: battle a sequence of opponent lineups (curated archetypes + seeded procedural variants).
5. Each battle auto-resolves with animated, readable playback (speed controls + skip).
6. Run ends at **7 wins** (victory) or **3 losses** (defeat). ✅ APPROVED
7. Receive **Embers** (soft currency, 🟡 placeholder name — Creative may rename) scaled to wins; spend Embers on packs.
8. Open packs → new creatures/variants → adjust Circuit → run again. Progress persists across app restarts; a settings control resets all local data.

## 3. Battle rules and minimum stat model

✅ **APPROVED: Lean stat model** — each creature has:

| Property | Role |
|---|---|
| **Power** | Damage dealt per attack |
| **Vitality** | Health; at 0 the creature is defeated |
| **Element** | One of four; drives a simple advantage wheel |
| **Ability** | Exactly one, drawn from a controlled trigger/effect library |
| Rarity, family | **Collection metadata only in MVP** — no combat effect. Family becomes mechanical post-MVP. |

**Combat resolution (🟡 recommended):**

- Both Circuits queue front-to-back. Each **round**, the two front-most living creatures exchange attacks **simultaneously** (Super Auto Pets model — eliminates the need for a Speed stat and makes ties meaningful).
- Damage = attacker Power, ×1.5 if elementally advantaged, ×0.75 if disadvantaged (exact multipliers tunable in config; 🟡).
- Defeated creatures leave the field; the lineup compresses forward. Battle ends when one side is empty. Both empty simultaneously = draw, counts as a win for the player (🟡 — generosity favors fun in MVP).
- **Elements (4):** placeholder identities *Ember / Tide / Verdant / Volt* in a cycle (each beats the next, loses to the previous). Creative owns final element names/icons. 🟡
- **Deterministic:** same lineups + same seed = identical battle, verified by tests. All randomness flows through one seeded RNG.

**Ability triggers (MVP set of 7, closed list):** battle start · before own attack · after own attack · on ally defeated · on self defeated · first time below 50% Vitality · end of round.

**Ability effects (MVP set of ~8, closed list):** deal damage (front/last/all enemies) · heal ally · buff Power · buff Vitality · shield next hit · summon a token creature into last slot · gain Power when ally defeated (scavenger) · redirect one hit to self (guardian).

That's deliberately small: 7 triggers × ~8 effects gives the 24–30 roster plenty of distinct identities and supports at least three archetypes (guardian wall, scavenger snowball, trigger-tempo) without balance hell. Every effect lives in a central rules engine; cards are pure data.

**Event log:** the engine emits an ordered event stream (attack, damage, trigger fired, buff, defeat, summon, battle end, each with cause). Playback, explanations, debugging, and tests all consume this log. It is the contract between engine and UI.

## 4. Technical stack ✅ APPROVED

- **React 18 + TypeScript + Vite** — fast local dev server, strong typing for the engine, best-supported stack for an AI-assisted developer.
- **Zustand** for app state (🟡 — tiny, testable, no boilerplate).
- **Vitest + React Testing Library** for tests; **Playwright** available for browser verification.
- **Zod** for content-schema validation (creatures, packs, opponents, saves). 🟡
- **Persistence: localStorage** with versioned, migratable save schema (🟡 — IndexedDB is overkill at MVP scale).
- **CSS:** plain CSS Modules + CSS custom properties for theming (🟡 — keeps the visual layer trivially reskinnable by Creative).
- **No backend. No accounts. No network calls.**

## 5. Architecture and data boundaries

```
src/
  engine/        # Pure TS. Deterministic battle sim. Zero DOM/React imports.
  content/       # JSON creature/ability/pack/opponent data + Zod schemas + validator
  services/      # Save/load (versioned), currency ledger, pack generation, run manager
  state/         # Zustand stores wiring services to UI
  ui/            # React components: cards, collection, builder, battle playback, screens
  assets/        # Placeholder art & frames, path-mapped by manifest (see §10)
```

**Hard boundaries the PM will enforce at every gate:**
- `engine/` never imports from `ui/` or touches the DOM. UI renders only from the event log + snapshots.
- All content is JSON validated against schemas at build/test time; adding a creature = adding data + assets, not code.
- Every currency mutation goes through one ledger service (the future monetization seam).
- Creature **identity** (stats/ability) is a separate record from card **variant** (art/frame/foil). One identity → many variants.
- Save data carries a schema version from day one.

## 6. Data models (planning level)

- **CreatureDefinition:** id, placeholder name, element, rarity, power, vitality, abilityId, familyTag, evolvesFromId? (evolution is data-reserved but **mechanically excluded from MVP** 🟡).
- **AbilityDefinition:** id, trigger, effect, magnitude, target, description template.
- **CardVariant:** id, creatureId, treatment (standard/foil/full-art), artRef, frameRef.
- **CollectionEntry:** creatureId → { ownedVariantIds[], duplicateCount, firstAcquiredAt }.
- **Pack:** id, cost, slotCount, raritySlotTable, variantOddsTable (all config, no code).
- **OpponentLineup:** id, name, creatureIds[5], archetypeTag, difficultyTier — curated set + procedural generator (seeded, difficulty-scaled by run progress).
- **RunState:** wins, losses, currentOpponentId, seed, rewardsAccrued, status.
- **SaveFile:** schemaVersion, collection, savedCircuits[] (🟡 MVP allows 3 saved Circuits), embersBalance, ledgerHistory, runState?, onboardingComplete, settings.
- **RewardTable:** config mapping run outcomes → Embers/packs.

## 7. Refined stage plan (sequential, gated)

Charter's six stages stand, with sharpened boundaries:

| Stage | Delivers | Est. (dev sessions) |
|---|---|---|
| **0.1 Foundation** | Repo scaffold, Vite/TS/Vitest/lint tooling, app shell + routing, content schemas defined, placeholder asset contract, README. No gameplay. | 1–2 |
| **0.2 Battle engine** | Headless deterministic sim, full trigger/effect library, event log, lineup validation, seeded RNG, ~10 test creatures, heavy test suite. | 2–3 |
| **0.3 Battle UI + builder** | Card component, team builder (drag/reorder), battle playback from event log, speed/skip, result screen. Temp content. | 2–3 |
| **0.4 Collection & progression** | Persistent collection, pack opening flow + reveal, duplicates, Embers ledger, run manager, opponent generation, rewards, onboarding, save/reset. | 2–3 |
| **0.5 Content integration** | Full 24–30 placeholder roster loaded as validated data, cosmetic variant proof (a few foils), opponent archetypes, balance pass for 3+ viable strategies. **Creative's names/art drop in here or later without code changes.** | 1–2 |
| **0.6 Release candidate** | End-to-end polish, defect burn-down, responsive + accessibility baseline, full automated + browser test pass, setup docs, RC build. | 1–2 |

**Total estimate: roughly 9–15 developer sessions.** That's a complexity range, not a promise.

## 8. Tickets and definition of done (planning level)

Each stage brief will contain 5–10 numbered tickets. Summary of DoD per stage:

- **0.1 done when:** `npm install && npm run dev` serves the shell; lint/type/test commands pass; schemas exist with example data validating; README covers setup; nothing broken, nothing extra.
- **0.2 done when:** every trigger/effect has tests; same-seed determinism test passes; full battle produces a coherent event log; illegal lineups rejected; engine has zero UI imports (verified by lint rule).
- **0.3 done when:** a temp Circuit can be built, reordered, and battled with readable playback at 1×/2×/skip; every event-log event type has a visible representation; result screen shows outcome + summary.
- **0.4 done when:** the full loop (onboard → starter pack → build → run → rewards → reopen app with progress intact → reset works) passes automated + browser checks; ledger balances always reconcile; save survives version stamp round-trip.
- **0.5 done when:** full roster passes schema validation; swapping any art asset requires zero code changes (demonstrated); at least 3 distinct archetype lineups each achieve a winning run vs. the opponent pool in simulation.
- **0.6 done when:** MVP success criteria in the charter are met; no known critical defect; docs current; RC tagged for owner commit.

## 9. Verification strategy per stage

Every stage: automated tests (Vitest) + type check + lint, and from 0.3 onward, browser verification with screenshots in the completion report. Stage-specific:
- **0.2:** determinism harness (run 1,000 seeded battles twice, diff event logs); property-style tests on lineup compression and trigger ordering.
- **0.4:** exploit tests — reward duplication, negative Embers, pack re-roll via reload, run-state tampering on refresh.
- **0.5:** content validator run in CI mode; scripted archetype-vs-pool win-rate simulation with results table in the report.
- **0.6:** full regression + manual first-time-player walkthrough recorded as evidence.

Developer reports at every gate: what changed, tests run + results, browser checks, screenshots, known issues, deferred work, proposed commit text. I review, then issue `ACCEPTED` / `ACCEPTED WITH DOCUMENTED DEBT` / `CHANGES REQUIRED`.

## 10. Creative asset requirements and replacement workflow

**MVP ships with placeholder everything creative** — per the owner: final art, creature names, and card designs are Creative's job, after Phase 0 or during 0.5+.

- Every creature gets an obviously-placeholder name (`PH_EMBER_GUARDIAN_01` style in data, rendered as a readable temp name) so nothing placeholder is mistaken for final.
- All art/frames resolve through a single **asset manifest** (JSON mapping variantId → file path). Replacing art = dropping a file + editing the manifest. Zero code.
- Card template is one component reading layout tokens (CSS custom properties) so Creative's final card design is a restyle, not a rebuild.
- Delivery spec for Creative (sizes, aspect ratios, formats, safe zones) is a Stage 0.3 deliverable — I'll hand it to Creative as its own doc.
- Placeholder art: simple generated shapes/gradients per element, clearly labeled, all under `assets/placeholder/`.

## 11. Accessibility and responsive baseline

Keyboard-navigable menus and builder; visible focus states; text alternatives for element/rarity (never color alone); battle text log alongside animation (doubles as reduced-motion mode, honoring `prefers-reduced-motion`); WCAG AA contrast on text; sensible layout from ~1024px up (desktop web target — mobile responsiveness is post-MVP polish, not a Phase 0 promise 🟡).

## 12. Risks

| Risk | Level | Mitigation |
|---|---|---|
| Battle feels flat / strategies collapse to one lineup | **High** | Stage 0.2 gate requires simulated proof of 3 archetypes before UI investment |
| Scope creep (evolution, families, store, more elements) | **High** | Scope ledger; anything not in this plan needs owner sign-off |
| IP proximity to Pokémon/SAP | Medium | Original names/art/terms enforced at review; mechanics-inspiration only; placeholder naming convention prevents accidental shipping of risky temp content |
| Balance burn (24–30 creatures) | Medium | Closed effect library + simulation tooling; MVP needs "interesting," not "final balance" |
| Save-data corruption / progression exploits | Medium | Versioned saves, ledger reconciliation tests, exploit test suite in 0.4 |
| Placeholder content leaking into "final" feel | Low | PH_ naming + centralized placeholder dir |
| Session-estimate drift | Medium | Gates catch it early; estimate is a range and revisited at each gate |

## 13. Decisions needed from the owner

**Already approved:** React+TS+Vite · lean stat model · 7 wins / 3 losses.

**Approving this plan also approves the 🟡 items,** most notably: simultaneous front-line combat (no Speed stat), 4-element cycle, closed 7-trigger/~8-effect library, evolution excluded from MVP mechanics, localStorage saves, 3 Circuit slots, placeholder currency name "Embers," desktop-first (≥1024px) layout.

**🔴 Nothing blocks Stage 0.1.** Two decisions I'll bring to you before Stage 0.5: (1) final element count/identities if Creative wants input before the balance pass; (2) whether Creative's real names/art land inside Phase 0.5 or after RC.

## 14. Phase 0 exclusions and deferred roadmap

**Excluded (per charter, unchanged):** real money, battle pass, subscriptions, live PvP, real async matchmaking, trading, accounts/cloud, notifications, social, analytics/ads, narrative campaign, hundreds of cards, store release, final balance. **Additionally excluded by this plan (🟡):** evolution mechanics, family-based combat effects, Speed stat, mock store UI (not needed to validate architecture), sound design beyond a few placeholder cues.

**Deferred roadmap (preserved, not planned):** async opponent snapshots → accounts/cloud → mobile packaging → seasons/ladders → cosmetic storefront & collector membership → evolution & families → live-ops tooling.

## 15. Estimate

**9–15 AI-assisted developer sessions** across six gated stages, plus PM review turnaround at each gate. Biggest uncertainty sits in 0.2 (engine depth) and 0.4 (progression surface area). No false precision: the gates exist so we re-estimate with evidence every stage.

---

**Next step:** Owner reviews this plan. On approval, I will issue the **Stage 0.1 Developer Brief** as a separate, self-contained document ready to paste into the Claude Code dev session. No coding starts before that.
