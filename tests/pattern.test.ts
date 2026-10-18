import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {recommend} from '../src/core/recommend';
import {patternProfile} from '../src/core/pattern';
import {backtest} from '../src/core/backtest';
import type {Dataset} from '../src/core/data';
const {draws}=JSON.parse(await readFile('public/data/lotto.json','utf8')) as Dataset;

test('패턴 참고 추천은 고유 번호와 재현성을 보장한다',()=>{
  const profile=patternProfile(draws);
  for(const count of [1,5,10])for(const seed of [42,645,20261018]){
    const result=recommend(draws,'pattern',count,seed);
    for(const g of result){
      assert.equal(new Set(g.numbers).size,6);
      assert.ok(g.numbers.every(n=>n>=1&&n<=45));

      assert.deepEqual(g.pattern!.overlap,g.numbers.filter(n=>profile.last.numbers.includes(n)));
      assert.equal(g.pattern!.referenceRound,profile.last.round);
    }

    assert.equal(new Set(result.map(g=>g.numbers.join())).size,count);
    assert.deepEqual(result,recommend(draws,'pattern',count,seed));
  }
});

test('패턴 백테스트는 미래 번호를 보지 않는다',()=>{
  const subset=draws.slice(-35),changed=structuredClone(subset);changed.at(-1)!.numbers=[1,2,3,4,5,6];
  const a=backtest(subset,'pattern',42,5),b=backtest(changed,'pattern',42,5);
  assert.deepEqual(a.rows.at(-1)!.predicted,b.rows.at(-1)!.predicted);
  assert.ok(a.rows.every(r=>r.trainingLast<r.round));
});

