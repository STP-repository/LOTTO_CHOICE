import test from 'node:test';
import assert from 'node:assert/strict';
import {difficulty,generateEscape,generateHarvest,hashSeed,verifyEscape,verifyHarvest,initialHarvest,placeToken,harvestTick,canonicalGrid} from '../src/core/puzzles';
const stages=['1','100','500','1000','5000','30000','100000'];
test('난이도 정책의 모든 경계와 무한 단계 상한',()=>{
 for(const [stage,tier] of [['1',0],['30',0],['31',1],['100',1],['101',2],['300',2],['301',3],['500',3],['501',4],['1000',4],['1001',5],['100000',5],['999999999999999999999999999',5]] as const)assert.equal(difficulty(stage).tier,tier);
 for(const stage of ['1001','5000','30000','100000','999999999999999999999999999']){const p=difficulty(stage);assert.ok(p.target>=4&&p.target<=5);assert.equal(p.maxBlocks,12);assert.equal(p.maxWalls,5);assert.equal(p.maxSolution,220);}
});
test('지정 단계 두 게임의 재현성·상한·해결 가능성',()=>{
 for(const stage of stages)for(let i=0;i<8;i++){
  const seed=hashSeed(`${stage}:${i}`),e=generateEscape(stage,seed),h=generateHarvest(stage,seed);
  assert.ok(verifyEscape(e,e.solution),`escape ${stage}:${i}`);assert.ok(verifyHarvest(h,h.solution),`harvest ${stage}:${i}`);
  assert.deepEqual(generateEscape(stage,seed),e);assert.deepEqual(generateHarvest(stage,seed),h);
  assert.ok(e.blocks.length<=12&&e.walls.length<=5&&e.solution.length<=220&&e.rating.withinCap);
  assert.ok(h.width<=19&&h.cells.filter(c=>c>=0).length<=400&&h.tokens.length<=220&&h.rating.withinCap);
  assert.equal(initialHarvest(h).slots.length,5);
 }
});
test('상한 이후 동일 시드와 같은 목표이면 단계 번호와 무관한 동일 구조',()=>{
 // Stage affects labels and seed selection, never an unbounded size multiplier.
 for(const stage of ['5000','30000','100000']){
  const a=generateEscape('1002',42),b=generateEscape(stage,42),h=generateHarvest('1002',42),j=generateHarvest(stage,42);
  assert.equal(a.signature,b.signature);assert.deepEqual(a.rating,b.rating);assert.equal(h.signature,j.signature);assert.deepEqual(h.rating,j.rating);
 }
});
test('상한 단계의 서로 다른 시드는 구조를 다양화한다',()=>{
 const e=new Set<string>(),h=new Set<string>();for(let i=0;i<40;i++){e.add(generateEscape('100000',hashSeed(`escape:${i}`)).signature);h.add(generateHarvest('100000',hashSeed(`harvest:${i}`)).signature);}
 assert.equal(e.size,40);assert.equal(h.size,40);
 assert.equal(canonicalGrid([['c2','.'],['c3','c2']]),canonicalGrid([['c5','c0'],['.','c5']]));
});
test('수거는 한 틱에 한 픽셀만 제거하고 빈 슬롯을 재사용한다',()=>{
 const p={width:2,height:1,cells:[0,0],tokens:[{id:1,color:0,remaining:2}]};let s=initialHarvest(p);s=placeToken(p,s,1)!;
 s=harvestTick(p,s);assert.equal(s.collected,1);assert.equal(s.slots[0]?.remaining,1);s=harvestTick(p,s);assert.equal(s.phase,'won');assert.equal(s.slots[0],null);
});

