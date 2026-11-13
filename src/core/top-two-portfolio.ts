import {randomBlendSampler} from './method-five';
import {validCombination} from './combination-groups';
import {LOTTO_OUTCOMES} from './portfolio-coverage';
import {sampleSix} from './advanced-model';
import {rng} from './recommend';
import type {Draw} from './data';

export const MIXED_EXTRA_NAMES = ['한 번호대 3개 이상','최근 100회 다빈도','추첨 순서 그대로','27·38 패턴','세 방식 무작위 비율 혼합'] as const;
export const MIXED_DISPLAY_ORDER = [0, 1, 2, 3, 9, 4, 5, 6, 7, 8] as const;

export function buildPatternPortfolio(base: readonly number[][], seed: number): number[][] {
  const used = new Set(base.flat());
  if (base.length !== 5 || used.size !== 30 || base.some(numbers => !validCombination(numbers))) {
    throw new Error('번호가 겹치지 않는 기존 5조합이 필요합니다.');
  }
  const unused = Array.from({length: 45}, (_, index) => index + 1).filter(n => !used.has(n));
  const extra = base.map((numbers, index) => [
    ...unused.slice(index * 3, index * 3 + 3),
    numbers[0],
    base[(index + 1) % 5][1],
    base[(index + 2) % 5][2],
  ].sort((a, b) => a - b));
  const random = rng(seed ^ 0x2738);
  const portfolio = [...extra];
  for (let attempt = 0; portfolio.length < 10 && attempt < 10000; attempt++) {
    const sample = sampleSix(random);
    const fixedPair = portfolio.length === 5;
    const numbers = fixedPair
      ? [27, 38, ...sample.filter(n => n !== 27 && n !== 38).slice(0, 4)].sort((a, b) => a - b)
      : sample;
    if (!fixedPair && numbers.includes(27) && numbers.includes(38)) continue;
    const odd = numbers.filter(n => n % 2).length;
    const sum = numbers.reduce((total, n) => total + n, 0);
    if (odd < 2 || odd > 4 || sum < 110 || sum > 165) continue;
    if (portfolio.some(ticket => numbers.filter(n => ticket.includes(n)).length > 3)) continue;
    portfolio.push(numbers);
  }
  if (portfolio.length !== 10) throw new Error('패턴 5조합을 구성하지 못했습니다.');
  return portfolio;
}

// One exact match and six possible choices of which ticket number is the bonus.
// Applies to portfolios whose tickets share at most three numbers pairwise.
export const TOP_TWO_PROBABILITY_PER_TICKET = 7 / LOTTO_OUTCOMES;

export function replacePortfolioC(portfolio: number[][], candidates: number[][]) {
  const compatible = (numbers: number[]) => portfolio.every((ticket, i) => i === 2 || numbers.filter(n => ticket.includes(n)).length <= 3);
  const replacement = candidates.find(compatible);
  if (!replacement) throw new Error('교차 전이 후보 100개에서 겹침 조건을 만족하는 조합이 없습니다.');
  return portfolio.map((ticket, index) => index === 2 ? replacement : ticket);
}

export function buildMixedPortfolio(base: number[][], seed: number, history: Draw[]) {
  const portfolio = [...base];
  const frequentNumbers = (window: number) => {
    const frequency = new Uint16Array(46);
    for (const draw of history.slice(-window)) {
      for (const number of draw.numbers) frequency[number]++;
    }
    return new Set(Array.from({length: 45}, (_, index) => index + 1)
      .sort((a, b) => frequency[b] - frequency[a] || a - b).slice(0, 15));
  };
  const compatible = (numbers: number[]) => portfolio.every(ticket => numbers.filter(n => ticket.includes(n)).length <= 3);
  const random = rng(seed ^ 0x6297af);
  const pick = (accept: (numbers: number[]) => boolean, sample = () => sampleSix(random)) => {
    for (let attempt = 0; attempt < 3000; attempt++) {
      const numbers = sample();
      if (accept(numbers) && compatible(numbers)) {
        portfolio.push(numbers);
        return numbers;
      }
    }
    throw new Error('겹침 조건을 만족하는 추천 조합을 찾지 못했습니다.');
  };
  pick(() => true);
  const frequent100 = frequentNumbers(100);
  pick(numbers => numbers.filter(n => frequent100.has(n)).length >= 3);
  const frequent50 = frequentNumbers(50);
  pick(numbers => numbers.filter(n => frequent50.has(n)).length >= 3);

  const patternRandom = rng(seed ^ 0x2738);
  const pairPattern = () => {
    const sample = sampleSix(patternRandom);
    return [27, 38, ...sample.filter(n => n !== 27 && n !== 38).slice(0, 4)].sort((a, b) => a - b);
  };
  pick(numbers => {
    const odd = numbers.filter(n => n % 2).length;
    const sum = numbers.reduce((total, n) => total + n, 0);
    return odd >= 2 && odd <= 4 && sum >= 110 && sum <= 165;
  }, pairPattern);

  const pairs = new Map<number, number>();
  for (const draw of history.slice(-100)) {
    const numbers = [...draw.numbers].sort((a, b) => a - b);
    numbers.forEach((a, index) => {
      for (const b of numbers.slice(index + 1)) {
        const key = a * 46 + b;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    });
  }
  const pairRandom = rng(seed ^ 0x4a235f);
  pick(numbers => numbers.some((a, index) =>
    numbers.slice(index + 1).some(b => (pairs.get(a * 46 + b) ?? 0) >= 5)
  ), () => sampleSix(pairRandom));
  // Build the other slots with their original inputs before replacing H.
  const previous = new Set(history.at(-1)!.numbers);
  const fixed = portfolio.filter((_, index) => index !== 7);
  const previousDrawRandom = rng(seed ^ 0x41628913);
  for (let attempt = 0; attempt < 10000; attempt++) {
    const numbers = sampleSix(previousDrawRandom);
    if (numbers.filter(n => previous.has(n)).length === 1 &&
        fixed.every(ticket => numbers.filter(n => ticket.includes(n)).length <= 3)) {
      portfolio[7] = numbers;
      const otherTickets = portfolio.filter((_, index) => index !== 5);
      const bandRandom = rng(seed ^ 0x30201009);
      for (let candidate = 0; candidate < 3000; candidate++) {
        const ticket = sampleSix(bandRandom);
        const bands = [0, 0, 0, 0, 0];
        for (const number of ticket) bands[Math.floor(number / 10)]++;
        if (bands.some(count => count >= 3) &&
            otherTickets.every(other => ticket.filter(n => other.includes(n)).length <= 3)) {
          portfolio[5] = ticket;
          const blend = randomBlendSampler(history, rng(seed ^ 0x4a4d4958));
          const fixedTickets = portfolio.slice(0, 9);
          for (let attempt = 0; attempt < 3000; attempt++) {
            const mixed = blend();
            if (fixedTickets.every(other => mixed.filter(n => other.includes(n)).length <= 3)) {
              portfolio[9] = mixed;
              return replaceWithDrawOrder(portfolio, seed);
            }
          }
          throw new Error('무작위 비율 혼합 조합을 찾지 못했습니다.');
        }
      }
      throw new Error('번호대 집중 조건에 맞는 조합을 찾지 못했습니다.');
    }
  }
  throw new Error('직전 본번호와 1개 겹치는 추천 조합을 찾지 못했습니다.');
}

function replaceWithDrawOrder(portfolio: number[][], seed: number): number[][] {
  const slot = MIXED_DISPLAY_ORDER[8];
  const fixed = portfolio.filter((_, index) => index !== slot);
  const random = rng(seed ^ 0x6297af);
  for (let attempt = 0; attempt < 3000; attempt++) {
    const numbers = new Set<number>();
    while (numbers.size < 6) numbers.add(1 + Math.floor(random() * 45));
    if (fixed.every(ticket => ticket.filter(number => numbers.has(number)).length <= 3)) {
      return portfolio.map((ticket, index) => index === slot ? [...numbers] : ticket);
    }
  }
  throw new Error('겹침 조건에 맞는 추첨 순서 조합을 찾지 못했습니다.');
}

export function buildLowOverlapPortfolio(seed: number): number[][] {
  const random = rng(seed ^ 0x41628913);
  const bag = Array.from({length: 45}, (_, index) => index + 1);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  const base = Array.from({length: 5}, (_, i) => bag.slice(i * 6, i * 6 + 6));
  const extra = base.map((numbers, i) => [
    ...bag.slice(30 + i * 3, 33 + i * 3),
    numbers[0], base[(i + 1) % 5][1], base[(i + 2) % 5][2],
  ]);
  return [...base, ...extra].map(numbers => [...numbers].sort((a, b) => a - b));
}
