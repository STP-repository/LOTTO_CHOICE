import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {recommend} from '../src/core/recommend';
import {patternProfile,matchesPattern,consecutivePairs} from '../src/core/pattern';
import {backtest} from '../src/core/backtest';
import type {Dataset} from '../src/core/data';
const {draws}=JSON.parse(await readFile('public/data/lotto.json','utf8')) as Dataset;

test('패턴 추천의 모든 게임이 첨부된 네 조건을 동시에 충족한다',()=>{
  const profile=patternProfile(draws);
  for(const count of [1,5,10])for(const seed of [42,645,20261018]){
    const result=recommend(draws,'pattern',count,seed);
    for(const g of result){
      assert.ok(matchesPattern(g.numbers,profile));
      const odd=g.numbers.filter(n=>n%2).length,sum=g.numbers.reduce((a,b)=>a+b,0);
      assert.ok(odd>=2&&odd<=4);
      assert.ok(consecutivePairs(g.numbers)>=1);
      assert.ok(g.numbers.some(n=>profile.last.numbers.includes(n)));
      assert.ok(Math.abs(sum-profile.meanSum)<=20);
      assert.deepEqual(g.pattern!.overlap,g.numbers.filter(n=>profile.last.numbers.includes(n)));
      assert.equal(g.pattern!.referenceRound,profile.last.round);
    }
    assert.equal(new Set(result.map(g=>g.numbers.join())).size,count);
    assert.deepEqual(result,recommend(draws,'pattern',count,seed));
  }
});

test('패턴 동시 충족 집계는 실제 직전 회차를 비교하며 백테스트는 미래를 보지 않는다',()=>{
  const profile=patternProfile(draws);
  let manual=0;
  for(let i=1;i<profile.draws.length;i++){
    const row=profile.draws[i],ns=row.numbers,odd=ns.filter(n=>n%2).length,sum=ns.reduce((a,b)=>a+b,0);
    if(odd>=2&&odd<=4&&sum>=profile.sumMin&&sum<=profile.sumMax&&consecutivePairs(ns)>=1&&ns.some(n=>profile.draws[i-1].numbers.includes(n)))manual++;
  }
  assert.equal(profile.matchingHistory,manual);
  const subset=draws.slice(-35),changed=structuredClone(subset);changed.at(-1)!.numbers=[1,2,3,4,5,6];
  const a=backtest(subset,'pattern',42,5),b=backtest(changed,'pattern',42,5);
  assert.deepEqual(a.rows.at(-1)!.predicted,b.rows.at(-1)!.predicted);
  assert.ok(a.rows.every(r=>r.trainingLast<r.round));
});
