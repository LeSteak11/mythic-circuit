import manifestJson from './manifest.json';
import { assetManifestSchema, type AssetManifest, type VariantAssets } from './manifestSchema';

/**
 * Loader stub for the asset manifest. Later stages will call getVariantAssets
 * from the card component; for now this only proves the contract: manifest is
 * validated at load time and consumers never hard-code asset paths.
 */

let cachedManifest: AssetManifest | undefined;

export function loadAssetManifest(): AssetManifest {
  cachedManifest ??= assetManifestSchema.parse(manifestJson);
  return cachedManifest;
}

/** Returns the art/frame paths (relative to src/assets/) for a card variant. */
export function getVariantAssets(variantId: string): VariantAssets {
  const entry = loadAssetManifest().variants[variantId];
  if (!entry) {
    throw new Error(`No asset manifest entry for variant "${variantId}"`);
  }
  return entry;
}

/**
 * Build-time URL map of every asset under src/assets/. Vite rewrites these to
 * hashed URLs in production; dynamic `new URL(..., import.meta.url)` is not
 * statically analyzable, so the glob map is the reliable route.
 */
const assetUrls = import.meta.glob('./**/*.{svg,png,webp,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Resolves a manifest-relative asset path to a URL the browser can load. */
export function resolveAssetUrl(relativePath: string): string {
  const url = assetUrls[`./${relativePath}`];
  if (!url) {
    throw new Error(`Asset file not found under src/assets/: ${relativePath}`);
  }
  return url;
}
