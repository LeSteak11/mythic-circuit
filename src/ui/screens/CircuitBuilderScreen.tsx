import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadCatalog } from '../../content/catalog';
import { LINEUP_SIZE } from '../../engine';
import type { LineupError } from '../../engine';
import { useMatchStore, validateCircuit } from '../../state/matchStore';
import CreatureCard from '../components/CreatureCard';
import { cardDataForCreature } from '../components/cardData';
import styles from './CircuitBuilderScreen.module.css';

function describeError(error: LineupError): string {
  switch (error.code) {
    case 'wrong_size':
      return `Your Circuit needs exactly ${error.expected} creatures (currently ${error.actual}).`;
    case 'duplicate_creature':
      return `Duplicate creature in the Circuit: ${error.creatureId}.`;
    case 'unknown_creature':
      return `Unknown creature: ${error.creatureId}.`;
    case 'unknown_ability':
      return `Creature ${error.creatureId} references a missing ability (${error.abilityId}).`;
  }
}

export default function CircuitBuilderScreen() {
  const catalog = loadCatalog();
  const navigate = useNavigate();
  const circuitIds = useMatchStore((s) => s.circuitIds);
  const selectedOpponentId = useMatchStore((s) => s.selectedOpponentId);
  const addCreature = useMatchStore((s) => s.addCreature);
  const removeCreature = useMatchStore((s) => s.removeCreature);
  const moveCreature = useMatchStore((s) => s.moveCreature);
  const reorderCreature = useMatchStore((s) => s.reorderCreature);
  const resetCircuit = useMatchStore((s) => s.resetCircuit);
  const selectOpponent = useMatchStore((s) => s.selectOpponent);
  const startBattle = useMatchStore((s) => s.startBattle);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const validation = validateCircuit(circuitIds);
  const circuitFull = circuitIds.length >= LINEUP_SIZE;
  const selectedOpponent = selectedOpponentId
    ? catalog.opponentsById.get(selectedOpponentId)
    : undefined;
  const canBattle = validation.ok && selectedOpponent !== undefined;

  const onBattle = () => {
    if (startBattle()) {
      navigate('/battle');
    }
  };

  return (
    <div className={styles.layout}>
      <section aria-labelledby="roster-heading" className={styles.roster}>
        <h2 id="roster-heading">Circuit Builder</h2>
        <p className={styles.hint}>
          Temporary Stage 0.3 roster — all 12 representative creatures are available. Add five to
          your Circuit; slot 1 fights first.
        </p>
        <ul className={styles.rosterGrid}>
          {catalog.creatures.map((creature) => {
            const inCircuit = circuitIds.includes(creature.id);
            return (
              <li key={creature.id} className={styles.rosterItem}>
                <CreatureCard card={cardDataForCreature(creature.id)} />
                <button
                  type="button"
                  onClick={() => addCreature(creature.id)}
                  disabled={inCircuit || circuitFull}
                >
                  {inCircuit ? 'In Circuit' : circuitFull ? 'Circuit full' : `Add ${creature.name}`}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className={styles.sidebar}>
        <section aria-labelledby="circuit-heading" className={styles.circuit}>
          <h3 id="circuit-heading">Your Circuit</h3>
          <ol className={styles.slots} aria-label="Circuit slots, slot 1 is the front">
            {Array.from({ length: LINEUP_SIZE }, (_, index) => {
              const creatureId = circuitIds[index];
              const positionLabel =
                index === 0 ? 'Front' : index === LINEUP_SIZE - 1 ? 'Rear' : null;
              if (!creatureId) {
                return (
                  <li key={`empty-${index}`} className={styles.emptySlot}>
                    <span className={styles.slotLabel}>
                      Slot {index + 1}
                      {positionLabel ? ` — ${positionLabel}` : ''}
                    </span>
                    <span className={styles.emptyText}>Empty</span>
                  </li>
                );
              }
              const creature = catalog.creaturesById.get(creatureId);
              return (
                <li
                  key={creatureId}
                  className={`${styles.slot} ${dragIndex === index ? styles.dragging : ''}`}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== index) {
                      reorderCreature(dragIndex, index);
                    }
                    setDragIndex(null);
                  }}
                >
                  <span className={styles.slotLabel}>
                    Slot {index + 1}
                    {positionLabel ? ` — ${positionLabel}` : ''}
                  </span>
                  <span className={styles.slotName}>{creature?.name ?? creatureId}</span>
                  <span className={styles.slotControls}>
                    <button
                      type="button"
                      onClick={() => moveCreature(creatureId, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${creature?.name ?? creatureId} forward (toward slot 1)`}
                    >
                      ▲ Forward
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCreature(creatureId, 1)}
                      disabled={index === circuitIds.length - 1}
                      aria-label={`Move ${creature?.name ?? creatureId} back (toward slot 5)`}
                    >
                      ▼ Back
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCreature(creatureId)}
                      aria-label={`Remove ${creature?.name ?? creatureId} from the Circuit`}
                    >
                      ✕ Remove
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
          {!validation.ok && (
            <ul className={styles.errors} aria-live="polite">
              {validation.errors.map((error, i) => (
                <li key={i}>{describeError(error)}</li>
              ))}
            </ul>
          )}
          <div className={styles.circuitActions}>
            <button type="button" onClick={resetCircuit} disabled={circuitIds.length === 0}>
              Reset Circuit
            </button>
          </div>
        </section>

        <section aria-labelledby="opponent-heading" className={styles.opponents}>
          <h3 id="opponent-heading">Choose an opponent</h3>
          <div className={styles.opponentButtons} role="radiogroup" aria-label="Opponent lineup">
            {catalog.opponents.map((opponent) => (
              <button
                key={opponent.id}
                type="button"
                role="radio"
                aria-checked={selectedOpponentId === opponent.id}
                className={selectedOpponentId === opponent.id ? styles.opponentSelected : ''}
                onClick={() => selectOpponent(opponent.id)}
              >
                {opponent.name}
                <span className={styles.archetype}> ({opponent.archetypeTag})</span>
              </button>
            ))}
          </div>
          {selectedOpponent && (
            <div className={styles.opponentPreview}>
              <h4>{selectedOpponent.name} — ordered Circuit</h4>
              <ol className={styles.opponentList}>
                {selectedOpponent.creatureIds.map((creatureId, index) => (
                  <li key={creatureId}>
                    <span className={styles.slotLabel}>
                      {index + 1}
                      {index === 0 ? ' (front)' : ''}
                    </span>{' '}
                    {catalog.creaturesById.get(creatureId)?.name ?? creatureId}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <button
            type="button"
            className={styles.battleButton}
            onClick={onBattle}
            disabled={!canBattle}
          >
            Battle this Circuit
          </button>
          {!canBattle && (
            <p className={styles.hint}>
              {validation.ok
                ? 'Select an opponent to battle.'
                : 'Complete a legal 5-creature Circuit to battle.'}
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
