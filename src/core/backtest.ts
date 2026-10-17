import { recent15, type Draw } from './data';
import { recommend, type Mode } from './recommend';
export function backtest(draws:Draw[],mode:Mode='composite',seed=20261017,games=5) {
  const sorted=[...draws].sort((a,b)=>a.round-b.round); const start=Math.max(30,sorted.length-100);
  if(sorted.length<31)throw new Error('백테스트는 최소 31회 데이터가 필요합니다.');
  const rows=sorted.slice(start).map((target,j)=>{
    const train=recent15(sorted.slice(0,start+j),new Date(`${target.date}T00:00:00+09:00`));
    if(train.some(d=>d.round>=target.round || d.date>=target.date))throw new Error('미래 데이터 누출 감지');
    const predicted=recommend(train,mode,games,(seed^Math.imul(target.round,2654435761))>>>0);
    const random=recommend(train,'random',games,(seed^Math.imul(target.round,1597334677))>>>0);
    const hits=(ns:number[])=>ns.filter(n=>target.numbers.includes(n)).length;
    const matches=predicted.map(g=>hits(g.numbers)),baseline=random.map(g=>hits(g.numbers));
    return {round:target.round,trainingLast:train.at(-1)!.round,trainingSize:train.length,predicted:predicted.map(g=>g.numbers),actual:target.numbers,matches,baseline,average:matches.reduce((a,b)=>a+b,0)/games,random:baseline.reduce((a,b)=>a+b,0)/games};
  });
  return {seed,games,mode,rows,average:rows.reduce((s,r)=>s+r.average,0)/rows.length,randomAverage:rows.reduce((s,r)=>s+r.random,0)/rows.length,histogram:Array.from({length:7},(_,n)=>({name:String(n),추천:rows.flatMap(r=>r.matches).filter(x=>x===n).length,무작위:rows.flatMap(r=>r.baseline).filter(x=>x===n).length}))};
}
