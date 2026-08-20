import { describe, expect, it } from 'vitest';
import type { AbilityDefinition, CreatureDefinition } from '../content/schemas';
import { validateLineup } from './lineup';

const abilities: AbilityDefinition[] = [
  {
    id: 'ability-inert',
    trigger: 'battle_start',
    effect: 'shield',
    magnitude: 0,
    target: 'self',
    descriptionTemplate: 'Does nothing.',
  },
];

function creature(id: string, abilityId = 'ability-inert'): CreatureDefinition {
  return {
    id,
    name: `PH_${id.toUpperCase()}`,
    element: 'ember',
    rarity: 'common',
    power: 3,
    vitality: 5,
    abilityId,
    familyTag: 'test',
  };
}

const pool = ['c-1', 'c-2', 'c-3', 'c-4', 'c-5', 'c-6'].map((id) => creature(id));

describe('validateLineup', () => {
  it('accepts a legal lineup and returns resolved creatures in order', () => {
    const result = validateLineup(['c-3', 'c-1', 'c-5', 'c-2', 'c-4'], pool, abilities);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.creatures.map((c) => c.id)).toEqual(['c-3', 'c-1', 'c-5', 'c-2', 'c-4']);
    }
  });

  it('rejects lineups that are not exactly 5', () => {
    const short = validateLineup(['c-1', 'c-2'], pool, abilities);
    expect(short.ok).toBe(false);
    if (!short.ok) {
      expect(short.errors).toContainEqual({ code: 'wrong_size', expected: 5, actual: 2 });
    }
    const long = validateLineup(['c-1', 'c-2', 'c-3', 'c-4', 'c-5', 'c-6'], pool, abilities);
    expect(long.ok).toBe(false);
  });

  it('rejects duplicate creature identities', () => {
    const result = validateLineup(['c-1', 'c-1', 'c-2', 'c-3', 'c-4'], pool, abilities);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: 'duplicate_creature', creatureId: 'c-1' });
    }
  });

  it('rejects unknown creature ids', () => {
    const result = validateLineup(['c-1', 'c-2', 'c-3', 'c-4', 'c-nope'], pool, abilities);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: 'unknown_creature', creatureId: 'c-nope' });
    }
  });

  it('rejects creatures whose ability cannot be resolved', () => {
    const poolWithBadAbility = [...pool.slice(0, 4), creature('c-bad', 'ability-missing')];
    const result = validateLineup(
      ['c-1', 'c-2', 'c-3', 'c-4', 'c-bad'],
      poolWithBadAbility,
      abilities,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: 'unknown_ability',
        creatureId: 'c-bad',
        abilityId: 'ability-missing',
      });
    }
  });

  it('reports multiple errors at once', () => {
    const result = validateLineup(['c-1', 'c-1', 'c-nope'], pool, abilities);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3); // size + duplicate + unknown
    }
  });
});
