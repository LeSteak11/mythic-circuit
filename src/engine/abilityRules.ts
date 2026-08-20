import type { AbilityEffect, AbilityTarget, AbilityTrigger } from '../content/schemas';

/**
 * Per-effect target legality — the single source of truth, pinned in Stage 0.2.
 * The content schema (src/content/schemas.ts) imports this table so illegal
 * combinations are rejected at data-validation time, and the engine relies on
 * it never receiving one.
 *
 * | effect        | legal targets                                        |
 * |---------------|------------------------------------------------------|
 * | damage        | front_enemy, last_enemy, all_enemies                 |
 * | heal          | self, ally_behind, ally_lowest_vitality, all_allies  |
 * | buff_power    | self, ally_behind, ally_lowest_vitality, all_allies  |
 * | buff_vitality | self, ally_behind, ally_lowest_vitality, all_allies  |
 * | shield        | self, ally_behind                                    |
 * | summon        | self (token joins the summoner's side, last slot)    |
 * | scavenge      | self (and requires the ally_defeated trigger)        |
 * | guard         | self (arms the guard; it protects the ally behind)   |
 */
export const EFFECT_TARGET_LEGALITY: Record<AbilityEffect, readonly AbilityTarget[]> = {
  damage: ['front_enemy', 'last_enemy', 'all_enemies'],
  heal: ['self', 'ally_behind', 'ally_lowest_vitality', 'all_allies'],
  buff_power: ['self', 'ally_behind', 'ally_lowest_vitality', 'all_allies'],
  buff_vitality: ['self', 'ally_behind', 'ally_lowest_vitality', 'all_allies'],
  shield: ['self', 'ally_behind'],
  summon: ['self'],
  scavenge: ['self'],
  guard: ['self'],
};

/** Effects that only make sense on a specific trigger. */
export const EFFECT_TRIGGER_REQUIREMENTS: Partial<
  Record<AbilityEffect, readonly AbilityTrigger[]>
> = {
  scavenge: ['ally_defeated'],
};
