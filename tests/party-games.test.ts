import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GAME_TYPES,parseParticipants,makeLadder,simulatePinball,simulateRace,diceTournament,knockout} from '../src/core/party-games';

test('랜덤게임 10종과 참가자 등록 범위·중복 이름 허용을 검증한다',()=>{
  assert.equal(GAME_TYPES.length,10);assert.equal(new Set(GAME_TYPES.map(g=>g.id)).size,10);
  assert.deepEqual(parseParticipants(' 민수\n 지수, 수진 '),['민수','지수','수진']);
  assert.deepEqual(parseParticipants('민수,민수'),['민수','민수']);assert.throws(()=>parseParticipants('가'.repeat(21)));assert.throws(()=>parseParticipants(Array.from({length:21},(_,i)=>String(i)).join(',')));
});
test('사다리는 모든 이름을 서로 다른 도착점으로 보내고 당첨 경로가 일치한다',()=>{
  for(const count of [2,3,7,20])for(let seed=0;seed<30;seed++){
    const a=makeLadder(count,seed);assert.deepEqual(a,makeLadder(count,seed));assert.equal(new Set(a.paths.map(p=>p.end)).size,count);assert.equal(a.paths[a.winner].end,a.target);
    for(const p of a.paths)assert.ok(p.steps.every(n=>n>=0&&n<count));
  }
});
test('핀볼은 실제 충돌 경로를 재현하고 마지막 도착자를 당첨자로 정한다',()=>{
  for(const count of [2,7,20])for(let seed=0;seed<50;seed++){
    const p=simulatePinball(count,seed);assert.equal(p.arrivals.length,count);assert.equal(new Set(p.arrivals.map(a=>a.id)).size,count);assert.equal(p.winner,p.arrivals.at(-1)!.id);assert.ok(p.frames.at(-1)!.every(b=>b.finished));assert.ok(p.arrivals.every((a,i)=>!i||p.arrivals[i-1].time<=a.time));
  }
  assert.deepEqual(simulatePinball(5,42),simulatePinball(5,42));
});
test('경주·주사위·토너먼트는 각 게임 규칙의 승자와 시드 재현성을 지킨다',()=>{
  for(const count of [2,3,7,20])for(let seed=0;seed<30;seed++){
    const race=simulateRace(count,seed);assert.equal(race.winner,race.arrivals[0]);assert.equal(race.arrivals.length,count);assert.ok(race.frames.at(-1)!.every(p=>p===100));
    const dice=diceTournament(count,seed);assert.deepEqual(dice.rounds.at(-1)!.survivors,[dice.winner]);dice.rounds.forEach(r=>assert.ok(r.survivors.every(id=>r.rolls[r.players.indexOf(id)]===Math.max(...r.rolls))));
    const bracket=knockout(count,seed);assert.equal(bracket.rounds.at(-1)!.pairs[0].winner,bracket.winner);bracket.rounds.forEach(r=>r.pairs.forEach(p=>assert.ok(p.winner===p.a||p.winner===p.b)));
  }
  assert.deepEqual(simulateRace(7,42),simulateRace(7,42));assert.deepEqual(diceTournament(7,42),diceTournament(7,42));assert.deepEqual(knockout(7,42),knockout(7,42));
});
test('3·5단계 핀볼은 실제 코스를 반복 통과하고 마지막 도착자가 당첨된다',()=>{
  for(const stages of [3,5])for(const count of [2,8,20])for(const seed of [1,7,42,99]){
    const p=simulatePinball(count,seed,stages);assert.equal(p.arrivals.length,count);assert.ok(p.frames.at(-1)!.every(b=>b.finished&&b.stage===stages-1));assert.equal(p.winner,p.arrivals.at(-1)!.id);assert.ok(p.frames.some(frame=>frame.some(b=>b.stage>0&&!b.finished)));
  }
});
