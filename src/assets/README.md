# src/assets/

Art and card frames, resolved **only** through `manifest.json`. Everything in `placeholder/` is obviously-labeled temporary art.

## Boundary rules

- No component or module hard-codes an asset path. Everything resolves through `manifest.json` via `loadManifest.ts` (`getVariantAssets(variantId)` → `{ art, frame }` paths → `resolveAssetUrl(path)` for a browser URL).
- `manifest.json` maps **card-variant id → art/frame paths** (relative to this directory) and is validated by the Zod schema in `manifestSchema.ts`. `npm run validate:content` checks it, plus that every card variant in content has a manifest entry.
- Placeholder art lives under `placeholder/` and is visually labeled `PLACEHOLDER` so it can't be mistaken for final.

## How Creative swaps in real art (zero code changes)

1. Drop the final image file(s) into this directory — e.g. `final/ember-guardian.webp` (kebab-case names; svg/png/webp/jpg).
2. Edit `manifest.json`: point the variant's `"art"` (and/or `"frame"`) at the new path:

   ```json
   "variant-ember-guardian-01-standard": {
     "art": "final/ember-guardian.webp",
     "frame": "placeholder/frame-standard.svg"
   }
   ```

3. Run `npm run validate:content` — it confirms the manifest is well-formed.
4. Done. No TypeScript, component, or content-data changes are ever needed; the card renders the new art on next load.

New _variants_ (e.g. a foil) are one data entry in `src/content/data/card-variants.json` plus one manifest entry — still no code.

**Delivery spec** for Creative (exact sizes, formats, safe zones, icon rules): [`ai-communication-docs/phase-0/CREATIVE_ASSET_DELIVERY_SPEC.md`](../../ai-communication-docs/phase-0/CREATIVE_ASSET_DELIVERY_SPEC.md). Current placeholders use 512×512 art and 512×716 frames as a working stand-in for the pinned 1024×1024 / 1024×1432 masters.
