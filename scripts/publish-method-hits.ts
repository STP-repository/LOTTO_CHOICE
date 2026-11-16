import {readFile, writeFile} from 'node:fs/promises';
import {validateDraws} from '../src/core/data';
import {dataSignature} from '../src/core/advanced-model';
import {generateMethodFiveBefore, methodSeed} from '../src/core/method-five';
import {generateAdaptiveFive} from '../src/core/adaptive-five';
import {generateFrequencyFilterFive} from '../src/core/frequency-filter-five';
import {generateCombinedFormulas} from '../src/core/combined-formulas';
import {buildMixedPortfolio, buildLowOverlapPortfolio, MIXED_DISPLAY_ORDER} from '../src/core/top-two-portfolio';
import {checkGame} from '../src/core/ticket';
import type {MethodHits} from '../src/services/method-five';

const draws = validateDraws(JSON.parse(await readFile('public/data/full-history.json', 'utf8')).draws);
const previous: Partial<MethodHits> = await readFile('public/data/method-hits.json', 'utf8')
  .then(content => JSON.parse(content), error => {
    if (error.code === 'ENOENT') return {};
    throw error;
  });
const modes = {five: 5, mixed: 10, 'low-overlap': 10, 'frequency-filter': 5};
const totals = Object.fromEntries(Object.entries(modes).map(([mode, count]) =>
  [mode, Array.from({length: count}, () => [0, 0, 0, 0, 0])]));
let latest: MethodHits['latest'];
for (const [i, draw] of draws.entries()) {
  if (i < 100) continue;
  const history = draws.slice(0, i);
  const result = generateMethodFiveBefore(history, draw);
  const five = result.games.map(game => game.numbers);
  const mixed = buildMixedPortfolio(five, result.seed, history);
  const filtered = generateFrequencyFilterFive(history, result.seed).games.map(game => game.numbers);
  const packs = {five, mixed: MIXED_DISPLAY_ORDER.map(index => mixed[index]), 'low-overlap': buildLowOverlapPortfolio(result.seed), 'frequency-filter': filtered};
  if (i === draws.length - 1) {
    latest = {draw, tickets: filtered.map(numbers => ({numbers, ...checkGame(numbers, draw)}))};
  }
  for (const [mode, tickets] of Object.entries(packs)) {
    tickets.forEach((numbers, index) => {
      const {rank} = checkGame(numbers, draw);
      if (rank) totals[mode][index][rank - 1]++;
    });
  }
}
const targetRound = draws.at(-1)!.round + 1;
const adaptive = {targetRound, ...generateAdaptiveFive(draws, methodSeed(targetRound))};
const upcoming = {targetRound, ...generateCombinedFormulas(draws, methodSeed(targetRound))};
const settled = draws.at(-1)!;
const recorded = previous.upcoming?.targetRound === settled.round ? previous.upcoming : undefined;
const previousResult = previous.combinedLatest?.draw.round === settled.round ? previous.combinedLatest : undefined;
const pastPack = previousResult ?? (() => {
  const pack = recorded ?? generateCombinedFormulas(draws.slice(0, -1), methodSeed(settled.round));
  return {draw: settled, frequencyCount: pack.frequency.length, replayed: !recorded,
    tickets: [...pack.frequency, ...pack.markov.games].map(({numbers}) => ({numbers, ...checkGame(numbers, settled)}))};
})();
await writeFile('public/data/method-hits.json', JSON.stringify({
  signature: dataSignature(draws), first: draws[100].round, last: draws.at(-1)!.round,
  rounds: draws.length - 100, totals, latest, adaptive, upcoming,
  combinedLatest: {...pastPack, draw: settled, tickets: pastPack.tickets.map(({numbers}) => ({numbers, ...checkGame(numbers, settled)}))},
}));
