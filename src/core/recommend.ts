import type { Draw } from './data';
import { frequency } from './statistics';
export const MODES={all:'15년 전체 통계',recent:'최근 100회 통계',hot:'고빈도 번호 중심',cold:'저빈도 번호 중심',balanced:'홀짝·합계·구간 균형',composite:'종합 통계 적합도',random:'완전 무작위'} as const;
export type Mode=keyof typeof MODES;
export const WEIGHTS={all:0.35,recent:0.25,overdue:0.10,balance:0.30};
export function rng(seed:number) {let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function model(draws:Draw[]) {
  const all=frequency(draws),recent=frequency(draws.slice(-100)),gap=Array<number>(46).fill(draws.length);
  draws.forEach((d,i)=>d.numbers.forEach(n=>gap[n]=draws.length-i-1));
  gap[0]=0; // Index zero is not a lottery number and must not affect normalization.
  const norm=(a:number[])=>a.map(n=>n/Math.max(1,...a));
  return {all:norm(all),recent:norm(recent),gap:norm(gap),cold:all.map(n=>(Math.max(...all)+1-n)/(Math.max(...all)+1))};
}
export function balanceScore(ns:number[]) {const odd=ns.filter(n=>n%2).length,sum=ns.reduce((a,b)=>a+b,0),groups=new Set(ns.map(n=>Math.floor((n-1)/10))).size;return (Math.max(0,1-Math.abs(odd-3)/3)+Math.max(0,1-Math.abs(sum-138)/117)+groups/5)/3;}
export function score(ns:number[],m:ReturnType<typeof model>,mode:Mode) {
  const avg=(key:'all'|'recent'|'gap'|'cold')=>ns.reduce((s,n)=>s+m[key][n],0)/6;
  if(mode==='random')return null;
  if(mode==='balanced')return balanceScore(ns)*100;
  if(mode==='composite')return 100*(WEIGHTS.all*avg('all')+WEIGHTS.recent*avg('recent')+WEIGHTS.overdue*avg('gap')+WEIGHTS.balance*balanceScore(ns));
  return 100*avg(mode==='hot'?'all':mode==='cold'?'cold':mode==='recent'?'recent':'all');
}
export function recommend(draws:Draw[],mode:Mode,count:number,seed:number) {
  if(![1,5,10].includes(count))throw new Error('게임 수는 1, 5, 10만 가능합니다.');
  if(!draws.length && mode!=='random')throw new Error('추천에 사용할 데이터가 없습니다.');
  const random=rng(seed),m=model(draws),seen=new Set<string>(); const result:{numbers:number[],score:number|null}[]=[];
  for(let g=0;g<count;g++){
    let best:number[]|undefined,bestScore=-1;
    for(let attempt=0;attempt<(mode==='balanced'||mode==='composite'?60:8);attempt++) {
      const pool=Array.from({length:45},(_,i)=>i+1),ns:number[]=[];
      while(ns.length<6){const ws=pool.map(n=>mode==='random'||mode==='balanced'?1:0.2+(mode==='composite'?0.55*m.all[n]+0.35*m.recent[n]+0.10*m.gap[n]:m[mode==='cold'?'cold':mode==='recent'?'recent':'all'][n]));let pick=random()*ws.reduce((a,b)=>a+b,0),idx=0;while(idx<ws.length-1 && (pick-=ws[idx])>=0)idx++;ns.push(pool.splice(idx,1)[0]);}
      ns.sort((a,b)=>a-b);if(seen.has(ns.join(',')))continue;
      const s=score(ns,m,mode)??0;if(!best||s>bestScore){best=ns;bestScore=s;} if(mode==='random')break;
    }
    if(!best)throw new Error('고유 조합 생성 실패. 시드를 변경해 주세요.'); seen.add(best.join(','));result.push({numbers:best,score:mode==='random'?null:bestScore});
  }
  return result;
}
