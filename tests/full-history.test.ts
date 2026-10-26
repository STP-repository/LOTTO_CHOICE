import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advancedGenerate,prepareCandidates,BASE_WEIGHTS,dataSignature,roundSeed,overlap} from '../src/core/advanced-model';
import {validateSnapshot,precomputedRecommendations,invalidatePrecomputed} from '../src/services/precomputed';
import {compressCandidates} from '../src/core/combination-groups';
import theory from '../src/core/theory-distributions.json';
import {validateAdvanced} from '../src/core/advanced-validation';
const raw=JSON.parse(readFileSync('public/data/full-history.json','utf8'));
const draws=raw.draws;
test('기존 5조합의 역할·산식·번호는 같은 입력과 시드에서 변경 전 결과와 일치한다',()=>{
 const old=JSON.parse(readFileSync('tests/fixtures/legacy-five.json','utf8'));
 const result=advancedGenerate(draws.filter((d:any)=>d.round<=old.last),2000,old.seed,BASE_WEIGHTS,undefined,{diagnostics:false});
 assert.deepEqual(result.games,old.games);
});
test('전체 이력 스냅샷은 날짜가 지나도 서명이 같고 5·10·15 기본·압축 조합이 유효하다',()=>{
 const saved=JSON.parse(readFileSync('public/data/advanced-2000.json','utf8'));
 for(const path of ['standard','compressed'] as const)for(const count of [5,10,15]){
  const result=saved.sets[`${path}-${count}`];validateSnapshot(raw,saved,result,count,path);
  assert.equal(result.games.length,count);assert.equal(new Set(result.games.map((g:any)=>g.numbers.join())).size,count);
  assert.ok(result.games.every((g:any,i:number)=>result.games.slice(i+1).every((h:any)=>overlap(g.numbers,h.numbers)<=3)));
 }
 const broken=structuredClone(saved.sets['standard-5']);broken.snapshot.targetRound++;assert.throws(()=>validateSnapshot(raw,saved,broken,5,'standard'));
 assert.throws(()=>validateSnapshot({...raw,draws:draws.slice(0,-1)},saved,saved.sets['standard-5'],5,'standard'));
 const modified=structuredClone(saved.sets['standard-5']);modified.weights.markov++;assert.throws(()=>validateSnapshot(raw,saved,modified,5,'standard'));
 assert.equal(saved.signature,dataSignature(draws));assert.notEqual(roundSeed(draws),roundSeed(draws.slice(0,-1)));
});
test('전체 이론 분포 8개 항목은 각각 모든 8145060 조합을 집계한다',()=>{
 assert.equal(Object.keys(theory.hist).length,8);for(const h of Object.values(theory.hist))assert.equal(Object.values(h).reduce((s,n)=>s+n,0),8145060);
 assert.equal((theory.hist as any).odd['0'],74613); // C(22,6)
});
test('압축과 복구는 기록되며 유효성 위반 조합은 복구할 수 없다',()=>{
 const p=prepareCandidates(draws,2000,42);p.candidates.push({...p.candidates[0],numbers:[1,1,2,3,4,5],flagged:true,restored:true});
 const filtered=compressCandidates(p,BASE_WEIGHTS,15);assert.equal(filtered.diagnostics.invalid,1);assert.ok(filtered.diagnostics.safetyExcluded>0);
 assert.ok(filtered.diagnostics.records.some(r=>r.reason==='번호 유효성 위반'&&!r.restored));assert.ok(!filtered.candidates.some(c=>new Set(c.numbers).size!==6));
 assert.equal(filtered.diagnostics.afterRecovery-filtered.diagnostics.afterCompression,filtered.diagnostics.compressionExcluded);
});
test('일반 고급 백테스트는 설정을 고정하고 5·10·15조합과 무작위를 같은 수로 평가한다',()=>{
 for(const count of [5,10,15]){
  const report=validateAdvanced(draws,2000,42,new Date(),undefined,{count,rounds:2});
  assert.equal(report.base.games,count*2);assert.equal(report.random.games,count*2);assert.equal(report.tuned,false);assert.deepEqual(report.weights,BASE_WEIGHTS);
  const changed=structuredClone(draws);changed.at(-1).numbers=[1,2,3,4,5,6];
  const after=validateAdvanced(changed,2000,42,new Date(),undefined,{count,rounds:1});assert.deepEqual(report.rows.at(-1)!.models.base.games,after.rows.at(-1)!.models.base.games);
 }
});
test('사전 순위는 매 요청 최신 파일을 확인하고 갱신 도중의 응답은 거부한다',async()=>{
 const original=globalThis.fetch;const saved=JSON.parse(readFileSync('public/data/ranked-results.json','utf8'));let calls=0;
 try{
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify(saved));};
  assert.equal((await precomputedRecommendations(draws,'all',15)).length,15);await precomputedRecommendations(draws,'all',5);assert.equal(calls,2);
  globalThis.fetch=async()=>{invalidatePrecomputed();return new Response(JSON.stringify(saved));};
  await assert.rejects(precomputedRecommendations(draws,'all',5),/갱신/);
 }finally{globalThis.fetch=original;}
});
