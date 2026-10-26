import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyPuzzleProof} from '../src/core/puzzle-proof';
import type {PuzzleAction} from '../src/core/puzzle-proof';
import {generateEscape,generateHarvest,initialHarvest,placeToken,harvestAvailable,hashSeed,GENERATOR_VERSION} from '../src/core/puzzles';
import {completeCollection} from '../src/core/harvest-transport';
test('공개 랭킹의 클리어 검증은 같은 시드의 실제 이동과 수거만 승인한다',()=>{
 for(const stage of ['1','1000','100000']){
  const e=generateEscape(stage,hashSeed(`${GENERATOR_VERSION}:escape:${stage}`)),moves=e.solution.map(m=>({type:'move' as const,...m}));
  assert.equal(verifyPuzzleProof('escape',stage,GENERATOR_VERSION,moves).moves,moves.length);
  assert.throws(()=>verifyPuzzleProof('escape',stage,GENERATOR_VERSION,moves.slice(1)));
  const p=generateHarvest(stage,hashSeed(`${GENERATOR_VERSION}:harvest:${stage}`));let s=initialHarvest(p),serial=0;const actions:PuzzleAction[]=[];
  for(const id of p.solution){s=placeToken(p,s,id)!;actions.push({type:'place',id});for(let hit=harvestAvailable(p,s);hit;hit=harvestAvailable(p,s)){const t=s.slots[hit.slot]!,c={type:'collect' as const,id:++serial,...hit,tokenId:t.id,color:t.color,started:0};actions.push(c);s=completeCollection(p,s,c);}}
  assert.equal(verifyPuzzleProof('harvest',stage,GENERATOR_VERSION,actions).units,s.collected);
  assert.throws(()=>verifyPuzzleProof('harvest',stage,GENERATOR_VERSION,actions.slice(0,-1)));
 }
});
test('이상 단계·버전·거대 기록과 클라이언트 서버 규칙 차이를 거부한다',()=>{
 for(const stage of ['0','-1','1.5','1e6','9'.repeat(41)])assert.throws(()=>verifyPuzzleProof('escape',stage,GENERATOR_VERSION,[]));
 assert.throws(()=>verifyPuzzleProof('escape','1','fake',[]));
 for(const file of ['puzzles.ts','harvest-transport.ts','puzzle-proof.ts'])assert.equal(readFileSync(`src/core/${file}`,'utf8'),readFileSync(`defense-online/lib/${file}`,'utf8'));
});
