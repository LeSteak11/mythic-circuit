import type { AbilityDefinition, CreatureDefinition } from '../content/schemas';
import type { LineupError, LineupValidationResult } from './types';

export const LINEUP_SIZE = 5;

/**
 * Validates an ordered lineup of creature ids against a creature/ability pool.
 * Returns typed errors — never throws — so the UI can explain problems.
 */
export function validateLineup(
  creatureIds: readonly string[],
  creaturePool: readonly CreatureDefinition[],
  abilityPool: readonly AbilityDefinition[],
): LineupValidationResult {
  const errors: LineupError[] = [];

  if (creatureIds.length !== LINEUP_SIZE) {
    errors.push({ code: 'wrong_size', expected: LINEUP_SIZE, actual: creatureIds.length });
  }

  const seen = new Set<string>();
  for (const creatureId of creatureIds) {
    if (seen.has(creatureId)) {
      errors.push({ code: 'duplicate_creature', creatureId });
    }
    seen.add(creatureId);
  }

  const creaturesById = new Map(creaturePool.map((c) => [c.id, c]));
  const abilityIds = new Set(abilityPool.map((a) => a.id));
  const creatures: CreatureDefinition[] = [];

  for (const creatureId of creatureIds) {
    const creature = creaturesById.get(creatureId);
    if (!creature) {
      errors.push({ code: 'unknown_creature', creatureId });
      continue;
    }
    if (!abilityIds.has(creature.abilityId)) {
      errors.push({ code: 'unknown_ability', creatureId, abilityId: creature.abilityId });
      continue;
    }
    creatures.push(creature);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, creatures };
}
