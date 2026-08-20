import type { AbilityDefinition, CreatureDefinition, Element } from '../content/schemas';
import type { BattleEvent } from './events';

export type Side = 'player' | 'opponent';

/** Runtime state of one creature in one battle. */
export interface CreatureInstance {
  /** Unique within this battle (e.g. "player-3", "token-1"). */
  instanceId: string;
  /** Content id, or a synthetic id for summoned tokens. */
  definitionId: string;
  name: string;
  side: Side;
  element: Element;
  basePower: number;
  /** Current Power including buffs. */
  power: number;
  maxVitality: number;
  vitality: number;
  /** Hits fully blocked before taking damage. */
  shieldCharges: number;
  /** Hits redirected from the ally directly behind to this creature. */
  guardCharges: number;
  /** Resolved ability; tokens have none. */
  ability: AbilityDefinition | undefined;
  defeated: boolean;
  /** first_below_half_vitality fires at most once per creature. */
  belowHalfTriggerFired: boolean;
  isToken: boolean;
}

/** Full mutable battle state. Slot = array index; index 0 is the front. */
export interface BattleState {
  player: CreatureInstance[];
  opponent: CreatureInstance[];
  round: number;
}

export type BattleOutcome = 'player_win' | 'opponent_win' | 'draw_both_empty' | 'draw_round_cap';

export interface BattleResult {
  /** Draws count as a player win (confirmed decision). */
  winner: Side;
  outcome: BattleOutcome;
  rounds: number;
  events: BattleEvent[];
}

export interface BattleInput {
  /** Ordered lineup, slot 1 (front) first. Exactly 5 creatures. */
  player: CreatureDefinition[];
  opponent: CreatureDefinition[];
  /** Every ability referenced by any lineup creature must be present. */
  abilities: AbilityDefinition[];
  /**
   * Seed for the injected RNG. MVP combat consumes no randomness (battles are
   * fully determined by the lineups), but the RNG is part of the engine
   * contract for future content.
   */
  seed: number;
}

/** Typed lineup validation errors — returned, never thrown. */
export type LineupError =
  | { code: 'wrong_size'; expected: number; actual: number }
  | { code: 'duplicate_creature'; creatureId: string }
  | { code: 'unknown_creature'; creatureId: string }
  | { code: 'unknown_ability'; creatureId: string; abilityId: string };

export type LineupValidationResult =
  { ok: true; creatures: CreatureDefinition[] } | { ok: false; errors: LineupError[] };
