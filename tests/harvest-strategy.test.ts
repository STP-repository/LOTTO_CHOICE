import test from 'node:test';import assert from 'node:assert/strict';
import catalog from '../src/core/harvest-strategy-catalog.json';
import {settleHarvest,strategyPolicy} from '../src/core/harvest-strategy';
import {generateHarvest,verifyHarvest,initialHarvest,placeToken,harvestTick,hashSeed,HARVEST_VERSION} from '../src/core/puzzles';
test('100개 이상의 다른 도안은 실제 규칙으로 끝까지 해결되고 수량이 정확하다',()=>{
 assert.ok(catalog.length>=100);assert.ok(new Set(catalog.map(p=>p.cells.join(','))).size>=100);
 for(const p of catalog){assert.ok(verifyHarvest(p,p.solution),p.theme);assert.equal(p.tokens.reduce((s,t)=>s+t.remaining,0),p.cells.filter(c=>c>=0).length);assert.ok(p.failures>=3);}
});
test('빠른 탐색기의 차단·수량·슬롯 결과가 실제 틱 엔진과 같다',()=>{
 for(const p of catalog.slice(0,16)){let slow=initialHarvest(p),fast=initialHarvest(p);for(const id of p.solution){slow=placeToken(p,slow,id)!;fast=placeToken(p,fast,id)!;for(let guard=0;guard<=p.cells.length;guard++){const next=harvestTick(p,slow);if(next===slow)break;slow=next;if(slow.phase!=='playing')break;}fast=settleHarvest(p,fast);assert.deepEqual(fast.cells,slow.cells);assert.deepEqual(fast.slots,slow.slots);assert.equal(fast.phase,slow.phase);}}
});
test('현재 단계는 재현 가능하며 5개 단순 정책 중 적어도 3개를 통과시키지 않는다',()=>{
 for(const stage of ['1','2','10','100','500','1000','5000','30000','100000']){const seed=hashSeed(`${HARVEST_VERSION}:harvest:${stage}`),p=generateHarvest(stage,seed);assert.ok(verifyHarvest(p,p.solution));assert.deepEqual(generateHarvest(stage,seed),p);assert.ok(['left','right','smallest','largest','visible'].filter(k=>!strategyPolicy(p,k)).length>=3,stage);}
});
