import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import rosterAbilitiesJson from '../content/data/abilities.json';
import rosterCreaturesJson from '../content/data/creatures.json';
import {
  abilityDefinitionSchema,
  creatureDefinitionSchema,
  type AbilityDefinition,
  type CreatureDefinition,
} from '../content/schemas';
import { LineupInputError, runBattle } from './battle';
import type { BattleEvent } from './events';
import { createRng, shuffled } from './rng';

const rosterAbilities = z.array(abilityDefinitionSchema).parse(rosterAbilitiesJson);
const rosterCreatures = z.array(creatureDefinitionSchema).parse(rosterCreaturesJson);

/** Inert ability: fires only below half vitality, grants 0 shield — silent in most tests. */
const inert: AbilityDefinition = {
  id: 'ability-inert',
  trigger: 'first_below_half_vitality',
  effect: 'shield',
  magnitude: 0,
  target: 'self',
  descriptionTemplate: 'Does nothing.',
};

let idCounter = 0;
function creature(overrides: Partial<CreatureDefinition> = {}): CreatureDefinition {
  idCounter += 1;
  return {
    id: `t-${idCounter}`,
    name: `PH_T_${idCounter}`,
    element: 'ember',
    rarity: 'common',
    power: 3,
    vitality: 3,
    abilityId: 'ability-inert',
    familyTag: 'test',
    ...overrides,
  };
}

function team(overrides: Partial<CreatureDefinition> = {}): CreatureDefinition[] {
  return Array.from({ length: 5 }, () => creature(overrides));
}

function ofType<T extends BattleEvent['type']>(
  events: BattleEvent[],
  type: T,
): Extract<BattleEvent, { type: T }>[] {
  return events.filter((e) => e.type === type) as Extract<BattleEvent, { type: T }>[];
}

describe('core battle loop', () => {
  it('mirror vanilla teams trade down to a both-empty draw, which counts as a player win', () => {
    const result = runBattle({ player: team(), opponent: team(), abilities: [inert], seed: 1 });
    expect(result.outcome).toBe('draw_both_empty');
    expect(result.winner).toBe('player');
    expect(result.rounds).toBe(5); // power 3 vs vitality 3: one mutual KO per round
    expect(ofType(result.events, 'defeat')).toHaveLength(10);
    expect(ofType(result.events, 'compression')).toHaveLength(10); // both sides, every round
    expect(result.events.at(-1)?.type).toBe('battle_end');
  });

  it('a stronger side wins outright', () => {
    const result = runBattle({
      player: team({ power: 5, vitality: 10 }),
      opponent: team(),
      abilities: [inert],
      seed: 1,
    });
    expect(result.outcome).toBe('player_win');
    expect(result.winner).toBe('player');
  });

  it('applies element multipliers to attacks (×1.5 advantage, ×0.75 disadvantage)', () => {
    const result = runBattle({
      player: team({ element: 'ember', power: 4, vitality: 30 }),
      opponent: team({ element: 'volt', power: 4, vitality: 30 }),
      abilities: [inert],
      seed: 1,
    });
    const [playerAttack, opponentAttack] = ofType(result.events, 'attack');
    // Ember beats Volt: player advantaged, opponent disadvantaged.
    expect(playerAttack?.multiplier).toBe(1.5);
    expect(playerAttack?.amount).toBe(6); // round(4 × 1.5)
    expect(opponentAttack?.multiplier).toBe(0.75);
    expect(opponentAttack?.amount).toBe(3); // round(4 × 0.75)
  });

  it('throws a typed error on invalid lineups', () => {
    expect(() =>
      runBattle({
        player: team().slice(0, 4),
        opponent: team(),
        abilities: [inert],
        seed: 1,
      }),
    ).toThrow(LineupInputError);
  });
});

describe('determinism and termination', () => {
  it('1,000 seeded random battles produce identical event logs when run twice', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const rng = createRng(seed);
      const pick = (): CreatureDefinition[] => shuffled(rosterCreatures, rng).slice(0, 5);
      const player = pick();
      const opponent = pick();
      const first = runBattle({ player, opponent, abilities: rosterAbilities, seed });
      const second = runBattle({ player, opponent, abilities: rosterAbilities, seed });
      if (JSON.stringify(first.events) !== JSON.stringify(second.events)) {
        expect.fail(`event logs diverged for seed ${seed}`);
      }
    }
  });

  it('terminates stalling battles at the round cap as a draw (player win)', () => {
    const mend: AbilityDefinition = {
      id: 'ability-mend-test',
      trigger: 'after_own_attack',
      effect: 'heal',
      magnitude: 2,
      target: 'ally_lowest_vitality',
      descriptionTemplate: 'Heals.',
    };
    const healers = (): CreatureDefinition[] =>
      team({ power: 2, vitality: 5, abilityId: 'ability-mend-test' });
    const result = runBattle(
      { player: healers(), opponent: healers(), abilities: [mend], seed: 1 },
      { roundCap: 25 },
    );
    expect(result.outcome).toBe('draw_round_cap');
    expect(result.winner).toBe('player');
    expect(result.rounds).toBe(25);
  });
});

describe('trigger resolution', () => {
  const shieldStart: AbilityDefinition = {
    id: 'ability-shield-start',
    trigger: 'battle_start',
    effect: 'shield',
    magnitude: 1,
    target: 'self',
    descriptionTemplate: 'Shields.',
  };

  it('fires battle_start triggers front-most first, player before opponent on ties', () => {
    const player = team();
    const opponent = team();
    (player[0] as CreatureDefinition).abilityId = 'ability-shield-start';
    (player[2] as CreatureDefinition).abilityId = 'ability-shield-start';
    (opponent[1] as CreatureDefinition).abilityId = 'ability-shield-start';
    const result = runBattle({
      player,
      opponent,
      abilities: [inert, shieldStart],
      seed: 1,
    });
    const fired = ofType(result.events, 'trigger_fired').filter(
      (e) => e.trigger === 'battle_start',
    );
    expect(fired.map((e) => e.sourceId)).toEqual(['player-1', 'opponent-2', 'player-3']);
  });

  it('before_own_attack buffs apply before the exchange', () => {
    const rage: AbilityDefinition = {
      id: 'ability-rage-test',
      trigger: 'before_own_attack',
      effect: 'buff_power',
      magnitude: 1,
      target: 'self',
      descriptionTemplate: 'Rages.',
    };
    const player = team({ vitality: 30 });
    (player[0] as CreatureDefinition).abilityId = 'ability-rage-test';
    const result = runBattle({
      player,
      opponent: team({ power: 1, vitality: 30 }),
      abilities: [inert, rage],
      seed: 1,
    });
    const attacks = ofType(result.events, 'attack').filter((e) => e.attackerId === 'player-1');
    expect(attacks[0]?.amount).toBe(4); // base 3 + 1 before the first attack
    expect(attacks[1]?.amount).toBe(5); // stacks each round
  });

  it('after_own_attack fires for surviving attackers and heals the most wounded ally', () => {
    const mend: AbilityDefinition = {
      id: 'ability-mend-test',
      trigger: 'after_own_attack',
      effect: 'heal',
      magnitude: 2,
      target: 'ally_lowest_vitality',
      descriptionTemplate: 'Heals.',
    };
    const player = team({ vitality: 10 });
    (player[0] as CreatureDefinition).abilityId = 'ability-mend-test';
    const result = runBattle({
      player,
      opponent: team({ power: 3, vitality: 40 }),
      abilities: [inert, mend],
      seed: 1,
    });
    const heals = ofType(result.events, 'heal');
    // Round 1: front takes 3 (7/10), is the most wounded ally, heals itself 2 → 9.
    expect(heals[0]).toMatchObject({ targetId: 'player-1', amount: 2, newVitality: 9 });
  });

  it('after_own_attack does NOT fire for an attacker that died in the exchange', () => {
    const mend: AbilityDefinition = {
      id: 'ability-mend-test',
      trigger: 'after_own_attack',
      effect: 'heal',
      magnitude: 2,
      target: 'ally_lowest_vitality',
      descriptionTemplate: 'Heals.',
    };
    const player = team({ vitality: 3 });
    (player[0] as CreatureDefinition).abilityId = 'ability-mend-test';
    const result = runBattle({
      player,
      opponent: team({ power: 5, vitality: 40 }),
      abilities: [inert, mend],
      seed: 1,
    });
    const fromDead = ofType(result.events, 'trigger_fired').filter(
      (e) => e.sourceId === 'player-1' && e.trigger === 'after_own_attack',
    );
    expect(fromDead).toHaveLength(0);
  });

  it('scavenge stacks Power on every ally defeat', () => {
    const scavenge: AbilityDefinition = {
      id: 'ability-scavenge-test',
      trigger: 'ally_defeated',
      effect: 'scavenge',
      magnitude: 2,
      target: 'self',
      descriptionTemplate: 'Scavenges.',
    };
    const player = team({ power: 1, vitality: 1 });
    player[4] = creature({ power: 4, vitality: 20, abilityId: 'ability-scavenge-test' });
    const result = runBattle({
      player,
      opponent: team({ power: 5, vitality: 50 }),
      abilities: [inert, scavenge],
      seed: 1,
    });
    const buffs = ofType(result.events, 'buff').filter(
      (e) => e.targetId === 'player-5' && e.stat === 'power',
    );
    expect(buffs).toHaveLength(4); // one per fallen chaff ally
    expect(buffs.map((b) => b.newValue)).toEqual([6, 8, 10, 12]);
  });

  it('self_defeated (martyr) buffs all living allies on death', () => {
    const martyr: AbilityDefinition = {
      id: 'ability-martyr-test',
      trigger: 'self_defeated',
      effect: 'buff_power',
      magnitude: 2,
      target: 'all_allies',
      descriptionTemplate: 'Martyrs.',
    };
    const player = team({ power: 1, vitality: 10 });
    player[0] = creature({ power: 1, vitality: 3, abilityId: 'ability-martyr-test' });
    const result = runBattle({
      player,
      opponent: team({ power: 3, vitality: 40 }),
      abilities: [inert, martyr],
      seed: 1,
    });
    const buffs = ofType(result.events, 'buff').filter(
      (e) => e.cause.kind === 'ability' && e.cause.abilityId === 'ability-martyr-test',
    );
    expect(buffs).toHaveLength(4); // the 4 surviving allies; the dead martyr is excluded
    expect(buffs.every((b) => b.newValue === 3)).toBe(true);
  });

  it('first_below_half_vitality fires exactly once', () => {
    const frenzy: AbilityDefinition = {
      id: 'ability-frenzy-test',
      trigger: 'first_below_half_vitality',
      effect: 'buff_power',
      magnitude: 3,
      target: 'self',
      descriptionTemplate: 'Frenzies.',
    };
    const player = team({ power: 1, vitality: 6 });
    (player[0] as CreatureDefinition).abilityId = 'ability-frenzy-test';
    const result = runBattle({
      player,
      opponent: team({ power: 2, vitality: 30 }),
      abilities: [inert, frenzy],
      seed: 1,
    });
    const frenzyBuffs = ofType(result.events, 'buff').filter(
      (e) => e.cause.kind === 'ability' && e.cause.abilityId === 'ability-frenzy-test',
    );
    expect(frenzyBuffs).toHaveLength(1); // 6 → 4 (no), 4 → 2 (fires), 2 → 0 (dead, no refire)
    expect(frenzyBuffs[0]).toMatchObject({ targetId: 'player-1', amount: 3, newValue: 4 });
    const laterAttacks = ofType(result.events, 'attack').filter((e) => e.attackerId === 'player-1');
    expect(laterAttacks[2]?.amount).toBe(4); // round 3 attack uses the buffed power
  });

  it('end_of_round damage fires after the exchange', () => {
    const spark: AbilityDefinition = {
      id: 'ability-spark-test',
      trigger: 'end_of_round',
      effect: 'damage',
      magnitude: 1,
      target: 'front_enemy',
      descriptionTemplate: 'Sparks.',
    };
    const player = team({ power: 5, vitality: 3 });
    (player[0] as CreatureDefinition).abilityId = 'ability-spark-test';
    const result = runBattle({
      player,
      opponent: team({ power: 1, vitality: 10 }),
      abilities: [inert, spark],
      seed: 1,
    });
    const sparkDamage = ofType(result.events, 'damage').filter(
      (e) => e.cause.kind === 'ability' && e.cause.abilityId === 'ability-spark-test',
    );
    expect(sparkDamage.length).toBeGreaterThan(0);
    // Round 1: opponent front takes 5 (attack) then 1 (spark) → 10 - 6 = 4 remaining.
    expect(sparkDamage[0]).toMatchObject({
      targetId: 'opponent-1',
      amount: 1,
      remainingVitality: 4,
    });
  });
});

describe('effect behaviors', () => {
  it('damage targets last enemy and all enemies correctly', () => {
    const snipe: AbilityDefinition = {
      id: 'ability-snipe-test',
      trigger: 'battle_start',
      effect: 'damage',
      magnitude: 2,
      target: 'last_enemy',
      descriptionTemplate: 'Snipes.',
    };
    const storm: AbilityDefinition = {
      id: 'ability-storm-test',
      trigger: 'end_of_round',
      effect: 'damage',
      magnitude: 1,
      target: 'all_enemies',
      descriptionTemplate: 'Storms.',
    };
    const player = team({ vitality: 20 });
    (player[0] as CreatureDefinition).abilityId = 'ability-snipe-test';
    (player[1] as CreatureDefinition).abilityId = 'ability-storm-test';
    const result = runBattle({
      player,
      opponent: team({ power: 1, vitality: 20 }),
      abilities: [inert, snipe, storm],
      seed: 1,
    });
    const snipeHits = ofType(result.events, 'damage').filter(
      (e) => e.cause.kind === 'ability' && e.cause.abilityId === 'ability-snipe-test',
    );
    expect(snipeHits[0]).toMatchObject({ targetId: 'opponent-5', amount: 2 });
    const stormHitsRound1 = ofType(result.events, 'damage')
      .filter((e) => e.cause.kind === 'ability' && e.cause.abilityId === 'ability-storm-test')
      .slice(0, 5);
    expect(stormHitsRound1.map((e) => e.targetId)).toEqual([
      'opponent-1',
      'opponent-2',
      'opponent-3',
      'opponent-4',
      'opponent-5',
    ]);
  });

  it('heal is capped at max vitality', () => {
    const mend: AbilityDefinition = {
      id: 'ability-mend-test',
      trigger: 'after_own_attack',
      effect: 'heal',
      magnitude: 2,
      target: 'ally_lowest_vitality',
      descriptionTemplate: 'Heals.',
    };
    const player = team({ vitality: 10 });
    (player[0] as CreatureDefinition).abilityId = 'ability-mend-test';
    const result = runBattle({
      player,
      opponent: team({ power: 1, vitality: 40 }),
      abilities: [inert, mend],
      seed: 1,
    });
    const heals = ofType(result.events, 'heal');
    // Takes 1 damage per round, heals min(2, deficit) = 1 back to full.
    expect(heals[0]).toMatchObject({ targetId: 'player-1', amount: 1, newVitality: 10 });
  });

  it('buff_vitality raises current and max vitality for all allies', () => {
    const bulwark: AbilityDefinition = {
      id: 'ability-bulwark-test',
      trigger: 'battle_start',
      effect: 'buff_vitality',
      magnitude: 2,
      target: 'all_allies',
      descriptionTemplate: 'Bulwarks.',
    };
    const player = team({ vitality: 3 });
    (player[2] as CreatureDefinition).abilityId = 'ability-bulwark-test';
    const result = runBattle({
      player,
      opponent: team({ power: 4, vitality: 30 }),
      abilities: [inert, bulwark],
      seed: 1,
    });
    const buffs = ofType(result.events, 'buff').filter((e) => e.stat === 'vitality');
    expect(buffs).toHaveLength(5);
    expect(buffs.every((b) => b.newValue === 5)).toBe(true);
    // Buffed front (5 vitality) now survives a 4-damage hit.
    const firstHitOnFront = ofType(result.events, 'damage').find((e) => e.targetId === 'player-1');
    expect(firstHitOnFront).toMatchObject({ amount: 4, remainingVitality: 1 });
  });

  it('shield blocks the next hit completely, then expires', () => {
    const shellback: AbilityDefinition = {
      id: 'ability-shell-test',
      trigger: 'battle_start',
      effect: 'shield',
      magnitude: 1,
      target: 'self',
      descriptionTemplate: 'Shields.',
    };
    const player = team({ vitality: 10 });
    (player[0] as CreatureDefinition).abilityId = 'ability-shell-test';
    const result = runBattle({
      player,
      opponent: team({ power: 3, vitality: 40 }),
      abilities: [inert, shellback],
      seed: 1,
    });
    const hits = ofType(result.events, 'damage').filter((e) => e.targetId === 'player-1');
    expect(hits[0]).toMatchObject({ amount: 0, blockedByShield: true, remainingVitality: 10 });
    expect(hits[1]).toMatchObject({ amount: 3, blockedByShield: false, remainingVitality: 7 });
  });

  it('summon places a token in the last slot and the battle continues on an otherwise empty board', () => {
    const brood: AbilityDefinition = {
      id: 'ability-brood-test',
      trigger: 'self_defeated',
      effect: 'summon',
      magnitude: 3,
      target: 'self',
      descriptionTemplate: 'Summons.',
    };
    const player = team({ power: 1, vitality: 1 });
    player[4] = creature({ power: 1, vitality: 1, abilityId: 'ability-brood-test' });
    const result = runBattle({
      player,
      opponent: team({ power: 5, vitality: 50 }),
      abilities: [inert, brood],
      seed: 1,
    });
    const summons = ofType(result.events, 'summon');
    expect(summons).toHaveLength(1);
    expect(summons[0]?.creature).toMatchObject({ side: 'player', power: 3, vitality: 3 });
    // The token fought after the summoner died: its defeat comes later, then battle_end.
    const tokenDefeat = result.events.findIndex(
      (e) => e.type === 'defeat' && e.instanceId === summons[0]?.creature.instanceId,
    );
    const summonIndex = result.events.findIndex((e) => e.type === 'summon');
    expect(tokenDefeat).toBeGreaterThan(summonIndex);
    expect(result.outcome).toBe('opponent_win');
  });

  it('summon fizzles when the board is full', () => {
    const summonEor: AbilityDefinition = {
      id: 'ability-summon-eor',
      trigger: 'end_of_round',
      effect: 'summon',
      magnitude: 2,
      target: 'self',
      descriptionTemplate: 'Summons.',
    };
    const player = team({ power: 1, vitality: 10 });
    (player[2] as CreatureDefinition).abilityId = 'ability-summon-eor';
    const result = runBattle(
      {
        player,
        opponent: team({ power: 1, vitality: 10 }),
        abilities: [inert, summonEor],
        seed: 1,
      },
      { roundCap: 2 },
    );
    const fired = ofType(result.events, 'trigger_fired').filter(
      (e) => e.abilityId === 'ability-summon-eor',
    );
    expect(fired.length).toBeGreaterThan(0); // the trigger fires...
    expect(ofType(result.events, 'summon')).toHaveLength(0); // ...but the summon fizzles
  });

  it('guard redirects a hit aimed at the ally behind, and the guardian can die doing it', () => {
    const guard: AbilityDefinition = {
      id: 'ability-guard-test',
      trigger: 'battle_start',
      effect: 'guard',
      magnitude: 1,
      target: 'self',
      descriptionTemplate: 'Guards.',
    };
    const snipe: AbilityDefinition = {
      id: 'ability-snipe-test',
      trigger: 'battle_start',
      effect: 'damage',
      magnitude: 2,
      target: 'last_enemy',
      descriptionTemplate: 'Snipes.',
    };
    const player = team({ vitality: 10 });
    player[3] = creature({ power: 1, vitality: 1, abilityId: 'ability-guard-test' }); // guardian, slot 4
    const opponent = team({ vitality: 10 });
    (opponent[4] as CreatureDefinition).abilityId = 'ability-snipe-test'; // fires after the guardian arms
    const result = runBattle({ player, opponent, abilities: [inert, guard, snipe], seed: 1 });

    const snipeHit = ofType(result.events, 'damage').find(
      (e) => e.cause.kind === 'ability' && e.cause.abilityId === 'ability-snipe-test',
    );
    // Redirected from the last player creature onto the 1-vitality guardian, killing it.
    expect(snipeHit).toMatchObject({ targetId: 'player-4', redirectedFrom: 'player-5', amount: 2 });
    const guardianDefeat = ofType(result.events, 'defeat').find((e) => e.instanceId === 'player-4');
    expect(guardianDefeat).toBeDefined();
    // The protected ally took no damage at battle start.
    const victimHits = ofType(result.events, 'damage').filter(
      (e) =>
        e.targetId === 'player-5' &&
        e.cause.kind === 'ability' &&
        e.cause.trigger === 'battle_start',
    );
    expect(victimHits).toHaveLength(0);
  });
});
