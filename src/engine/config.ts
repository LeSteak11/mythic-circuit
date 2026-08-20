import type { Element } from '../content/schemas';

/** Tunable battle configuration. All combat math constants live here. */
export interface BattleConfig {
  /** Element wheel order — each element beats the NEXT one in the cycle. */
  elementWheel: readonly Element[];
  advantageMultiplier: number;
  disadvantageMultiplier: number;
  neutralMultiplier: number;
  /** Hard termination guarantee: reaching this round count ends the battle as a draw. */
  roundCap: number;
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  elementWheel: ['ember', 'volt', 'tide', 'verdant'],
  advantageMultiplier: 1.5,
  disadvantageMultiplier: 0.75,
  neutralMultiplier: 1,
  roundCap: 200,
};

/**
 * Element multiplier for attacker vs defender. Advantage table is data
 * (the wheel) — a fifth element extends the wheel, not this code.
 */
export function elementMultiplier(
  attacker: Element,
  defender: Element,
  config: BattleConfig,
): number {
  const wheel = config.elementWheel;
  const attackerIndex = wheel.indexOf(attacker);
  const defenderIndex = wheel.indexOf(defender);
  if (attackerIndex === -1 || defenderIndex === -1) {
    return config.neutralMultiplier;
  }
  if ((attackerIndex + 1) % wheel.length === defenderIndex) {
    return config.advantageMultiplier; // attacker beats the next element in the wheel
  }
  if ((defenderIndex + 1) % wheel.length === attackerIndex) {
    return config.disadvantageMultiplier;
  }
  return config.neutralMultiplier;
}
