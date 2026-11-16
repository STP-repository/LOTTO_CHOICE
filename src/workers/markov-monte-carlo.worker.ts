import type {Draw} from '../core/data';
import {generateCombinedFormulas} from '../core/combined-formulas';
import {generateMarkovMonteCarloFive} from '../core/markov-monte-carlo-five';

interface Request {
  history: Draw[];
  seed: number;
  fixed: number[];
  excluded: number[];
  combined: boolean;
}

self.onmessage = ({data}: MessageEvent<Request>) => {
  try {
    const {history, seed, fixed, excluded, combined} = data;
    self.postMessage(combined ? generateCombinedFormulas(history, seed, fixed, excluded) : {
      frequency: [], markov: generateMarkovMonteCarloFive(history, seed, fixed, excluded), seed,
    });
  } catch (error) {
    self.postMessage({error: error instanceof Error ? error.message : String(error)});
  }
};
