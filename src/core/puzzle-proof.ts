import {colorBoost,COLOR_ITEMS,type ColorItem} from './color-items';
import {startBoard,step,finishExit} from './color-block-escape';
import {generateColorStage as legacyColorStage} from './color-block-legacy';
import {generateColorStage,replaySolution} from './color-block-stages';
import {generateHarvest,hashSeed,GENERATOR_VERSION,HARVEST_VERSION,initialHarvest,placeToken,DIRECTIONS} from './puzzles';
import type {PuzzleKind,Direction} from './puzzles';
import {completeCollection} from './harvest-transport';
export type PuzzleAction={type:'boost';item:ColorItem;id?:number}|{type:'move';id:number;direction:Direction}|{type:'place';id:number;slot?:number}|{type:'collect';id:number;index:number;slot:number;tokenId:number;color:number;started:number};
export function verifyPuzzleProof(kind:PuzzleKind,stage:string,version:string,actions:PuzzleAction[]){
 if(!['escape','harvest'].includes(kind)||typeof stage!=='string'||! /^[1-9]\d{0,39}$/.test(stage)||!(kind==='harvest'?[HARVEST_VERSION]:[GENERATOR_VERSION,'color-block-escape-v1']).includes(version)||!Array.isArray(actions)||!actions.length||actions.length>6000)throw Error('기록 형식이 잘못되었습니다.');
 const seed=hashSeed(`${version}:${kind}:${stage}`);
 if(kind==='escape'){
  const p=(version==='color-block-escape-v1'?legacyColorStage:generateColorStage)(stage,seed);let state=startBoard(p),items=0;const used:Partial<Record<ColorItem,number>>={};
  for(const a of actions){if(a.type==='move'){if(!Number.isSafeInteger(a.id)||!DIRECTIONS.includes(a.direction))throw Error('탈출 기록이 잘못되었습니다.');const next=step(p,state,a.id,a.direction);if(!next)throw Error('이동 기록을 재현할 수 없습니다.');state=next;}
   else if(a.type==='boost'&&version===GENERATOR_VERSION){if(!Object.hasOwn(COLOR_ITEMS,a.item)||(used[a.item]??0)>=COLOR_ITEMS[a.item].limit)throw Error('아이템 사용 한도를 초과했습니다.');const next=colorBoost(p,state,a.item,a.id);if(!next)throw Error('아이템 대상이 잘못되었습니다.');state=next;used[a.item]=(used[a.item]??0)+1;items++;}
   else throw Error('탈출 기록이 잘못되었습니다.');
   for(const flight of [...state.flights])state=finishExit(state,flight.id);
  }
  if(state.phase!=='won')throw Error('탈출 기록을 재현할 수 없습니다.');return {moves:state.moves,units:p.pieces.length,items};
 }
 const p=generateHarvest(stage,seed);let s=initialHarvest(p);for(const a of actions){if(a.type==='place'){if(a.slot!==undefined&&(!Number.isInteger(a.slot)||a.slot<0||a.slot>4))throw Error('슬롯 위치가 잘못되었습니다.');const next=placeToken(p,s,a.id,a.slot===undefined?[]:[0,1,2,3,4].filter(slot=>slot!==a.slot));if(!next)throw Error('슬롯 배치 기록이 잘못되었습니다.');s=next;}else if(a.type==='collect'){if(![a.index,a.slot,a.id,a.tokenId,a.color].every(Number.isSafeInteger))throw Error('수거 기록이 잘못되었습니다.');const next=completeCollection(p,s,a);if(next===s)throw Error('수거 기록을 재현할 수 없습니다.');s=next;}else throw Error('수거 기록이 잘못되었습니다.');}if(s.phase!=='won')throw Error('아직 클리어하지 않은 기록입니다.');return {moves:actions.filter(a=>a.type==='place').length,units:s.collected,items:0};
}
