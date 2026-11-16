import {overlap, shape} from './advanced-model';
import type {Draw} from './data';
import {rng} from './recommend';

export const FREQUENCY_FILTER_LIMIT = 200_000;

export function parseFilterNumbers(input: string): number[] {
  const values = input.trim().split(/[\s,·]+/).filter(Boolean);
  if (values.some(value => !/^\d{1,2}$/.test(value))) throw Error('번호는 쉼표 또는 공백으로 구분해 주세요.');
  return values.map(Number);
}

export function generateFrequencyFilterFive(
  history: Draw[], seed: number, fixed: number[] = [], excluded: number[] = [],
) {
  if (history.length < 100 || history[0].round !== 1) throw Error('제1회부터의 확정 당첨 기록이 필요합니다.');
  for (const list of [fixed, excluded]) {
    if (new Set(list).size !== list.length || list.some(n => !Number.isInteger(n) || n < 1 || n > 45)) {
      throw Error('고정수와 제외수는 중복 없이 1~45번을 입력해 주세요.');
    }
  }
  if (fixed.length > 5) throw Error('고정수는 최대 5개입니다.');
  if (overlap(fixed, excluded)) throw Error('같은 번호를 고정수와 제외수에 동시에 넣을 수 없습니다.');
  const frequency = new Uint8Array(46);
  for (const draw of history.slice(-100)) for (const n of draw.numbers) frequency[n]++;
  const average = 600 / 45;
  const available = Array.from({length: 45}, (_, i) => i + 1)
    .filter(n => !fixed.includes(n) && !excluded.includes(n))
    .map(number => {
      const weight = 1 + 0.15 * (frequency[number] - average) / average;
      return {number, weight: weight <= 0 ? 0.1 : weight};
    });
  if (available.length + fixed.length < 6) throw Error('제외수를 적용한 뒤 사용할 번호가 최소 6개 필요합니다.');
  const winners = new Set(history.map(draw => [...draw.numbers].sort((a, b) => a - b).join(',')));
  const previous = history.at(-1)!.numbers;
  const random = rng(seed);
  const games: {numbers: number[]; odd: number; low: number; sum: number; ac: number}[] = [];
  let attempts = 0;
  while (games.length < 5 && attempts < FREQUENCY_FILTER_LIMIT) {
    attempts++;
    const numbers = [...fixed], remaining = [...available];
    let total = remaining.reduce((sum, entry) => sum + entry.weight, 0);
    while (numbers.length < 6) {
      let roll = random() * total;
      const index = remaining.findIndex(entry => (roll -= entry.weight) < 0);
      const [entry] = remaining.splice(index < 0 ? remaining.length - 1 : index, 1);
      numbers.push(entry.number);
      total -= entry.weight;
    }
    numbers.sort((a, b) => a - b);
    const {odd, low, sum, ac, consecutive, ranges, overlap: previousOverlap} = shape(numbers, previous);
    if (sum < 120 || sum > 155 || odd < 2 || odd > 4 || low < 2 || low > 4 ||
        consecutive > 1 || previousOverlap > 2 || ac < 7 || ranges.split('-').some(n => Number(n) > 3)) continue;
    if (numbers.some(n => numbers.filter(other => other % 10 === n % 10).length > 2)) continue;
    if (winners.has(numbers.join(',')) || games.some(game => overlap(game.numbers, numbers) >= 4)) continue;
    games.push({numbers, odd, low, sum, ac});
  }
  return {games, attempts};
}
