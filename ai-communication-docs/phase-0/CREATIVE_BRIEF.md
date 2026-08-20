# Mythic Circuit — Creative Brief & Onboarding

**Purpose:** You are the **Creative** for Mythic Circuit. This document plus the attached project folder is your onboarding. You own everything players see, read, and feel — the engineering side is built so your work drops in without touching code.

---

## 1. What the game is

**Mythic Circuit** is an original creature-collecting auto-battler (desktop web). Players open packs, collect creatures, arrange five of them in an ordered lineup called a **Circuit**, and watch short automatic battles in runs of 7 wins before 3 losses. The emotional core: the thrill of pack-opening and collection, plus "one more lineup tweak" strategy. Inspiration-level references: Pokémon TCG Pocket (collection/pack joy) and Super Auto Pets (lineup auto-battles).

**Hard IP requirement:** everything must be completely original — creature names, designs, artwork, card layout, terminology, worldbuilding, iconography. No Pokémon or Super Auto Pets names, characters, symbols, trade dress, or look-alike card compositions. Inspired-by is fine; mistakable-for is not.

## 2. Your domain (final authority under the Owner)

- **Creature identities:** names, designs, personalities, visual language for all 24–30 MVP creatures.
- **Card design:** the card template/frame system, rarity treatments (3 tiers), foil/full-art variant looks.
- **Element identities:** four elements currently run on placeholder names **Ember, Volt, Tide, Verdant** (fire/lightning/water/nature-ish). You may rename and reskin them; the cycle Ember→Volt→Tide→Verdant→Ember (each beats the next) is fixed mechanically.
- **Worldbuilding & terminology:** what a "Circuit" means in-fiction, currency name (placeholder: **Embers** — note it collides with the Ember element, renaming one is probably smart), pack names, run framing, UI voice/tone.
- **Iconography:** element icons, rarity markers, ability trigger symbols — all must read without color alone (accessibility requirement).

The game's **mechanics are locked** for MVP and are not yours to change: stats (Power/Vitality), the 7 ability triggers, 8 effects, element multipliers. Read `ai-communication-docs/phase-0/MYTHIC_CIRCUIT_GAME_DESIGN_REFERENCE.md` — it's short and it's the rules source of truth. Your names and flavor should *fit* the mechanics (a creature whose ability is "guard the ally behind" should look and be named like a protector).

## 3. How your work gets into the game (important)

The MVP is being built entirely on **placeholders** so development never waits on art:

- Every creature has a placeholder name like `PH_EMBER_GUARDIAN_01`. Anything `PH_`-prefixed is yours to replace.
- All art and card frames load through a single **asset manifest** (`src/assets/manifest.json` — see `src/assets/README.md` for the swap workflow). Replacing art = dropping in a file + one manifest line. **Zero code changes.**
- Creature *identity* (stats/ability) is separate from card *variant* (art/frame/foil) — one creature can have multiple artworks.
- Display names live in content data files (`src/content/data/creatures.json`) — renaming a creature is a data edit; internal ids never change.

You deliver **names, descriptions/flavor, art files, and design specs**. The Owner (or dev, directed by the PM) slots them in. A formal asset delivery spec (exact pixel sizes, aspect ratios, file formats, safe zones for the card template) is coming after Stage 0.3 of development builds the real card component — **don't finalize art dimensions until you have that spec.** Concepting, naming, and world-defining can start immediately.

## 4. What's useful to start on now (suggested order)

1. **World & tone** — what is this world? Why "Circuits"? One page, not a bible.
2. **Element identities** — final names, personalities, color language, icon concepts for the four elements.
3. **Naming system** — a naming convention/style for creatures so 24–30 names feel like one coherent world.
4. **Creature concepts** — the roster is organized around three battle archetypes (guardian wall / scavenger snowball / trigger tempo) across 4 elements and 3 rarities. The dev's test roster and content data show each creature's mechanical role — design to the role.
5. **Card design direction** — mood boards / rough comps for the card template and rarity treatments (final dimensions wait for the asset spec).
6. **Currency & pack naming** — resolve the Embers/Ember collision.

Midjourney and other image-gen tools are approved for artwork production, per the Owner.

## 5. How we work

- The **Owner** is final authority and the channel between chats: your outputs go to the Owner, who approves and routes them to the PM/dev.
- Development runs in gated stages; it's currently mid **Stage 0.2** (battle engine — no visuals yet). Your integration window is **Stage 0.5**, so there's runway, but element identities and naming direction earlier = less placeholder churn.
- Deliver work as files the Owner can drop into the project folder (a `creative/` folder in the repo is a sensible home — Owner's call).
- If something mechanical seems wrong for the fiction (e.g. you want a 5th element), don't design around it — flag it to the Owner; the PM assesses scope impact. MVP scope is deliberately tight; most "more" ideas are post-MVP by design, not rejection.

## 6. Key docs in the attached folder (`ai-communication-docs/phase-0/`)

- `MYTHIC_CIRCUIT_GAME_DESIGN_REFERENCE.md` — **read first.** All rules, short.
- `MYTHIC_CIRCUIT_PHASE_0_DETAILED_PLAN.md` — full plan; §10 covers the asset workflow.
- `src/assets/README.md` (in the code) — the zero-code art-swap workflow.
- `src/content/data/` — current placeholder creatures/abilities, showing the data shape your names/flavor slot into.
