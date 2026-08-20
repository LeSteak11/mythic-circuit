# Mythic Circuit — Creative Asset Delivery Spec

**Version 1.0 · 2026-08-19 · Stage 0.3 deliverable.** Aligned with the implemented card component (`src/ui/components/CreatureCard.tsx`). Safe-zone diagram: [`reports/screenshots/stage-0.3-card-safe-zones.svg`](reports/screenshots/stage-0.3-card-safe-zones.svg).

This spec lets Creative replace every placeholder with final art with **zero code changes**. If anything here conflicts with a future card redesign, the PM updates this spec first.

## 1. What the UI draws vs. what Creative delivers

The card **component** draws all text overlays: creature name, element + rarity labels, Power/Vitality stats, and the ability description. Creative delivers **image layers only**:

| Deliverable | Master size | Format | Notes |
|---|---|---|---|
| Creature art | **1024×1024** | WebP (preferred), PNG, or SVG | Square crop; the UI displays it inside the card's square art window and may crop/scale down to ~96 px |
| Card frame / foil overlay | **1024×1432** | Transparent PNG/WebP or SVG | Same ratio as the 512×716 working placeholder frame; transparent inside the art window and overlay rows |
| Element / rarity / trigger icons | **SVG preferred**, else transparent PNG at **128×128** | SVG / PNG | Critical marks inside a **96×96** centered safe area |

## 2. Canvas, safe zones, and overlays

See the diagram for exact regions (drawn at half scale). At the 1024×1432 card master:

- **Frame zone:** outer 24 px border ring — decorative frame art only.
- **Name bar:** full-width band directly under the top frame edge — the UI renders the creature name here; keep frame art quiet (low contrast, no busy detail).
- **Art window:** square region below the name bar (928×928 at master scale). Creature art fills this window. **Critical subject matter must sit inside the central 80%** of the 1024×1024 art source — edges may be cropped at small sizes.
- **Element/rarity row, stat row, ability text block:** the lower ~300 px of the card. The UI draws text here on top of the frame; frames need a readable, low-noise background in these rows (or transparency — the card background shows through).
- **Never bake text into art or frame files.** Names, stats, and ability text always come from content data so Creative renames and rebalances never require art changes.

## 3. File format and color rules

- **Color space: sRGB.** No embedded CMYK or wide-gamut profiles.
- **Transparency:** frames and icons must use real alpha transparency (no matte/white boxes). Creature art may be fully opaque.
- **Recommended file-size budgets:** creature art ≤ 300 KB (WebP quality ~80 is typically well under this); frames ≤ 200 KB; icons ≤ 20 KB. These are budgets, not hard failures — flag intentional exceptions.
- **File naming:** kebab-case, lowercase, digits allowed: `ember-guardian.webp`, `frame-foil.svg`, `icon-element-tide.svg`. Allowed extensions: `svg png webp jpg` (the manifest schema rejects anything else).

## 4. The replacement workflow (zero code)

All art resolves through **`src/assets/manifest.json`** — a map from card-variant id to art/frame paths (relative to `src/assets/`):

1. Drop the file(s) into `src/assets/` (any subfolder, e.g. `src/assets/final/`).
2. Edit `manifest.json` so the variant points at the new file:

   ```json
   "variant-ember-guardian-01-standard": {
     "art": "final/ember-guardian.webp",
     "frame": "final/frame-standard.webp"
   }
   ```

3. Run `npm run validate:content` — confirms the manifest is well-formed and every card variant has an entry.
4. Reload the app. Done — no TypeScript, component, or content changes.

A new *variant* (e.g. a foil of an existing creature) is one entry in `src/content/data/card-variants.json` plus one manifest entry. See `src/assets/README.md` for the developer-side contract.

## 5. Current placeholder state (for reference)

- 2 of 12 creatures have placeholder art (`placeholder/art-*.svg`, labeled gradients); the other 10 render an explicit `PLACEHOLDER — ART PENDING` panel.
- One shared placeholder frame exists (`placeholder/frame-standard.svg`). Per-rarity/foil frames are welcome whenever Creative is ready — each is just a manifest entry.
- All creature names are `PH_`-prefixed placeholders; final names are a content-data change, not an art change.

## 6. Icon needs (first pass)

- 4 element icons (PH identities: Ember, Volt, Tide, Verdant) — the UI currently uses text + a glyph (▲◆●■) as the non-color cue; final icons replace the glyph but the text label stays.
- 3 rarity marks (Common / Rare / Mythic) — currently text + border treatment.
- 7 trigger icons (optional, post-MVP nicety) — battle start, before/after attack, ally/self defeated, below half, end of round.
