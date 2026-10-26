import { type Draw } from './data';

export function consecutivePairs(ns: number[]) {
  const sorted = [...ns].sort((a, b) => a - b);
  return sorted.slice(1).filter((n, i) => n === sorted[i] + 1).length;
}
export function patternProfile(input: Draw[]) {
  if (!input.length) throw new Error('패턴 추천에 사용할 기록이 없습니다.');
  const sorted = [...input].sort((a, b) => a.round - b.round);
  const draws = sorted;
  const last = draws.at(-1)!;


  const odd = Array<number>(7).fill(0), consecutive = Array<number>(6).fill(0), overlaps = Array<number>(7).fill(0);

  draws.forEach((d, i) => {
    const o = d.numbers.filter(n => n % 2).length, c = consecutivePairs(d.numbers);

    odd[o]++; consecutive[c]++;
    if (i) {
      const overlap = d.numbers.filter(n => draws[i - 1].numbers.includes(n)).length;
      overlaps[overlap]++;

    }
  });
  return { draws, last, odd, consecutive, overlaps };
}
/** Positive weighted sampling keeps every candidate eligible; scores are preferences only. */
export function weightedIndex(weights: number[], random: () => number) {
  let pick = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) { pick -= weights[i]; if (pick < 0) return i; }
  return weights.length - 1;
}
export function selectPatternNumbers(profile: ReturnType<typeof patternProfile>, count: number, random: () => number) {
  const candidates: { numbers: number[]; rating: number }[] = [], seen = new Set<string>();
  for (let attempt = 0; attempt < 50_000 && candidates.length < count * 30; attempt++) {
    const pool = Array.from({ length: 45 }, (_, i) => i + 1);
    for (let j = 0; j < 6; j++) { const k = j + Math.floor(random() * (45 - j)); [pool[j], pool[k]] = [pool[k], pool[j]]; }
    const ns = pool.slice(0, 6).sort((a, b) => a - b), key = ns.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const odd = ns.filter(n => n % 2).length, c = consecutivePairs(ns), overlap = ns.filter(n => profile.last.numbers.includes(n)).length;
    const history = (profile.odd[odd] / Math.max(1, ...profile.odd) + profile.consecutive[c] / Math.max(1, ...profile.consecutive) + profile.overlaps[overlap] / Math.max(1, ...profile.overlaps)) / 3;
    const rating = history;
    candidates.push({ numbers: ns, rating });
  }
  if (candidates.length < count) throw new Error('고유 후보 조합이 부족합니다.');
  const result: { numbers: number[]; rating: number }[] = [];
  while (result.length < count) {
    const weights = candidates.map(c => {
      const overlap = Math.max(0, ...result.map(g => g.numbers.filter(n => c.numbers.includes(n)).length));
      return .5 + c.rating - .08 * overlap / 6;
    });
    result.push(candidates.splice(weightedIndex(weights, random), 1)[0]);
  }
  return result;
}
