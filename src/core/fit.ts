import type { Draw } from './data';
import { model, rng, score, type Mode } from './recommend';

export const FIT_SAMPLE_SIZE = 10_000;
export const FIT_REFERENCE_SEED = 6452026;

/** Uniform 6/45 reference combinations, independent of recommendation selection. */
export function referenceScores(draws: Draw[], mode: Mode, size = FIT_SAMPLE_SIZE): number[] {
  if (mode === 'random' || !draws.length) return [];
  const m = model(draws), random = rng(FIT_REFERENCE_SEED), scores: number[] = [];
  for (let i = 0; i < size; i++) {
    const pool = Array.from({ length: 45 }, (_, n) => n + 1);
    for (let j = 0; j < 6; j++) {
      const k = j + Math.floor(random() * (45 - j));
      [pool[j], pool[k]] = [pool[k], pool[j]];
    }
    scores.push(score(pool.slice(0, 6), m, mode)!);
  }
  return scores.sort((a, b) => a - b);
}

/** Estimated upper-tail share including ties; add-one smoothing avoids a 0% claim. */
export function upperTailPercent(value: number | null, sortedScores: number[]): number | null {
  if (value === null || !Number.isFinite(value) || !sortedScores.length) return null;
  let lo = 0, hi = sortedScores.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedScores[mid] < value - 1e-9) lo = mid + 1;
    else hi = mid;
  }
  return (sortedScores.length - lo + 1) / (sortedScores.length + 1) * 100;
}

export function fitLabel(value: number | null, reference: number[]): string {
  const percent = upperTailPercent(value, reference);
  return percent === null ? '균등 무작위 · 적합도 평가 없음' : `통계 적합도 · 상위 약 ${(Math.ceil(percent * 10) / 10).toFixed(1)}%`;
}
