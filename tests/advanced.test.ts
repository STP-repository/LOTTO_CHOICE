import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {collectFullHistory,OFFICIAL,type Dataset} from '../src/core/data';
import {advancedGenerate,analysisSplit,BASE_WEIGHTS,FACTORS,normalizeWeights,numberAnalysis,overlap,shape} from '../src/core/advanced-model';
import {comparison,evaluateRound,initialModels,deriveCandidate,chooseOnValidation} from '../src/core/advanced-validation';
const raw=JSON.parse(await readFile('public/data/full-history.json','utf8')) as Dataset;
// Stable historical fixture: future weekly data refreshes must not change these checks.
const data={...raw,draws:raw.draws.filter(d=>d.date<='2026-10-21')};
const now=new Date('2026-10-21T12:00:00+09:00');

test('추가 분석: 전체 이력과 달력 기준 10/3/2년을 누락·중복 없이 분리한다',()=>{
  const s=analysisSplit(data.draws,now);assert.equal(s.all[0].round,1);assert.equal(s.start,'2011-10-21');assert.equal(s.validationStart,'2021-10-21');assert.equal(s.testStart,'2024-10-21');assert.equal(s.complete,true);
  assert.equal(s.training.length+s.validation.length+s.test.length,s.recent.length);
  assert.ok(s.training.at(-1)!.round<s.validation[0].round);assert.ok(s.validation.at(-1)!.round<s.test[0].round);
  assert.equal(analysisSplit(data.draws.slice(-200),now).complete,false);
});
test('추가 분석: AC·고저·끝수·간격·보너스 제외·베타 사전분포를 직접 검산한다',()=>{
  const s=shape([1,2,3,4,5,6],[1,8,10,20,30,40]);assert.equal(s.ac,0);assert.equal(s.low,6);assert.equal(s.consecutive,5);assert.equal(s.sum,21);assert.equal(s.gapMean,1);assert.equal(s.overlap,1);assert.equal(shape([1,11,21,31,41,45]).endings,10);
  const rows=[{round:1,date:'2002-12-07',numbers:[1,2,3,4,5,6],bonus:7},{round:2,date:'2002-12-14',numbers:[1,8,9,10,11,12],bonus:7}];
  const profile=numberAnalysis(rows),one=profile[0],seven=profile[6];assert.equal(one.count,2);assert.equal(one.posterior[0].mean,6/32);assert.deepEqual(one.transitions[0].counts,[0,0,0,1]);assert.equal(one.transitions[0].p11,5/31);assert.equal(one.gapMean,1);assert.equal(seven.count,0);assert.equal(seven.absent,2);assert.equal(seven.posterior[0].mean,4/32);assert.ok(Math.abs(one.walk-(2-2*6/45))<1e-12);
});
test('추가 분석: 가중치 합계는 정확히 10000bp이며 기본값과 모든 항목을 유지한다',()=>{
  assert.deepEqual(FACTORS.map(k=>BASE_WEIGHTS[k]),[15,10,10,10,10,10,10,5,10,10]);
  for(const model of initialModels()){assert.equal(FACTORS.reduce((s,k)=>s+Math.round(model.weights[k]*100),0),10000);assert.ok(FACTORS.every(k=>model.weights[k]>0));}
  assert.throws(()=>normalizeWeights({...BASE_WEIGHTS,frequency:-1}));
});
test('추가 분석: 실제 후보 수·5조합·게임 간 겹침·점수 산식·시드 재현성을 검증한다',()=>{
  const first=advancedGenerate(data.draws,2000,42),second=advancedGenerate(data.draws,2000,42);
  assert.deepEqual(first,second);assert.equal(first.simulation.unique,2000);assert.equal(first.simulation.uniform.count,1000);assert.equal(first.simulation.weighted.count,1000);assert.equal(first.games.length,5);
  first.games.forEach((g,i)=>{assert.equal(new Set(g.numbers).size,6);assert.deepEqual(g.numbers,[...g.numbers].sort((a,b)=>a-b));assert.ok(g.numbers.every(n=>n>=1&&n<=45));assert.ok(g.score>=0&&g.score<=100);assert.ok(first.games.slice(i+1).every(h=>overlap(g.numbers,h.numbers)<=3));const score=FACTORS.reduce((s,k)=>s+g.features[k]*BASE_WEIGHTS[k]/100,0)-g.penalty;assert.ok(Math.abs(g.score-Math.max(0,score))<1e-9);});
  assert.ok(first.simulation.restored<=first.simulation.flagged);
});
test('추가 분석: 대상·미래 번호 변경은 해당 회차 예측과 점수에 영향을 주지 않는다',()=>{
  const target=data.draws.at(-2)!,models=initialModels().slice(0,2),before=evaluateRound(data.draws,target,models,100,42,'validation');
  const changed=structuredClone(data.draws);changed.at(-2)!.numbers=[1,2,3,4,5,6];changed.at(-1)!.numbers=[7,8,9,10,11,12];
  const after=evaluateRound(changed,changed.at(-2)!,models,100,42,'validation');
  assert.ok(before.historyLast<target.round);assert.deepEqual(before.models.base.games,after.models.base.games);assert.deepEqual(before.models.equal.games,after.models.equal.games);assert.deepEqual(before.baseline,after.baseline);
});
test('추가 분석: 동일 성능은 기본 가중치를 유지하고 신뢰구간·보정 p를 꾸미지 않는다',()=>{
  const c=comparison(Array(104).fill(.8),Array(104).fill(.8),42,32);assert.equal(c.difference,0);assert.equal(c.p,1);assert.equal(c.adjustedP,1);assert.deepEqual(c.ci,[0,0]);
  const models=initialModels();const target=data.draws.at(-1)!,r=evaluateRound(data.draws,target,models,100,42,'training');
  for(const m of Object.values(r.models))m.matches=[1,1,1,1,1];r.baselineMatches=[1,1,1,1,1];
  const rows=Array.from({length:104},()=>structuredClone(r));const derived=deriveCandidate(models,rows);assert.deepEqual(derived.model.weights,BASE_WEIGHTS);
  assert.equal(chooseOnValidation(models,rows,rows,42).selectedId,'base');
});
test('전체 이력 수집기는 공식 응답을 검증하고 첫 회차 누락을 거부한다',async()=>{
  const raw={data:{list:data.draws.map(d=>({ltEpsd:d.round,ltRflYmd:d.date.replaceAll('-',''),...Object.fromEntries(d.numbers.map((n,i)=>[`tm${i+1}WnNo`,n])),bnsWnNo:d.bonus}))}};
  const d=await collectFullHistory(now,async url=>{assert.equal(url,OFFICIAL);return raw;});assert.equal(d.verified,true);assert.equal(d.draws[0].round,1);
  await assert.rejects(collectFullHistory(now,async()=>({data:{list:raw.data.list.slice(1)}})));
});
