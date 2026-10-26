import {validateDraws,type Draw} from './data';
import {rng} from './recommend';
import {BASE_WEIGHTS,advancedGenerate,mean,overlap,quantile,sampleSix,sd,type Weights,type AdvancedGame} from './advanced-model';
export interface WeightModel {id:string;name:string;weights:Weights}
export interface EvaluationRow {phase:'training'|'validation'|'test';round:number;date:string;historyLast:number;historySize:number;seed:number;budget:number;unique:number;baseline:number[][];baselineMatches:number[];models:Record<string,{games:AdvancedGame[];matches:number[]}>}
function blockSeries(values:number[],size=8){return Array.from({length:Math.ceil(values.length/size)},(_,i)=>values.slice(i*size,i*size+size));}
export function comparison(values:number[],reference:number[],seed:number,comparisons=1){
  if(values.length!==reference.length||!values.length)throw new Error('동일한 회차 수의 비교 자료가 필요합니다.');
  const differences=values.map((v,i)=>v-reference[i]),difference=mean(differences),blocks=blockSeries(differences),random=rng(seed),sums=blocks.map(a=>a.reduce((s,v)=>s+v,0)),repetitions=4096;
  let extreme=0;const samples:number[]=[];
  for(let r=0;r<repetitions;r++){
    const flipped=sums.reduce((s,v)=>s+(random()<.5?-v:v),0)/differences.length;
    if(Math.abs(flipped)>=Math.abs(difference)-1e-12)extreme++;
    let sum=0,n=0;for(let j=0;j<blocks.length;j++){const b=blocks[Math.floor(random()*blocks.length)];sum+=b.reduce((s,v)=>s+v,0);n+=b.length;}samples.push(sum/n);
  }
  const p=(extreme+1)/(repetitions+1);
  return {difference,p,adjustedP:Math.min(1,p*comparisons),ci:[quantile(samples,.025),quantile(samples,.975)],blocks:blocks.length,repetitions,method:'8회차 비중첩 블록 부호반전 검정 · 블록 부트스트랩 95% 구간 · Bonferroni 보정',uncertain:blocks.length<10};
}

export function evaluateRound(all:Draw[],target:Draw,models:WeightModel[],budget:number,seed:number,phase:EvaluationRow['phase'],count=5,path:'standard'|'compressed'='standard'):EvaluationRow{
 const history=all.filter(d=>d.round<target.round&&d.date<target.date),roundSeed=(seed^Math.imul(target.round,2654435761))>>>0,random=rng(roundSeed^0x6297af),baseline:number[][]=[];
 while(baseline.length<count){const ns=sampleSix(random);if(!baseline.some(g=>g.join()===ns.join()))baseline.push(ns);}
 const results=Object.fromEntries(models.map(m=>{const generated=advancedGenerate(history,budget,roundSeed,m.weights,undefined,{count,path,diagnostics:false});return [m.id,{games:generated.games,matches:generated.games.map(g=>overlap(g.numbers,target.numbers))}];}));
 return {phase,round:target.round,date:target.date,historyLast:history.at(-1)!.round,historySize:history.length,seed:roundSeed,budget,unique:budget,baseline,baselineMatches:baseline.map(ns=>overlap(ns,target.numbers)),models:results};
}
function metrics(rows:EvaluationRow[],id:string){const counts=rows.flatMap(r=>id==='random'?r.baselineMatches:r.models[id].matches),perRound=rows.map(r=>mean(id==='random'?r.baselineMatches:r.models[id].matches));return {rounds:rows.length,games:counts.length,counts:Array.from({length:7},(_,i)=>counts.filter(v=>v===i).length),average:mean(counts),volatility:sd(perRound),perRound,maxima:rows.map(r=>Math.max(...(id==='random'?r.baselineMatches:r.models[id].matches)))};}
export function validateAdvanced(input:Draw[],budget:number,seed:number,now=new Date(),onProgress?:(p:{phase:string;done:number;total:number})=>void,options:{count?:number;rounds?:number;path?:'standard'|'compressed'}={}){
 const all=validateDraws(input,now),count=options.count??5,path=options.path??'standard',start=Math.max(30,all.length-(options.rounds??100)),targets=all.slice(start);
 if(all[0].round!==1||!targets.length)throw Error('제1회부터 최소 31회 전체 이력이 필요합니다.');
 if(![5,10,15].includes(count))throw Error('5·10·15조합을 선택해 주세요.');
 // All settings and weights are fixed before evaluation. No model selection on these rows.
 const models=[{id:'base',name:'기본 가중치',weights:{...BASE_WEIGHTS}}],rows:EvaluationRow[]=[];
 for(const target of targets){rows.push(evaluateRound(all,target,models,budget,seed,'test',count,path));onProgress?.({phase:'일반 워크포워드',done:rows.length,total:targets.length});}
 const base=metrics(rows,'base'),random=metrics(rows,'random');
 return {version:'full-backtest-v2',asOf:now.toISOString(),budget,seed,count,path,first:targets[0],last:targets.at(-1)!,weights:{...BASE_WEIGHTS},tuned:false,executions:rows.length,base,random,againstRandom:comparison(base.perRound,random.perRound,seed,1),rows,note:'기본 가중치와 설정을 평가 전에 고정했습니다. 여러 설정 중 결과가 좋은 것을 사후 선택하면 선택 편향이 발생합니다.'};
}
export type ValidationReport=ReturnType<typeof validateAdvanced>;
export function generateWithValidation(draws:Draw[],budget:number,seed:number,_report?:ValidationReport,onProgress?:(n:number)=>void){return advancedGenerate(draws,budget,seed,BASE_WEIGHTS,onProgress);}
