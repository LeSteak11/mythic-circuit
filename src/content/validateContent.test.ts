import { describe, expect, it } from 'vitest';
import abilities from './data/abilities.json';
import cardVariants from './data/card-variants.json';
import creatures from './data/creatures.json';
import invalidCreatures from './__fixtures__/invalid-creatures.json';
import manifest from '../assets/manifest.json';
import { opponentLineupSchema, packSchema, saveFileEnvelopeSchema } from './schemas';
import { validateContent } from './validateContent';

const validFiles = {
  'abilities.json': abilities,
  'creatures.json': creatures,
  'card-variants.json': cardVariants,
};

describe('validateContent', () => {
  it('accepts the shipped content data with the shipped asset manifest', () => {
    const errors = validateContent(validFiles, {
      manifestVariantIds: new Set(Object.keys(manifest.variants)),
    });
    expect(errors).toEqual([]);
  });

  it('rejects the invalid creatures fixture with readable errors', () => {
    const errors = validateContent({
      'abilities.json': abilities,
      'creatures.json': invalidCreatures,
    });
    const messages = errors.map((e) => `[${e.file}] ${e.message}`);

    // Schema errors on entry 0: missing name, unknown element, power 0.
    expect(messages.some((m) => m.includes('entry 0') && m.includes('name'))).toBe(true);
    expect(messages.some((m) => m.includes('entry 0') && m.includes('element'))).toBe(true);
    expect(messages.some((m) => m.includes('entry 0') && m.includes('power'))).toBe(true);
    // Duplicate id across entries 1 and 2.
    expect(messages).toContainEqual(expect.stringContaining('duplicate id "creature-dupe-01"'));
    // Referential error: entry 2 points at a missing ability.
    expect(messages).toContainEqual(
      expect.stringContaining('unknown abilityId "ability-does-not-exist"'),
    );
  });

  it('reports missing required files and unknown files', () => {
    const errors = validateContent({ 'mystery.json': [] });
    const messages = errors.map((e) => `[${e.file}] ${e.message}`);
    expect(messages).toContainEqual(expect.stringContaining('[abilities.json]'));
    expect(messages).toContainEqual(expect.stringContaining('[creatures.json]'));
    expect(messages).toContainEqual(expect.stringContaining('unknown content file'));
  });

  it('rejects a card variant with no asset manifest entry', () => {
    const errors = validateContent(validFiles, { manifestVariantIds: new Set() });
    expect(errors.map((e) => e.message)).toContainEqual(
      expect.stringContaining('no entry in src/assets/manifest.json'),
    );
  });

  it('rejects non-array content files', () => {
    const errors = validateContent({ ...validFiles, 'packs.json': { id: 'not-an-array' } });
    expect(errors.map((e) => e.message)).toContainEqual(
      expect.stringContaining('must contain a JSON array'),
    );
  });
});

describe('schema edge cases', () => {
  it('rejects a pack whose raritySlotTable length does not match slotCount', () => {
    const result = packSchema.safeParse({
      id: 'pack-standard-01',
      name: 'PH_STANDARD_PACK',
      cost: 100,
      slotCount: 5,
      raritySlotTable: [{ common: 1, rare: 0, mythic: 0 }],
      variantOddsTable: { standard: 95, foil: 4, full_art: 1 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an opponent lineup with duplicate creature identities', () => {
    const result = opponentLineupSchema.safeParse({
      id: 'opponent-wall-01',
      name: 'PH_GUARDIAN_WALL',
      creatureIds: ['creature-a', 'creature-a', 'creature-b', 'creature-c', 'creature-d'],
      archetypeTag: 'guardian-wall',
      difficultyTier: 1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts a save-file envelope with only a schemaVersion', () => {
    expect(saveFileEnvelopeSchema.safeParse({ schemaVersion: 1 }).success).toBe(true);
    expect(saveFileEnvelopeSchema.safeParse({}).success).toBe(false);
    expect(saveFileEnvelopeSchema.safeParse({ schemaVersion: 1, extra: true }).success).toBe(false);
  });
});
