import { recent15, type Draw } from './data';

export const PATTERN_SUM_TOLERANCE = 20;
export function consecutivePairs(ns: number[]) {
  const sorted = [...ns].sort((a, b) => a - b);
  return sorted.slice(1).filter((n, i) => n === sorted[i] + 1).length;
}
export function patternProfile(input: Draw[]) {
  if (!input.length) throw new Error('패턴 추천에 사용할 기록이 없습니다.');
  const sorted = [...input].sort((a, b) => a.round - b.round);
  const draws = recent15(sorted, new Date(`${sorted.at(-1)!.date}T12:00:00+09:00`));
  const last = draws.at(-1)!;
  const meanSum = draws.reduce((s, d) => s + d.numbers.reduce((a, b) => a + b, 0), 0) / draws.length;
  const sumMin = Math.ceil(meanSum - PATTERN_SUM_TOLERANCE), sumMax = Math.floor(meanSum + PATTERN_SUM_TOLERANCE);
  const odd = Array<number>(7).fill(0), consecutive = Array<number>(6).fill(0), overlaps = Array<number>(7).fill(0);
  let matchingHistory = 0;
  draws.forEach((d, i) => {
    const o = d.numbers.filter(n => n % 2).length, c = consecutivePairs(d.numbers);
    const sum = d.numbers.reduce((a, b) => a + b, 0);
    odd[o]++; consecutive[c]++;
    if (i) {
      const overlap = d.numbers.filter(n => draws[i - 1].numbers.includes(n)).length;
      overlaps[overlap]++;
      if (o >= 2 && o <= 4 && c >= 1 && overlap >= 1 && sum >= sumMin && sum <= sumMax) matchingHistory++;
    }
  });
  return { draws, last, meanSum, sumMin, sumMax, odd, consecutive, overlaps, matchingHistory, comparisonCount: Math.max(0, draws.length - 1) };
}
export function matchesPattern(ns: number[], profile: ReturnType<typeof patternProfile>) {
  const odd = ns.filter(n => n % 2).length, sum = ns.reduce((a, b) => a + b, 0);
  return odd >= 2 && odd <= 4 && sum >= profile.sumMin && sum <= profile.sumMax && consecutivePairs(ns) >= 1 && ns.some(n => profile.last.numbers.includes(n));
}
export function selectPatternNumbers(profile: ReturnType<typeof patternProfile>, count: number, random: () => number) {
  const candidates: { numbers: number[]; rating: number }[] = [], seen = new Set<string>();
  for (let attempt = 0; attempt < 50_000 && candidates.length < count * 30; attempt++) {
    const pool = Array.from({ length: 45 }, (_, i) => i + 1);
    for (let j = 0; j < 6; j++) { const k = j + Math.floor(random() * (45 - j)); [pool[j], pool[k]] = [pool[k], pool[j]]; }
    const ns = pool.slice(0, 6).sort((a, b) => a - b), key = ns.join(',');
    if (seen.has(key) || !matchesPattern(ns, profile)) continue;
    seen.add(key);
    const odd = ns.filter(n => n % 2).length, c = consecutivePairs(ns), overlap = ns.filter(n => profile.last.numbers.includes(n)).length;
    const sumCloseness = 1 - Math.abs(ns.reduce((a, b) => a + b, 0) - profile.meanSum) / PATTERN_SUM_TOLERANCE;
    const rating = (profile.odd[odd] / Math.max(1, ...profile.odd) + profile.consecutive[c] / Math.max(1, ...profile.consecutive) + profile.overlaps[overlap] / Math.max(1, ...profile.overlaps) + sumCloseness) / 4;
    candidates.push({ numbers: ns, rating });
  }
  if (candidates.length < count) throw new Error('패턴 조건에 맞는 고유 조합이 부족합니다. 조건을 완화하지 않고 중단했습니다.');
  const result: { numbers: number[]; rating: number }[] = [];
  while (result.length < count) {
    let best = 0, bestValue = -Infinity;
    candidates.forEach((c, i) => {
      const overlap = Math.max(0, ...result.map(g => g.numbers.filter(n => c.numbers.includes(n)).length));
      const value = c.rating - .08 * overlap / 6;
      if (value > bestValue) { best = i; bestValue = value; }
    });
    result.push(candidates.splice(best, 1)[0]);
  }
  return result;
}
