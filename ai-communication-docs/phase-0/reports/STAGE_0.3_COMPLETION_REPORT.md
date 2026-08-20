# Stage 0.3 Completion Report — Playable Battle Presentation and Circuit Builder

**From:** Developer · **Date:** 2026-08-19 · **Stage status:** COMPLETE, awaiting PM gate review
**Brief:** `STAGE_0.3_DEVELOPER_BRIEF.md`

---

## 1. Delivery by ticket

### Ticket 1 — UI dependencies, state boundary, test harness ✅

- **Zustand** installed; `src/state/matchStore.ts` holds only the temporary Circuit, selected opponent, and the prepared match (immutable `BattleResult` + seed). Not persisted — refresh resets, by design. `startBattle()` calls `runBattle` **exactly once** per match.
- **Playwright** installed (Chromium), `playwright.config.ts` (auto-starts the dev server), `npm run test:e2e`. Vitest remains for unit/component tests (`e2e/` excluded from Vitest).
- Boundary READMEs updated (`src/state/`, `src/ui/`, `src/assets/`, root). UI/state import only the public engine API (`src/engine/index.ts`).

### Ticket 2 — Runtime content catalog and reusable card ✅

- `src/content/catalog.ts`: validates and loads creatures/abilities/variants/opponents **once** (Zod-parsed, cached); exposes id maps and `describeAbility()` (full `{magnitude}` interpolation). Components never parse raw JSON.
- `src/ui/components/CreatureCard.tsx` + `cardData.ts`: ONE card template used by builder and battle. Shows placeholder name, Power, Vitality (current/max in battle), element as text + glyph (▲◆●■), rarity as text + border treatment, and the fully interpolated ability description with a trigger label.
- Art/frame resolve only through the asset manifest loader; the loader now uses a Vite `import.meta.glob` URL map (reliable across dev/build/test — see §3).
- Creatures without a Stage 0.2 variant (10 of 12) render an accessible `PLACEHOLDER — ART PENDING` panel. All 12 creatures usable.
- Card appearance flows entirely through `--card-*` CSS custom properties in `global.css`.

### Ticket 3 — Circuit Builder ✅

`/circuit` is a functional builder: 12-creature roster with Add buttons; ordered slots 1–5 labeled **Slot 1 — Front** / **Slot 5 — Rear**; remove/reset; **both** pointer drag-reorder and keyboard `▲ Forward` / `▼ Back` buttons with descriptive accessible names. Duplicates and overfill are prevented at the source (buttons flip to disabled `In Circuit` / `Circuit full`) and final legality comes from `validateLineup()` with readable messages (e.g. "Your Circuit needs exactly 5 creatures (currently 3)."). `Battle this Circuit` stays disabled until legal + opponent chosen, with a hint explaining why.

### Ticket 4 — Opponent selection and battle setup ✅

- The three archetype lineups live as validated content data in `src/content/data/opponent-lineups.json` (the existing `OpponentLineup` schema; the validator now also checks opponent creature references). Not embedded in components.
- Radio-group selection of PH_GUARDIAN_WALL / PH_SCAVENGER_SNOWBALL / PH_TRIGGER_TEMPO shows the selected opponent's ordered Circuit before battle.
- Battle start runs `runBattle` once with the fixed documented seed **20260819** (`DEFAULT_BATTLE_SEED`), stores the immutable log, navigates to `/battle`.
- Direct `/battle` with no match shows a friendly empty state linking to the builder (no throw).

### Ticket 5 — Event-log playback model ✅

`src/ui/battle/playback.ts` — pure, fully unit-tested, never reruns combat:

- `groupEvents()` splits the raw log into presentation frames; the engine's **two attack declarations + two damage applications (+ resulting defeats) become one simultaneous-exchange frame**. The raw log is never mutated.
- `buildPlayback()` folds events into per-frame `DisplayState` (lineup order, current Power/Vitality/max, shield & guard charges, summons, defeats, round) + readable log lines + source/target highlight ids.
- `summarizeBattle()` derives the result summary purely from the log.
- `FRAME_MS` is presentation-only; speed/pause/step/skip select frames and can never change the outcome (the outcome is already fixed in the stored log).

### Ticket 6 — Battle presentation and controls ✅

`/battle` renders both ordered Circuits as labeled rows (**Opponent** top / **You** bottom) with FRONT tags and the front line marked between them; acting creatures get a solid **source** outline, affected creatures a dashed **target** outline. Controls: Play/Pause, Next, 1×/2× (`aria-pressed`), Skip to Result, Replay — all with disabled states. A persistent battle log (numbered, cause-attributed: "X takes 6 damage (×1.5 element advantage)", "Y triggers (battle start): …") sits beside the board and survives skipping. Animation is minimal CSS (outline highlights, compression transition); every state change is readable from card numbers + the log, never animation alone.

### Ticket 7 — Result state and replay loop ✅

Result panel on `battle_end`: outcome heading (Victory! / Defeat / **Draw — awarded to you**), explanation line, rounds, defeats per side, ability-trigger count, shield blocks, guard redirects, summons, and a per-trigger activity breakdown — all derived from the event log. `Edit Circuit` (Circuit preserved) and `Replay Battle` (frame 0, same log). No run structure or rewards.

### Ticket 8 — Accessibility, responsive, Creative spec ✅

- Everything is native buttons/links: keyboard operable, visible `:focus-visible` outlines, descriptive accessible names; drag is never the only route.
- Element (text + glyph), rarity (text + border style), damage/heal/buffs/outcome (text log + numbers) — never color alone.
- `prefers-reduced-motion` collapses all transitions to immediate state changes (global CSS); playback remains fully usable (verified in e2e with `reducedMotion: 'reduce'`).
- 1024×768 and 1440×900 verified with an automated no-horizontal-overflow assertion.
- **`CREATIVE_ASSET_DELIVERY_SPEC.md`** created (pinned 1024×1432 card master, 1024×1024 art with central-80% rule, overlay/frame rules, icon spec 128/96, sRGB, naming, size budgets, manifest workflow) with the labeled safe-zone diagram at `reports/screenshots/stage-0.3-card-safe-zones.svg`.

### Ticket 9 — Tests, browser verification, documentation ✅

37 new Vitest tests (87 total) + 4 Playwright tests. Coverage per brief: card rendering & missing-art fallback · builder add/remove/duplicates/validation/accessible reordering · opponent selection & one-time battle creation · pure playback for every event type incl. guard redirect, shield block, summon, compression, exchange grouping · 1×/2×/pause/next/skip/replay/empty-state · result summary & draw wording · full builder→battle→result→builder e2e workflow. Docs updated (root/ui/state/assets READMEs).

## 2. Per-event representation table

| Event | Board representation | Text-log representation |
|---|---|---|
| battle_start | Both lineups appear, FRONT tags | "Battle begins!" |
| round_start | Round indicator updates (aria-live) | "— Round N —" |
| trigger_fired | Source card gets solid outline | "Your NAME (slot 1) triggers (trigger): full ability description" |
| attack | Both attackers outlined (one frame) | "Your A (slot 1) and Opponent B (slot 1) strike simultaneously!" |
| damage | Vitality number drops; target dashed outline | "Opponent X (slot 1) takes N damage (×1.5 element advantage) — M Vitality left." |
| heal | Vitality number rises | "Your X (slot 2) recovers N Vitality (now M)." |
| buff | Power/Vitality numbers rise | "Your X (slot 3) gains +N Power (now M)." |
| shield | "Shield ×N" badge on card | "Opponent X (slot 2) raises a shield (N charges)." |
| guard | "Guard ×N" badge on card | "Your X (slot 1) guards the ally behind it (N charges)." |
| shield block | Badge count drops; Vitality unchanged | "A shield blocks the hit on Opponent X (slot 1)." |
| guard redirect | Guard badge drops; damage lands on guardian | "Your G (slot 4) intercepts the hit aimed at Your V (slot 5)! Your G (slot 4) takes N damage…" |
| summon | Token card appears in last slot | "Your PH_SUMMON_TOKEN is summoned into the last slot (3/3)." |
| defeat | Card dims + "DEFEATED" label | "Your X (slot 1) is defeated." |
| compression | Row reflows (CSS transition) | "The player/opponent Circuit closes ranks." |
| battle_end | Result panel appears | Outcome line, e.g. "Draw — … awarded to you." |

**Primarily textual (per the brief's request to list them):** element multiplier (log note + numbers; no projectile/impact animation), targeting (outlines + log, no arrows), compression (simple reflow). All others combine a visible board change with a log line. Nothing depends on animation alone.

## 3. Implementation decisions worth review

- **Playback starts paused** with a prominent Play button. Rationale: deterministic tests/screenshots, and the reader controls pacing from step 1. Autoplay-on-entry is a one-line change if the PM prefers it at 0.6 polish.
- **Asset loader change** (`src/assets/loadManifest.ts`): `resolveAssetUrl` now uses an eager `import.meta.glob` URL map instead of dynamic `new URL(..., import.meta.url)` — the dynamic form isn't statically analyzable by Vite and broke under the test transform. Manifest contract unchanged; unknown paths now throw a clear error.
- **Opponent lineups as content data** (`opponent-lineups.json`) rather than TS constants — reuses the Stage 0.1 schema, gets validator coverage (including new creature-reference checks), and matches the "opponents are the same data shape as player Circuits" seam.
- One dependency beyond the authorized two: **`@testing-library/user-event`** (dev), the standard RTL companion for realistic interaction tests. Flagging per the working agreement.
- The engine and its 50 tests are untouched. No combat-rule changes; no engine defects found during UI work.

## 4. Automated verification output

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, clean |
| `npm run lint` | exit 0, clean |
| `npm test` | **12 files, 87/87 passed** (50 pre-existing + 37 new) |
| `npm run validate:content` | exit 0 — 12 abilities, 12 creatures, 2 variants, **3 opponent lineups** + manifest valid |
| `npm run sim:archetypes` | identical six-row table to the Stage 0.2 report (engine untouched) |
| `npm run build` | exit 0 — 279.96 kB JS (85.6 kB gzip), 9.2 kB CSS |
| `npm run test:e2e` | **4/4 passed** (workflow + 3 evidence/verification tests, Chromium) |

## 5. Browser checks

Verified in Chromium via the Playwright evidence suite (assertions, not eyeballs) plus manual screenshot review:

| Check | Result |
|---|---|
| 1440×900 builder / battle / result | ✅ screenshots below |
| 1024×768 usable, no page-level horizontal overflow | ✅ automated `scrollWidth ≤ clientWidth` assertion at both sizes |
| Keyboard-only use | ✅ builder add + playback stepping driven via focus+Enter in e2e; all controls are native buttons; RTL covers Move Forward/Back |
| Play/Pause, Next, 1×/2×, Skip, Replay | ✅ unit tests + e2e |
| Mid-battle state | ✅ `stage-0.3-battle.png`: simultaneous exchange highlighted, charges + current/max Vitality visible, log attributing causes |
| Skip → result, replay, edit | ✅ e2e + unit |
| Direct `/battle` empty state | ✅ e2e |
| `prefers-reduced-motion` | ✅ e2e context with `reducedMotion: 'reduce'` completes the full flow |
| Console errors | ✅ zero — asserted in every evidence test |

Screenshots (in `ai-communication-docs/phase-0/reports/screenshots/`):

- `stage-0.3-builder.png` — legal five-card Circuit + selected opponent with ordered preview
- `stage-0.3-battle.png` — mid-battle simultaneous exchange, highlights, charges, text log
- `stage-0.3-result.png` — result panel with outcome, stats, trigger-activity summary
- `stage-0.3-1024.png` — 1024px layout
- `stage-0.3-card-safe-zones.svg` — safe-zone diagram referenced by `CREATIVE_ASSET_DELIVERY_SPEC.md`

## 6. Known issues

- None functional. One environmental note: a Playwright-orphaned dev server once served a stale module graph mid-session (fixed by killing the process; fresh `npm run test:e2e` starts its own server and passes). Not a code defect.
- The Playwright `NO_COLOR`/`FORCE_COLOR` console warning is cosmetic (environment variables), harmless.

## 7. Deferred items

- Final card visual design, element/rarity icons, autoplay decision, and richer attack animation → Creative + Stage 0.6 polish (all state changes are already readable without animation).
- Collection screen, packs, persistence, run structure → Stage 0.4 (untouched, per scope).
- Variants for the remaining 10 creatures → Stage 0.5 content work.

---

## 8. Gate-review correction (2026-08-19, post CHANGES REQUIRED)

**Required correction from `STAGE_0.3_GATE_REVIEW.md`: side-aware log text — DELIVERED.**

- All creature references in playback log lines now use the recommended side-aware format: `Your PH_EMBER_GUARDIAN_01 (slot 1)` / `Opponent PH_EMBER_GUARDIAN_01 (slot 1)` (`sideAwareName()` in `src/ui/battle/playback.ts`). The blocked-shield line was rephrased to "A shield blocks the hit on Opponent X (slot 1)." to keep the side label readable.
- Slot labels come from the **display state at the time of the event** (the pre-frame state), so they stay accurate after compression, and they keep multiple same-named summon tokens on one side distinguishable. Summon lines take their side directly from the event snapshot (the token is not yet in the pre-frame state).
- **Engine event log and combat semantics untouched** — this is presentation text only; the engine and its 50 tests are byte-identical.
- Three focused tests added (90 total now), exactly matching the review's list:
  1. identical creature identities on opposing sides produce distinct Your/Opponent trigger, attack-headline, and damage lines;
  2. slot labels reflect the pre-event lineup after compression (PH_THREE reads "slot 2" after the front falls, while the earlier defeat line keeps its original slot);
  3. guard-redirection text distinguishes protector and intended target by side and slot.
- Full command list rerun after the correction — `typecheck` 0 · `lint` 0 · `test` **90/90** · `validate:content` 0 · `sim:archetypes` unchanged · `build` 0 · `test:e2e` **4/4**.
- Browser evidence refreshed: `stage-0.3-battle.png` now shows the mirror-guardian case from the review resolved — "Your PH_EMBER_GUARDIAN_01 (slot 1) and Opponent PH_EMBER_GUARDIAN_01 (slot 1) strike simultaneously!" with distinct per-side damage lines. Builder/result/1024 screenshots re-captured in the same run.
- Housekeeping found during the rerun: `npm run format` had reformatted the Owner's root document "Mythic Circuit - Creative Direction v1 (standalone).html" (whitespace only). It was restored from git, and `.prettierignore` now excludes root-level HTML other than `index.html` so owner-managed documents are never touched again.

## Ready-to-paste commit block

```
COMMIT TITLE:
Phase 0 / Stage 0.3 — Gate correction: side-aware battle log text

COMMIT DESCRIPTION:
Gate-review correction (STAGE_0.3_GATE_REVIEW.md): all playback log lines now
identify creatures by side and slot — "Your PH_EMBER_GUARDIAN_01 (slot 1)" vs
"Opponent PH_EMBER_GUARDIAN_01 (slot 1)" — using the display state at the time
of each event, so slot labels stay accurate after compression and same-named
summon tokens remain distinguishable. Presentation text only; engine event log
and combat semantics untouched.

Three focused tests added per the review (90 total): distinct per-side lines for
identical creature identities, post-compression slot accuracy, and side/position
in guard-redirection text. Full command list rerun (typecheck, lint, 90/90
tests, validate:content, sim, build, 4/4 e2e) and browser screenshots refreshed;
correction section appended to STAGE_0.3_COMPLETION_REPORT.md.

Also: .prettierignore now excludes owner-managed root HTML documents (the
Creative Direction doc was restored untouched from git).
```

(The original full-stage commit block was superseded: the Stage 0.3 implementation is already committed per the gate review's history note, so the pending commit is the correction above.)
