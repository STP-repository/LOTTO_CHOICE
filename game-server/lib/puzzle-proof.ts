import {generateEscape,generateHarvest,hashSeed,GENERATOR_VERSION,initialEscape,initialHarvest,moveEscape,placeToken,DIRECTIONS} from './puzzles';
import type {PuzzleKind,Direction} from './puzzles';
import {completeCollection} from './harvest-transport';
export type PuzzleAction={type:'move';id:number;direction:Direction}|{type:'place';id:number}|{type:'collect';id:number;index:number;slot:number;tokenId:number;color:number;started:number};
export function verifyPuzzleProof(kind:PuzzleKind,stage:string,version:string,actions:PuzzleAction[]){
 if(!['escape','harvest'].includes(kind)||typeof stage!=='string'||! /^[1-9]\d{0,39}$/.test(stage)||version!==GENERATOR_VERSION||!Array.isArray(actions)||!actions.length||actions.length>6000)throw Error('기록 형식이 잘못되었습니다.');
 const seed=hashSeed(`${version}:${kind}:${stage}`);
 if(kind==='escape'){const p=generateEscape(stage,seed);let s=initialEscape(p);for(const a of actions){if(a.type!=='move'||!Number.isSafeInteger(a.id)||!DIRECTIONS.includes(a.direction))throw Error('탈출 기록이 잘못되었습니다.');const next=moveEscape(p,s,a.id,a.direction);if(!next)throw Error('이동 기록을 재현할 수 없습니다.');s=next;}if(s.phase!=='won')throw Error('아직 클리어하지 않은 기록입니다.');return {moves:s.moves,units:p.blocks.length};}
 const p=generateHarvest(stage,seed);let s=initialHarvest(p);for(const a of actions){if(a.type==='place'){const next=placeToken(p,s,a.id);if(!next)throw Error('슬롯 배치 기록이 잘못되었습니다.');s=next;}else if(a.type==='collect'){if(![a.index,a.slot,a.id,a.tokenId,a.color].every(Number.isSafeInteger))throw Error('수거 기록이 잘못되었습니다.');const next=completeCollection(p,s,a);if(next===s)throw Error('수거 기록을 재현할 수 없습니다.');s=next;}else throw Error('수거 기록이 잘못되었습니다.');}if(s.phase!=='won')throw Error('아직 클리어하지 않은 기록입니다.');return {moves:actions.filter(a=>a.type==='place').length,units:s.collected};
}
