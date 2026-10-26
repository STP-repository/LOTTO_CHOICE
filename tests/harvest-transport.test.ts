import test from 'node:test';
import assert from 'node:assert/strict';
import {initialHarvest,placeToken,generateHarvest,hashSeed} from '../src/core/puzzles';
import {reserveCollection,completeCollection} from '../src/core/harvest-transport';
test('운반 예약은 그림·수량을 바꾸지 않고 같은 픽셀과 수량을 중복 예약하지 않는다',()=>{
 const p={width:4,height:1,cells:[0,0,0,0],tokens:[{id:1,color:0,remaining:2}]},s=placeToken(p,initialHarvest(p),1)!;
 const before=structuredClone(s),a=reserveCollection(p,s,[],1,0)!;
 assert.deepEqual(s,before);const second=reserveCollection(p,s,[a],2,190)!;assert.ok(second);assert.notEqual(second.index,a.index);assert.equal(reserveCollection(p,s,[a,second],3,190),null);
 const next=completeCollection(p,s,a);assert.equal(next.collected,1);assert.equal(next.slots[0]?.remaining,1);assert.equal(next.cells[a.index],-1);
 assert.strictEqual(completeCollection(p,next,a),next);assert.equal(s.cells[a.index],0);
 const b=reserveCollection(p,next,[],2,820)!;assert.notEqual(a.index,b.index);
 const last=completeCollection(p,next,b);assert.equal(last.slots[0],null);assert.equal(last.collected,2);
});
test('마지막 블록의 도착 확정 전에는 클리어되지 않고 잘못된 슬롯의 운반은 무시한다',()=>{
 const p={width:1,height:1,cells:[2],tokens:[{id:7,color:2,remaining:1}]},s=placeToken(p,initialHarvest(p),7)!,c=reserveCollection(p,s,[],1,0)!;
 assert.equal(s.phase,'playing');assert.strictEqual(completeCollection(p,s,{...c,tokenId:8}),s);
 const final=completeCollection(p,s,c);assert.equal(final.phase,'won');assert.equal(final.collected,1);assert.equal(final.slots[0],null);
});
test('0 표시로 닫히는 슬롯은 종료 연출 중 재사용되지 않는다',()=>{
 const p={width:1,height:1,cells:[1],tokens:[{id:1,color:1,remaining:1}]},s=initialHarvest(p),next=placeToken(p,s,1,[0])!;
 assert.equal(next.slots[0],null);assert.equal(next.slots[1]?.id,1);
 assert.equal(placeToken(p,s,1,[0,1,2,3,4]),null);
});
test('3개 병렬 예약·순차 투입도 검증 경로의 최종 수량과 일치하고 예약 취소는 무손실이다',()=>{
 for(const stage of ['1','100','1000','100000']){
  const p=generateHarvest(stage,hashSeed(`transport:${stage}`));let s=initialHarvest(p),serial=0;
  for(const id of p.solution){s=placeToken(p,s,id)!;assert.ok(s);let guard=0;
   while(s.slots.some(Boolean)&&guard++<p.cells.length){const pending=[];for(let i=0;i<3;i++){const c=reserveCollection(p,s,pending,++serial,serial*190);if(c)pending.push(c);}assert.ok(pending.length);
    const before=structuredClone(s);reserveCollection(p,s,[],99999,0);assert.deepEqual(s,before);
    for(const c of pending)s=completeCollection(p,s,c);
   }
  }
  assert.equal(s.phase,'won');assert.equal(s.collected,p.cells.filter(c=>c>=0).length);assert.ok(s.slots.every(t=>!t));
 }
});
