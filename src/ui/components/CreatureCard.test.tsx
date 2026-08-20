import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreatureCard from './CreatureCard';
import { cardDataForCreature, cardDataForDisplay } from './cardData';

describe('CreatureCard', () => {
  it('renders name, stats, element/rarity text, and the interpolated ability', () => {
    render(<CreatureCard card={cardDataForCreature('creature-tide-scavenger-01')} />);
    expect(screen.getByText('PH_TIDE_SCAVENGER_01')).toBeInTheDocument();
    expect(screen.getByText('Power')).toBeInTheDocument();
    expect(screen.getAllByText('4')).toHaveLength(2); // Power 4, Vitality 4
    expect(screen.getByText(/tide/)).toBeInTheDocument();
    expect(screen.getByText('common')).toBeInTheDocument();
    expect(screen.getByText(/Gains 2 Power whenever an ally is defeated\./)).toBeInTheDocument();
    expect(screen.getByText(/Ally defeated/)).toBeInTheDocument();
  });

  it('renders manifest art for creatures with a variant', () => {
    const card = cardDataForCreature('creature-ember-guardian-01');
    // Vite may inline small assets as data: URIs — only require a resolvable URL.
    expect(card.artUrl).toBeTruthy();
    expect(card.frameUrl).toBeTruthy();
    const { container } = render(<CreatureCard card={card} />);
    expect(container.querySelectorAll('img').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the accessible art-pending fallback for creatures without a variant', () => {
    render(<CreatureCard card={cardDataForCreature('creature-volt-striker-01')} />);
    expect(screen.getByRole('img', { name: 'Placeholder — art pending' })).toBeInTheDocument();
  });

  it('shows current/max vitality and charges in battle mode', () => {
    render(
      <CreatureCard
        card={cardDataForDisplay({
          instanceId: 'player-1',
          definitionId: 'creature-ember-guardian-01',
          name: 'PH_EMBER_GUARDIAN_01',
          element: 'ember',
          power: 3,
          vitality: 4,
          maxVitality: 7,
          shield: 1,
          guard: 2,
          defeated: false,
        })}
        compact
      />,
    );
    expect(screen.getByText('4/7')).toBeInTheDocument();
    expect(screen.getByText(/Shield ×1/)).toBeInTheDocument();
    expect(screen.getByText(/Guard ×2/)).toBeInTheDocument();
  });

  it('labels defeated creatures and token summons', () => {
    render(
      <CreatureCard
        card={cardDataForDisplay({
          instanceId: 'token-1',
          definitionId: 'token-of-creature-verdant-broodmother-01',
          name: 'PH_SUMMON_TOKEN',
          element: 'verdant',
          power: 3,
          vitality: 0,
          maxVitality: 3,
          shield: 0,
          guard: 0,
          defeated: true,
        })}
        compact
      />,
    );
    expect(screen.getByText('Defeated')).toBeInTheDocument();
    expect(screen.getByText('token')).toBeInTheDocument();
  });
});
