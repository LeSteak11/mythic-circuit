import type {
  AbilityDefinition,
  AbilityTarget,
  AbilityTrigger,
  CreatureDefinition,
} from '../content/schemas';
import { DEFAULT_BATTLE_CONFIG, elementMultiplier, type BattleConfig } from './config';
import type { BattleEvent, CreatureSnapshot, EventCause } from './events';
import { validateLineup } from './lineup';
import { createRng, type Rng } from './rng';
import type {
  BattleInput,
  BattleOutcome,
  BattleResult,
  BattleState,
  CreatureInstance,
  Side,
} from './types';

/**
 * Deterministic battle simulation.
 *
 * Resolution model (per design reference §3–§5):
 * - Slot = array index, index 0 is the front. Defeated creatures stay in place
 *   as "corpses" until the current trigger queue drains, so slot references
 *   stay stable mid-resolution; a cleanup pass then removes them and emits
 *   compression events.
 * - Triggers enqueue FIFO; each effect resolves fully before the next starts.
 *   When several creatures trigger at once, order is front-most first, player
 *   side before opponent on slot ties.
 * - A queued trigger is skipped if its source has since been defeated —
 *   except self_defeated, whose source is dead by definition.
 * - Attacks apply the element multiplier and deal at least 1 damage; ability
 *   damage is flat (no element multiplier).
 */

interface QueueItem {
  trigger: AbilityTrigger;
  source: CreatureInstance;
}

interface Ctx {
  state: BattleState;
  events: BattleEvent[];
  config: BattleConfig;
  rng: Rng;
  queue: QueueItem[];
  tokenCounter: number;
}

class LineupInputError extends Error {
  constructor(
    side: Side,
    public readonly errors: unknown[],
  ) {
    super(`Invalid ${side} lineup: ${JSON.stringify(errors)}`);
    this.name = 'LineupInputError';
  }
}

function makeInstance(
  def: CreatureDefinition,
  side: Side,
  slot: number,
  abilitiesById: Map<string, AbilityDefinition>,
): CreatureInstance {
  return {
    instanceId: `${side}-${slot + 1}`,
    definitionId: def.id,
    name: def.name,
    side,
    element: def.element,
    basePower: def.power,
    power: def.power,
    maxVitality: def.vitality,
    vitality: def.vitality,
    shieldCharges: 0,
    guardCharges: 0,
    ability: abilitiesById.get(def.abilityId),
    defeated: false,
    belowHalfTriggerFired: false,
    isToken: false,
  };
}

function snapshot(c: CreatureInstance, slot: number): CreatureSnapshot {
  return {
    instanceId: c.instanceId,
    definitionId: c.definitionId,
    name: c.name,
    side: c.side,
    element: c.element,
    power: c.power,
    vitality: c.vitality,
    slot,
  };
}

function sideOf(ctx: Ctx, side: Side): CreatureInstance[] {
  return side === 'player' ? ctx.state.player : ctx.state.opponent;
}

function living(creatures: readonly CreatureInstance[]): CreatureInstance[] {
  return creatures.filter((c) => !c.defeated);
}

function enemySideName(side: Side): Side {
  return side === 'player' ? 'opponent' : 'player';
}

/**
 * All living creatures in trigger-resolution order: front-most slot first,
 * player before opponent on slot ties.
 */
function resolutionOrder(ctx: Ctx): CreatureInstance[] {
  const playerLiving = living(ctx.state.player);
  const opponentLiving = living(ctx.state.opponent);
  const merged: CreatureInstance[] = [];
  const max = Math.max(playerLiving.length, opponentLiving.length);
  for (let slot = 0; slot < max; slot++) {
    const p = playerLiving[slot];
    const o = opponentLiving[slot];
    if (p) merged.push(p);
    if (o) merged.push(o);
  }
  return merged;
}

function enqueueForAll(ctx: Ctx, trigger: AbilityTrigger, candidates: CreatureInstance[]): void {
  for (const c of candidates) {
    if (c.ability?.trigger === trigger) {
      ctx.queue.push({ trigger, source: c });
    }
  }
}

/** Resolve targets to LIVING creatures at resolution time. */
function resolveTargets(
  ctx: Ctx,
  source: CreatureInstance,
  target: AbilityTarget,
): CreatureInstance[] {
  const allies = living(sideOf(ctx, source.side));
  const enemies = living(sideOf(ctx, enemySideName(source.side)));
  switch (target) {
    case 'self':
      return source.defeated ? [] : [source];
    case 'ally_behind': {
      const own = sideOf(ctx, source.side);
      const index = own.indexOf(source);
      const behind = own.slice(index + 1).find((c) => !c.defeated);
      return behind ? [behind] : [];
    }
    case 'ally_lowest_vitality': {
      if (allies.length === 0) return [];
      let lowest = allies[0] as CreatureInstance;
      for (const ally of allies) {
        if (ally.vitality < lowest.vitality) lowest = ally;
      }
      return [lowest];
    }
    case 'all_allies':
      return allies;
    case 'front_enemy':
      return enemies.length > 0 ? [enemies[0] as CreatureInstance] : [];
    case 'last_enemy':
      return enemies.length > 0 ? [enemies[enemies.length - 1] as CreatureInstance] : [];
    case 'all_enemies':
      return enemies;
  }
}

/**
 * Apply one hit to a target: guard redirection (one hop, never for front
 * attacks since nothing stands in front of the front), then shield block,
 * then damage, defeat detection, and trigger enqueueing.
 */
function applyHit(
  ctx: Ctx,
  initialTarget: CreatureInstance,
  amount: number,
  cause: EventCause,
): void {
  if (initialTarget.defeated) return;

  let target = initialTarget;
  let redirectedFrom: string | undefined;

  const own = living(sideOf(ctx, initialTarget.side));
  const position = own.indexOf(initialTarget);
  const protector = position > 0 ? (own[position - 1] as CreatureInstance) : undefined;
  if (protector && protector.guardCharges > 0) {
    protector.guardCharges -= 1;
    redirectedFrom = initialTarget.instanceId;
    target = protector;
  }

  if (target.shieldCharges > 0) {
    target.shieldCharges -= 1;
    ctx.events.push({
      type: 'damage',
      targetId: target.instanceId,
      amount: 0,
      remainingVitality: target.vitality,
      blockedByShield: true,
      ...(redirectedFrom !== undefined ? { redirectedFrom } : {}),
      cause,
    });
    return;
  }

  target.vitality -= amount;
  if (target.vitality < 0) target.vitality = 0;
  ctx.events.push({
    type: 'damage',
    targetId: target.instanceId,
    amount,
    remainingVitality: target.vitality,
    blockedByShield: false,
    ...(redirectedFrom !== undefined ? { redirectedFrom } : {}),
    cause,
  });

  if (
    !target.belowHalfTriggerFired &&
    target.vitality > 0 &&
    target.vitality * 2 < target.maxVitality
  ) {
    target.belowHalfTriggerFired = true;
    if (target.ability?.trigger === 'first_below_half_vitality') {
      ctx.queue.push({ trigger: 'first_below_half_vitality', source: target });
    }
  }

  if (target.vitality <= 0) {
    target.defeated = true;
    const slot = sideOf(ctx, target.side).indexOf(target);
    ctx.events.push({
      type: 'defeat',
      instanceId: target.instanceId,
      side: target.side,
      slot,
      cause,
    });
    if (target.ability?.trigger === 'self_defeated') {
      ctx.queue.push({ trigger: 'self_defeated', source: target });
    }
    const allies = living(sideOf(ctx, target.side));
    enqueueForAll(ctx, 'ally_defeated', allies);
  }
}

function applyEffect(ctx: Ctx, item: QueueItem): void {
  const { source } = item;
  const ability = source.ability;
  if (!ability) return;
  const cause: EventCause = {
    kind: 'ability',
    abilityId: ability.id,
    sourceId: source.instanceId,
    trigger: item.trigger,
  };

  if (ability.effect === 'summon') {
    const own = sideOf(ctx, source.side);
    const livingCount = living(own).length;
    if (livingCount >= 5) return; // board full — summon fizzles (trigger_fired already logged)
    ctx.tokenCounter += 1;
    const token: CreatureInstance = {
      instanceId: `token-${ctx.tokenCounter}`,
      definitionId: `token-of-${source.definitionId}`,
      name: 'PH_SUMMON_TOKEN',
      side: source.side,
      element: source.element,
      basePower: ability.magnitude,
      power: ability.magnitude,
      maxVitality: ability.magnitude,
      vitality: ability.magnitude,
      shieldCharges: 0,
      guardCharges: 0,
      ability: undefined,
      defeated: false,
      belowHalfTriggerFired: false,
      isToken: true,
    };
    own.push(token);
    ctx.events.push({ type: 'summon', creature: snapshot(token, livingCount), cause });
    return;
  }

  const targets = resolveTargets(ctx, source, ability.target);
  for (const target of targets) {
    if (target.defeated) continue; // may have died earlier in this same effect
    switch (ability.effect) {
      case 'damage':
        applyHit(ctx, target, ability.magnitude, cause);
        break;
      case 'heal': {
        const healed = Math.min(ability.magnitude, target.maxVitality - target.vitality);
        target.vitality += healed;
        ctx.events.push({
          type: 'heal',
          targetId: target.instanceId,
          amount: healed,
          newVitality: target.vitality,
          cause,
        });
        break;
      }
      case 'buff_power':
      case 'scavenge':
        target.power += ability.magnitude;
        ctx.events.push({
          type: 'buff',
          targetId: target.instanceId,
          stat: 'power',
          amount: ability.magnitude,
          newValue: target.power,
          cause,
        });
        break;
      case 'buff_vitality':
        target.maxVitality += ability.magnitude;
        target.vitality += ability.magnitude;
        ctx.events.push({
          type: 'buff',
          targetId: target.instanceId,
          stat: 'vitality',
          amount: ability.magnitude,
          newValue: target.vitality,
          cause,
        });
        break;
      case 'shield':
        target.shieldCharges += ability.magnitude;
        ctx.events.push({
          type: 'shield',
          targetId: target.instanceId,
          charges: target.shieldCharges,
          cause,
        });
        break;
      case 'guard':
        target.guardCharges += ability.magnitude;
        ctx.events.push({
          type: 'guard',
          targetId: target.instanceId,
          charges: target.guardCharges,
          cause,
        });
        break;
    }
  }
}

/** Process queued triggers FIFO until empty. Effects never interrupt each other. */
function drainQueue(ctx: Ctx): void {
  while (ctx.queue.length > 0) {
    const item = ctx.queue.shift() as QueueItem;
    if (item.source.defeated && item.trigger !== 'self_defeated') continue;
    const ability = item.source.ability;
    if (!ability) continue;
    ctx.events.push({
      type: 'trigger_fired',
      trigger: item.trigger,
      sourceId: item.source.instanceId,
      abilityId: ability.id,
    });
    applyEffect(ctx, item);
  }
}

/** Remove corpses, emit compression events, player side first. */
function cleanup(ctx: Ctx): void {
  for (const sideName of ['player', 'opponent'] as const) {
    const side = sideOf(ctx, sideName);
    const removed = side.filter((c) => c.defeated);
    if (removed.length === 0) continue;
    const remaining = side.filter((c) => !c.defeated);
    if (sideName === 'player') ctx.state.player = remaining;
    else ctx.state.opponent = remaining;
    ctx.events.push({
      type: 'compression',
      side: sideName,
      removedIds: removed.map((c) => c.instanceId),
      order: remaining.map((c) => c.instanceId),
    });
  }
}

function checkEnd(ctx: Ctx): BattleOutcome | undefined {
  const playerAlive = living(ctx.state.player).length;
  const opponentAlive = living(ctx.state.opponent).length;
  if (playerAlive === 0 && opponentAlive === 0) return 'draw_both_empty';
  if (opponentAlive === 0) return 'player_win';
  if (playerAlive === 0) return 'opponent_win';
  return undefined;
}

/** Drain triggers, clean the board, and report whether the battle ended. */
function settle(ctx: Ctx): BattleOutcome | undefined {
  drainQueue(ctx);
  cleanup(ctx);
  return checkEnd(ctx);
}

function finish(ctx: Ctx, outcome: BattleOutcome): BattleResult {
  // Draws count as a player win (confirmed decision — generosity favors fun).
  const winner: Side = outcome === 'opponent_win' ? 'opponent' : 'player';
  ctx.events.push({ type: 'battle_end', outcome, winner, rounds: ctx.state.round });
  return { winner, outcome, rounds: ctx.state.round, events: ctx.events };
}

export function runBattle(
  input: BattleInput,
  configOverrides?: Partial<BattleConfig>,
): BattleResult {
  const config: BattleConfig = { ...DEFAULT_BATTLE_CONFIG, ...configOverrides };

  for (const sideName of ['player', 'opponent'] as const) {
    const defs = sideName === 'player' ? input.player : input.opponent;
    const validation = validateLineup(
      defs.map((c) => c.id),
      defs,
      input.abilities,
    );
    if (!validation.ok) {
      throw new LineupInputError(sideName, validation.errors);
    }
  }

  const abilitiesById = new Map(input.abilities.map((a) => [a.id, a]));
  const ctx: Ctx = {
    state: {
      player: input.player.map((def, slot) => makeInstance(def, 'player', slot, abilitiesById)),
      opponent: input.opponent.map((def, slot) =>
        makeInstance(def, 'opponent', slot, abilitiesById),
      ),
      round: 0,
    },
    events: [],
    config,
    rng: createRng(input.seed),
    queue: [],
    tokenCounter: 0,
  };

  ctx.events.push({
    type: 'battle_start',
    player: ctx.state.player.map((c, slot) => snapshot(c, slot)),
    opponent: ctx.state.opponent.map((c, slot) => snapshot(c, slot)),
  });

  // Battle-start abilities: slot 1 → 5, player first on ties.
  enqueueForAll(ctx, 'battle_start', resolutionOrder(ctx));
  let outcome = settle(ctx);
  if (outcome) return finish(ctx, outcome);

  while (ctx.state.round < config.roundCap) {
    ctx.state.round += 1;
    ctx.events.push({ type: 'round_start', round: ctx.state.round });

    // Phase 1: before_own_attack for both fronts (player first).
    let playerFront = ctx.state.player[0] as CreatureInstance;
    let opponentFront = ctx.state.opponent[0] as CreatureInstance;
    enqueueForAll(ctx, 'before_own_attack', [playerFront, opponentFront]);
    outcome = settle(ctx);
    if (outcome) return finish(ctx, outcome);

    // Phase 2: simultaneous front exchange. Damage is computed for both sides
    // before either hit is applied, so both can die in the same exchange.
    playerFront = ctx.state.player[0] as CreatureInstance;
    opponentFront = ctx.state.opponent[0] as CreatureInstance;
    const playerMultiplier = elementMultiplier(playerFront.element, opponentFront.element, config);
    const opponentMultiplier = elementMultiplier(
      opponentFront.element,
      playerFront.element,
      config,
    );
    const playerDamage = Math.max(1, Math.round(playerFront.power * playerMultiplier));
    const opponentDamage = Math.max(1, Math.round(opponentFront.power * opponentMultiplier));
    ctx.events.push({
      type: 'attack',
      attackerId: playerFront.instanceId,
      defenderId: opponentFront.instanceId,
      amount: playerDamage,
      multiplier: playerMultiplier,
    });
    ctx.events.push({
      type: 'attack',
      attackerId: opponentFront.instanceId,
      defenderId: playerFront.instanceId,
      amount: opponentDamage,
      multiplier: opponentMultiplier,
    });
    applyHit(ctx, opponentFront, playerDamage, {
      kind: 'attack',
      attackerId: playerFront.instanceId,
    });
    applyHit(ctx, playerFront, opponentDamage, {
      kind: 'attack',
      attackerId: opponentFront.instanceId,
    });

    // Phase 3: after_own_attack for surviving attackers (player first). Death
    // triggers from the exchange are already queued ahead of these (FIFO).
    enqueueForAll(
      ctx,
      'after_own_attack',
      [playerFront, opponentFront].filter((c) => !c.defeated),
    );
    outcome = settle(ctx);
    if (outcome) return finish(ctx, outcome);

    // Phase 4: end_of_round for all living creatures, resolution order.
    enqueueForAll(ctx, 'end_of_round', resolutionOrder(ctx));
    outcome = settle(ctx);
    if (outcome) return finish(ctx, outcome);
  }

  return finish(ctx, 'draw_round_cap');
}

export { LineupInputError };
