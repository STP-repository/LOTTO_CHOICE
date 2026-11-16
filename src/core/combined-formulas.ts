import type {Draw} from './data';
import {generateFrequencyFilterFive} from './frequency-filter-five';
import {generateMarkovMonteCarloFive} from './markov-monte-carlo-five';

export function generateCombinedFormulas(history: Draw[], seed: number, fixed: number[] = [], excluded: number[] = []) {
  const frequency = generateFrequencyFilterFive(history, seed, fixed, excluded).games;
  const markov = generateMarkovMonteCarloFive(history, seed, fixed, excluded, frequency.map(game => game.numbers));
  return {frequency, markov, seed};
}
