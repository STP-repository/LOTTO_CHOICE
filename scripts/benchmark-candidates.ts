import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {prepareCandidates,selectGames,BASE_WEIGHTS,dataSignature,quantile,mean} from '../src/core/advanced-model';
import {candidateScore} from '../src/core/combination-groups';
const data=JSON.parse(await readFile('public/data/full-history.json','utf8'));
if(process.argv[2]==='--one'){
 const budget=Number(process.argv[3]),seed=Number(process.argv[4]),started=performance.now(),before=process.memoryUsage().rss,p=prepareCandidates(data.draws,budget,seed),scores=p.candidates.map(c=>candidateScore(c,BASE_WEIGHTS)),sorted=[...scores].sort((a,b)=>a-b);
 const sets=Object.fromEntries([5,10,15].map(count=>[count,selectGames(p,BASE_WEIGHTS,seed,count).map(g=>({numbers:g.numbers,score:g.score,role:g.role}))]));
 console.log(JSON.stringify({budget,seed,signature:dataSignature(data.draws),unique:p.simulation.unique,attempts:p.simulation.attempts,duplicates:p.simulation.attempts-p.simulation.unique,score:{min:sorted[0],p10:quantile(sorted,.1),median:quantile(sorted,.5),p90:quantile(sorted,.9),max:sorted.at(-1),mean:mean(scores)},top:sorted.slice(-15).reverse(),sets,milliseconds:performance.now()-started,rssBefore:before,rssAfter:process.memoryUsage().rss,peakRss:process.resourceUsage().maxRSS*1024,scoreContext:'선정 전 다양성 100점, 기존 가중치 및 꼬리 감점'}));
}else{
 const rows:any[]=[];for(const budget of [2000,10000,100000,1000000])for(const seed of [20261021,20261022]){
  console.error(`${budget} / seed ${seed}`);const json=execFileSync(process.execPath,['--max-old-space-size=8192','node_modules/tsx/dist/cli.mjs','scripts/benchmark-candidates.ts','--one',String(budget),String(seed)],{encoding:'utf8',maxBuffer:10*1024*1024});rows.push(JSON.parse(json));
 }
 const comparisons=rows.filter(r=>r.seed===20261021).map((r,i,base)=>({budget:r.budget,sameFiveAs2000:r.sets['5'].filter((g:any)=>base[0].sets['5'].some((h:any)=>g.numbers.join()===h.numbers.join())).length,betweenSeeds:r.sets['5'].filter((g:any)=>rows.find(x=>x.budget===r.budget&&x.seed===20261022)!.sets['5'].some((h:any)=>g.numbers.join()===h.numbers.join())).length}));
 await writeFile('reports/candidate-scale-report.json',JSON.stringify({version:1,signature:dataSignature(data.draws),lastRound:data.draws.at(-1).round,generatedAt:new Date().toISOString(),rows,comparisons,note:'실행 환경의 RSS 측정이며 생성 후보 점수의 향상은 적중률 향상의 증거가 아닙니다.'},null,2));
 await writeFile('public/data/candidate-scale-report.json',await readFile('reports/candidate-scale-report.json','utf8'));console.log('reports/candidate-scale-report.json');
}
