import {overlap, shape} from './advanced-model';
import type {Draw} from './data';
import {rng} from './recommend';

export const SIMULATION_COUNT = 1_000_000;
const numbers = Array.from({length: 45}, (_, index) => index + 1);
const key = (ticket: number[]) => ticket.reduce((value, number) => value * 46 + number, 0);

export function generateMarkovMonteCarloFive(
  history: Draw[], seed: number, fixed: number[], excluded: number[], alreadySelected: number[][] = [],
) {
  if (history.length < 100 || history[0].round !== 1) throw Error('제1회부터의 확정 당첨 기록이 필요합니다.');
  if (fixed.length > 5 || [fixed, excluded].some(list => new Set(list).size !== list.length ||
      list.some(n => !Number.isInteger(n) || n < 1 || n > 45)) || overlap(fixed, excluded)) {
    throw Error('고정수는 최대 5개이며, 고정수·제외수에 중복 없이 1~45번을 입력해 주세요.');
  }
  const available = numbers.filter(n => !fixed.includes(n) && !excluded.includes(n));
  if (available.length + fixed.length < 6) throw Error('제외수를 적용한 뒤 사용할 번호가 최소 6개 필요합니다.');
  const previous = history.at(-1)!.numbers;
  const frequency = new Uint32Array(46), recent = new Uint32Array(46);
  const transitions = Array.from({length: 46}, () => new Uint32Array(46));
  const totals = new Uint32Array(46);
  for (const [index, draw] of history.entries()) {
    for (const n of draw.numbers) {
      frequency[n]++;
      if (index >= history.length - 100) recent[n]++;
      if (index) for (const from of history[index - 1].numbers) {
        transitions[from][n]++;
        totals[from]++;
      }
    }
  }
  const expected = history.length * 6 / 45;
  const deviation = Math.sqrt(expected * (1 - 6 / 45));
  const groups = numbers.map(n => {
    const z = (frequency[n] - expected) / deviation;
    return z >= 1 ? 0 : z <= -1 ? 2 : 1;
  });
  const markov = numbers.map(n => previous.reduce((sum, from) => sum + (transitions[from][n] + 1) / (totals[from] + 45), 0) / 6);
  const average = 600 / 45;
  const frequencyScore = numbers.map(n => 1 + 0.3 * (recent[n] - average) / average);
  const mean = (values: number[]) => values.reduce((sum, n) => sum + n, 0) / 45;
  const markovMean = mean(markov), frequencyMean = mean(frequencyScore);
  const weights = available.map(n => Math.max(0.1, 0.5 * (markov[n - 1] / markovMean + frequencyScore[n - 1] / frequencyMean)));
  const fullWeight = weights.reduce((sum, n) => sum + n, 0);
  const hits = new Uint32Array(46), random = rng(seed);
  const blocked = new Set([...history.map(draw => draw.numbers), ...alreadySelected].map(key));
  const seen = new Set<number>();
  const candidates: {numbers: number[]; sum: number; odd: number; low: number; ac: number; tier: number; counts: number[]}[] = [];
  const used = new Uint8Array(available.length);
  for (let sample = 0; sample < SIMULATION_COUNT; sample++) {
    const ticket = [...fixed];
    used.fill(0);
    let total = fullWeight;
    while (ticket.length < 6) {
      let roll = random() * total, chosen = -1;
      for (let i = 0; i < available.length; i++) {
        if (used[i]) continue;
        chosen = i;
        roll -= weights[i];
        if (roll < 0) break;
      }
      used[chosen] = 1;
      ticket.push(available[chosen]);
      total -= weights[chosen];
    }
    for (const n of ticket) hits[n]++;
    ticket.sort((a, b) => a - b);
    const id = key(ticket);
    if (seen.has(id) || blocked.has(id)) continue;
    seen.add(id);
    const sum = ticket.reduce((value, n) => value + n, 0);
    if (sum < 78 || sum > 198) continue;
    const odd = ticket.filter(n => n % 2).length, low = ticket.filter(n => n <= 22).length;
    if (odd < 2 || odd > 4 || low < 2 || low > 4) continue;
    const {ac, consecutive, ranges, overlap: carried} = shape(ticket, previous);
    if (ac < 6 || consecutive > 1 || carried > 3 || ranges.split('-').some(n => Number(n) > 3)) continue;
    if (ticket.some(n => ticket.filter(other => other % 10 === n % 10).length > 2)) continue;
    const tier = ac === 6 ? 3 : carried === 3 ? 2 : sum < 108 || sum > 168 ? 1 : 0;
    const counts = [0, 0, 0];
    for (const n of ticket) counts[groups[n - 1]]++;
    candidates.push({numbers: ticket, sum, odd, low, ac, tier, counts});
  }
  const scores = numbers.map(n => Math.log(hits[n] / SIMULATION_COUNT));
  const ranked = candidates.map(candidate => ({
    ...candidate, score: candidate.numbers.reduce((sum, n) => sum + scores[n - 1], 0)
      - 0.5 * candidate.counts.reduce((sum, count) => sum + Math.abs(count - 2), 0),
  })).sort((a, b) => b.score - a.score || key(a.numbers) - key(b.numbers));
  let games: typeof ranked = [];
  let tier = 0;
  for (; tier <= 3; tier++) {
    games = [];
    for (const candidate of ranked) {
      if (candidate.tier > tier || games.some(game => overlap(game.numbers, candidate.numbers) >= 4)) continue;
      games.push(candidate);
      if (games.length === 5) break;
    }
    if (games.length === 5) break;
  }
  return {games, simulations: SIMULATION_COUNT, hot: numbers.filter(n => groups[n - 1] === 0),
    cold: numbers.filter(n => groups[n - 1] === 2), relaxed: Math.min(tier, 3), lastRound: history.at(-1)!.round};
}
