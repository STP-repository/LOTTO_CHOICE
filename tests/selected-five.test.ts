import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSelectedFive,selectedIdentity} from '../src/core/selected-five';
import {checkGame} from '../src/core/ticket';
import type {Draw} from '../src/core/data';

const draws:Draw[]=JSON.parse(readFileSync('public/data/full-history.json','utf8')).draws;
test('다섯 방식은 선택한 사후 실험의 1·2등 번호를 정확히 재현하며 미래 입력을 사용하지 않는다',()=>{
 const cases=[
  {round:1250,index:0,numbers:[1,5,8,23,27,28],rank:2},
  {round:1244,index:1,numbers:[1,18,25,26,34,38],rank:2},
  {round:1243,index:2,numbers:[9,18,24,38,43,44],rank:1},
  {round:1244,index:3,numbers:[13,18,25,26,34,38],rank:2},
  {round:1245,index:4,numbers:[4,5,12,25,32,42],rank:2},
 ];
 for(const item of cases){
  const history=draws.filter(draw=>draw.round<item.round);
  const pack=generateSelectedFive(history);
  assert.equal(pack.games.length,5);
  assert.equal(pack.targetRound,item.round);
  assert.deepEqual(pack.games[item.index].numbers,item.numbers);
  assert.equal(checkGame(item.numbers,draws.find(draw=>draw.round===item.round)!).rank,item.rank);
  const changed=structuredClone(draws);
  changed.filter(draw=>draw.round>=item.round).forEach(draw=>{draw.numbers=[1,2,3,4,5,6];draw.bonus=7;});
  assert.deepEqual(generateSelectedFive(changed.filter(draw=>draw.round<item.round)),pack);
 }
});
test('기준 회차 메인5장·새시드5장·고정수·제외수와 저장형 번호 유효성을 확인한다',()=>{
 const main=generateSelectedFive(draws),fresh=generateSelectedFive(draws,10383);
 assert.equal(main.games.length,5);
 assert.equal(fresh.games.length,5);
 assert.notEqual(selectedIdentity(main),selectedIdentity(fresh));
 assert.deepEqual(generateSelectedFive(draws),main);
 const filtered=generateSelectedFive(draws,10383,[3,11],[44]);
 assert.equal(filtered.games.length,5);
 for(const game of filtered.games){
  assert.equal(new Set(game.numbers).size,6);
  assert.ok(game.numbers.includes(3)&&game.numbers.includes(11)&&!game.numbers.includes(44));
 }
 assert.throws(()=>generateSelectedFive(draws,1,[3],[3]));
});
