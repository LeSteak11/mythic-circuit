import type { z } from 'zod';
import {
  abilityDefinitionSchema,
  cardVariantSchema,
  creatureDefinitionSchema,
  opponentLineupSchema,
  packSchema,
  rewardTableSchema,
  type AbilityDefinition,
  type CardVariant,
  type CreatureDefinition,
  type OpponentLineup,
} from './schemas';

/**
 * Pure content validation: takes already-parsed JSON keyed by base filename,
 * returns a flat list of readable errors (empty = valid). File loading lives
 * in scripts/validate-content.ts so this module stays free of Node APIs and
 * unit-testable.
 */

export interface ContentError {
  file: string;
  message: string;
}

/** Every known content file maps to an array of one schema. */
const fileSchemas = {
  'abilities.json': abilityDefinitionSchema,
  'creatures.json': creatureDefinitionSchema,
  'card-variants.json': cardVariantSchema,
  'packs.json': packSchema,
  'opponent-lineups.json': opponentLineupSchema,
  'reward-tables.json': rewardTableSchema,
} as const;

type KnownFile = keyof typeof fileSchemas;

const REQUIRED_FILES: KnownFile[] = ['abilities.json', 'creatures.json'];

function formatZodIssues(file: string, index: number, error: z.ZodError): ContentError[] {
  return error.issues.map((issue) => ({
    file,
    message: `entry ${index}${issue.path.length > 0 ? ` → ${issue.path.join('.')}` : ''}: ${issue.message}`,
  }));
}

function checkUniqueIds(file: string, entries: Array<{ id: string }>): ContentError[] {
  const seen = new Set<string>();
  const errors: ContentError[] = [];
  for (const entry of entries) {
    if (seen.has(entry.id)) {
      errors.push({ file, message: `duplicate id "${entry.id}"` });
    }
    seen.add(entry.id);
  }
  return errors;
}

export interface ValidateContentOptions {
  /**
   * Variant ids present in src/assets/manifest.json. When provided, every
   * card variant must have a manifest entry resolving its art/frame paths.
   */
  manifestVariantIds?: Set<string>;
}

export function validateContent(
  files: Record<string, unknown>,
  options: ValidateContentOptions = {},
): ContentError[] {
  const errors: ContentError[] = [];

  for (const required of REQUIRED_FILES) {
    if (!(required in files)) {
      errors.push({ file: required, message: 'required content file is missing' });
    }
  }

  const parsed: Partial<Record<KnownFile, unknown[]>> = {};

  for (const [file, data] of Object.entries(files)) {
    const schema = (fileSchemas as Record<string, z.ZodTypeAny>)[file];
    if (!schema) {
      errors.push({
        file,
        message: `unknown content file — expected one of: ${Object.keys(fileSchemas).join(', ')}`,
      });
      continue;
    }
    if (!Array.isArray(data)) {
      errors.push({ file, message: 'content file must contain a JSON array' });
      continue;
    }
    const validEntries: unknown[] = [];
    data.forEach((entry, index) => {
      const result = schema.safeParse(entry);
      if (result.success) {
        validEntries.push(result.data);
      } else {
        errors.push(...formatZodIssues(file, index, result.error));
      }
    });
    parsed[file as KnownFile] = validEntries;
    errors.push(...checkUniqueIds(file, validEntries as Array<{ id: string }>));
  }

  // Referential integrity (only across entries that individually parsed).
  const abilities = (parsed['abilities.json'] ?? []) as AbilityDefinition[];
  const creatures = (parsed['creatures.json'] ?? []) as CreatureDefinition[];
  const variants = (parsed['card-variants.json'] ?? []) as CardVariant[];

  const abilityIds = new Set(abilities.map((a) => a.id));
  const creatureIds = new Set(creatures.map((c) => c.id));

  for (const creature of creatures) {
    if (!abilityIds.has(creature.abilityId)) {
      errors.push({
        file: 'creatures.json',
        message: `creature "${creature.id}" references unknown abilityId "${creature.abilityId}"`,
      });
    }
    if (creature.evolvesFromId !== undefined && !creatureIds.has(creature.evolvesFromId)) {
      errors.push({
        file: 'creatures.json',
        message: `creature "${creature.id}" references unknown evolvesFromId "${creature.evolvesFromId}"`,
      });
    }
  }

  for (const variant of variants) {
    if (!creatureIds.has(variant.creatureId)) {
      errors.push({
        file: 'card-variants.json',
        message: `variant "${variant.id}" references unknown creatureId "${variant.creatureId}"`,
      });
    }
    if (options.manifestVariantIds && !options.manifestVariantIds.has(variant.id)) {
      errors.push({
        file: 'card-variants.json',
        message: `variant "${variant.id}" has no entry in src/assets/manifest.json`,
      });
    }
  }

  const opponents = (parsed['opponent-lineups.json'] ?? []) as OpponentLineup[];
  for (const opponent of opponents) {
    for (const creatureId of opponent.creatureIds) {
      if (!creatureIds.has(creatureId)) {
        errors.push({
          file: 'opponent-lineups.json',
          message: `opponent "${opponent.id}" references unknown creatureId "${creatureId}"`,
        });
      }
    }
  }

  return errors;
}
