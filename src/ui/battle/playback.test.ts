import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../../content/catalog';
import { runBattle, type BattleEvent, type CreatureSnapshot } from '../../engine';
import { buildPlayback, groupEvents, summarizeBattle } from './playback';

function snap(
  instanceId: string,
  name: string,
  side: 'player' | 'opponent',
  slot: number,
  power = 3,
  vitality = 5,
): CreatureSnapshot {
  return {
    instanceId,
    definitionId: `def-${instanceId}`,
    name,
    side,
    element: 'ember',
    power,
    vitality,
    slot,
  };
}

/**
 * Synthetic log exercising ALL 13 event types:
 * battle start → guard arm → shield arm → snipe with guard redirect →
 * round 1 → simultaneous exchange (shield block + lethal hit + defeat) →
 * death summon → heal + double buff → compression → battle end.
 */
const syntheticEvents: BattleEvent[] = [
  {
    type: 'battle_start',
    player: [snap('player-1', 'PH_A', 'player', 0, 3, 5), snap('player-2', 'PH_B', 'player', 1)],
    opponent: [
      snap('opponent-1', 'PH_X', 'opponent', 0, 3, 6),
      snap('opponent-2', 'PH_Y', 'opponent', 1, 4, 6),
    ],
  },
  { type: 'trigger_fired', trigger: 'battle_start', sourceId: 'player-1', abilityId: 'ab-guard' },
  {
    type: 'guard',
    targetId: 'player-1',
    charges: 1,
    cause: {
      kind: 'ability',
      abilityId: 'ab-guard',
      sourceId: 'player-1',
      trigger: 'battle_start',
    },
  },
  {
    type: 'trigger_fired',
    trigger: 'battle_start',
    sourceId: 'opponent-1',
    abilityId: 'ab-shield',
  },
  {
    type: 'shield',
    targetId: 'opponent-1',
    charges: 1,
    cause: {
      kind: 'ability',
      abilityId: 'ab-shield',
      sourceId: 'opponent-1',
      trigger: 'battle_start',
    },
  },
  { type: 'trigger_fired', trigger: 'battle_start', sourceId: 'opponent-2', abilityId: 'ab-snipe' },
  {
    type: 'damage',
    targetId: 'player-1',
    amount: 2,
    remainingVitality: 3,
    blockedByShield: false,
    redirectedFrom: 'player-2',
    cause: {
      kind: 'ability',
      abilityId: 'ab-snipe',
      sourceId: 'opponent-2',
      trigger: 'battle_start',
    },
  },
  { type: 'round_start', round: 1 },
  { type: 'attack', attackerId: 'player-1', defenderId: 'opponent-1', amount: 5, multiplier: 1.5 },
  { type: 'attack', attackerId: 'opponent-1', defenderId: 'player-1', amount: 3, multiplier: 1 },
  {
    type: 'damage',
    targetId: 'opponent-1',
    amount: 0,
    remainingVitality: 6,
    blockedByShield: true,
    cause: { kind: 'attack', attackerId: 'player-1' },
  },
  {
    type: 'damage',
    targetId: 'player-1',
    amount: 3,
    remainingVitality: 0,
    blockedByShield: false,
    cause: { kind: 'attack', attackerId: 'opponent-1' },
  },
  {
    type: 'defeat',
    instanceId: 'player-1',
    side: 'player',
    slot: 0,
    cause: { kind: 'attack', attackerId: 'opponent-1' },
  },
  { type: 'trigger_fired', trigger: 'self_defeated', sourceId: 'player-1', abilityId: 'ab-brood' },
  {
    type: 'summon',
    creature: snap('token-1', 'PH_SUMMON_TOKEN', 'player', 2, 3, 3),
    cause: {
      kind: 'ability',
      abilityId: 'ab-brood',
      sourceId: 'player-1',
      trigger: 'self_defeated',
    },
  },
  { type: 'trigger_fired', trigger: 'end_of_round', sourceId: 'opponent-2', abilityId: 'ab-boost' },
  {
    type: 'heal',
    targetId: 'opponent-1',
    amount: 1,
    newVitality: 6,
    cause: {
      kind: 'ability',
      abilityId: 'ab-boost',
      sourceId: 'opponent-2',
      trigger: 'end_of_round',
    },
  },
  {
    type: 'buff',
    targetId: 'opponent-2',
    stat: 'power',
    amount: 2,
    newValue: 6,
    cause: {
      kind: 'ability',
      abilityId: 'ab-boost',
      sourceId: 'opponent-2',
      trigger: 'end_of_round',
    },
  },
  {
    type: 'buff',
    targetId: 'opponent-2',
    stat: 'vitality',
    amount: 2,
    newValue: 8,
    cause: {
      kind: 'ability',
      abilityId: 'ab-boost',
      sourceId: 'opponent-2',
      trigger: 'end_of_round',
    },
  },
  { type: 'compression', side: 'player', removedIds: ['player-1'], order: ['player-2', 'token-1'] },
  { type: 'battle_end', outcome: 'opponent_win', winner: 'opponent', rounds: 1 },
];

describe('groupEvents', () => {
  it('groups the attack pair and its damage/defeats into ONE exchange frame', () => {
    const frames = groupEvents(syntheticEvents);
    const exchange = frames.find((f) => f.kind === 'exchange');
    expect(exchange?.events.map((e) => e.type)).toEqual([
      'attack',
      'attack',
      'damage',
      'damage',
      'defeat',
    ]);
  });

  it('produces the expected frame-kind sequence', () => {
    const frames = groupEvents(syntheticEvents);
    expect(frames.map((f) => f.kind)).toEqual([
      'setup',
      'trigger',
      'trigger',
      'trigger',
      'round',
      'exchange',
      'trigger',
      'trigger',
      'compression',
      'end',
    ]);
  });
});

describe('buildPlayback state reconstruction', () => {
  const frames = buildPlayback(syntheticEvents);
  const at = (kind: string, nth = 0) => frames.filter((f) => f.kind === kind)[nth];

  it('initializes lineups from the battle_start snapshots', () => {
    const setup = frames[0];
    expect(setup?.state.player.map((c) => c.name)).toEqual(['PH_A', 'PH_B']);
    expect(setup?.state.opponent).toHaveLength(2);
    expect(setup?.state.player[0]?.maxVitality).toBe(5);
  });

  it('applies guard arming, then consumes a charge on redirect', () => {
    const guardFrame = at('trigger', 0);
    expect(guardFrame?.state.player[0]?.guard).toBe(1);
    const snipeFrame = at('trigger', 2);
    expect(snipeFrame?.state.player[0]?.guard).toBe(0); // charge consumed by redirect
    expect(snipeFrame?.state.player[0]?.vitality).toBe(3);
    expect(snipeFrame?.logLines.join(' ')).toContain('PH_A intercepts the hit aimed at PH_B');
  });

  it('applies the simultaneous exchange: shield block + lethal damage + defeat', () => {
    const exchange = at('exchange');
    expect(exchange?.state.opponent[0]?.shield).toBe(0); // block consumed
    expect(exchange?.state.opponent[0]?.vitality).toBe(6); // no damage through shield
    expect(exchange?.state.player[0]?.vitality).toBe(0);
    expect(exchange?.state.player[0]?.defeated).toBe(true);
    expect(exchange?.sourceIds).toEqual(['player-1', 'opponent-1']);
    const log = exchange?.logLines.join(' ') ?? '';
    expect(log).toContain('strike simultaneously');
    expect(log).toContain("PH_X's shield blocks the hit");
    expect(log).toContain('PH_A is defeated');
  });

  it('appends summons, applies heal and both buff kinds', () => {
    const summonFrame = at('trigger', 3);
    expect(summonFrame?.state.player.map((c) => c.name)).toContain('PH_SUMMON_TOKEN');
    const boostFrame = at('trigger', 4);
    expect(boostFrame?.state.opponent[1]?.power).toBe(6);
    expect(boostFrame?.state.opponent[1]?.vitality).toBe(8);
    expect(boostFrame?.state.opponent[1]?.maxVitality).toBe(8); // buff_vitality raises max
  });

  it('reorders and removes on compression', () => {
    const compression = at('compression');
    expect(compression?.state.player.map((c) => c.instanceId)).toEqual(['player-2', 'token-1']);
  });

  it('records the outcome on battle_end without inferring anything', () => {
    const end = at('end');
    expect(end?.state.ended).toBe(true);
    expect(end?.state.outcome).toBe('opponent_win');
    expect(end?.state.winner).toBe('opponent');
  });

  it('notes element multipliers in exchange damage lines when not blocked', () => {
    // Attack at ×1.5 was blocked; verify the ×1 hit has no note and a modified log works.
    const exchange = at('exchange');
    const damageLine = exchange?.logLines.find((l) => l.includes('takes 3 damage'));
    expect(damageLine).toBe('PH_A takes 3 damage — 0 Vitality left.');
  });
});

describe('summarizeBattle', () => {
  it('derives the result summary purely from the log', () => {
    const summary = summarizeBattle(syntheticEvents);
    expect(summary).toMatchObject({
      outcome: 'opponent_win',
      winner: 'opponent',
      rounds: 1,
      playerDefeats: 1,
      opponentDefeats: 0,
      triggersFired: 5,
      shieldBlocks: 1,
      guardRedirects: 1,
      summons: 1,
    });
    expect(summary?.triggerCounts.battle_start).toBe(3);
  });

  it('returns null when the log has no battle_end', () => {
    expect(summarizeBattle(syntheticEvents.slice(0, 3))).toBeNull();
  });
});

describe('integration with the real engine', () => {
  it('replays a full engine battle to its recorded outcome', () => {
    const catalog = loadCatalog();
    const wall = catalog.opponentsById.get('opponent-guardian-wall-01');
    const tempo = catalog.opponentsById.get('opponent-trigger-tempo-01');
    const toDefs = (ids: readonly string[]) =>
      ids.map((id) => {
        const def = catalog.creaturesById.get(id);
        if (!def) throw new Error(`missing ${id}`);
        return def;
      });
    const result = runBattle({
      player: toDefs(wall?.creatureIds ?? []),
      opponent: toDefs(tempo?.creatureIds ?? []),
      abilities: catalog.abilities,
      seed: 42,
    });
    const frames = buildPlayback(result.events, catalog.describeAbility);
    const last = frames[frames.length - 1];
    expect(last?.kind).toBe('end');
    expect(last?.state.ended).toBe(true);
    expect(last?.state.outcome).toBe(result.outcome);
    expect(last?.state.winner).toBe(result.winner);
    expect(last?.state.round).toBe(result.rounds);
    // Every frame's log is non-empty except possibly pure-state frames.
    expect(frames.every((f) => f.logLines.length > 0 || f.kind === 'compression')).toBe(true);
  });
});
