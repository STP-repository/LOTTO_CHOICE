import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {recommend} from '../src/core/recommend';import {backtest} from '../src/core/backtest';import {evidenceModel,evaluateEvidence} from '../src/core/evidence';import {rankAllCombinations,compareRank,TOTAL_COMBINATIONS} from '../src/core/ranking';import type {Dataset} from '../src/core/data';
const {draws}=JSON.parse(await readFile('public/data/lotto.json','utf8')) as Dataset;
test('전수 검색 결과는 별도의 소규모 전체 조합 계산과 일치한다',()=>{
 const m=evidenceModel(draws),manual=[] as {numbers:number[];rating:number}[];
 function visit(ns:number[],next:number){if(ns.length===6){manual.push({numbers:ns,rating:evaluateEvidence(ns,m).rating});return;}for(let n=next;n<=10;n++)visit([...ns,n],n+1);}
 visit([],1);manual.sort(compareRank);const actual=rankAllCombinations(m,10,10);
 assert.equal(actual.checked,210);assert.equal(actual.total,210);
 assert.deepEqual(actual.top.map(g=>g.numbers),manual.slice(0,10).map(g=>g.numbers));
 actual.top.forEach((g,i)=>assert.ok(Math.abs(g.rating-manual[i].rating)<1e-12));
});
test('통합 추천은 전체 조합의 상위 순위이며 시드·게임 수·반환값 변경에 영향을 받지 않는다',()=>{
 const a=recommend(draws,'integrated',10,42),b=recommend(draws,'integrated',5,999);
 assert.deepEqual(a.slice(0,5),b);assert.deepEqual(a,recommend(draws,'integrated',10,645));
 assert.equal(new Set(a.map(g=>g.numbers.join())).size,10);
 for(let i=0;i<a.length;i++){assert.equal(a[i].rank,i+1);assert.ok(a[i].reasons?.length);if(i)assert.ok(a[i-1].score!>=a[i].score!-1e-10);}
 b[0].numbers[0]=999;assert.deepEqual(a.slice(0,5),recommend(draws,'integrated',5,0));
 const m=evidenceModel(draws),full=rankAllCombinations(m);assert.equal(full.checked,TOTAL_COMBINATIONS);assert.equal(full.total,TOTAL_COMBINATIONS);
 assert.deepEqual(a.map(g=>g.numbers),full.top.map(g=>g.numbers));
 assert.throws(()=>recommend(draws,'integrated',1,42));
});
test('통합 백테스트에서 대상 당첨번호를 바꿔도 해당 회차 추천은 바뀌지 않는다',()=>{
 const subset=draws.slice(-31),changed=structuredClone(subset);changed.at(-1)!.numbers=[1,2,3,4,5,6];
 const a=backtest(subset,'integrated',42,5),b=backtest(changed,'integrated',999,5);
 assert.ok(a.rows.every(r=>r.trainingLast<r.round));assert.deepEqual(a.rows.at(-1)!.predicted,b.rows.at(-1)!.predicted);
});
