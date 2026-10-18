import type {Draw} from './data';
import {frequency} from './statistics';
import {consecutivePairs,sumCloseness} from './pattern';

// Deliberate preference weights, frozen before validation; not learned probabilities.
export const FEATURE_WEIGHTS={frequency:.12,recent:.12,overdue:.06,odd:.10,sum:.14,ranges:.10,endings:.08,pairs:.10,consecutive:.09,overlap:.09};
export function evidenceModel(draws:Draw[]) {
  if(!draws.length)throw new Error('분석할 기록이 없습니다.');
  const counts=frequency(draws),recent=frequency(draws.slice(-100)),gap=Array<number>(46).fill(draws.length);
  const hist=Array.from({length:4},()=>new Map<string,number>()),endings=Array<number>(10).fill(0),pairs=new Map<string,number>();
  const rangeKey=(ns:number[])=>Array.from({length:5},(_,i)=>ns.filter(n=>Math.floor((n-1)/10)===i).length).join(':');
  draws.forEach((d,i)=>{
    d.numbers.forEach(n=>{gap[n]=draws.length-i-1;endings[n%10]++;});
    const keys=[String(d.numbers.filter(n=>n%2).length),rangeKey(d.numbers),String(consecutivePairs(d.numbers)),String(i?d.numbers.filter(n=>draws[i-1].numbers.includes(n)).length:0)];
    keys.forEach((k,j)=>{if(j===3&&i===0)return;hist[j].set(k,(hist[j].get(k)??0)+1);});
    const ns=[...d.numbers].sort((a,b)=>a-b);
    for(let a=0;a<5;a++)for(let b=a+1;b<6;b++){const key=`${ns[a]},${ns[b]}`;pairs.set(key,(pairs.get(key)??0)+1);}
  });
  gap[0]=0;
  return {counts,recent,gap,hist,endings,pairs,rangeKey,last:draws.at(-1)!,size:draws.length,meanSum:draws.reduce((s,d)=>s+d.numbers.reduce((a,b)=>a+b,0),0)/draws.length};
}
export function evaluateEvidence(numbers:number[],m:ReturnType<typeof evidenceModel>){
  const ns=[...numbers].sort((a,b)=>a-b),odd=ns.filter(n=>n%2).length,consecutive=consecutivePairs(ns),overlap=ns.filter(n=>m.last.numbers.includes(n));
  const avg=(values:number[])=>ns.reduce((s,n)=>s+values[n],0)/6/Math.max(1,...values);
  const hist=(i:number,key:string)=>(m.hist[i].get(key)??0)/Math.max(1,...m.hist[i].values());
  const pairList=[] as {key:string;count:number}[];
  for(let a=0;a<5;a++)for(let b=a+1;b<6;b++){const key=`${ns[a]},${ns[b]}`;pairList.push({key,count:m.pairs.get(key)??0});}
  pairList.sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
  const values={frequency:avg(m.counts),recent:avg(m.recent),overdue:avg(m.gap),odd:hist(0,String(odd)),sum:sumCloseness(ns,m.meanSum),ranges:hist(1,m.rangeKey(ns)),endings:ns.reduce((s,n)=>s+m.endings[n%10],0)/6/Math.max(1,...m.endings),pairs:pairList.reduce((s,p)=>s+p.count,0)/15/Math.max(1,...m.pairs.values()),consecutive:hist(2,String(consecutive)),overlap:hist(3,String(overlap.length))};
  const rating=(Object.keys(FEATURE_WEIGHTS) as (keyof typeof FEATURE_WEIGHTS)[]).reduce((s,k)=>s+FEATURE_WEIGHTS[k]*values[k],0);
  const frequencyLeaders=[...ns].sort((a,b)=>m.counts[b]-m.counts[a]||a-b).slice(0,2);
  const recentLeader=[...ns].sort((a,b)=>m.recent[b]-m.recent[a]||a-b)[0],gapLeader=[...ns].sort((a,b)=>m.gap[b]-m.gap[a]||a-b)[0];
  const reasons=[
    `전체 빈도: ${frequencyLeaders.map(n=>`${n}번 ${m.counts[n]}회`).join(' · ')} / ${m.size}회 기록`,
    `최근·미출현: ${recentLeader}번 최근 ${Math.min(100,m.size)}회 중 ${m.recent[recentLeader]}회 · ${gapLeader}번 ${m.gap[gapLeader]}회 미출현`,
    `홀짝·합계: ${odd}:${6-odd} · 합계 ${ns.reduce((a,b)=>a+b,0)} / 과거 평균 ${m.meanSum.toFixed(1)}`,
    `구간·끝자리: 구간별 ${m.rangeKey(ns)}개 · 끝자리 ${ns.map(n=>n%10).join('·')}`,
    `함께 나온 쌍: ${pairList[0].key.replace(',', '·')}번 ${pairList[0].count}회 / ${m.size}회 기록`,
    `연속·직전 중복: ${consecutive}쌍 · ${m.last.round}회와 ${overlap.length}개${overlap.length?` (${overlap.join('·')})`:''}`,
  ];
  return {rating,values,reasons};
}
