import type { AbilityTrigger, Element } from '../content/schemas';
import type { BattleOutcome, Side } from './types';

/**
 * The event log is the contract between engine and UI: an ordered, typed
 * stream describing every state change with cause attribution. Playback,
 * explanations, and tests consume this log without re-simulating.
 */

/** Why something happened. */
export type EventCause =
  | { kind: 'attack'; attackerId: string }
  | { kind: 'ability'; abilityId: string; sourceId: string; trigger: AbilityTrigger }
  | { kind: 'system' };

/** Immutable snapshot of a creature for lineup/summon reporting. */
export interface CreatureSnapshot {
  instanceId: string;
  definitionId: string;
  name: string;
  side: Side;
  element: Element;
  power: number;
  vitality: number;
  slot: number;
}

export type BattleEvent =
  | { type: 'battle_start'; player: CreatureSnapshot[]; opponent: CreatureSnapshot[] }
  | { type: 'round_start'; round: number }
  | { type: 'trigger_fired'; trigger: AbilityTrigger; sourceId: string; abilityId: string }
  | {
      type: 'attack';
      attackerId: string;
      defenderId: string;
      /** Final damage after the element multiplier (min 1). */
      amount: number;
      multiplier: number;
    }
  | {
      type: 'damage';
      targetId: string;
      /** Damage actually applied (0 when blocked by a shield). */
      amount: number;
      remainingVitality: number;
      blockedByShield: boolean;
      /** Set when a guard redirected this hit; the original target's id. */
      redirectedFrom?: string;
      cause: EventCause;
    }
  | { type: 'heal'; targetId: string; amount: number; newVitality: number; cause: EventCause }
  | {
      type: 'buff';
      targetId: string;
      stat: 'power' | 'vitality';
      amount: number;
      newValue: number;
      cause: EventCause;
    }
  | { type: 'shield'; targetId: string; charges: number; cause: EventCause }
  | { type: 'guard'; targetId: string; charges: number; cause: EventCause }
  | { type: 'summon'; creature: CreatureSnapshot; cause: EventCause }
  | { type: 'defeat'; instanceId: string; side: Side; slot: number; cause: EventCause }
  | { type: 'compression'; side: Side; removedIds: string[]; order: string[] }
  | { type: 'battle_end'; outcome: BattleOutcome; winner: Side; rounds: number };
