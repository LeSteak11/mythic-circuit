import { getVariantAssets, resolveAssetUrl } from '../../assets/loadManifest';
import { loadCatalog, triggerLabel } from '../../content/catalog';
import type { Element } from '../../content/schemas';
import type { DisplayCreature } from '../battle/playback';

/**
 * Card view-model shared by the builder and battle views. All content and
 * asset lookups happen here (via catalog + asset loader) — the card component
 * itself never touches JSON or file paths.
 */

export interface CardData {
  key: string;
  name: string;
  element: Element;
  /** 'token' for summoned creatures, which have no content rarity. */
  rarity: 'common' | 'rare' | 'mythic' | 'token';
  power: number;
  vitality: number;
  /** Present only in battle views. */
  maxVitality?: number;
  abilityText: string | null;
  triggerText: string | null;
  artUrl: string | null;
  frameUrl: string | null;
  shield: number;
  guard: number;
  defeated: boolean;
}

function resolveArt(creatureId: string): { artUrl: string | null; frameUrl: string | null } {
  const catalog = loadCatalog();
  const variant = catalog.variantByCreatureId.get(creatureId);
  if (!variant) return { artUrl: null, frameUrl: null };
  const assets = getVariantAssets(variant.id);
  return { artUrl: resolveAssetUrl(assets.art), frameUrl: resolveAssetUrl(assets.frame) };
}

/** Card data for a roster creature (builder / opponent preview). */
export function cardDataForCreature(creatureId: string): CardData {
  const catalog = loadCatalog();
  const creature = catalog.creaturesById.get(creatureId);
  if (!creature) throw new Error(`Unknown creature id: ${creatureId}`);
  const ability = catalog.abilitiesById.get(creature.abilityId);
  return {
    key: creature.id,
    name: creature.name,
    element: creature.element,
    rarity: creature.rarity,
    power: creature.power,
    vitality: creature.vitality,
    abilityText: catalog.describeAbility(creature.abilityId),
    triggerText: ability ? triggerLabel(ability.trigger) : null,
    ...resolveArt(creature.id),
    shield: 0,
    guard: 0,
    defeated: false,
  };
}

/** Card data for a battle-board creature reconstructed from the event log. */
export function cardDataForDisplay(creature: DisplayCreature): CardData {
  const catalog = loadCatalog();
  const definition = catalog.creaturesById.get(creature.definitionId);
  const ability = definition ? catalog.abilitiesById.get(definition.abilityId) : undefined;
  return {
    key: creature.instanceId,
    name: creature.name,
    element: creature.element,
    rarity: definition ? definition.rarity : 'token',
    power: creature.power,
    vitality: creature.vitality,
    maxVitality: creature.maxVitality,
    abilityText: definition ? catalog.describeAbility(definition.abilityId) : null,
    triggerText: ability ? triggerLabel(ability.trigger) : null,
    ...(definition ? resolveArt(definition.id) : { artUrl: null, frameUrl: null }),
    shield: creature.shield,
    guard: creature.guard,
    defeated: creature.defeated,
  };
}
