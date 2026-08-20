import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMatchStore } from '../../state/matchStore';
import CircuitBuilderScreen from './CircuitBuilderScreen';

function renderBuilder() {
  return render(
    <MemoryRouter initialEntries={['/circuit']}>
      <CircuitBuilderScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useMatchStore.setState({ circuitIds: [], selectedOpponentId: null, match: null });
});

describe('CircuitBuilderScreen', () => {
  it('shows all 12 roster creatures and a size validation message', () => {
    renderBuilder();
    expect(screen.getAllByRole('button', { name: /^Add PH_/ })).toHaveLength(12);
    expect(
      screen.getByText('Your Circuit needs exactly 5 creatures (currently 0).'),
    ).toBeInTheDocument();
  });

  it('adds creatures, prevents duplicates, and fills exactly five slots', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByRole('button', { name: 'Add PH_EMBER_GUARDIAN_01' }));
    // The added creature's button flips to a disabled "In Circuit" state.
    expect(screen.getByRole('button', { name: 'In Circuit' })).toBeDisabled();

    for (const name of [
      'Add PH_TIDE_SCAVENGER_01',
      'Add PH_VOLT_STRIKER_01',
      'Add PH_VERDANT_HEALER_01',
      'Add PH_EMBER_RAGER_01',
    ]) {
      await user.click(screen.getByRole('button', { name }));
    }
    // Circuit full: remaining roster buttons are disabled.
    expect(screen.getAllByRole('button', { name: 'Circuit full' })).toHaveLength(7);
    expect(screen.queryByText(/Your Circuit needs exactly 5 creatures/)).not.toBeInTheDocument();
  });

  it('identifies front and rear slots and reorders with keyboard-accessible buttons', async () => {
    const user = userEvent.setup();
    useMatchStore.setState({
      circuitIds: [
        'creature-ember-guardian-01',
        'creature-tide-scavenger-01',
        'creature-volt-striker-01',
        'creature-verdant-healer-01',
        'creature-ember-rager-01',
      ],
    });
    renderBuilder();
    const slots = screen.getByRole('list', { name: /Circuit slots/ });
    expect(within(slots).getByText('Slot 1 — Front')).toBeInTheDocument();
    expect(within(slots).getByText('Slot 5 — Rear')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Move PH_TIDE_SCAVENGER_01 forward (toward slot 1)' }),
    );
    expect(useMatchStore.getState().circuitIds[0]).toBe('creature-tide-scavenger-01');

    await user.click(
      screen.getByRole('button', { name: 'Remove PH_TIDE_SCAVENGER_01 from the Circuit' }),
    );
    expect(useMatchStore.getState().circuitIds).toHaveLength(4);
  });

  it('requires both a legal circuit and an opponent before battling', async () => {
    const user = userEvent.setup();
    useMatchStore.setState({
      circuitIds: [
        'creature-ember-guardian-01',
        'creature-tide-scavenger-01',
        'creature-volt-striker-01',
        'creature-verdant-healer-01',
        'creature-ember-rager-01',
      ],
    });
    renderBuilder();
    const battleButton = screen.getByRole('button', { name: 'Battle this Circuit' });
    expect(battleButton).toBeDisabled();
    expect(screen.getByText('Select an opponent to battle.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /PH_GUARDIAN_WALL/ }));
    expect(screen.getByText('PH_GUARDIAN_WALL — ordered Circuit')).toBeInTheDocument();
    expect(screen.getByText(/1 \(front\)/)).toBeInTheDocument();
    expect(battleButton).toBeEnabled();

    await user.click(battleButton);
    const match = useMatchStore.getState().match;
    expect(match).not.toBeNull();
    expect(match?.opponentId).toBe('opponent-guardian-wall-01');
  });

  it('resets the circuit', async () => {
    const user = userEvent.setup();
    useMatchStore.setState({ circuitIds: ['creature-ember-guardian-01'] });
    renderBuilder();
    await user.click(screen.getByRole('button', { name: 'Reset Circuit' }));
    expect(useMatchStore.getState().circuitIds).toEqual([]);
  });
});
