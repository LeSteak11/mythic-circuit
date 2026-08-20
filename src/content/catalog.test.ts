import { describe, expect, it } from 'vitest';
import { loadCatalog, triggerLabel } from './catalog';

describe('content catalog', () => {
  it('loads and validates all content once', () => {
    const catalog = loadCatalog();
    expect(catalog.creatures).toHaveLength(12);
    expect(catalog.abilities).toHaveLength(12);
    expect(catalog.opponents).toHaveLength(3);
    expect(loadCatalog()).toBe(catalog); // cached instance
  });

  it('interpolates ability descriptions fully', () => {
    const catalog = loadCatalog();
    const text = catalog.describeAbility('ability-scavenge-01');
    expect(text).toBe('Gains 2 Power whenever an ally is defeated.');
    expect(text).not.toContain('{magnitude}');
    expect(catalog.describeAbility('ability-nope')).toBe('Unknown ability.');
  });

  it('maps standard variants and trigger labels', () => {
    const catalog = loadCatalog();
    expect(catalog.variantByCreatureId.get('creature-ember-guardian-01')?.id).toBe(
      'variant-ember-guardian-01-standard',
    );
    expect(catalog.variantByCreatureId.has('creature-volt-striker-01')).toBe(false);
    expect(triggerLabel('end_of_round')).toBe('End of round');
  });
});
