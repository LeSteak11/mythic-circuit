import { z } from 'zod';
import abilitiesJson from './data/abilities.json';
import cardVariantsJson from './data/card-variants.json';
import creaturesJson from './data/creatures.json';
import opponentLineupsJson from './data/opponent-lineups.json';
import {
  abilityDefinitionSchema,
  cardVariantSchema,
  creatureDefinitionSchema,
  opponentLineupSchema,
  type AbilityDefinition,
  type CardVariant,
  type CreatureDefinition,
  type OpponentLineup,
} from './schemas';

/**
 * Runtime content catalog: validates and loads all content data exactly once,
 * outside presentation components. UI code reads from this adapter — it never
 * parses raw JSON or resolves content references itself.
 */

export interface ContentCatalog {
  creatures: CreatureDefinition[];
  abilities: AbilityDefinition[];
  cardVariants: CardVariant[];
  opponents: OpponentLineup[];
  creaturesById: Map<string, CreatureDefinition>;
  abilitiesById: Map<string, AbilityDefinition>;
  /** Standard-treatment variant per creature id, when one exists. */
  variantByCreatureId: Map<string, CardVariant>;
  opponentsById: Map<string, OpponentLineup>;
  /** Fully interpolated ability description for a creature. */
  describeAbility(abilityId: string): string;
}

const TRIGGER_LABELS = {
  battle_start: 'Battle start',
  before_own_attack: 'Before attacking',
  after_own_attack: 'After attacking',
  ally_defeated: 'Ally defeated',
  self_defeated: 'On defeat',
  first_below_half_vitality: 'First time below half Vitality',
  end_of_round: 'End of round',
} as const;

export function triggerLabel(trigger: keyof typeof TRIGGER_LABELS): string {
  return TRIGGER_LABELS[trigger];
}

let cached: ContentCatalog | undefined;

export function loadCatalog(): ContentCatalog {
  if (cached) return cached;

  const creatures = z.array(creatureDefinitionSchema).parse(creaturesJson);
  const abilities = z.array(abilityDefinitionSchema).parse(abilitiesJson);
  const cardVariants = z.array(cardVariantSchema).parse(cardVariantsJson);
  const opponents = z.array(opponentLineupSchema).parse(opponentLineupsJson);

  const abilitiesById = new Map(abilities.map((a) => [a.id, a]));
  const variantByCreatureId = new Map<string, CardVariant>();
  for (const variant of cardVariants) {
    if (variant.treatment === 'standard' && !variantByCreatureId.has(variant.creatureId)) {
      variantByCreatureId.set(variant.creatureId, variant);
    }
  }

  cached = {
    creatures,
    abilities,
    cardVariants,
    opponents,
    creaturesById: new Map(creatures.map((c) => [c.id, c])),
    abilitiesById,
    variantByCreatureId,
    opponentsById: new Map(opponents.map((o) => [o.id, o])),
    describeAbility(abilityId: string): string {
      const ability = abilitiesById.get(abilityId);
      if (!ability) return 'Unknown ability.';
      return ability.descriptionTemplate.replaceAll('{magnitude}', String(ability.magnitude));
    },
  };
  return cached;
}
