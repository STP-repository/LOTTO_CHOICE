import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompetition,competitionSeed,recordAttempt,nextCompetitionTurn,competitionComplete,competitionStandings} from '../src/core/arcade-competition';
test('파티 대결은 같은 라운드 시드·독립 이름·단 한 번 기록·라운드 합산 순위를 지킨다',()=>{
  let c=createCompetition(['민수','민수','지수'],2,1234);assert.notEqual(c.players[0],c.players[1]);
  const firstSeed=competitionSeed(c);assert.equal(nextCompetitionTurn(c).turn,0);
  for(let i=0;i<6;i++){assert.equal(c.turn,i);assert.equal(competitionSeed(c),i<3?firstSeed:(firstSeed+2654435761)>>>0);c=recordAttempt(c,[100,300,200,500,200,400][i]);assert.equal(recordAttempt(c,999999).attempts.length,c.attempts.length);if(i<5)c=nextCompetitionTurn(c);}
  assert.equal(competitionComplete(c),true);assert.deepEqual(competitionStandings(c).map(p=>p.total),[600,600,500]);assert.equal(nextCompetitionTurn(c).turn,5);
  assert.throws(()=>createCompetition(['혼자'],1,0));assert.throws(()=>recordAttempt(c,NaN));
});
