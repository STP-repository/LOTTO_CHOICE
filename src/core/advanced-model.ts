import {compressCandidates,groupReport,type SelectionPath} from './combination-groups';
import { validateDraws, type Draw } from './data';
import { rng } from './recommend';

export const FACTORS = ['frequency','markov','bayes','deviation','balance','sum','ranges','patterns','spacing','diversity'] as const;
export type Factor = typeof FACTORS[number];
export type Weights = Record<Factor,number>;
export const LABELS: Record<Factor,string> = {frequency:'최근·장기 빈도',markov:'마르코프',bayes:'베이즈',deviation:'평균회귀·편차',balance:'홀짝·고저',sum:'번호 합계',ranges:'구간 분포',patterns:'연속번호·끝수',spacing:'AC값·간격',diversity:'조합 다양성'};
export const BASE_WEIGHTS: Weights = {frequency:15,markov:10,bayes:10,deviation:10,balance:10,sum:10,ranges:10,patterns:5,spacing:10,diversity:10};
export const WINDOWS = [30,50,100,200] as const;
export function dataSignature(draws:Draw[]){let h=2166136261;for(const c of JSON.stringify(draws)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}return `${draws.length}-${draws.at(-1)?.round??0}-${h.toString(16)}`;}
export function normalizeWeights(values:Weights):Weights {
  if(FACTORS.some(k=>!Number.isFinite(values[k])||values[k]<0))throw new Error('가중치는 0 이상의 유한한 값이어야 합니다.');
  const sum=FACTORS.reduce((s,k)=>s+values[k],0);if(!sum)throw new Error('가중치 합계가 0입니다.');
  // Integer basis points, largest remainders: displayed and stored total is exactly 100%.
  const raw=FACTORS.map(k=>values[k]/sum*10000),bp=raw.map(Math.floor);
  const order=raw.map((v,i)=>({i,f:v-bp[i]})).sort((a,b)=>b.f-a.f);
  for(let n=10000-bp.reduce((a,b)=>a+b,0),i=0;i<n;i++)bp[order[i].i]++;
  return Object.fromEntries(FACTORS.map((k,i)=>[k,bp[i]/100])) as Weights;
}
export const mean=(a:number[])=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
export const sd=(a:number[])=>a.length>1?Math.sqrt(a.reduce((s,v)=>s+(v-mean(a))**2,0)/(a.length-1)):0;
export function quantile(a:number[],p:number){const s=[...a].sort((x,y)=>x-y);if(!s.length)return 0;const i=(s.length-1)*p,lo=Math.floor(i);return s[lo]+(s[Math.ceil(i)]-s[lo])*(i-lo);}
const probability=6/45;
export function shape(ns:number[],previous:number[]=[]){
  const gaps=ns.slice(1).map((n,i)=>n-ns[i]),diffs=new Set<number>();for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)diffs.add(ns[j]-ns[i]);
  const buckets=[0,0,0,0,0],ends=Array<number>(10).fill(0);ns.forEach(n=>{buckets[Math.floor((n-1)/10)]++;ends[n%10]++;});
  return {odd:ns.filter(n=>n%2).length,low:ns.filter(n=>n<=22).length,sum:ns.reduce((s,n)=>s+n,0),ranges:buckets.join('-'),groups:buckets.filter(Boolean).length,consecutive:gaps.filter(g=>g===1).length,endings:ends.reduce((s,n)=>s+n*(n-1)/2,0),ac:diffs.size-5,gapMean:mean(gaps),gapSd:sd(gaps),overlap:ns.filter(n=>previous.includes(n)).length,neighbors:ns.filter(n=>previous.some(p=>Math.abs(n-p)===1)).length};
}
export interface NumberAnalysis {number:number;count:number;recent:Record<number,number>;lastRound:number|null;absent:number;gapMean:number;gapSd:number;transitions:{window:number;counts:number[];p01:number;p11:number;n0:number;n1:number}[];posterior:{window:number;n:number;mean:number;sd:number}[];z:number;recentZ:number;walk:number;walkSd:number;walkPath:number[];scores:number[]}
export function numberAnalysis(draws:Draw[]):NumberAnalysis[]{
  return Array.from({length:45},(_,i)=>{
    const number=i+1,states=draws.map(d=>Number(d.numbers.includes(number))),hits=states.flatMap((v,j)=>v?[j]:[]),gaps=hits.slice(1).map((j,k)=>j-hits[k]);
    const count=hits.length,recent=Object.fromEntries(WINDOWS.map(w=>[w,states.slice(-w).reduce((s,v)=>s+v,0)]));
    const posterior=WINDOWS.map(window=>{const n=Math.min(window,states.length),a=4+recent[window],b=26+n-recent[window];return {window,n,mean:a/(a+b),sd:Math.sqrt(a*b/((a+b)**2*(a+b+1)))};});
    const transitions=[draws.length,...WINDOWS].map(window=>{const st=states.slice(-window),counts=[0,0,0,0];for(let j=1;j<st.length;j++)counts[st[j-1]*2+st[j]]++;const n0=counts[0]+counts[1],n1=counts[2]+counts[3];return {window,counts,p01:(counts[1]+4)/(n0+30),p11:(counts[3]+4)/(n1+30),n0,n1};});
    const z=(count-states.length*probability)/Math.sqrt(Math.max(1,states.length*probability*(1-probability))),nr=Math.min(100,states.length),recentZ=(recent[100]-nr*probability)/Math.sqrt(Math.max(1,nr*probability*(1-probability)));
    let walk=0;const walkPath=states.map(v=>walk+=v-probability),walkSd=Math.sqrt(states.length*probability*(1-probability));
    const tr=transitions[0],last=states.at(-1),n=last?tr.n1:tr.n0,mp=last?tr.p11:tr.p01;
    const longRate=count/Math.max(1,states.length),recentRate=recent[100]/Math.max(1,nr);
    // Markov is strongly shrunk toward the fair-draw baseline, and not a claimed predictive probability.
    const markov=probability+(mp-probability)*n/(n+200);
    const bayes=mean(posterior.map(p=>p.mean-p.sd));
    return {number,count,recent,lastRound:hits.length?draws[hits.at(-1)!].round:null,absent:hits.length?draws.length-1-hits.at(-1)!:draws.length,gapMean:mean(gaps),gapSd:sd(gaps),transitions,posterior,z,recentZ,walk,walkSd,walkPath,scores:[(longRate+recentRate)/2,markov,bayes,Math.exp(-(Math.abs(z)+Math.abs(recentZ))/6)]};
  });
}
type Shape=ReturnType<typeof shape>;
const bins=(s:Shape)=>[`${s.odd}:${s.low}`,String(Math.floor(s.sum/20)),s.ranges,`${s.consecutive}:${s.endings}`,`${s.ac}:${Math.floor(s.gapMean/2)}:${Math.floor(s.gapSd/3)}`,String(s.overlap),String(s.neighbors)];
export function buildAdvancedModel(draws:Draw[]){
  if(draws.length<30)throw new Error('통합 분석에는 최소 30회 데이터가 필요합니다.');
  const numbers=numberAnalysis(draws),previous=draws.at(-1)!.numbers,shapes=draws.map((d,i)=>shape(d.numbers,draws[i-1]?.numbers));
  const hist=Array.from({length:7},()=>new Map<string,number>());shapes.forEach(s=>bins(s).forEach((b,i)=>hist[i].set(b,(hist[i].get(b)??0)+1)));
  const maxima=hist.map(h=>Math.max(1,...h.values())),minmax=Array.from({length:4},(_,i)=>{const vals=numbers.map(n=>n.scores[i]);return [Math.min(...vals),Math.max(...vals)];});
  const keys=['odd','low','sum','groups','consecutive','ac'] as const;
  const bounds=keys.map(key=>({key,low:quantile(shapes.map(s=>s[key]),.025),high:quantile(shapes.map(s=>s[key]),.975)}));
  return {numbers,previous,hist,maxima,minmax,bounds,count:draws.length,shapes};
}
export type AdvancedModel=ReturnType<typeof buildAdvancedModel>;
export interface Candidate {numbers:number[];features:number[];shape:Shape;weighted:boolean;flagged:boolean;restored:boolean;penalty:number}
export function candidateFeatures(numbers:number[],m:AdvancedModel,weighted=false):Candidate{
  const s=shape(numbers,m.previous),b=bins(s),dist=b.map((v,i)=>100*((m.hist[i].get(v)??0)+1)/(m.maxima[i]+1));
  const features=Array.from({length:4},(_,i)=>{const [lo,hi]=m.minmax[i];return mean(numbers.map(n=>hi===lo?50:100*(m.numbers[n-1].scores[i]-lo)/(hi-lo)));});
  features.push(dist[0],dist[1],dist[2],mean([dist[3],dist[5],dist[6]]),dist[4],100);
  return {numbers,features,shape:s,weighted,flagged:m.bounds.some(b=>s[b.key]<b.low||s[b.key]>b.high),restored:false,penalty:0};
}
export function sampleSix(random:()=>number,weights?:number[]):number[]{
  const ns:number[]=[];
  if(!weights){while(ns.length<6){const n=1+Math.floor(random()*45);if(!ns.includes(n))ns.push(n);}}
  else {let total=weights.reduce((s,v)=>s+v,0);while(ns.length<6){let r=random()*total;for(let i=0;i<45;i++){if(ns.includes(i+1))continue;r-=weights[i];if(r<0){ns.push(i+1);total-=weights[i];break;}}}}
  return ns.sort((a,b)=>a-b);
}
export function prepareCandidates(draws:Draw[],budget:number,seed:number,onProgress?:(n:number)=>void){
  if(!Number.isInteger(budget)||budget<100||budget>1_000_000)throw new Error('후보 수는 100~1,000,000 사이 정수여야 합니다.');
  const model=buildAdvancedModel(draws),random=rng(seed),weights=model.numbers.map(n=>.5+(n.scores[0]+n.scores[1]+n.scores[2])/3/probability);
  const candidates:Candidate[]=[],seen=new Set<number>();let attempts=0;
  const uniformTarget=Math.ceil(budget/2),weightedTarget=Math.floor(budget/2);
  for(let group=0;group<2;group++){const target=group?weightedTarget:uniformTarget;let made=0;
    while(made<target){attempts++;const ns=sampleSix(random,group?weights:undefined);const key=ns.reduce((s,n)=>s*46+n,0);if(seen.has(key))continue;seen.add(key);candidates.push(candidateFeatures(ns,model,!!group));made++;if(candidates.length%5000===0)onProgress?.(candidates.length/budget);}
  }
  // Safety Σ marks empirical tails; Games Out Value restores them when a two-proportion
  // comparison against this run's uniform reference gives insufficient evidence (|z| <= 3.3).
  const reference=candidates.filter(c=>!c.weighted),flaggedReference=reference.filter(c=>c.flagged).length;
  const observed=draws.map((d,i)=>shape(d.numbers,draws[i-1]?.numbers)).filter(s=>model.bounds.some(b=>s[b.key]<b.low||s[b.key]>b.high)).length;
  const p=(observed+flaggedReference)/(draws.length+reference.length),se=Math.sqrt(p*(1-p)*(1/draws.length+1/reference.length));
  const z=se?(observed/draws.length-flaggedReference/reference.length)/se:0;
  candidates.forEach(c=>{c.restored=c.flagged&&Math.abs(z)<=3.3;c.penalty=c.flagged&&!c.restored?5:0;});
  const distribution=(weighted:boolean)=>{const rows=candidates.filter(c=>c.weighted===weighted);return {count:rows.length,meanSum:mean(rows.map(c=>c.shape.sum)),meanOdd:mean(rows.map(c=>c.shape.odd)),meanAc:mean(rows.map(c=>c.shape.ac)),tails:rows.filter(c=>c.flagged).length};};
  return {model,candidates,simulation:{target:budget,unique:candidates.length,attempts,uniform:distribution(false),weighted:distribution(true),flagged:candidates.filter(c=>c.flagged).length,restored:candidates.filter(c=>c.restored).length,tailZ:z,bounds:model.bounds}};
}
export type Prepared=ReturnType<typeof prepareCandidates>;
export interface AdvancedGame {role:string;numbers:number[];score:number;features:Record<Factor,number>;shape:Shape;flagged:boolean;restored:boolean;penalty:number}
export const overlap=(a:number[],b:number[])=>a.filter(n=>b.includes(n)).length;
export function selectGames(prepared:Prepared,weights:Weights,seed:number,count=5):AdvancedGame[]{
  if(![5,10,15].includes(count))throw Error('조합 수는 5·10·15만 가능합니다.');
  if(Math.round(FACTORS.reduce((s,k)=>s+weights[k]*100,0))!==10000||FACTORS.some(k=>weights[k]<0))throw new Error('가중치 합계는 100%여야 합니다.');
  const selected:AdvancedGame[]=[],random=rng(seed^0xa53c71);
  const recent=prepared.model.numbers.map(n=>n.recent[100]),long=prepared.model.numbers.map(n=>n.count);
  const maxRecent=Math.max(1,...recent),maxLong=Math.max(1,...long);
  const roles=['A · 종합 분석','B · 최근 통계','C · 장기·편차','D · 가중 몬테카를로','E · 균등 무작위·다양성'];
  for(let index=0;index<count;index++){
    const role=index%5;
    let best:Candidate|undefined,bestValue=-Infinity,bestFeatures:number[]=[];
    for(const c of prepared.candidates){
      if(role===3&&!c.weighted||role===4&&c.weighted)continue;
      if(selected.some(g=>overlap(c.numbers,g.numbers)>3))continue;
      const f=[...c.features];f[9]=selected.length?100*(1-Math.max(...selected.map(g=>overlap(c.numbers,g.numbers)))/6):100;
      const total=f.reduce((s,v,i)=>s+v*weights[FACTORS[i]]/100,0)-c.penalty;
      const specialty=role===1?mean(c.numbers.map(n=>recent[n-1]/maxRecent*100)):role===2?mean(c.numbers.map(n=>long[n-1]/maxLong*100))*.5+f[3]*.5:total;
      const value=role===4?random():role===1||role===2?total*.65+specialty*.35:total;
      if(value>bestValue){best=c;bestValue=value;bestFeatures=f;}
    }
    if(!best)throw new Error(`공통 번호 3개 이하인 ${count}조합을 찾지 못했습니다. 후보 수를 늘려 주세요.`);
    const score=Math.max(0,bestFeatures.reduce((s,v,i)=>s+v*weights[FACTORS[i]]/100,0)-best.penalty);
    selected.push({role:roles[role]+(index>=5?` · ${Math.floor(index/5)+1}차`:''),numbers:best.numbers,score,features:Object.fromEntries(FACTORS.map((k,i)=>[k,bestFeatures[i]])) as Weights,shape:best.shape,flagged:best.flagged,restored:best.restored,penalty:best.penalty});
  }
  return selected;
}
export function selectFive(prepared:Prepared,weights:Weights,seed:number):AdvancedGame[]{return selectGames(prepared,weights,seed,5);}
export const ANALYSIS_VERSION='full-history-v2';
export function roundSeed(draws:Draw[]){return (20261021^Math.imul(draws.at(-1)!.round,2654435761))>>>0;}
export interface GenerateOptions {count?:number;path?:SelectionPath;diagnostics?:boolean}
export function advancedGenerate(draws:Draw[],budget:number,seed:number,weights=BASE_WEIGHTS,onProgress?:(n:number)=>void,options:GenerateOptions={}){
 return generatePrepared(draws,prepareCandidates(draws,budget,seed,onProgress),seed,weights,options);
}
export function generatePrepared(draws:Draw[],prepared:Prepared,seed:number,weights=BASE_WEIGHTS,options:GenerateOptions={}){
 const budget=prepared.simulation.target,count=options.count??5,path=options.path??'standard';
 const compression=path==='compressed'?compressCandidates(prepared,weights,count):null;
 const games=selectGames(compression?{...prepared,candidates:compression.candidates}:prepared,weights,seed,count);
 return {games,numbers:prepared.model.numbers,simulation:prepared.simulation,weights,seed,budget,first:draws[0],last:draws.at(-1)!,version:ANALYSIS_VERSION,
 snapshot:{lastRound:draws.at(-1)!.round,targetRound:draws.at(-1)!.round+1,lastDrawDate:draws.at(-1)!.date,signature:dataSignature(draws),settingsVersion:ANALYSIS_VERSION,seed,budget,count,path,generatedAt:new Date().toISOString()},
 diagnostics:options.diagnostics===false?undefined:compression?.diagnostics??{independent:true,theoryTotal:8145060,primary:budget,afterCompression:budget,groupsBefore:groupReport(prepared.candidates,prepared.model.shapes,weights)}};
}
