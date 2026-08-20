import { create } from 'zustand';
import { loadCatalog } from '../content/catalog';
import { runBattle, validateLineup, LINEUP_SIZE } from '../engine';
import type { BattleResult, LineupValidationResult } from '../engine';

/**
 * Ephemeral match state for Stage 0.3: the temporary Circuit under
 * construction, the selected opponent, and the current battle result.
 * Deliberately NOT persisted — refresh resets it.
 */

/** Fixed, documented seed for Stage 0.3 battles (no run structure yet). */
export const DEFAULT_BATTLE_SEED = 20260819;

export interface PreparedMatch {
  result: BattleResult;
  playerCreatureIds: string[];
  opponentId: string;
  seed: number;
}

interface MatchState {
  /** Ordered Circuit under construction, slot 1 first; up to 5 entries. */
  circuitIds: string[];
  selectedOpponentId: string | null;
  match: PreparedMatch | null;
  addCreature(creatureId: string): void;
  removeCreature(creatureId: string): void;
  /** Swap with the neighbor toward the front (-1) or rear (+1). */
  moveCreature(creatureId: string, direction: -1 | 1): void;
  /** Drag reorder: move the entry at fromIndex to toIndex. */
  reorderCreature(fromIndex: number, toIndex: number): void;
  resetCircuit(): void;
  selectOpponent(opponentId: string): void;
  /**
   * Runs the battle EXACTLY ONCE for the current circuit + opponent and
   * stores the immutable result for playback. Returns false if illegal.
   */
  startBattle(seed?: number): boolean;
  clearMatch(): void;
}

export function validateCircuit(circuitIds: readonly string[]): LineupValidationResult {
  const catalog = loadCatalog();
  return validateLineup(circuitIds, catalog.creatures, catalog.abilities);
}

export const useMatchStore = create<MatchState>((set, get) => ({
  circuitIds: [],
  selectedOpponentId: null,
  match: null,

  addCreature(creatureId) {
    const { circuitIds } = get();
    if (circuitIds.length >= LINEUP_SIZE || circuitIds.includes(creatureId)) return;
    set({ circuitIds: [...circuitIds, creatureId] });
  },

  removeCreature(creatureId) {
    set({ circuitIds: get().circuitIds.filter((id) => id !== creatureId) });
  },

  moveCreature(creatureId, direction) {
    const circuitIds = [...get().circuitIds];
    const from = circuitIds.indexOf(creatureId);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= circuitIds.length) return;
    const swapped = circuitIds[to] as string;
    circuitIds[to] = creatureId;
    circuitIds[from] = swapped;
    set({ circuitIds });
  },

  reorderCreature(fromIndex, toIndex) {
    const circuitIds = [...get().circuitIds];
    if (
      fromIndex < 0 ||
      fromIndex >= circuitIds.length ||
      toIndex < 0 ||
      toIndex >= circuitIds.length
    ) {
      return;
    }
    const [moved] = circuitIds.splice(fromIndex, 1);
    circuitIds.splice(toIndex, 0, moved as string);
    set({ circuitIds });
  },

  resetCircuit() {
    set({ circuitIds: [] });
  },

  selectOpponent(opponentId) {
    set({ selectedOpponentId: opponentId });
  },

  startBattle(seed = DEFAULT_BATTLE_SEED) {
    const { circuitIds, selectedOpponentId } = get();
    const catalog = loadCatalog();
    const opponent = selectedOpponentId ? catalog.opponentsById.get(selectedOpponentId) : undefined;
    if (!opponent) return false;
    const playerValidation = validateCircuit(circuitIds);
    if (!playerValidation.ok) return false;
    const opponentValidation = validateCircuit(opponent.creatureIds);
    if (!opponentValidation.ok) return false;
    const result = runBattle({
      player: playerValidation.creatures,
      opponent: opponentValidation.creatures,
      abilities: catalog.abilities,
      seed,
    });
    set({
      match: {
        result,
        playerCreatureIds: [...circuitIds],
        opponentId: opponent.id,
        seed,
      },
    });
    return true;
  },

  clearMatch() {
    set({ match: null });
  },
}));
