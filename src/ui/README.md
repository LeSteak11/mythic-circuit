# src/ui/

React components and screens: cards, collection, Circuit builder, battle playback.

## Boundary rules

- Renders **only** from state stores, engine event logs, and snapshots — never reaches into engine internals and never mutates game state directly.
- Battle playback consumes the engine's event log; the log is the contract between engine and UI.
- Styling is CSS Modules + CSS custom properties (see `global.css`) so Creative's final design is a restyle, not a rebuild.
- Card art/frames resolve through `src/assets/manifest.json` via the loader in `src/assets/` — no hard-coded asset paths in components.
