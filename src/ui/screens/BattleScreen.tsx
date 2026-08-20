import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadCatalog } from '../../content/catalog';
import { useMatchStore, type PreparedMatch } from '../../state/matchStore';
import { buildPlayback, summarizeBattle, FRAME_MS, TRIGGER_LABELS } from '../battle/playback';
import type { DisplayCreature, PlaybackFrame } from '../battle/playback';
import CreatureCard from '../components/CreatureCard';
import { cardDataForDisplay } from '../components/cardData';
import styles from './BattleScreen.module.css';

export default function BattleScreen() {
  const match = useMatchStore((s) => s.match);
  if (!match) {
    return (
      <section aria-labelledby="battle-heading">
        <h2 id="battle-heading">Battle</h2>
        <p>No battle is prepared yet. Build a Circuit and choose an opponent first.</p>
        <p>
          <Link to="/circuit">Go to the Circuit Builder</Link>
        </p>
      </section>
    );
  }
  return <BattlePlayback match={match} />;
}

function Row({
  side,
  creatures,
  frame,
}: {
  side: 'player' | 'opponent';
  creatures: DisplayCreature[];
  frame: PlaybackFrame;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{side === 'player' ? 'You' : 'Opponent'}</span>
      <ol className={styles.rowCards} aria-label={`${side} Circuit, front slot first`}>
        {creatures.map((creature, index) => {
          const highlight = frame.sourceIds.includes(creature.instanceId)
            ? 'source'
            : frame.targetIds.includes(creature.instanceId)
              ? 'target'
              : null;
          return (
            <li key={creature.instanceId} className={styles.rowItem}>
              <span className={styles.slotTag}>{index === 0 ? 'FRONT' : `Slot ${index + 1}`}</span>
              <CreatureCard card={cardDataForDisplay(creature)} compact highlight={highlight} />
            </li>
          );
        })}
        {creatures.length === 0 && <li className={styles.rowEmpty}>No creatures remaining</li>}
      </ol>
    </div>
  );
}

function BattlePlayback({ match }: { match: PreparedMatch }) {
  const catalog = loadCatalog();
  const navigate = useNavigate();
  const frames = useMemo(
    () => buildPlayback(match.result.events, catalog.describeAbility),
    [match, catalog],
  );
  const lastIndex = frames.length - 1;
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const logRef = useRef<HTMLDivElement>(null);

  const frame = frames[frameIndex] as PlaybackFrame;
  const atEnd = frameIndex >= lastIndex;
  const summary = useMemo(() => summarizeBattle(match.result.events), [match]);
  const opponent = catalog.opponentsById.get(match.opponentId);

  useEffect(() => {
    if (!playing || frameIndex >= lastIndex) return;
    const timer = setTimeout(() => {
      const next = Math.min(frameIndex + 1, lastIndex);
      setFrameIndex(next);
      if (next >= lastIndex) setPlaying(false);
    }, FRAME_MS / speed);
    return () => clearTimeout(timer);
  }, [playing, frameIndex, lastIndex, speed]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [frameIndex]);

  const logLines = frames
    .slice(0, frameIndex + 1)
    .flatMap((f, fi) => f.logLines.map((line, li) => ({ key: `${fi}-${li}`, line })));

  return (
    <section aria-labelledby="battle-heading" className={styles.battle}>
      <div className={styles.headerRow}>
        <h2 id="battle-heading">Battle vs {opponent?.name ?? match.opponentId}</h2>
        <p className={styles.roundIndicator} aria-live="polite">
          {frame.state.round > 0 ? `Round ${frame.state.round}` : 'Battle start'}
          {' · '}step {frameIndex + 1}/{frames.length} · seed {match.seed}
        </p>
      </div>

      <div className={styles.controls} role="group" aria-label="Playback controls">
        <button type="button" onClick={() => setPlaying((p) => !p)} disabled={atEnd}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => setFrameIndex((i) => Math.min(i + 1, lastIndex))}
          disabled={atEnd || playing}
        >
          Next
        </button>
        <button type="button" aria-pressed={speed === 1} onClick={() => setSpeed(1)}>
          1×
        </button>
        <button type="button" aria-pressed={speed === 2} onClick={() => setSpeed(2)}>
          2×
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setFrameIndex(lastIndex);
          }}
          disabled={atEnd}
        >
          Skip to Result
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setFrameIndex(0);
          }}
          disabled={frameIndex === 0}
        >
          Replay
        </button>
      </div>

      <div className={styles.boardAndLog}>
        <div className={styles.board}>
          <Row side="opponent" creatures={frame.state.opponent} frame={frame} />
          <div className={styles.frontLine} aria-hidden>
            ⚔ front line ⚔
          </div>
          <Row side="player" creatures={frame.state.player} frame={frame} />
        </div>

        <div className={styles.logPanel}>
          <h3>Battle log</h3>
          <div className={styles.log} ref={logRef} tabIndex={0} aria-label="Battle log">
            <ol aria-live="polite">
              {logLines.map(({ key, line }) => (
                <li key={key}>{line}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {atEnd && summary && (
        <div className={styles.result} role="region" aria-label="Battle result">
          <h3>
            {summary.outcome === 'player_win' && 'Victory!'}
            {summary.outcome === 'opponent_win' && 'Defeat'}
            {(summary.outcome === 'draw_both_empty' || summary.outcome === 'draw_round_cap') &&
              'Draw — awarded to you'}
          </h3>
          <p>
            {summary.outcome === 'draw_both_empty' &&
              'Both Circuits fell in the same exchange; draws count as your win.'}
            {summary.outcome === 'draw_round_cap' &&
              'The round limit was reached; draws count as your win.'}
            {summary.outcome === 'player_win' && 'Your Circuit defeated the opposing lineup.'}
            {summary.outcome === 'opponent_win' && 'The opposing Circuit outlasted yours.'}
          </p>
          <dl className={styles.summaryStats}>
            <div>
              <dt>Rounds</dt>
              <dd>{summary.rounds}</dd>
            </div>
            <div>
              <dt>Your defeats</dt>
              <dd>{summary.playerDefeats}</dd>
            </div>
            <div>
              <dt>Opponent defeats</dt>
              <dd>{summary.opponentDefeats}</dd>
            </div>
            <div>
              <dt>Abilities triggered</dt>
              <dd>{summary.triggersFired}</dd>
            </div>
            <div>
              <dt>Shield blocks</dt>
              <dd>{summary.shieldBlocks}</dd>
            </div>
            <div>
              <dt>Guard redirects</dt>
              <dd>{summary.guardRedirects}</dd>
            </div>
            <div>
              <dt>Summons</dt>
              <dd>{summary.summons}</dd>
            </div>
          </dl>
          {summary.triggersFired > 0 && (
            <p className={styles.triggerBreakdown}>
              Trigger activity:{' '}
              {Object.entries(summary.triggerCounts)
                .map(
                  ([trigger, count]) =>
                    `${TRIGGER_LABELS[trigger as keyof typeof TRIGGER_LABELS]} ×${count}`,
                )
                .join(' · ')}
            </p>
          )}
          <div className={styles.resultActions}>
            <button type="button" onClick={() => navigate('/circuit')}>
              Edit Circuit
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setFrameIndex(0);
              }}
            >
              Replay Battle
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
