import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {recommend,INTEGRATED_SOURCES,INTEGRATED_EVALUATORS} from '../src/core/recommend';
import {backtest} from '../src/core/backtest';
import {patternProfile,matchesPattern,consecutivePairs,consecutiveTarget} from '../src/core/pattern';
import type {Dataset} from '../src/core/data';
const {draws}=JSON.parse(await readFile('public/data/lotto.json','utf8')) as Dataset;

test('통합 추천은 기존 방식과 패턴 후보를 비교해 5·10게임을 중복 없이 재현한다',()=>{
  assert.equal(INTEGRATED_SOURCES.length,8);
  assert.ok(INTEGRATED_SOURCES.includes('random'));
  assert.ok(INTEGRATED_SOURCES.includes('pattern'));
  assert.ok(!INTEGRATED_EVALUATORS.includes('hot'));
  for(const count of [5,10]){
    const result=recommend(draws,'integrated',count,42);
    assert.deepEqual(result,recommend(draws,'integrated',count,42));
    assert.equal(result.length,count);
    assert.equal(result.filter(g=>consecutivePairs(g.numbers)>0).length,consecutiveTarget(patternProfile(draws),count));
    assert.equal(new Set(result.map(g=>g.numbers.join())).size,count);
    for(const g of result){
      assert.ok(matchesPattern(g.numbers,patternProfile(draws)));
      assert.ok(g.pattern?.overlap.length);
      assert.equal(new Set(g.numbers).size,6);
      assert.ok(g.numbers.every(n=>n>=1&&n<=45));
      assert.deepEqual(g.numbers,[...g.numbers].sort((a,b)=>a-b));
      assert.ok(g.sources?.length);
      assert.ok(g.sources!.every(s=>INTEGRATED_SOURCES.includes(s)));
    }
  }
  assert.throws(()=>recommend(draws,'integrated',1,42));
});

test('통합 백테스트도 대상 회차 번호 변경이 그 회차 추천에 영향이 없다',()=>{
  const subset=draws.slice(-35),changed=structuredClone(subset);
  changed.at(-1)!.numbers=[1,2,3,4,5,6];
  const a=backtest(subset,'integrated',42,5),b=backtest(changed,'integrated',42,5);
  assert.ok(a.rows.every(r=>r.trainingLast<r.round));
  assert.deepEqual(a.rows.at(-1)!.predicted,b.rows.at(-1)!.predicted);
});
