import type { Draw } from './data';
export function frequency(draws:Draw[]) { const counts=Array<number>(46).fill(0); for(const d of draws) for(const n of d.numbers) counts[n]++; return counts; }
const histogram=(values:(number|string)[])=>{const m=new Map<string,number>();for(const v of values)m.set(String(v),(m.get(String(v))??0)+1);return [...m].map(([name,count])=>({name,count})).sort((a,b)=>Number(a.name)-Number(b.name));};
export function analyze(draws:Draw[]) {
  const counts=frequency(draws), windows=[10,30,50,100,200].map(w=>frequency(draws.slice(-w)));
  const lastSeen=Array<number>(46).fill(draws.length);
  draws.forEach((d,i)=>d.numbers.forEach(n=>lastSeen[n]=draws.length-1-i));
  const yearStart=draws.length?new Date(draws.at(-1)!.date):new Date(); yearStart.setUTCFullYear(yearStart.getUTCFullYear()-1);
  const lastYear=draws.filter(d=>d.date>yearStart.toISOString().slice(0,10)); const yf=frequency(lastYear);
  const numbers=Array.from({length:45},(_,i)=>({number:i+1,count:counts[i+1],recent10:windows[0][i+1],recent30:windows[1][i+1],recent50:windows[2][i+1],recent100:windows[3][i+1],recent200:windows[4][i+1],gap:lastSeen[i+1],allRate:draws.length?counts[i+1]/draws.length*100:0,yearRate:lastYear.length?yf[i+1]/lastYear.length*100:0,recentRate:Math.min(draws.length,100)?windows[3][i+1]/Math.min(draws.length,100)*100:0}));
  const pairs=new Map<string,number>(); const ranges=Array<number>(5).fill(0);
  for(const d of draws) {for(const n of d.numbers){ranges[Math.floor((n-1)/10)]++;} for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){const k=`${d.numbers[i]} · ${d.numbers[j]}`;pairs.set(k,(pairs.get(k)??0)+1);}}
  const years=[...new Set(draws.map(d=>d.date.slice(0,4)))].map(year=>({year,draws:draws.filter(d=>d.date.startsWith(year))})).map(x=>({year:x.year,count:x.draws.length,frequencies:frequency(x.draws).slice(1)}));
  return {numbers,years,hot:[...numbers].sort((a,b)=>b.count-a.count).slice(0,6),cold:[...numbers].sort((a,b)=>a.count-b.count).slice(0,6),overdue:[...numbers].sort((a,b)=>b.gap-a.gap).slice(0,6),oddEven:histogram(draws.map(d=>d.numbers.filter(n=>n%2).length)),sums:histogram(draws.map(d=>Math.floor(d.numbers.reduce((a,b)=>a+b,0)/20)*20)),consecutive:histogram(draws.map(d=>d.numbers.slice(1).filter((n,i)=>n===d.numbers[i]+1).length)),overlap:histogram(draws.slice(1).map((d,i)=>d.numbers.filter(n=>draws[i].numbers.includes(n)).length)),ranges:ranges.map((count,i)=>({name:i===4?'41–45':`${i*10+1}–${i*10+10}`,count})),pairs:[...pairs].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,15)};
}
