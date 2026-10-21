import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkGame, parseTicket, ticketDrawDate } from '../src/core/ticket';

test('공식 QR 주소, 혼합 선택 방식, 다섯 게임과 용지 일련번호를 읽는다',()=>{
  const value='0649q182125373839m040728303235s032122334142n011130333841q0313192736390000002379';
  const ticket=parseTicket(`http://qr.nlotto.co.kr/?v=${value}`);
  assert.equal(ticket.round,649);assert.equal(ticket.games.length,5);
  assert.deepEqual(ticket.games[0],[18,21,25,37,38,39]);
  assert.deepEqual(parseTicket('https://m.dhlottery.co.kr/qr.do?method=winQr&v=1071q010203040506').games,[[1,2,3,4,5,6]]);
  assert.equal(ticketDrawDate(1),'2002-12-07');
});
test('임의 URL, 누락, 중복, 범위 오류 및 여섯 게임은 거부한다',()=>{
  for(const value of ['https://evil.example/?v=1071q010203040506','https://dhlottery.co.kr.evil.example/?v=1071q010203040506','1071q0102030405','1071q010203040505','1071q000203040506','1071q010203040546','0000q010203040506','1071'+ 'q010203040506'.repeat(6),'1071q010203040506junk'])assert.throws(()=>parseTicket(value));
});
test('해당 회차 당첨번호와 보너스를 구분하여 1~5등과 낙첨을 판정한다',()=>{
  const draw={round:1071,date:'2023-06-10',numbers:[1,2,3,4,5,6],bonus:7};
  for(const [numbers,rank] of [ [[1,2,3,4,5,6],1],[[1,2,3,4,5,7],2],[[1,2,3,4,5,8],3],[[1,2,3,4,7,8],4],[[1,2,3,7,8,9],5],[[1,2,7,8,9,10],null],[[7,8,9,10,11,12],null]] as const){
    assert.equal(checkGame([...numbers],draw).rank,rank);
  }
  assert.deepEqual(checkGame([1,2,3,4,5,7],draw).matched,[1,2,3,4,5]);
});
