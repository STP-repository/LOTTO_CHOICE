import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recentGameNames,rememberGameNames,activeGameRoster,saveActiveGameRoster} from '../src/services/game-names';
test('최근 이름은 재방문에도 복원하고 보관 목록만 합치며 게임 참가자 중복은 막지 않는다',()=>{
  const store=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>store.set(key,value)}});
  assert.deepEqual(recentGameNames(),[]);assert.equal(rememberGameNames(['민수','민수','지수'],[]).saved,true);assert.deepEqual(recentGameNames(),['민수','지수']);
  assert.equal(saveActiveGameRoster(['민수','민수','지수'],[0,2]),true);assert.deepEqual(activeGameRoster(),{names:['민수','민수','지수'],selected:[0,2]});
  rememberGameNames(['수진'],recentGameNames());assert.deepEqual(recentGameNames(),['수진','민수','지수']);
  const many=Array.from({length:60},(_,i)=>`사용자${i}`);rememberGameNames(many,[]);assert.equal(recentGameNames().length,50);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>'{broken',setItem:()=>{throw new Error('storage blocked');}}});assert.deepEqual(recentGameNames(),[]);assert.equal(rememberGameNames(['민수'],[]).saved,false);
});
