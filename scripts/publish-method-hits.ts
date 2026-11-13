import {readFile, writeFile} from 'node:fs/promises';
import {validateDraws} from '../src/core/data';
import {dataSignature} from '../src/core/advanced-model';
import {generateMethodFiveBefore} from '../src/core/method-five';
import {buildMixedPortfolio, buildLowOverlapPortfolio, MIXED_DISPLAY_ORDER} from '../src/core/top-two-portfolio';
import {checkGame} from '../src/core/ticket';

const draws = validateDraws(JSON.parse(await readFile('public/data/full-history.json', 'utf8')).draws);
const modes = {five: 5, mixed: 10, 'low-overlap': 10};
const totals = Object.fromEntries(Object.entries(modes).map(([mode, count]) =>
  [mode, Array.from({length: count}, () => [0, 0, 0, 0, 0])]));
for (const [i, draw] of draws.entries()) {
  if (i < 100) continue;
  const history = draws.slice(0, i);
  const result = generateMethodFiveBefore(history, draw);
  const five = result.games.map(game => game.numbers);
  const mixed = buildMixedPortfolio(five, result.seed, history);
  const packs = {five, mixed: MIXED_DISPLAY_ORDER.map(index => mixed[index]), 'low-overlap': buildLowOverlapPortfolio(result.seed)};
  for (const [mode, tickets] of Object.entries(packs)) {
    tickets.forEach((numbers, index) => {
      const {rank} = checkGame(numbers, draw);
      if (rank) totals[mode][index][rank - 1]++;
    });
  }
}
await writeFile('public/data/method-hits.json', JSON.stringify({
  signature: dataSignature(draws), first: draws[100].round, last: draws.at(-1)!.round,
  rounds: draws.length - 100, totals,
}));
