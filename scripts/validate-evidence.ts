import {readFile,writeFile} from 'node:fs/promises';import {backtest} from '../src/core/backtest';import {recommend} from '../src/core/recommend';import {FEATURE_WEIGHTS} from '../src/core/evidence';import type {Dataset} from '../src/core/data';
const {draws}=JSON.parse(await readFile('public/data/lotto.json','utf8')) as Dataset;
const results=[];
for(const period of [{name:'앞선 100회',data:draws.slice(0,-100)},{name:'최근 100회',data:draws}]){
 const start=performance.now(),r=backtest(period.data,'integrated',42,5);
 results.push({period:period.name,firstRound:r.rows[0].round,lastRound:r.rows.at(-1)!.round,rounds:r.rows.length,games:r.games,average:r.average,randomAverage:r.randomAverage,noLeakage:r.rows.every(row=>row.trainingLast<row.round),elapsedMs:Math.round(performance.now()-start)});
 console.log(JSON.stringify(results.at(-1)));
}
const report={method:'full-enumeration-v3-records80-structure20',generatedAt:new Date().toISOString(),dataLastRound:draws.at(-1)!.round,weights:FEATURE_WEIGHTS,comparisonSeed:42,combinationsPerDraw:8145060,results,top10:recommend(draws,'integrated',10,0),note:'통합 추천에는 난수가 없습니다. 가중치는 결과 확인 전에 고정했으며 결과로 조정하지 않았습니다. 과거 검증은 미래 실험이 아니며 당첨 확률 우위를 입증하지 않습니다.'};
await writeFile('reports/ranking-validation.json',JSON.stringify(report,null,2));
