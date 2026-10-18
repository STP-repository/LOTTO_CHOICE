import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evidenceModel,evaluateEvidence,FEATURE_WEIGHTS} from '../src/core/evidence';
import type {Draw} from '../src/core/data';
const draws:Draw[]=[{round:1,date:'2026-01-03',numbers:[1,2,3,4,5,6],bonus:7},{round:2,date:'2026-01-10',numbers:[1,2,10,20,30,40],bonus:7}];
test('합계가 제외된 9개 근거 지표는 고정 기록에서 빈도·끝자리·번호 쌍·미출현을 정확히 계산한다',()=>{
 const m=evidenceModel(draws),e=evaluateEvidence([1,2,10,20,30,40],m);
 assert.equal(m.pairs.get('1,2'),2);assert.equal(m.endings[0],4);assert.equal(m.gap[3],1);assert.equal(m.counts[1],2);
 assert.equal(Object.keys(FEATURE_WEIGHTS).length,9);assert.ok(!('sum' in e.values));assert.ok(!('sum' in FEATURE_WEIGHTS));assert.equal(m.hist[3].get('2'),1);
 assert.equal(e.values.pairs,(2+14)/15/2);assert.equal(e.values.endings,(2+2+4*4)/6/4);
 assert.ok(Math.abs(Object.values(FEATURE_WEIGHTS).reduce((a,b)=>a+b,0)-1)<1e-10);
 assert.ok(Object.values(e.values).every(v=>Number.isFinite(v)&&v>=0&&v<=1));assert.equal(e.reasons.length,6);
 assert.ok(e.reasons.some(s=>s.includes('1·2번 2회')));
 const changed=structuredClone(draws);changed[1].numbers=[6,7,8,9,10,11];
 assert.notDeepEqual(evaluateEvidence([1,2,10,20,30,40],evidenceModel(changed)).values,e.values);
 assert.deepEqual(e,evaluateEvidence([1,2,10,20,30,40],m));
});

test('합계 관련 메타데이터를 바꿔도 평가값은 변하지 않는다',()=>{const m=evidenceModel(draws),ns=[1,2,10,20,30,40],before=evaluateEvidence(ns,m);Object.assign(m,{meanSum:999,sumMin:1,sumMax:1});assert.deepEqual(evaluateEvidence(ns,m),before);});

test('통합 비중은 번호 기록 80%·조합 구성 20%이고 보조 네 항목은 각각 5%이다',()=>{assert.ok(Math.abs(FEATURE_WEIGHTS.frequency+FEATURE_WEIGHTS.recent+FEATURE_WEIGHTS.overdue+FEATURE_WEIGHTS.endings+FEATURE_WEIGHTS.pairs-.8)<1e-12);for(const key of ['odd','ranges','consecutive','overlap'] as const)assert.equal(FEATURE_WEIGHTS[key],.05);assert.ok(!('sum' in FEATURE_WEIGHTS));});
