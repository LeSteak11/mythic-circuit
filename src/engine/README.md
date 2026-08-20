# src/engine/

Deterministic battle simulation. **Pure TypeScript — lands in Stage 0.2.**

## Boundary rules

- **Never** imports React, react-dom, or anything from `src/ui/` or `src/state/`.
- **Never** touches the DOM, browser storage, or the network. No `window`, `document`, `localStorage`, `fetch`.
- All randomness flows through one seeded RNG passed in by the caller — same lineups + same seed = identical battle.
- Communicates outward only through its **event log** and state snapshots; the UI renders from those, never from engine internals.

These rules are enforced by ESLint (`no-restricted-imports` / `no-restricted-globals` for `src/engine/**` in `eslint.config.js`) — violations fail `npm run lint`.
