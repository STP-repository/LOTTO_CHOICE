import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fitLabel, referenceScores, upperTailPercent, FIT_SAMPLE_SIZE } from '../src/core/fit';
import { recommend } from '../src/core/recommend';
import type { Dataset } from '../src/core/data';
const { draws } = JSON.parse(await readFile('public/data/lotto.json', 'utf8')) as Dataset;

test('상위 비율은 동점을 포함하고 점수가 높을수록 낮아진다', () => {
  assert.equal(upperTailPercent(1, [1, 2, 2, 3]), 100);
  assert.equal(upperTailPercent(2, [1, 2, 2, 3]), 80);
  assert.equal(upperTailPercent(3, [1, 2, 2, 3]), 40);
  assert.equal(upperTailPercent(5, [5, 5, 5]), 100);
  assert.equal(upperTailPercent(null, [1]), null);
  assert.equal(upperTailPercent(2, []), null);
});

test('독립 무작위 비교 표본은 재현되고 추천 번호와 내부 점수는 바꾸지 않는다', () => {
  const before = recommend(draws, 'composite', 5, 42);
  const ref = referenceScores(draws, 'composite');
  assert.equal(ref.length, FIT_SAMPLE_SIZE);
  assert.deepEqual(ref, referenceScores(draws, 'composite'));
  assert.deepEqual(before, recommend(draws, 'composite', 5, 42));
  assert.ok(ref.every((n, i) => Number.isFinite(n) && (!i || n >= ref[i - 1])));
  const labels = before.map(g => fitLabel(g.score, ref));
  assert.ok(labels.every(l => l.startsWith('통계 적합도 · 상위 약 ')));
  assert.match(fitLabel(101, ref), /0\.1%/);
  assert.equal(fitLabel(null, []), '균등 무작위 · 적합도 평가 없음');
  assert.deepEqual(referenceScores(draws, 'random'), []);
});
