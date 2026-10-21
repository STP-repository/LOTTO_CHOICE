import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dataSignature} from '../src/core/advanced-model';
import {recent15,validateDraws} from '../src/core/data';
import {evidenceModel,evaluateEvidence} from '../src/core/evidence';
import {modeWeights,type Mode,type RecommendedGame} from '../src/core/recommend';
test('배포 사전 분석은 현재 자료와 일치하고 실제 점수순 10조합을 제공한다',()=>{
  const data=JSON.parse(readFileSync('public/data/lotto.json','utf8'));
  const draws=recent15(validateDraws(data.draws));
  const saved=JSON.parse(readFileSync('public/data/ranked-results.json','utf8'));
  assert.equal(saved.version,2);assert.equal(saved.scopes.recent15.signature,dataSignature(draws));
  const full=validateDraws(JSON.parse(readFileSync('public/data/full-history.json','utf8')).draws);
  assert.equal(saved.scopes.all.signature,dataSignature(full));assert.equal(saved.scopes.all.firstRound,1);
  for(const [scope,rows] of [['recent15',draws],['all',full]] as const){
  const latest=rows.at(-1)!;
  const model=evidenceModel(scope==='all'?[...rows]:recent15([...rows],new Date(`${latest.date}T12:00:00+09:00`)));
  for(const mode of ['all','overdue','integrated'] as Mode[]){
    const games=saved.scopes[scope].results[mode] as RecommendedGame[];
    assert.equal(games.length,10);assert.equal(new Set(games.map(g=>g.numbers.join(','))).size,10);
    games.forEach((g,i)=>{assert.equal(g.rank,i+1);assert.equal(g.numbers.length,6);assert.equal(new Set(g.numbers).size,6);assert.ok(g.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=45));assert.ok(Math.abs(g.score!-evaluateEvidence(g.numbers,model,modeWeights(mode)).rating*100)<1e-9);if(i)assert.ok(games[i-1].score!>=g.score!);});
  }
  }
});
