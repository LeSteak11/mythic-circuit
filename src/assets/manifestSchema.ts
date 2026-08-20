import { z } from 'zod';

/**
 * Asset manifest contract: maps card-variant ids to the art and frame files
 * that render them. All art resolution flows through this manifest so
 * Creative can swap real art in with zero code changes — see README.md in
 * this directory.
 */

const assetPathSchema = z
  .string()
  .regex(
    /^[a-z0-9-]+(\/[a-z0-9-]+)*\.(svg|png|webp|jpg)$/,
    'asset paths are relative to src/assets/, kebab-case, with an svg/png/webp/jpg extension',
  );

export const variantAssetsSchema = z
  .object({
    art: assetPathSchema,
    frame: assetPathSchema,
  })
  .strict();
export type VariantAssets = z.infer<typeof variantAssetsSchema>;

export const assetManifestSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    variants: z.record(z.string(), variantAssetsSchema),
  })
  .strict();
export type AssetManifest = z.infer<typeof assetManifestSchema>;
