import type {Draw} from './data';
import {generateFrequencyFilterFive} from './frequency-filter-five';
import {generateMarkovMonteCarloFive, SIMULATION_COUNT} from './markov-monte-carlo-five';
import {buildIntegratedPool, selectIntegratedFive} from './integrated-lotto-five';

export function generateCombinedFormulas(history: Draw[], seed: number, fixed: number[] = [], excluded: number[] = [], simulations = SIMULATION_COUNT) {
  const frequency = generateFrequencyFilterFive(history, seed, fixed, excluded).games;
  const markov = generateMarkovMonteCarloFive(history, seed, fixed, excluded, frequency.map(game => game.numbers), simulations);
  return {frequency, markov, seed};
}

export function generateRecommendationPack(history: Draw[], seed: number, fixed: number[] = [], excluded: number[] = [],
  {simulations = SIMULATION_COUNT, generations = 300} = {}) {
  const {markov} = generateCombinedFormulas(history, seed, fixed, excluded, simulations);
  const {candidates, ...stats} = buildIntegratedPool(history, seed, fixed, excluded, simulations, 0.5,
    markov.games.map(game => game.numbers));
  const integrated = {...stats, ...selectIntegratedFive({candidates, ...stats}, seed, fixed, excluded, undefined, generations)};
  return {markov, integrated, seed};
}

export function recommendationIdentity(pack: ReturnType<typeof generateRecommendationPack>) {
  return [...pack.markov.games, ...pack.integrated.games].map(game => game.numbers.join(',')).sort().join(';');
}
