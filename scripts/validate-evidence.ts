import {readFile,writeFile} from 'node:fs/promises';
import {backtest} from '../src/core/backtest';
import {FEATURE_WEIGHTS} from '../src/core/evidence';
import type {Dataset} from '../src/core/data';
const {draws}=JSON.parse(await readFile('public/data/lotto.json','utf8')) as Dataset;
const seeds=[42,645,20261018];
const periods=[{name:'사전 확인',data:draws.slice(0,-100)},{name:'최종 확인',data:draws}];
const results=periods.map(period=>({period:period.name,runs:seeds.map(seed=>{
 const r=backtest(period.data,'integrated',seed,5);
 return {seed,firstRound:r.rows[0].round,lastRound:r.rows.at(-1)!.round,rounds:r.rows.length,games:r.games,average:r.average,randomAverage:r.randomAverage,noLeakage:r.rows.every(row=>row.trainingLast<row.round)};
})}));
const report={generatedAt:new Date().toISOString(),dataLastRound:draws.at(-1)!.round,weights:FEATURE_WEIGHTS,method:'가중치를 사전에 고정하고 시간 순서가 다른 두 기간을 검증했습니다. 기간별 결과로 가중치를 재조정하지 않았습니다. 기존에 관찰한 데이터이므로 완전히 새로운 미래 실험은 아닙니다. 각 회차의 추천에는 해당 회차 이전 데이터만 사용합니다. 시드별 결과는 같은 당첨 기록을 공유하므로 독립 표본으로 간주하지 않습니다.',results,conclusion:'무작위 대비 당첨 확률 우위가 검증됐다고 해석하지 않습니다.'};
await writeFile('reports/evidence-validation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
