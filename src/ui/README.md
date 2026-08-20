# src/ui/

React components and screens: cards, Circuit builder, battle playback.

## Layout

- `components/CreatureCard.tsx` — the ONE reusable card template (builder + battle), styled entirely through `--card-*` CSS custom properties in `global.css` so Creative can restyle without rebuilding. `components/cardData.ts` builds its view model from the content catalog + asset loader.
- `battle/playback.ts` — pure playback model: folds the engine event log into presentation frames (state snapshots + log lines + highlights). It never reruns combat rules; the raw log is untouched. `FRAME_MS` is presentation-only timing.
- `screens/CircuitBuilderScreen.tsx` — roster, ordered slots 1–5 (drag AND keyboard Move Forward/Back), `validateLineup()`-backed validation messages, opponent selection, `Battle this Circuit`.
- `screens/BattleScreen.tsx` — event-log playback: board with both Circuits (fronts marked), Play/Pause/Next/1×/2×/Skip/Replay controls, persistent battle text log, result panel with summary + Edit/Replay.

## Boundary rules

- Renders **only** from state stores and the playback model over engine event logs — never engine internals, never a second `runBattle` call for the same match.
- Content/assets come from `src/content/catalog.ts` and the manifest loader in `src/assets/` — components never parse raw JSON or hard-code asset paths.
- May import the public engine API (`src/engine/index.ts`) only.
- Element, rarity, and outcomes are always communicated with text/glyphs/border treatments — never color alone. `prefers-reduced-motion` collapses transitions to immediate state changes.
