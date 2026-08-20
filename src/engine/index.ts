/** Public engine API. Everything else in src/engine/ is internal. */
export { runBattle, LineupInputError } from './battle';
export { validateLineup, LINEUP_SIZE } from './lineup';
export { createRng, shuffled, type Rng } from './rng';
export { DEFAULT_BATTLE_CONFIG, elementMultiplier, type BattleConfig } from './config';
export { EFFECT_TARGET_LEGALITY, EFFECT_TRIGGER_REQUIREMENTS } from './abilityRules';
export type {
  BattleInput,
  BattleOutcome,
  BattleResult,
  BattleState,
  CreatureInstance,
  LineupError,
  LineupValidationResult,
  Side,
} from './types';
export type { BattleEvent, CreatureSnapshot, EventCause } from './events';
