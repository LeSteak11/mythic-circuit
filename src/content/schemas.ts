import { z } from 'zod';

/**
 * Content schemas for Mythic Circuit, per the Phase 0 plan §6.
 *
 * These are planning-level shapes. Stage 0.2 (battle engine) may refine
 * ability targets/magnitudes; any change bumps the relevant fixture data
 * and is called out at the stage gate.
 *
 * Naming conventions:
 * - ids: kebab-case, stable, referenced across files (e.g. "creature-ember-guardian-01").
 * - display names: placeholder content uses the PH_ prefix (e.g. "PH_EMBER_GUARDIAN_01")
 *   so nothing placeholder can be mistaken for final. Creative owns final names.
 */

const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ids must be kebab-case (lowercase letters, digits, dashes)');

const placeholderNameSchema = z
  .string()
  .min(1)
  .describe('Display name. Placeholder content must use the PH_ prefix.');

/** Four-element advantage wheel: ember → volt → tide → verdant → ember (all PH). */
export const elementSchema = z.enum(['ember', 'volt', 'tide', 'verdant']);
export type Element = z.infer<typeof elementSchema>;

/** Rarity affects drop odds and card treatment only — never raw power gating. */
export const raritySchema = z.enum(['common', 'rare', 'mythic']);
export type Rarity = z.infer<typeof raritySchema>;

/** Closed MVP trigger list (7) — see game design reference §5. */
export const abilityTriggerSchema = z.enum([
  'battle_start',
  'before_own_attack',
  'after_own_attack',
  'ally_defeated',
  'self_defeated',
  'first_below_half_vitality',
  'end_of_round',
]);
export type AbilityTrigger = z.infer<typeof abilityTriggerSchema>;

/** Closed MVP effect list (~8) — see game design reference §5. */
export const abilityEffectSchema = z.enum([
  'damage',
  'heal',
  'buff_power',
  'buff_vitality',
  'shield',
  'summon',
  'scavenge',
  'guard',
]);
export type AbilityEffect = z.infer<typeof abilityEffectSchema>;

/** Planning-level target list; Stage 0.2 will pin down per-effect legality. */
export const abilityTargetSchema = z.enum([
  'self',
  'ally_behind',
  'ally_lowest_vitality',
  'all_allies',
  'front_enemy',
  'last_enemy',
  'all_enemies',
]);
export type AbilityTarget = z.infer<typeof abilityTargetSchema>;

export const abilityDefinitionSchema = z
  .object({
    id: idSchema,
    trigger: abilityTriggerSchema,
    effect: abilityEffectSchema,
    magnitude: z.number().int().nonnegative(),
    target: abilityTargetSchema,
    /** Human-readable template; {magnitude} is interpolated at render time. */
    descriptionTemplate: z.string().min(1),
  })
  .strict();
export type AbilityDefinition = z.infer<typeof abilityDefinitionSchema>;

export const creatureDefinitionSchema = z
  .object({
    id: idSchema,
    name: placeholderNameSchema,
    element: elementSchema,
    rarity: raritySchema,
    power: z.number().int().positive(),
    vitality: z.number().int().positive(),
    abilityId: idSchema,
    /** Collection metadata only in MVP; families become mechanical post-MVP. */
    familyTag: idSchema,
    /** Data seam for evolution — mechanically excluded from MVP. */
    evolvesFromId: idSchema.optional(),
  })
  .strict();
export type CreatureDefinition = z.infer<typeof creatureDefinitionSchema>;

/** Card treatments; a creature identity can have many variants. */
export const variantTreatmentSchema = z.enum(['standard', 'foil', 'full_art']);
export type VariantTreatment = z.infer<typeof variantTreatmentSchema>;

export const cardVariantSchema = z
  .object({
    id: idSchema,
    creatureId: idSchema,
    treatment: variantTreatmentSchema,
    /** Asset keys resolved through src/assets/manifest.json — never raw paths here. */
    artRef: idSchema,
    frameRef: idSchema,
  })
  .strict();
export type CardVariant = z.infer<typeof cardVariantSchema>;

const rarityWeightsSchema = z
  .object({
    common: z.number().nonnegative(),
    rare: z.number().nonnegative(),
    mythic: z.number().nonnegative(),
  })
  .strict();

const treatmentWeightsSchema = z
  .object({
    standard: z.number().nonnegative(),
    foil: z.number().nonnegative(),
    full_art: z.number().nonnegative(),
  })
  .strict();

export const packSchema = z
  .object({
    id: idSchema,
    name: placeholderNameSchema,
    /** Cost in Embers (PH currency). Starter pack is cost 0. */
    cost: z.number().int().nonnegative(),
    slotCount: z.number().int().positive(),
    /** One rarity-weight row per slot. */
    raritySlotTable: z.array(rarityWeightsSchema),
    variantOddsTable: treatmentWeightsSchema,
  })
  .strict()
  .refine((pack) => pack.raritySlotTable.length === pack.slotCount, {
    message: 'raritySlotTable must have exactly one row per slot (length === slotCount)',
    path: ['raritySlotTable'],
  });
export type Pack = z.infer<typeof packSchema>;

export const opponentLineupSchema = z
  .object({
    id: idSchema,
    name: placeholderNameSchema,
    creatureIds: z
      .array(idSchema)
      .length(5)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: 'creatureIds must not contain duplicate creature identities',
      }),
    archetypeTag: idSchema,
    difficultyTier: z.number().int().positive(),
  })
  .strict();
export type OpponentLineup = z.infer<typeof opponentLineupSchema>;

export const rewardTableSchema = z
  .object({
    id: idSchema,
    /** Embers granted per run outcome, keyed by win count achieved (0–7). */
    entries: z
      .array(
        z
          .object({
            wins: z.number().int().min(0).max(7),
            embers: z.number().int().nonnegative(),
            bonusPackId: idSchema.optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export type RewardTable = z.infer<typeof rewardTableSchema>;

/**
 * Save-file envelope. Only the version stamp exists in Stage 0.1; the payload
 * (collection, circuits, embers, run state, settings) lands in Stage 0.4.
 */
export const saveFileEnvelopeSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
  })
  .strict();
export type SaveFileEnvelope = z.infer<typeof saveFileEnvelopeSchema>;
