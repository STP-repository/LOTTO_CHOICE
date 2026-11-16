import {BASE_WEIGHTS, FACTORS, overlap, prepareCandidates, type Factor, type Weights} from './advanced-model';
import {candidateScore, compressCandidates, groupKeys, groupReport, type GroupKey} from './combination-groups';
import type {Draw} from './data';

const factorByGroup: Record<GroupKey, Factor> = {
  odd: 'balance', low: 'balance', sum: 'sum', consecutive: 'patterns', ranges: 'ranges',
  ac: 'spacing', endings: 'patterns', spacing: 'spacing',
};

export function generateAdaptiveFive(history: Draw[], seed: number) {
  if (history.length < 100) throw Error('최소 100회 확정 이력이 필요합니다.');
  const prepared = prepareCandidates(history, 2000, seed);
  const groups = groupReport([], prepared.model.shapes, BASE_WEIGHTS);
  const effects = new Map<string, number>();
  const strength = {...BASE_WEIGHTS};
  for (const factor of FACTORS) strength[factor] = 0;
  const observations = {...strength};

  for (const group of groups) {
    const expected = group.theoretical;
    if (!expected) continue;
    const difference = group.historical - expected;
    const squared = difference ** 2;
    const variance = expected * (1 - expected) / history.length;
    const effect = difference === 0 ? 0 : difference * squared / (squared + variance);
    const factor = factorByGroup[group.factor];
    effects.set(group.factor + ':' + group.group, effect);
    strength[factor] += Math.abs(effect);
    observations[factor]++;
  }

  const weights = {...BASE_WEIGHTS};
  for (const factor of FACTORS) weights[factor] *= 1 + strength[factor] / Math.max(1, observations[factor]);
  const sum = FACTORS.reduce((total, factor) => total + weights[factor], 0);
  for (const factor of FACTORS) weights[factor] *= 100 / sum;

  const ranked = prepared.candidates.map(candidate => {
    const offsets = new Map<Factor, number>();
    let groupScore = 0;
    for (const [key, value] of Object.entries(groupKeys(candidate.shape))) {
      const effect = effects.get(key + ':' + value) ?? 0;
      const factor = factorByGroup[key as GroupKey];
      offsets.set(factor, (offsets.get(factor) ?? 0) + effect);
      groupScore += effect;
    }
    const features = candidate.features.map((value, i) =>
      Math.max(0, Math.min(100, value + 100 * (offsets.get(FACTORS[i]) ?? 0))));
    return {candidate, features, groupScore};
  });
  const flaggedCount = prepared.simulation.flagged;
  const flagged = new Set([...ranked].sort((a, b) =>
    a.groupScore - b.groupScore || Number(b.candidate.flagged) - Number(a.candidate.flagged)
  ).slice(0, flaggedCount));
  const candidates = ranked.map(item => {
    const excluded = flagged.has(item);
    const restored = excluded && item.candidate.restored;
    return {...item.candidate, features: item.features, flagged: excluded, restored, penalty: excluded && !restored ? 5 : 0};
  });
  const compressed = compressCandidates({...prepared, candidates}, weights as Weights, 5);
  const selected: number[][] = [];
  const styles = new Set<string>();
  const style = (candidate: typeof candidates[number]) => candidate.shape.odd + ':' + candidate.shape.ranges;
  while (selected.length < 5) {
    const compatible = compressed.candidates.filter(candidate => selected.every(ticket => overlap(ticket, candidate.numbers) <= 3));
    const varied = compatible.filter(candidate => !styles.has(style(candidate)));
    let best: typeof candidates[number] | undefined;
    let highest = -Infinity;
    for (const candidate of varied.length ? varied : compatible) {
      const shared = Math.max(0, ...selected.map(ticket => overlap(ticket, candidate.numbers)));
      const score = candidateScore({...candidate, features: [...candidate.features.slice(0, 9), 100 * (1 - shared / 6)]}, weights);
      if (score > highest) { highest = score; best = candidate; }
    }
    if (!best) throw Error('겹침 제한을 만족하는 자동 조정 후보가 부족합니다.');
    selected.push(best.numbers);
    styles.add(style(best));
  }
  return {tickets: selected, weights, excluded: flaggedCount, restored: compressed.diagnostics.restored};
}
