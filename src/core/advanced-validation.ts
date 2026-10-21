import type { Draw } from './data';
import { rng } from './recommend';
import { analysisSplit, BASE_WEIGHTS, FACTORS, advancedGenerate, mean, normalizeWeights, overlap, prepareCandidates, quantile, sampleSix, sd, selectFive, type AdvancedGame, type Factor, type Weights } from './advanced-model';

export interface WeightModel {id:string;name:string;weights:Weights}
const tilted=(changes:Partial<Weights>)=>normalizeWeights({...BASE_WEIGHTS,...changes});
export function initialModels():WeightModel[]{
  const named:WeightModel[]=[{id:'base',name:'기존 기본 가중치',weights:{...BASE_WEIGHTS}},{id:'equal',name:'동일 가중치',weights:tilted(Object.fromEntries(FACTORS.map(k=>[k,10])))},{id:'frequency',name:'빈도 중심',weights:tilted({frequency:30})},{id:'markov-bayes',name:'마르코프·베이즈 중심',weights:tilted({markov:20,bayes:20})},{id:'deviation',name:'평균회귀·편차 중심',weights:tilted({deviation:25})},{id:'distribution',name:'조합 분포 중심',weights:tilted({balance:15,sum:15,ranges:15,patterns:10,spacing:15})}];
  // Contribution probes reduce one factor by half; every factor remains present.
  return [...named,...FACTORS.map(k=>({id:`half-${k}`,name:`${k} 기여도 검증`,weights:tilted({[k]:BASE_WEIGHTS[k]/2})}))];
}
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
function metrics(rows:EvaluationRow[],id:string){
  const matches=rows.flatMap(r=>id==='random'?r.baselineMatches:r.models[id].matches),perRound=rows.map(r=>mean(id==='random'?r.baselineMatches:r.models[id].matches));
  return {rounds:rows.length,games:matches.length,counts:Array.from({length:7},(_,i)=>matches.filter(n=>n===i).length),average:mean(matches),volatility:sd(perRound),perRound,maxima:rows.map(r=>Math.max(...(id==='random'?r.baselineMatches:r.models[id].matches)))};
}
export function evaluateRound(all:Draw[],target:Draw,models:WeightModel[],budget:number,seed:number,phase:EvaluationRow['phase']):EvaluationRow{
  const history=all.filter(d=>d.round<target.round&&d.date<target.date),roundSeed=(seed^Math.imul(target.round,2654435761))>>>0;
  const prepared=prepareCandidates(history,budget,roundSeed),random=rng(roundSeed^0x6297af),baseline:number[][]=[];
  while(baseline.length<5){const ns=sampleSix(random);if(!baseline.some(g=>g.join()===ns.join()))baseline.push(ns);}
  return {phase,round:target.round,date:target.date,historyLast:history.at(-1)!.round,historySize:history.length,seed:roundSeed,budget,unique:prepared.simulation.unique,baseline,baselineMatches:baseline.map(ns=>overlap(ns,target.numbers)),models:Object.fromEntries(models.map(m=>{const games=selectFive(prepared,m.weights,roundSeed);return [m.id,{games,matches:games.map(g=>overlap(g.numbers,target.numbers))}];}))};
}
export function deriveCandidate(models:WeightModel[],training:EvaluationRow[]){
  const base=metrics(training,'base'),contributions=Object.fromEntries(FACTORS.map(k=>[k,base.average-metrics(training,`half-${k}`).average])) as Record<Factor,number>;
  const positive=FACTORS.map(k=>Math.max(0,contributions[k])),total=positive.reduce((s,v)=>s+v,0);
  const values=Object.fromEntries(FACTORS.map((k,i)=>[k,total?BASE_WEIGHTS[k]*.75+(5+50*positive[i]/total)*.25:BASE_WEIGHTS[k]])) as Weights;
  // Shrink toward the specified baseline; do not permit extreme or zero weights.
  const weights=normalizeWeights(Object.fromEntries(FACTORS.map(k=>[k,Math.max(2.5,Math.min(25,values[k]))])) as Weights);
  return {model:{id:'optimized',name:'학습 구간 기여도 기반 규제 후보',weights},contributions,initialCount:models.length};
}
function positivePeriods(a:number[],b:number[],parts:number){return Array.from({length:parts},(_,i)=>{const lo=Math.floor(i*a.length/parts),hi=Math.floor((i+1)*a.length/parts);return mean(a.slice(lo,hi).map((v,j)=>v-b[lo+j]));});}
export function chooseOnValidation(models:WeightModel[],rows:EvaluationRow[],training:EvaluationRow[],seed:number){
  const base=metrics(rows,'base'),random=metrics(rows,'random'),trainBase=metrics(training,'base'),trials=(models.length-1)*2;
  const comparisons=models.map(m=>{const result=metrics(rows,m.id),againstBase=comparison(result.perRound,base.perRound,seed,trials),againstRandom=comparison(result.perRound,random.perRound,seed+1,trials);
    const trainingRows=training.filter(r=>r.models[m.id]);const trained=trainingRows.length?metrics(trainingRows,m.id):null;
    const trainingStability=trained?positivePeriods(trained.perRound,trainBase.perRound,2):[];
    const stability=positivePeriods(result.perRound,base.perRound,3),randomStability=positivePeriods(result.perRound,random.perRound,3);
    const eligible=m.id!=='base'&&!againstBase.uncertain&&againstBase.adjustedP<.05&&againstRandom.adjustedP<.05&&againstBase.ci[0]>0&&againstRandom.ci[0]>0&&stability.every(v=>v>0)&&randomStability.every(v=>v>0)&&(m.id==='optimized'||trainingStability.every(v=>v>0));
    return {id:m.id,name:m.name,weights:m.weights,...result,againstBase,againstRandom,stability,randomStability,trainingStability,eligible};
  });
  const selected=[...comparisons].filter(c=>c.eligible).sort((a,b)=>(b.average-.01*sd(FACTORS.map(k=>b.weights[k]-BASE_WEIGHTS[k])))-(a.average-.01*sd(FACTORS.map(k=>a.weights[k]-BASE_WEIGHTS[k]))))[0];
  return {selectedId:selected?.id??'base',comparisons,trials,reason:selected?'학습·검증 기간 안정성 및 다중비교 보정 기준 통과. 최종 평가 전 동결.':'안정적이고 유의한 개선이 검증되지 않아 기본 가중치 유지.'};
}
export function validateAdvanced(input:Draw[],budget:number,seed:number,now=new Date(),onProgress?:(value:{phase:string;done:number;total:number})=>void){
  const split=analysisSplit(input,now);
  if(!split.complete||split.training.length<500||split.validation.length<150||split.test.length<100)throw new Error('최신 회차를 포함하는 온전한 최근 15년 자료가 필요합니다. 부족한 기간은 검증 완료로 표시하지 않습니다.');
  if(split.all[0].round!==1)throw new Error('제1회부터의 전체 이력이 없어 동일한 분석 조건을 재현할 수 없습니다.');
  const models=initialModels(),rows:EvaluationRow[]=[],trainingTargets=split.training.slice(-52);
  // First nine years initialize the model; the last training year supplies walk-forward
  // contribution probes. All validation and test rounds are evaluated, without subsampling.
  const total=trainingTargets.length+split.validation.length+split.test.length;
  for(const target of trainingTargets){rows.push(evaluateRound(split.all,target,models,budget,seed,'training'));onProgress?.({phase:'학습 기여도 평가',done:rows.length,total});}
  const derived=deriveCandidate(models,rows);models.push(derived.model);
  // The optimized candidate is derived from training only. Training rows remain honest,
  // without retroactively treating its in-sample scores as independent validation.
  for(const target of split.validation){rows.push(evaluateRound(split.all,target,models,budget,seed,'validation'));onProgress?.({phase:'가중치 검증',done:rows.length,total});}
  const training=rows.filter(r=>r.phase==='training'),validation=rows.filter(r=>r.phase==='validation');
  const selection=chooseOnValidation(models,validation,training,seed),frozen=models.find(m=>m.id===selection.selectedId)!;
  // Only the already frozen choice and baseline enter the holdout. Do not search holdout.
  const finalModels=frozen.id==='base'?[models[0]]:[models[0],frozen];
  for(const target of split.test){rows.push(evaluateRound(split.all,target,finalModels,budget,seed,'test'));onProgress?.({phase:'독립 최종 평가',done:rows.length,total});}
  const test=rows.filter(r=>r.phase==='test'),base=metrics(test,'base'),random=metrics(test,'random'),candidate=metrics(test,frozen.id);
  const againstBase=comparison(candidate.perRound,base.perRound,seed+2,2),againstRandom=comparison(candidate.perRound,random.perRound,seed+3,2);
  const applied=frozen.id!=='base'&&!againstBase.uncertain&&againstBase.adjustedP<.05&&againstRandom.adjustedP<.05&&againstBase.ci[0]>0&&againstRandom.ci[0]>0&&positivePeriods(candidate.perRound,base.perRound,2).every(v=>v>0);
  const finalWeights=applied?frozen.weights:{...BASE_WEIGHTS};
  const reason=applied?'사전 동결 후보가 독립 평가에서도 설정한 기준을 통과하여 적용합니다. 미래 당첨 확률 향상의 증거는 아닙니다.':frozen.id==='base'?selection.reason:'독립 최종 평가에서 개선이 재현되지 않았습니다. 다른 후보를 재선택하지 않고 기본 가중치로 복귀합니다.';
  const featureSample=prepareCandidates(split.all.filter(d=>d.round<split.validation[0].round),Math.min(budget,2000),seed).candidates;
  const correlations=FACTORS.flatMap((a,i)=>FACTORS.slice(i+1).map((b,j)=>{const x=featureSample.map(c=>c.features[i]),y=featureSample.map(c=>c.features[i+j+1]),sx=sd(x),sy=sd(y),mx=mean(x),my=mean(y);return {a,b,correlation:sx&&sy?x.reduce((s,v,k)=>s+(v-mx)*(y[k]-my),0)/((x.length-1)*sx*sy):0};})).filter(c=>Math.abs(c.correlation)>=.7);
  return {version:'advanced-v1',asOf:now.toISOString(),budget,seed,split:{start:split.start,end:split.end,actualStart:split.actualStart,actualEnd:split.actualEnd,first:split.first,last:split.last,fullFirst:split.all[0].round,fullLast:split.all.at(-1)!.round,training:split.training.length,validation:split.validation.length,test:split.test.length,trainingEvaluated:trainingTargets.length,complete:split.complete},models,contributions:derived.contributions,selection,frozenId:frozen.id,finalWeights,applied,reason,holdout:{base,random,candidate,againstBase,againstRandom},executions:rows.length,modelExecutions:rows.reduce((s,r)=>s+Object.keys(r.models).length,0),simulatedUnique:rows.reduce((s,r)=>s+r.unique,0),correlations,rows};
}
export type ValidationReport=ReturnType<typeof validateAdvanced>;
export function generateWithValidation(draws:Draw[],budget:number,seed:number,report?:ValidationReport,onProgress?:(n:number)=>void){
  return advancedGenerate(draws,budget,seed,report?.finalWeights??BASE_WEIGHTS,onProgress);
}
