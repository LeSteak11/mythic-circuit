# src/state/

Zustand stores wiring services to the UI — **lands in Stage 0.3+**.

## Boundary rules

- Stores orchestrate `src/services/` and expose state/actions to `src/ui/`. Game rules live in `src/engine/`, persistence in `src/services/` — never here.
- `src/engine/` must never import from this directory (lint-enforced).
