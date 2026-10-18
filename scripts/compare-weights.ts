import {readFile,writeFile} from 'node:fs/promises';
import {backtest} from '../src/core/backtest';
import {recommend} from '../src/core/recommend';
import {recent15,type Dataset} from '../src/core/data';
import {evidenceModel,FEATURE_WEIGHTS,type FeatureWeights} from '../src/core/evidence';
import {rankAllCombinations} from '../src/core/ranking';
const {draws}=JSON.parse(await readFile('public/data/lotto.json','utf8')) as Dataset;
const previous=Object.fromEntries(Object.entries({frequency:12,recent:12,overdue:6,odd:10,ranges:10,endings:8,pairs:10,consecutive:9,overlap:9}).map(([k,v])=>[k,v/86])) as FeatureWeights;
const results=[];
for(const period of [{name:'앞선 100회',data:draws.slice(0,-100)},{name:'최근 100회',data:draws}]){
 const start=performance.now(),r=backtest(period.data,'integrated',42,5);
 const oldAverages=r.rows.map(row=>{
  const target=period.data.find(d=>d.round===row.round)!;
  const train=recent15(period.data.filter(d=>d.round<row.round),new Date(`${target.date}T00:00:00+09:00`));
  if(train.some(d=>d.round>=target.round||d.date>=target.date))throw new Error('비교 기준에 미래 데이터가 있습니다.');
  const {top}=rankAllCombinations(evidenceModel(train),5,45,undefined,previous);
  return top.reduce((sum,g)=>sum+g.numbers.filter(n=>target.numbers.includes(n)).length,0)/5;
 });
 const result={period:period.name,firstRound:r.rows[0].round,lastRound:r.rows.at(-1)!.round,rounds:r.rows.length,games:r.games,beforeAverage:oldAverages.reduce((a,b)=>a+b,0)/oldAverages.length,average:r.average,randomAverage:r.randomAverage,noLeakage:r.rows.every(row=>row.trainingLast<row.round),elapsedMs:Math.round(performance.now()-start)};
 results.push(result);console.log(JSON.stringify(result));
}
const info={generatedAt:new Date().toISOString(),dataLastRound:draws.at(-1)!.round,comparisonSeed:42,combinationsPerDraw:8145060,note:'같은 회차·같은 훈련 데이터·5게임을 비교했습니다. 80/20 비중은 결과 확인 전에 정했으며 결과로 재조정하지 않았습니다. 이미 관찰한 과거 기록의 재검증이며 독립적인 미래 검증이나 확률 우위 입증은 아닙니다.'};
await writeFile('reports/weight-comparison.json',JSON.stringify({...info,beforeWeights:previous,afterWeights:FEATURE_WEIGHTS,results},null,2));
await writeFile('reports/ranking-validation.json',JSON.stringify({...info,method:'full-enumeration-v3-records80-structure20',weights:FEATURE_WEIGHTS,results:results.map(({beforeAverage,...r})=>r),top10:recommend(draws,'integrated',10,0)},null,2));
