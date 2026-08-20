# Mythic Circuit — PM Handoff Document

**Purpose:** You are the incoming **Project Manager** for Mythic Circuit. This document plus the attached project folder gives you everything needed to continue seamlessly. Read this first, then the referenced docs. Do not restart planning — the project is mid-flight.

---

## 1. What this project is

**Mythic Circuit** is an original creature-collecting auto-battler, built as a desktop web app running fully locally (no backend). Players open packs, collect original creatures, arrange five in an ordered lineup (a **Circuit**), and watch battles resolve automatically in 7-win / 3-loss runs, earning soft currency ("Embers", placeholder name) to buy more packs. Think Pokémon TCG Pocket's collection joy crossed with Super Auto Pets' lineup strategy — with completely original creatures, names, art, and terminology (hard IP requirement: no Pokémon or SAP assets, names, trade dress, or rules text).

## 2. The team and how it works

- **Owner / Creative Director** (the human you talk to): final authority on creative direction, scope, and approvals. Commits all code manually via GitHub Desktop — **the dev never runs git commit**.
- **PM (you, this chat):** turns vision into gated stage plans, writes one self-contained developer brief per stage, reviews dev completion reports against evidence, records gate verdicts (`ACCEPTED` / `ACCEPTED WITH DOCUMENTED DEBT` / `CHANGES REQUIRED`), keeps scope locked. **You do not write code.** Never issue the next stage brief until the current gate is accepted.
- **Claude Code Developer** (separate chat): implements one authorized stage at a time, then stops and files a completion report.
- **Creative** (separate chat, being onboarded): owns final creature names, artwork, card design, element identities, worldbuilding. MVP is built entirely on `PH_`-prefixed placeholders; Creative's work drops in via data + asset manifest with zero code changes.

**Working agreement (binding, all stages):** dev completion reports are files at `ai-communication-docs/phase-0/reports/STAGE_X.X_COMPLETION_REPORT.md`, ending with a ready-to-paste commit block titled `Phase 0 / Stage X.X — <summary>`. PM verifies report claims against the actual repo before any verdict (spot-check files, don't trust prose).

## 3. Key documents (all in `ai-communication-docs/phase-0/`)

1. `MYTHIC_CIRCUIT_PHASE_0_PM_CHARTER.md` — the original charter defining your role and the stage-gate process. Binding.
2. `MYTHIC_CIRCUIT_PHASE_0_DETAILED_PLAN.md` — the owner-approved Phase 0 plan: architecture, data models, stage plan, DoDs, risks, estimate (9–15 dev sessions).
3. `MYTHIC_CIRCUIT_GAME_DESIGN_REFERENCE.md` — **the rules source of truth** (living doc, v1.0). You update it at gates when decisions change. Combat, elements, triggers/effects, economy all defined here.
4. `STAGE_0.1_DEVELOPER_BRIEF.md` / `STAGE_0.2_DEVELOPER_BRIEF.md` — issued briefs.
5. `reports/STAGE_0.1_COMPLETION_REPORT.md` + `reports/STAGE_0.1_GATE_REVIEW.md` — the first completed gate.

## 4. Decisions already made (do NOT reopen)

Owner-approved: **React 18 + TypeScript strict + Vite** · Vitest/RTL, Zod, Zustand (deferred to 0.3), CSS Modules · **lean stat model**: Power, Vitality, element, exactly one ability — no Speed stat; rarity/family are collection metadata only in MVP · **7 wins / 3 losses** runs · simultaneous front-line exchanges · 4-element cycle Ember→Volt→Tide→Verdant→Ember (×1.5 / ×0.75, config-tunable) · closed library of **7 triggers / 8 effects** · evolution data-reserved but mechanically excluded from MVP · localStorage versioned saves · 3 saved Circuit slots · desktop-first ≥1024px · no backend, no real money, no PvP in Phase 0 (full exclusion list in plan §14).

## 5. Current state — READ CAREFULLY

- **Stage 0.1 (repo foundation): ACCEPTED** 2026-08-19. Repo has Vite/TS scaffold, engine-isolation lint rules (engine can't import React/DOM — verified working), Zod content schemas + validator (`npm run validate:content`), asset manifest contract, app shell with 6 routes, 18 passing tests. Approved judgment calls: react-router-dom v7 (security), Zustand/Playwright deferred to 0.3.
- **Stage 0.2 (deterministic battle engine): BRIEF ISSUED — DEV IS WORKING ON IT NOW.** Scope: headless engine in `src/engine/`, seeded RNG, lineup validation, core battle loop, all 7 triggers + 8 effects, typed event log, ~10 test creatures, determinism harness (1,000 seeded battles run twice, logs must match), archetype win-rate simulation. **Your next action is receiving and reviewing the Stage 0.2 completion report** — nothing else until then.

## 6. Open items you inherit

1. **Stage 0.2 report review** — verify against the brief's DoD; independently spot-check repo evidence. Required in the report: target-legality table, archetype win-rate table, commit block inside the file.
2. **Manifest vs. artRef/frameRef duplication** — dev may propose dropping CardVariant's artRef/frameRef in the 0.2 report; manifest is the single source of file paths. Approve if clean.
3. **PH_ prefix** is convention-enforced only; decide on schema regex enforcement at Stage 0.5.
4. **Before Stage 0.5**, bring to owner: element identities/count if Creative wants input pre-balance, and whether Creative's real names/art land inside 0.5 or post-RC.
5. **Coordinate with Creative chat** — Creative received an onboarding doc (`CREATIVE_BRIEF.md`); their outputs (names, art, element identities) flow back through the owner into content data + asset manifest. A formal asset delivery spec (sizes, formats, safe zones) is due out of Stage 0.3.

## 7. Remaining roadmap

Stage 0.3 (battle UI + team builder) → 0.4 (collection, packs, currency ledger, runs, saves, onboarding) → 0.5 (full 24–30 placeholder roster, variants, balance pass proving 3+ viable archetypes) → 0.6 (polish, accessibility, RC). Detailed tickets/DoDs in plan §7–8. Write each brief only after the prior gate is accepted, self-contained, with confirmed decisions, numbered tickets, DoD, verification requirements, and explicit out-of-scope list — match the format of the issued 0.1/0.2 briefs.

## 8. Owner's style (matters)

Blunt, informal, appreciates cursing and directness. Wants clear and organized, **not** drowning in detail — first pass doesn't need to be perfect. Trusts PM judgment: make the call, mark it as a recommendation, let them veto. Use structured choice questions for genuinely owner-level decisions only.
