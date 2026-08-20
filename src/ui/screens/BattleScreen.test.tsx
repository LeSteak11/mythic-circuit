import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbilityDefinition, CreatureDefinition } from '../../content/schemas';
import { runBattle } from '../../engine';
import { useMatchStore } from '../../state/matchStore';
import { FRAME_MS } from '../battle/playback';
import BattleScreen from './BattleScreen';

const FIVE = [
  'creature-ember-guardian-01',
  'creature-tide-scavenger-01',
  'creature-volt-striker-01',
  'creature-verdant-healer-01',
  'creature-ember-rager-01',
];

function renderBattle() {
  return render(
    <MemoryRouter initialEntries={['/battle']}>
      <BattleScreen />
    </MemoryRouter>,
  );
}

function prepareRealMatch() {
  useMatchStore.setState({
    circuitIds: [...FIVE],
    selectedOpponentId: 'opponent-guardian-wall-01',
  });
  expect(useMatchStore.getState().startBattle()).toBe(true);
}

/** Synthetic mutual-KO mirror match, guaranteed draw_both_empty. */
function prepareDrawMatch() {
  const inert: AbilityDefinition = {
    id: 'ability-inert',
    trigger: 'first_below_half_vitality',
    effect: 'shield',
    magnitude: 0,
    target: 'self',
    descriptionTemplate: 'Does nothing.',
  };
  const team = (side: string): CreatureDefinition[] =>
    Array.from({ length: 5 }, (_, i) => ({
      id: `${side}-${i}`,
      name: `PH_${side.toUpperCase()}_${i}`,
      element: 'ember',
      rarity: 'common',
      power: 3,
      vitality: 3,
      abilityId: 'ability-inert',
      familyTag: 'test',
    }));
  const result = runBattle({
    player: team('mine'),
    opponent: team('foe'),
    abilities: [inert],
    seed: 7,
  });
  expect(result.outcome).toBe('draw_both_empty');
  useMatchStore.setState({
    match: { result, playerCreatureIds: [], opponentId: 'opponent-guardian-wall-01', seed: 7 },
  });
}

beforeEach(() => {
  useMatchStore.setState({ circuitIds: [], selectedOpponentId: null, match: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BattleScreen', () => {
  it('shows a friendly empty state when no match is prepared', () => {
    renderBattle();
    expect(screen.getByText(/No battle is prepared yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the Circuit Builder' })).toBeInTheDocument();
  });

  it('renders both labeled Circuits with front slots marked', () => {
    prepareRealMatch();
    renderBattle();
    expect(
      screen.getByRole('list', { name: 'player Circuit, front slot first' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'opponent Circuit, front slot first' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('FRONT')).toHaveLength(2);
    expect(screen.getByText(/Battle start/)).toBeInTheDocument();
  });

  it('steps with Next, and 1×/2× expose pressed state', async () => {
    const user = userEvent.setup();
    prepareRealMatch();
    renderBattle();
    expect(screen.getByRole('button', { name: '1×' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '2×' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: '2×' }));
    expect(screen.getByRole('button', { name: '2×' })).toHaveAttribute('aria-pressed', 'true');

    expect(screen.getByText(/step 1\//)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/step 2\//)).toBeInTheDocument();
  });

  it('auto-advances while playing, and Pause stops it', () => {
    vi.useFakeTimers();
    prepareRealMatch();
    renderBattle();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(FRAME_MS + 20);
    });
    expect(screen.getByText(/step 2\//)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 3);
    });
    expect(screen.getByText(/step 2\//)).toBeInTheDocument(); // paused — no further advance
  });

  it('skips to the result, keeps the log, and supports replay', async () => {
    const user = userEvent.setup();
    prepareRealMatch();
    renderBattle();
    await user.click(screen.getByRole('button', { name: 'Skip to Result' }));
    const result = screen.getByRole('region', { name: 'Battle result' });
    expect(result).toBeInTheDocument();
    expect(within(result).getByText('Rounds')).toBeInTheDocument();
    expect(within(result).getByText('Abilities triggered')).toBeInTheDocument();
    // The persistent log survives skipping.
    expect(screen.getByText('Battle begins!')).toBeInTheDocument();

    await user.click(within(result).getByRole('button', { name: 'Replay Battle' }));
    expect(screen.getByText(/step 1\//)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Battle result' })).not.toBeInTheDocument();
  });

  it('labels draws clearly while showing they are awarded to the player', async () => {
    const user = userEvent.setup();
    prepareDrawMatch();
    renderBattle();
    await user.click(screen.getByRole('button', { name: 'Skip to Result' }));
    expect(screen.getByText('Draw — awarded to you')).toBeInTheDocument();
    expect(
      screen.getByText('Both Circuits fell in the same exchange; draws count as your win.'),
    ).toBeInTheDocument();
  });

  it('Edit Circuit returns to the builder route', async () => {
    const user = userEvent.setup();
    prepareRealMatch();
    render(
      <MemoryRouter initialEntries={['/battle']}>
        <Routes>
          <Route path="/battle" element={<BattleScreen />} />
          <Route path="/circuit" element={<div>builder route</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Skip to Result' }));
    await user.click(screen.getByRole('button', { name: 'Edit Circuit' }));
    expect(screen.getByText('builder route')).toBeInTheDocument();
  });
});
