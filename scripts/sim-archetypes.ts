/**
 * Archetype meaningfulness check — `npm run sim:archetypes`.
 *
 * Pits the three MVP archetype lineups against each other (and in mirrors).
 * Battles are deterministic, so the seeded RNG samples the strategy space:
 * each trial shuffles both sides' slot ORDER, then runs one battle. The
 * resulting win rates show whether the archetypes are strategically distinct.
 * This is evidence of meaningful differences, not balance tuning.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { abilityDefinitionSchema, creatureDefinitionSchema } from '../src/content/schemas';
import { createRng, runBattle, shuffled } from '../src/engine';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');
const dataDir = join(repoRoot, 'src', 'content', 'data');

const creatures = z
  .array(creatureDefinitionSchema)
  .parse(JSON.parse(readFileSync(join(dataDir, 'creatures.json'), 'utf8')));
const abilities = z
  .array(abilityDefinitionSchema)
  .parse(JSON.parse(readFileSync(join(dataDir, 'abilities.json'), 'utf8')));

const byId = new Map(creatures.map((c) => [c.id, c]));
function lineup(ids: string[]) {
  return ids.map((id) => {
    const def = byId.get(id);
    if (!def) throw new Error(`Unknown creature id in archetype lineup: ${id}`);
    return def;
  });
}

const archetypes = {
  'guardian-wall': lineup([
    'creature-ember-guardian-01',
    'creature-tide-shellback-01',
    'creature-tide-oracle-01',
    'creature-verdant-healer-01',
    'creature-volt-striker-01',
  ]),
  'scavenger-snowball': lineup([
    'creature-volt-martyr-01',
    'creature-verdant-broodmother-01',
    'creature-tide-scavenger-01',
    'creature-ember-berserker-01',
    'creature-ember-sniper-01',
  ]),
  'trigger-tempo': lineup([
    'creature-ember-rager-01',
    'creature-volt-striker-01',
    'creature-volt-stormcaller-01',
    'creature-ember-sniper-01',
    'creature-ember-berserker-01',
  ]),
} as const;

type ArchetypeName = keyof typeof archetypes;
const names = Object.keys(archetypes) as ArchetypeName[];

const TRIALS = 500;

interface MatchupRow {
  matchup: string;
  aWins: number;
  bWins: number;
  draws: number;
}

const rows: MatchupRow[] = [];
let matchupIndex = 0;

for (let i = 0; i < names.length; i++) {
  for (let j = i; j < names.length; j++) {
    const a = names[i] as ArchetypeName;
    const b = names[j] as ArchetypeName;
    let aWins = 0;
    let bWins = 0;
    let draws = 0;
    for (let trial = 0; trial < TRIALS; trial++) {
      const seed = matchupIndex * 1_000_000 + trial;
      const rng = createRng(seed);
      const result = runBattle({
        player: shuffled(archetypes[a], rng),
        opponent: shuffled(archetypes[b], rng),
        abilities,
        seed,
      });
      if (result.outcome === 'player_win') aWins++;
      else if (result.outcome === 'opponent_win') bWins++;
      else draws++;
    }
    rows.push({ matchup: `${a} vs ${b}`, aWins, bWins, draws });
    matchupIndex++;
  }
}

console.log(`Archetype simulation — ${TRIALS} seeded slot-order shuffles per matchup\n`);
console.log('| Matchup | A wins | B wins | Draws | A win rate |', '\n|---|---|---|---|---|');
for (const row of rows) {
  const rate = ((row.aWins / TRIALS) * 100).toFixed(1);
  console.log(`| ${row.matchup} | ${row.aWins} | ${row.bWins} | ${row.draws} | ${rate}% |`);
}
console.log(
  '\nNote: draws (both sides empty or round cap) are counted separately here;',
  'in a real run a draw counts as a player win.',
);
