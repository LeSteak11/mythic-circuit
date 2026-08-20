import type { CardData } from './cardData';
import styles from './CreatureCard.module.css';

/**
 * The one reusable card template (builder + battle). Structure is fixed;
 * appearance is driven by CSS custom properties (see global.css --card-*
 * tokens) so Creative can restyle without rebuilding.
 *
 * Element and rarity always appear as TEXT plus a non-color cue (glyph /
 * border treatment) — never color alone.
 */

const ELEMENT_GLYPHS: Record<CardData['element'], string> = {
  ember: '▲',
  volt: '◆',
  tide: '●',
  verdant: '■',
};

interface CreatureCardProps {
  card: CardData;
  /** Compact cards for the battle board / opponent previews. */
  compact?: boolean;
  highlight?: 'source' | 'target' | null;
}

export default function CreatureCard({
  card,
  compact = false,
  highlight = null,
}: CreatureCardProps) {
  const vitalityText =
    card.maxVitality !== undefined ? `${card.vitality}/${card.maxVitality}` : `${card.vitality}`;
  const classNames = [
    styles.card,
    compact ? styles.compact : '',
    card.defeated ? styles.defeated : '',
    highlight === 'source' ? styles.highlightSource : '',
    highlight === 'target' ? styles.highlightTarget : '',
    styles[`rarity_${card.rarity}`],
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={classNames} aria-label={`${card.name}, ${card.element} ${card.rarity}`}>
      <header className={styles.header}>
        <span className={styles.name}>{card.name}</span>
      </header>
      <div className={styles.artFrame}>
        {card.artUrl ? (
          <img className={styles.art} src={card.artUrl} alt="" />
        ) : (
          <div className={styles.artPending} role="img" aria-label="Placeholder — art pending">
            PLACEHOLDER — ART PENDING
          </div>
        )}
        {card.frameUrl ? (
          <img className={styles.frame} src={card.frameUrl} alt="" aria-hidden />
        ) : null}
      </div>
      <div className={styles.meta}>
        <span className={styles.element}>
          <span aria-hidden>{ELEMENT_GLYPHS[card.element]}</span> {card.element}
        </span>
        <span className={styles.rarity}>{card.rarity}</span>
      </div>
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Power</dt>
          <dd>{card.power}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Vitality</dt>
          <dd>{vitalityText}</dd>
        </div>
      </dl>
      {(card.shield > 0 || card.guard > 0) && (
        <p className={styles.charges}>
          {card.shield > 0 ? `Shield ×${card.shield} ` : ''}
          {card.guard > 0 ? `Guard ×${card.guard}` : ''}
        </p>
      )}
      {card.defeated && <p className={styles.defeatedLabel}>Defeated</p>}
      {!compact && card.abilityText && (
        <p className={styles.ability}>
          {card.triggerText ? <strong>{card.triggerText}: </strong> : null}
          {card.abilityText}
        </p>
      )}
    </article>
  );
}
