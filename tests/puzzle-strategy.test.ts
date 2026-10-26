import test from 'node:test';
import assert from 'node:assert/strict';
import {generateEscape,generateHarvest,initialHarvest,placeToken,harvestQueueHeads,hashSeed,verifyEscape,verifyHarvest,escapeGreedyWins,harvestLeftmostWins,GENERATOR_VERSION,HARVEST_VERSION} from '../src/core/puzzles';
import {reserveCollection,completeCollection,collectionDuration} from '../src/core/harvest-transport';

test('4개 줄의 맨 위만 선택 가능하고 선택한 줄만 앞으로 이동한다',()=>{
 const p={width:8,height:1,cells:Array(8).fill(0),tokens:Array.from({length:8},(_,i)=>({id:i+1,color:0,remaining:1,lane:i%4}))};let s=initialHarvest(p);
 assert.deepEqual(harvestQueueHeads(s).map(t=>t.id),[1,2,3,4]);assert.equal(placeToken(p,s,5),null);
 s=placeToken(p,s,1)!;assert.deepEqual(harvestQueueHeads(s).map(t=>t.id),[5,2,3,4]);assert.ok(placeToken(p,s,5));assert.equal(placeToken(p,s,6),null);
});

test('수거 가속은 도착 완료 조건과 슬롯의 실제 남은 수량을 보존한다',()=>{
 assert.equal(collectionDuration(false),360);assert.equal(collectionDuration(true),140);assert.ok(collectionDuration(true,true)<collectionDuration(false,true));
 const p={width:7,height:1,cells:Array(7).fill(2),tokens:[{id:1,color:2,remaining:7,lane:0}]};let s=placeToken(p,initialHarvest(p),1)!;const pending=[];
 for(let id=1;id<=10;id++){const c=reserveCollection(p,s,pending,id,0);if(c)pending.push(c);}assert.equal(pending.length,6);assert.equal(s.collected,0);assert.equal(new Set(pending.map(c=>c.index)).size,6);
 for(const c of pending.reverse())s=completeCollection(p,s,c);assert.equal(s.collected,6);assert.equal(s.phase,'playing');assert.equal(s.slots[0]?.remaining,1);
 const last=reserveCollection(p,s,[],11,0)!;s=completeCollection(p,s,last);assert.equal(s.phase,'won');assert.equal(s.collected,7);
});

test('전략 대기줄은 해결 가능하고 6단계부터 왼쪽만 고르는 정책을 차단한다',()=>{
 for(const stage of ['1','6','30','100','500','1000','5000','30000','100000']){
  const p=generateHarvest(stage,hashSeed(`${HARVEST_VERSION}:harvest:${stage}`));assert.ok(verifyHarvest(p,p.solution));assert.equal(new Set(p.tokens.map(t=>t.lane)).size,4);
  if(BigInt(stage)>=6n){assert.equal(harvestLeftmostWins(p),false,stage);assert.ok(p.greedyTrap);}
 }
});

test('컬러 이스케이프는 첫 판부터 다중 블록 간섭을 가지며 검증된 해결 경로가 있다',()=>{
 for(const stage of ['1','2','3','5','30','100','1000','100000'])for(let i=0;i<3;i++){
  const p=generateEscape(stage,hashSeed(`${GENERATOR_VERSION}:escape:${stage}:${i}`));assert.ok(verifyEscape(p,p.solution));assert.ok(p.blocks.length>=8,`${stage}:${i}`);assert.ok(p.rating.blocking>=12);assert.ok(p.solution.length>=45&&p.solution.length<=220);assert.equal(escapeGreedyWins(p),false,`${stage}:${i}`);
 }
});
