import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_BATTLE_SEED, useMatchStore, validateCircuit } from './matchStore';

const FIVE = [
  'creature-ember-guardian-01',
  'creature-tide-scavenger-01',
  'creature-volt-striker-01',
  'creature-verdant-healer-01',
  'creature-ember-rager-01',
];

function fillCircuit() {
  for (const id of FIVE) useMatchStore.getState().addCreature(id);
}

beforeEach(() => {
  useMatchStore.setState({ circuitIds: [], selectedOpponentId: null, match: null });
});

describe('matchStore', () => {
  it('adds creatures up to five, rejecting duplicates and overfill', () => {
    const store = useMatchStore.getState();
    store.addCreature(FIVE[0] as string);
    store.addCreature(FIVE[0] as string); // duplicate ignored
    expect(useMatchStore.getState().circuitIds).toEqual([FIVE[0]]);
    fillCircuit();
    useMatchStore.getState().addCreature('creature-tide-shellback-01'); // over cap ignored
    expect(useMatchStore.getState().circuitIds).toEqual(FIVE);
  });

  it('removes, moves, reorders, and resets', () => {
    fillCircuit();
    const store = useMatchStore.getState();
    store.moveCreature('creature-volt-striker-01', -1);
    expect(useMatchStore.getState().circuitIds[1]).toBe('creature-volt-striker-01');
    store.moveCreature('creature-ember-guardian-01', -1); // already at front — no-op
    expect(useMatchStore.getState().circuitIds[0]).toBe('creature-ember-guardian-01');
    store.reorderCreature(0, 4);
    expect(useMatchStore.getState().circuitIds[4]).toBe('creature-ember-guardian-01');
    store.removeCreature('creature-ember-guardian-01');
    expect(useMatchStore.getState().circuitIds).toHaveLength(4);
    store.resetCircuit();
    expect(useMatchStore.getState().circuitIds).toEqual([]);
  });

  it('validates circuits through the engine', () => {
    expect(validateCircuit([]).ok).toBe(false);
    expect(validateCircuit(FIVE).ok).toBe(true);
  });

  it('startBattle requires a legal circuit and a selected opponent', () => {
    expect(useMatchStore.getState().startBattle()).toBe(false); // nothing selected
    fillCircuit();
    expect(useMatchStore.getState().startBattle()).toBe(false); // no opponent
    useMatchStore.getState().selectOpponent('opponent-guardian-wall-01');
    expect(useMatchStore.getState().startBattle()).toBe(true);
    expect(useMatchStore.getState().match).not.toBeNull();
  });

  it('startBattle is deterministic for the same lineup, opponent, and seed', () => {
    fillCircuit();
    useMatchStore.getState().selectOpponent('opponent-trigger-tempo-01');
    useMatchStore.getState().startBattle();
    const first = useMatchStore.getState().match;
    useMatchStore.getState().clearMatch();
    useMatchStore.getState().startBattle();
    const second = useMatchStore.getState().match;
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.seed).toBe(DEFAULT_BATTLE_SEED);
    expect(JSON.stringify(first?.result.events)).toBe(JSON.stringify(second?.result.events));
  });
});
