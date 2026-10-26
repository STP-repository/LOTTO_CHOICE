import test from 'node:test';
import assert from 'node:assert/strict';
import {exposedPixels,initialHarvest,placeToken,generateHarvest,hashSeed} from '../src/core/puzzles';
import {reserveCollection,completeCollection} from '../src/core/harvest-transport';
test('숫자상자 슬롯은 정확히 5개이고 수거 완료 후에만 비워진다',()=>{
 const p={width:6,height:1,cells:[0,1,2,3,4,5],tokens:Array.from({length:6},(_,i)=>({id:i+1,color:i,remaining:1}))};let s=initialHarvest(p);
 for(let i=1;i<=5;i++)s=placeToken(p,s,i)!;assert.equal(s.slots.length,5);assert.equal(placeToken(p,s,6),null);
 const before=structuredClone(s),flight=reserveCollection(p,s,[],1,0)!;assert.deepEqual(s,before);assert.equal(s.slots[0]!.remaining,1);
 s=completeCollection(p,s,flight);assert.equal(s.collected,1);assert.equal(s.slots[0],null);assert.equal(s.phase,'playing');assert.ok(placeToken(p,s,6));
});
test('검은 테두리 안쪽 픽셀은 실제 외부 통로가 열려야 예약할 수 있다',()=>{
 const p={width:3,height:3,cells:[2,2,2,2,0,2,2,2,2],tokens:[{id:1,color:0,remaining:1},{id:2,color:2,remaining:8}]};let s=placeToken(p,initialHarvest(p),1)!;
 assert.ok(!exposedPixels(p,s.cells).includes(4));assert.equal(reserveCollection(p,s,[],1,0),null);
 s=placeToken(p,s,2)!;let f=reserveCollection(p,s,[],2,0)!;s=completeCollection(p,s,f);assert.ok(!exposedPixels(p,s.cells).includes(4));
 f=reserveCollection(p,s,[],3,0)!;s=completeCollection(p,s,f);assert.ok(exposedPixels(p,s.cells).includes(4));assert.equal(reserveCollection(p,s,[],4,0)!.index,4);
});
test('5개 병렬 슬롯에서 도착 확정 수량만 차감하고 지정 단계의 그림 전체를 완료한다',()=>{
 for(const stage of ['1','100','500','1000','5000','30000','100000']){
  const p=generateHarvest(stage,hashSeed(`capacity:${stage}`));let s=initialHarvest(p),serial=0,guard=0;const initial=p.cells.filter(c=>c>=0).length;
  while(s.phase==='playing'&&guard++<initial*3){
   for(const token of [...s.queue]){const next=placeToken(p,s,token.id);if(!next)break;s=next;}
   const before=structuredClone(s),pending=[];for(let i=0;i<5;i++){const c=reserveCollection(p,s,pending,++serial,0);if(c)pending.push(c);}assert.ok(pending.length>0,`${stage} blocked`);
   assert.deepEqual(s,before);assert.equal(new Set(pending.map(c=>c.index)).size,pending.length);
   for(const c of pending){const count=s.collected;s=completeCollection(p,s,c);assert.equal(s.collected,count+1);assert.strictEqual(completeCollection(p,s,c),s);}
  }
  assert.equal(s.phase,'won');assert.equal(s.collected,initial);assert.ok(s.cells.every(c=>c<0));assert.ok(s.slots.every(t=>!t));
 }
});
