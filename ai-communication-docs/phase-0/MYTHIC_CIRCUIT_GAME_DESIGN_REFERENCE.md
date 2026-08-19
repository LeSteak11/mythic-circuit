# Mythic Circuit — Game Design Reference

**Version 1.0 — 2026-08-19 · Living document.** The PM updates this at stage gates. If a brief and this doc ever conflict, this doc wins until the PM says otherwise. Placeholder terms are marked (PH) — Creative owns final names.

---

## 1. What the game is

Mythic Circuit is a creature-collecting auto-battler. You open packs, collect original creatures, arrange five of them in order — your **Circuit** — and watch battles resolve automatically. Strategy is entirely in *which creatures* and *what order*. Battles are short, readable, and deterministic: a loss should make you think "I'll swap slot 2," not "that was random bullshit."

**The loop:** open packs → collect → build a Circuit → run of auto-battles (win 7 before losing 3) → earn Embers (PH currency) → buy more packs → repeat.

## 2. Creatures

Every creature is defined by four things:

- **Power** — damage it deals per attack.
- **Vitality** — health. At 0 it's defeated and leaves the field.
- **Element** — one of four, sets the advantage wheel (§4).
- **Ability** — exactly one, built from the trigger + effect library (§5).

Also on the card, but **cosmetic/collection-only in MVP**: rarity (drop odds + frame treatment), family tag (future tribal synergies), evolution link (future mechanic — the data slot exists, the mechanic doesn't yet).

**Design rule:** a creature is pure data. New creature = new data entry + art. No code.

## 3. Battle resolution

1. Both Circuits line up slots 1–5, slot 1 in front.
2. Any **battle start** abilities fire (slot 1 → 5, player first on ties).
3. **Rounds** repeat: the two front creatures attack each other *simultaneously*. Damage = attacker's Power × element multiplier. Both can die in the same exchange.
4. Defeated creatures leave; everyone behind slides forward one slot.
5. Battle ends when a side is empty. Both empty at once = draw, counted as a player win.
6. Everything is driven by one seeded RNG — same lineups + same seed = identical battle, every time.

Every action emits an **event log** entry (attack, damage, trigger, buff, defeat, summon, end — each with its cause). The UI, explanations, and tests all read from this log.

## 4. Elements

Four elements in a simple cycle — each beats the next, loses to the previous:

**Ember → Volt → Tide → Verdant → Ember** (all PH)

Advantaged attacks deal **×1.5**, disadvantaged **×0.75**, neutral ×1.0. (Multipliers live in config, tunable.)

**Expansion seam:** a fifth+ element just extends the wheel or adds off-cycle relationships — the advantage table is data, not code.

## 5. Abilities: triggers + effects

An ability = **one trigger + one effect + magnitude + target.** Closed lists in MVP:

**Triggers (7):** battle start · before own attack · after own attack · ally defeated · self defeated · first time below 50% Vitality · end of round.

**Effects (~8):** damage (front / last / all enemies) · heal ally · buff Power · buff Vitality · shield (block next hit) · summon token into last slot · scavenge (gain Power when an ally dies) · guard (redirect one hit from the ally behind to self).

**Resolution order when triggers collide:** front-most creature first, player's side before opponent's, and effects queue — nothing interrupts an effect mid-resolution.

**Expansion seam:** new triggers and effects are added to the central rules engine once, then any creature can use them via data. This combinatorial space (triggers × effects × magnitudes × targets) is where future variety comes from — no per-card custom code, ever.

## 6. Archetypes (MVP targets)

The roster (24–30 creatures) must support at least three viable strategies:

- **Guardian wall** — tanky front, guards and shields protecting scaling back-liners.
- **Scavenger snowball** — cheap front-liners feeding death triggers that grow the closers.
- **Trigger tempo** — round-end and attack-trigger damage racing the enemy down.

Family tags loosely map to these now; post-MVP, families become real mechanics (tribal buffs).

## 7. Runs

- Build/pick a Circuit, start a run: a sequence of battles vs. opponent lineups.
- **Win 7** to complete the run; **3 losses** ends it. Between battles you may edit your Circuit.
- Opponents: curated archetype lineups + seeded procedural variants, difficulty scaling with your win count.
- **Expansion seam:** opponent lineups are the exact same data shape as player Circuits — future async "ghost" opponents are just recorded player lineups dropped into the pool.

## 8. Economy & collection

- **Embers (PH):** earned only through play (run rewards scale with wins). Spent on packs. Every mutation flows through one ledger — that ledger is the future monetization seam.
- **Packs:** starter pack (guaranteed viable roster) + one standard pack type. Contents driven by config tables (slot count, rarity odds, variant odds).
- **Rarities (3):** Common / Rare / Mythic (PH) — affects drop odds and card treatment only, **never** raw power-per-rarity gating (charter rule: no pay-to-win seams).
- **Collection:** tracks each creature identity, owned variants, duplicate count. Creature *identity* (stats) is separate from card *variant* (art/frame/foil) — one identity, many variants. Duplicates counted now; future use (crafting, cosmetics currency) deferred.
- **Circuits:** 3 saved lineup slots.

## 9. What's deliberately NOT in MVP (but seamed for)

Evolution mechanics · family/tribal combat effects · Speed stat · more elements · real async opponents · trading · store/monetization · sound design. Each has a data seam already reserved (noted above), so adding them later is expansion, not rework.

---

*Change log: v1.0 — initial version from approved Phase 0 plan.*
