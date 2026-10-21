import test from 'node:test';
import assert from 'node:assert/strict';
import {readSavedNumbers,saveSelectedNumbers,removeSavedNumbers} from '../src/services/saved-numbers';
test('선택 번호만 영구 저장하고 회차·분석 범위를 유지하며 중복과 잘못된 번호를 거부한다',()=>{
  const memory=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v)}});
  Object.defineProperty(globalThis,'window',{configurable:true,value:new EventTarget()});
  const selected=[1,2,3,4,5,6];
  assert.equal(saveSelectedNumbers([selected],1247,'1회부터 통합 분석'),1);
  selected[0]=45;assert.deepEqual(readSavedNumbers()[0].numbers,[1,2,3,4,5,6]);
  assert.equal(saveSelectedNumbers([[1,2,3,4,5,6]],1247,'1회부터 통합 분석'),0);
  assert.equal(saveSelectedNumbers([[1,2,3,4,5,6]],1247,'최근 15년 통합 분석'),1);
  assert.equal(readSavedNumbers().length,2);
  assert.throws(()=>saveSelectedNumbers([[1,1,2,3,4,5]],1247,'오류'));
  assert.throws(()=>saveSelectedNumbers([],1247,'미선택'));
  removeSavedNumbers(readSavedNumbers()[0].id);assert.equal(readSavedNumbers().length,1);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{throw new Error('quota');}}});
  assert.throws(()=>saveSelectedNumbers([[1,2,3,4,5,6]],1247,'저장 실패'),/저장 공간/);
});
