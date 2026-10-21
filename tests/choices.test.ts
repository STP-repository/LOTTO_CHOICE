import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHOICES, METHOD_DETAILS, combinationFacts } from '../src/core/choices';
import {FEATURE_WEIGHTS} from '../src/core/evidence';
import { MODES } from '../src/core/recommend';
test('구성 전용 네 조건은 메뉴에서 빼고 통합 분석 지표로 유지한다', () => {
  assert.deepEqual(CHOICES.map(c => c.mode), ['random','all','overdue']);
  for(const key of ['odd','ranges','consecutive','overlap'] as const)assert.ok(FEATURE_WEIGHTS[key]>0);
  assert.ok(!('endings' in MODES));
  assert.deepEqual(METHOD_DETAILS.map(c => c.mode).sort(), Object.keys(MODES).sort());
});
test('번호 설명은 홀짝·합계·끝 구간·연속 쌍을 정확히 계산하고 입력을 보존한다', () => {
  const ns = [45, 21, 11, 3, 2, 1];
  assert.deepEqual(combinationFacts(ns), ['홀수 5 · 짝수 1', '합계 83', '4개 구간에 분산', '연속번호 2쌍']);
  assert.deepEqual(ns, [45, 21, 11, 3, 2, 1]);
  assert.equal(combinationFacts([2, 12, 22, 32, 42, 44])[3], '연속번호 없음');
});
