import type { AbilityTrigger, Element } from '../../content/schemas';
import type { BattleEvent, BattleOutcome, Side } from '../../engine';

/**
 * Pure playback model: reconstructs display state by folding the engine's
 * event log, frame by frame. It NEVER reruns combat rules — every number
 * shown comes straight from event data. The raw log is left untouched.
 *
 * Frames group events into presentation steps. In particular, the engine's
 * two attack declarations + two damage applications (+ any resulting defeats)
 * become ONE simultaneous-exchange frame.
 */

export interface DisplayCreature {
  instanceId: string;
  definitionId: string;
  name: string;
  element: Element;
  power: number;
  vitality: number;
  maxVitality: number;
  shield: number;
  guard: number;
  defeated: boolean;
}

export interface DisplayState {
  player: DisplayCreature[];
  opponent: DisplayCreature[];
  round: number;
  ended: boolean;
  outcome: BattleOutcome | null;
  winner: Side | null;
}

export type FrameKind = 'setup' | 'round' | 'exchange' | 'trigger' | 'compression' | 'end';

/**
 * Base milliseconds per playback frame at 1× speed. Pure presentation
 * config — playback speed can never change the battle outcome because the
 * outcome is already fixed in the event log.
 */
export const FRAME_MS = 1100;

export interface PlaybackFrame {
  kind: FrameKind;
  events: BattleEvent[];
  logLines: string[];
  /** Creatures acting in this frame (attackers / triggering source). */
  sourceIds: string[];
  /** Creatures acted upon in this frame. */
  targetIds: string[];
  /** Display state AFTER this frame's events are applied. */
  state: DisplayState;
}

const TRIGGER_LABELS: Record<AbilityTrigger, string> = {
  battle_start: 'battle start',
  before_own_attack: 'before attacking',
  after_own_attack: 'after attacking',
  ally_defeated: 'ally defeated',
  self_defeated: 'on defeat',
  first_below_half_vitality: 'first time below half Vitality',
  end_of_round: 'end of round',
};

function emptyState(): DisplayState {
  return { player: [], opponent: [], round: 0, ended: false, outcome: null, winner: null };
}

function cloneState(state: DisplayState): DisplayState {
  return {
    ...state,
    player: state.player.map((c) => ({ ...c })),
    opponent: state.opponent.map((c) => ({ ...c })),
  };
}

function findCreature(state: DisplayState, instanceId: string): DisplayCreature | undefined {
  return (
    state.player.find((c) => c.instanceId === instanceId) ??
    state.opponent.find((c) => c.instanceId === instanceId)
  );
}

/**
 * Side-aware creature reference for log text: "Your PH_X (slot 1)" /
 * "Opponent PH_X (slot 1)". Both Circuits may field the same creature
 * identity, so the name alone is ambiguous. Slot numbers come from the
 * display state at the time of the event (the pre-frame state), so they
 * stay accurate after compression — and they keep same-named summon tokens
 * distinguishable within a side.
 */
function sideAwareName(state: DisplayState, instanceId: string): string {
  const playerIndex = state.player.findIndex((c) => c.instanceId === instanceId);
  if (playerIndex !== -1) {
    return `Your ${(state.player[playerIndex] as DisplayCreature).name} (slot ${playerIndex + 1})`;
  }
  const opponentIndex = state.opponent.findIndex((c) => c.instanceId === instanceId);
  if (opponentIndex !== -1) {
    return `Opponent ${(state.opponent[opponentIndex] as DisplayCreature).name} (slot ${opponentIndex + 1})`;
  }
  return instanceId;
}

/** Mutates `state` (a fresh clone) to reflect one event. */
function applyEvent(state: DisplayState, event: BattleEvent): void {
  switch (event.type) {
    case 'battle_start': {
      for (const sideName of ['player', 'opponent'] as const) {
        state[sideName] = event[sideName].map((s) => ({
          instanceId: s.instanceId,
          definitionId: s.definitionId,
          name: s.name,
          element: s.element,
          power: s.power,
          vitality: s.vitality,
          maxVitality: s.vitality,
          shield: 0,
          guard: 0,
          defeated: false,
        }));
      }
      break;
    }
    case 'round_start':
      state.round = event.round;
      break;
    case 'trigger_fired':
      break;
    case 'attack':
      break;
    case 'damage': {
      const target = findCreature(state, event.targetId);
      if (!target) break;
      if (event.blockedByShield) {
        target.shield = Math.max(0, target.shield - 1);
      } else {
        target.vitality = event.remainingVitality;
      }
      if (event.redirectedFrom !== undefined) {
        target.guard = Math.max(0, target.guard - 1);
      }
      break;
    }
    case 'heal': {
      const target = findCreature(state, event.targetId);
      if (target) target.vitality = event.newVitality;
      break;
    }
    case 'buff': {
      const target = findCreature(state, event.targetId);
      if (!target) break;
      if (event.stat === 'power') {
        target.power = event.newValue;
      } else {
        target.maxVitality += event.amount;
        target.vitality = event.newValue;
      }
      break;
    }
    case 'shield': {
      const target = findCreature(state, event.targetId);
      if (target) target.shield = event.charges;
      break;
    }
    case 'guard': {
      const target = findCreature(state, event.targetId);
      if (target) target.guard = event.charges;
      break;
    }
    case 'summon': {
      const s = event.creature;
      state[s.side].push({
        instanceId: s.instanceId,
        definitionId: s.definitionId,
        name: s.name,
        element: s.element,
        power: s.power,
        vitality: s.vitality,
        maxVitality: s.vitality,
        shield: 0,
        guard: 0,
        defeated: false,
      });
      break;
    }
    case 'defeat': {
      const target = findCreature(state, event.instanceId);
      if (target) target.defeated = true;
      break;
    }
    case 'compression': {
      const side = state[event.side];
      state[event.side] = event.order
        .map((id) => side.find((c) => c.instanceId === id))
        .filter((c): c is DisplayCreature => c !== undefined);
      break;
    }
    case 'battle_end':
      state.ended = true;
      state.outcome = event.outcome;
      state.winner = event.winner;
      break;
  }
}

const OUTCOME_LINES: Record<BattleOutcome, string> = {
  player_win: 'Victory! Your Circuit wins the battle.',
  opponent_win: 'Defeat. The opposing Circuit wins the battle.',
  draw_both_empty: 'Draw — both Circuits fell in the same exchange. Draws are awarded to you.',
  draw_round_cap: 'Draw — the round limit was reached. Draws are awarded to you.',
};

function multiplierNote(multiplier: number): string {
  if (multiplier > 1) return ` (×${multiplier} element advantage)`;
  if (multiplier < 1) return ` (×${multiplier} element disadvantage)`;
  return '';
}

/** One readable line per event; `preState` is the state BEFORE the frame. */
function logLine(
  event: BattleEvent,
  preState: DisplayState,
  frameEvents: BattleEvent[],
  describeAbility: (abilityId: string) => string,
): string | null {
  switch (event.type) {
    case 'battle_start':
      return 'Battle begins!';
    case 'round_start':
      return `— Round ${event.round} —`;
    case 'trigger_fired':
      return `${sideAwareName(preState, event.sourceId)} triggers (${TRIGGER_LABELS[event.trigger]}): ${describeAbility(event.abilityId)}`;
    case 'attack':
      return null; // the exchange is summarized once, via the damage lines
    case 'damage': {
      const targetName = sideAwareName(preState, event.targetId);
      const redirect =
        event.redirectedFrom !== undefined
          ? `${targetName} intercepts the hit aimed at ${sideAwareName(preState, event.redirectedFrom)}! `
          : '';
      if (event.blockedByShield) {
        return `${redirect}A shield blocks the hit on ${targetName}.`;
      }
      let note = '';
      if (event.cause.kind === 'attack') {
        const attack = frameEvents.find(
          (e) =>
            e.type === 'attack' &&
            event.cause.kind === 'attack' &&
            e.attackerId === event.cause.attackerId,
        );
        if (attack?.type === 'attack') note = multiplierNote(attack.multiplier);
      }
      return `${redirect}${targetName} takes ${event.amount} damage${note} — ${event.remainingVitality} Vitality left.`;
    }
    case 'heal':
      return `${sideAwareName(preState, event.targetId)} recovers ${event.amount} Vitality (now ${event.newVitality}).`;
    case 'buff':
      return event.stat === 'power'
        ? `${sideAwareName(preState, event.targetId)} gains +${event.amount} Power (now ${event.newValue}).`
        : `${sideAwareName(preState, event.targetId)} gains +${event.amount} Vitality (now ${event.newValue}).`;
    case 'shield':
      return `${sideAwareName(preState, event.targetId)} raises a shield (${event.charges} charge${event.charges === 1 ? '' : 's'}).`;
    case 'guard':
      return `${sideAwareName(preState, event.targetId)} guards the ally behind it (${event.charges} charge${event.charges === 1 ? '' : 's'}).`;
    case 'summon':
      // The token is not in the pre-frame state yet — side comes from the event.
      return `${event.creature.side === 'player' ? 'Your' : "Opponent's"} ${event.creature.name} is summoned into the last slot (${event.creature.power}/${event.creature.vitality}).`;
    case 'defeat':
      return `${sideAwareName(preState, event.instanceId)} is defeated.`;
    case 'compression':
      return `The ${event.side === 'player' ? 'player' : 'opponent'} Circuit closes ranks.`;
    case 'battle_end':
      return OUTCOME_LINES[event.outcome];
  }
}

function frameKindFor(event: BattleEvent): FrameKind | null {
  switch (event.type) {
    case 'battle_start':
      return 'setup';
    case 'round_start':
      return 'round';
    case 'attack':
      return 'exchange';
    case 'trigger_fired':
      return 'trigger';
    case 'compression':
      return 'compression';
    case 'battle_end':
      return 'end';
    default:
      return null; // attaches to the current frame
  }
}

/** Split the raw log into presentation frames (grouping only — no state yet). */
export function groupEvents(
  events: readonly BattleEvent[],
): { kind: FrameKind; events: BattleEvent[] }[] {
  const frames: { kind: FrameKind; events: BattleEvent[] }[] = [];
  let current: { kind: FrameKind; events: BattleEvent[] } | null = null;

  for (const event of events) {
    const kind = frameKindFor(event);
    if (kind === 'exchange' && current?.kind === 'exchange') {
      // Second attack declaration of the simultaneous pair — same frame.
      current.events.push(event);
      continue;
    }
    if (kind === 'compression' && current?.kind === 'compression') {
      current.events.push(event);
      continue;
    }
    if (kind !== null) {
      current = { kind, events: [event] };
      frames.push(current);
      continue;
    }
    if (!current) {
      current = { kind: 'trigger', events: [] };
      frames.push(current);
    }
    current.events.push(event);
  }
  return frames;
}

/** Build the full playback: frames with log lines, highlights, and post-frame state. */
export function buildPlayback(
  events: readonly BattleEvent[],
  describeAbility: (abilityId: string) => string = (id) => id,
): PlaybackFrame[] {
  const grouped = groupEvents(events);
  const frames: PlaybackFrame[] = [];
  let state = emptyState();

  for (const group of grouped) {
    const preState = state;
    const nextState = cloneState(state);
    const logLines: string[] = [];
    const sourceIds: string[] = [];
    const targetIds: string[] = [];

    for (const event of group.events) {
      const line = logLine(event, preState, group.events, describeAbility);
      if (line) logLines.push(line);
      applyEvent(nextState, event);

      if (event.type === 'attack') {
        sourceIds.push(event.attackerId);
        targetIds.push(event.defenderId);
      } else if (event.type === 'trigger_fired') {
        sourceIds.push(event.sourceId);
      } else if (event.type === 'damage' || event.type === 'heal' || event.type === 'shield') {
        targetIds.push(event.targetId);
      } else if (event.type === 'buff' || event.type === 'guard') {
        targetIds.push(event.targetId);
      } else if (event.type === 'summon') {
        targetIds.push(event.creature.instanceId);
      }
    }

    if (group.kind === 'exchange' && logLines.length > 0) {
      const [a, b] = group.events.filter((e) => e.type === 'attack');
      if (a?.type === 'attack' && b?.type === 'attack') {
        logLines.unshift(
          `${sideAwareName(preState, a.attackerId)} and ${sideAwareName(preState, b.attackerId)} strike simultaneously!`,
        );
      }
    }

    state = nextState;
    frames.push({
      kind: group.kind,
      events: group.events,
      logLines,
      sourceIds: [...new Set(sourceIds)],
      targetIds: [...new Set(targetIds)],
      state,
    });
  }
  return frames;
}

export interface BattleSummary {
  outcome: BattleOutcome;
  winner: Side;
  rounds: number;
  playerDefeats: number;
  opponentDefeats: number;
  triggersFired: number;
  triggerCounts: Partial<Record<AbilityTrigger, number>>;
  shieldBlocks: number;
  guardRedirects: number;
  summons: number;
}

/** Result-panel summary derived purely from the event log. */
export function summarizeBattle(events: readonly BattleEvent[]): BattleSummary | null {
  const end = events.find((e) => e.type === 'battle_end');
  if (end?.type !== 'battle_end') return null;
  const summary: BattleSummary = {
    outcome: end.outcome,
    winner: end.winner,
    rounds: end.rounds,
    playerDefeats: 0,
    opponentDefeats: 0,
    triggersFired: 0,
    triggerCounts: {},
    shieldBlocks: 0,
    guardRedirects: 0,
    summons: 0,
  };
  for (const event of events) {
    if (event.type === 'defeat') {
      if (event.side === 'player') summary.playerDefeats += 1;
      else summary.opponentDefeats += 1;
    } else if (event.type === 'trigger_fired') {
      summary.triggersFired += 1;
      summary.triggerCounts[event.trigger] = (summary.triggerCounts[event.trigger] ?? 0) + 1;
    } else if (event.type === 'damage') {
      if (event.blockedByShield) summary.shieldBlocks += 1;
      if (event.redirectedFrom !== undefined) summary.guardRedirects += 1;
    } else if (event.type === 'summon') {
      summary.summons += 1;
    }
  }
  return summary;
}

export { TRIGGER_LABELS };
