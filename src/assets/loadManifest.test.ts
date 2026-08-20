import { describe, expect, it } from 'vitest';
import { getVariantAssets, loadAssetManifest } from './loadManifest';

// Every file that actually exists under src/assets/ (Vite glob, build-time).
const existingAssetFiles = Object.keys(import.meta.glob('./**/*.{svg,png,webp,jpg}')).map((path) =>
  path.replace(/^\.\//, ''),
);

describe('asset manifest', () => {
  it('validates against the manifest schema at load time', () => {
    const manifest = loadAssetManifest();
    expect(manifest.schemaVersion).toBe(1);
    expect(Object.keys(manifest.variants).length).toBeGreaterThan(0);
  });

  it('only references asset files that exist on disk', () => {
    const manifest = loadAssetManifest();
    for (const [variantId, assets] of Object.entries(manifest.variants)) {
      expect(existingAssetFiles, `art for ${variantId}`).toContain(assets.art);
      expect(existingAssetFiles, `frame for ${variantId}`).toContain(assets.frame);
    }
  });

  it('resolves a known variant and rejects an unknown one', () => {
    const assets = getVariantAssets('variant-ember-guardian-01-standard');
    expect(assets.art).toBe('placeholder/art-ember-guardian-01.svg');
    expect(assets.frame).toBe('placeholder/frame-standard.svg');
    expect(() => getVariantAssets('variant-nope')).toThrow(/No asset manifest entry/);
  });
});
