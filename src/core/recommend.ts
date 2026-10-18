import { rankAllCombinations } from './ranking';
import { evidenceModel, evaluateEvidence,FEATURE_WEIGHTS,type FeatureWeights } from './evidence';
import type { Draw } from './data';
import { frequency } from './statistics';
import { recent15 } from './data';
import { patternProfile, selectPatternNumbers, consecutivePairs } from './pattern';
export const MODES={all:'15년 전체 통계',recent:'최근 100회 통계',hot:'고빈도 번호 중심',cold:'저빈도 번호 중심',balanced:'홀짝·구간 균형',composite:'종합 통계 적합도',random:'완전 무작위',integrated:'15년 통합 추천',pattern:'15년 패턴 기준',overdue:'미출현 기간',odd:'홀짝 패턴',ranges:'구간 구성',endings:'끝자리 빈도',pairs:'동반 번호 쌍',consecutive:'연속번호 패턴',overlap:'직전 중복 패턴'} as const;
export type Mode=keyof typeof MODES;
export type BaseMode='all'|'recent'|'hot'|'cold'|'balanced'|'composite'|'random';
export type SourceMode=Exclude<Mode,'integrated'>;
export interface RecommendedGame {numbers:number[];score:number|null;sources?:SourceMode[];reasons?:string[];rank?:number;pattern?:{referenceRound:number;overlap:number[];consecutive:number}}
export const WEIGHTS={all:0.35,recent:0.25,overdue:0.10,balance:0.30};
export function rng(seed:number) {let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function model(draws:Draw[]) {
  const all=frequency(draws),recent=frequency(draws.slice(-100)),gap=Array<number>(46).fill(draws.length);
  draws.forEach((d,i)=>d.numbers.forEach(n=>gap[n]=draws.length-i-1));
  gap[0]=0; // Index zero is not a lottery number and must not affect normalization.
  const norm=(a:number[])=>a.map(n=>n/Math.max(1,...a));
  return {all:norm(all),recent:norm(recent),gap:norm(gap),cold:all.map(n=>(Math.max(...all)+1-n)/(Math.max(...all)+1))};
}
export function balanceScore(ns:number[]) {const odd=ns.filter(n=>n%2).length,groups=new Set(ns.map(n=>Math.floor((n-1)/10))).size;return (Math.max(0,1-Math.abs(odd-3)/3)+groups/5)/2;}
export function score(ns:number[],m:ReturnType<typeof model>,mode:BaseMode) {
  const avg=(key:'all'|'recent'|'gap'|'cold')=>ns.reduce((s,n)=>s+m[key][n],0)/6;
  if(mode==='random')return null;
  if(mode==='balanced')return balanceScore(ns)*100;
  if(mode==='composite')return 100*(WEIGHTS.all*avg('all')+WEIGHTS.recent*avg('recent')+WEIGHTS.overdue*avg('gap')+WEIGHTS.balance*balanceScore(ns));
  return 100*avg(mode==='hot'?'all':mode==='cold'?'cold':mode==='recent'?'recent':'all');
}
export function recommend(draws:Draw[],mode:Mode,count:number,seed:number):RecommendedGame[] {
  if(mode==='integrated')return integratedRecommendations(draws,count,seed);
  if(mode in CONDITION_FEATURES)return rankedRecommendations(draws,mode,count);
  if(![1,5,10].includes(count))throw new Error('게임 수는 1, 5, 10만 가능합니다.');
  if(!draws.length && mode!=='random')throw new Error('추천에 사용할 데이터가 없습니다.');
  if(mode==='pattern'){
    const profile=patternProfile(draws);
    return selectPatternNumbers(profile,count,rng(seed)).map(g=>({numbers:g.numbers,score:g.rating*100,pattern:{referenceRound:profile.last.round,overlap:g.numbers.filter(n=>profile.last.numbers.includes(n)),consecutive:consecutivePairs(g.numbers)}}));
  }
  const random=rng(seed),m=model(draws),seen=new Set<string>(); const result:{numbers:number[],score:number|null}[]=[];
  for(let g=0;g<count;g++){
    let best:number[]|undefined,bestScore=-1;
    for(let attempt=0;attempt<(mode==='balanced'||mode==='composite'?60:8);attempt++) {
      const pool=Array.from({length:45},(_,i)=>i+1),ns:number[]=[];
      while(ns.length<6){const ws=pool.map(n=>mode==='random'||mode==='balanced'?1:0.2+(mode==='composite'?0.55*m.all[n]+0.35*m.recent[n]+0.10*m.gap[n]:m[mode==='cold'?'cold':mode==='recent'?'recent':'all'][n]));let pick=random()*ws.reduce((a,b)=>a+b,0),idx=0;while(idx<ws.length-1 && (pick-=ws[idx])>=0)idx++;ns.push(pool.splice(idx,1)[0]);}
      ns.sort((a,b)=>a-b);if(seen.has(ns.join(',')))continue;
      const s=score(ns,m,mode as BaseMode)??0;if(!best||s>bestScore){best=ns;bestScore=s;} if(mode==='random')break;
    }
    if(!best)throw new Error('고유 조합 생성 실패. 시드를 변경해 주세요.'); seen.add(best.join(','));result.push({numbers:best,score:mode==='random'?null:bestScore});
  }
  return result;
}

export const CONDITION_FEATURES={all:'frequency',recent:'recent',overdue:'overdue',odd:'odd',ranges:'ranges',endings:'endings',pairs:'pairs',consecutive:'consecutive',overlap:'overlap'} as const;
export function isRankedMode(mode:Mode){return mode==='integrated'||mode in CONDITION_FEATURES;}
export function modeWeights(mode:Mode):FeatureWeights{
 if(mode==='integrated')return FEATURE_WEIGHTS;
 const feature=CONDITION_FEATURES[mode as keyof typeof CONDITION_FEATURES];
 if(!feature)throw new Error('점수순 분석 방식이 아닙니다.');
 return Object.fromEntries(Object.keys(FEATURE_WEIGHTS).map(k=>[k,k===feature?1:0])) as FeatureWeights;
}
const rankingCache=new Map<string,RecommendedGame[]>();
export function integratedRecommendations(input:Draw[],count:number,_seed:number,onProgress?:(checked:number,total:number)=>void):RecommendedGame[]{
 if(count!==5&&count!==10)throw new Error('통합 추천은 5게임 또는 10게임만 가능합니다.');
 return rankedRecommendations(input,'integrated',count,onProgress);
}
export function rankedRecommendations(input:Draw[],mode:Mode,count:number,onProgress?:(checked:number,total:number)=>void):RecommendedGame[] {
 if(![1,5,10].includes(count))throw new Error('게임 수는 1, 5, 10만 가능합니다.');
 if(!input.length)throw new Error('추천에 사용할 데이터가 없습니다.');
 const sorted=[...input].sort((a,b)=>a.round-b.round),draws=recent15(sorted,new Date(`${sorted.at(-1)!.date}T12:00:00+09:00`));
 const key=mode+JSON.stringify(draws);let ranked=rankingCache.get(key);
 if(!ranked){
  const evidence=evidenceModel(draws),profile=patternProfile(draws),weights=modeWeights(mode),{top}=rankAllCombinations(evidence,10,45,onProgress,weights);
  ranked=top.map((g,i)=>{const e=evaluateEvidence(g.numbers,evidence,weights);return {numbers:g.numbers,rank:i+1,score:e.rating*100,reasons:e.reasons,pattern:{referenceRound:profile.last.round,overlap:g.numbers.filter(n=>profile.last.numbers.includes(n)),consecutive:consecutivePairs(g.numbers)}};});
  if(rankingCache.size>=12)rankingCache.delete(rankingCache.keys().next().value!);rankingCache.set(key,ranked);
 }else onProgress?.(8_145_060,8_145_060);
 return structuredClone(ranked.slice(0,count));
}
