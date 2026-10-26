import {readFile,writeFile} from 'node:fs/promises';
import {validateAdvanced} from '../src/core/advanced-validation';
const data=JSON.parse(await readFile('public/data/full-history.json','utf8')),reports=[];
for(const path of ['standard','compressed'] as const)for(const count of [5,10,15]){
 console.log(`${path} ${count}`);const report=validateAdvanced(data.draws,2000,20261021,new Date(),undefined,{count,path,rounds:105});
 reports.push({...report,multipleSettingsAdjustedP:Math.min(1,report.againstRandom.p*6)});
}
await writeFile('reports/configuration-backtests.json',JSON.stringify({settingsFrozen:true,noWeightSelection:true,comparisons:6,reports}));
await writeFile('public/data/backtest-comparison.json',JSON.stringify({comparisons:6,note:'6개 설정을 모두 보고하며 평가 후 가중치나 기본 경로를 선택하지 않았습니다.',reports:reports.map(r=>({...r,rows:[],base:{...r.base,perRound:[],maxima:[]},random:{...r.random,perRound:[],maxima:[]}}))}));
console.log(JSON.stringify(reports.map(r=>({path:r.path,count:r.count,rounds:r.executions,recommended:r.base.counts,random:r.random.counts,average:r.base.average,baseline:r.random.average,p:r.multipleSettingsAdjustedP}))));
