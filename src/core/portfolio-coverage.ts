import {validCombination} from './combination-groups';
export const LOTTO_OUTCOMES=8_145_060;
const transitionCache=new Map<number,Int16Array[]>();
function transitions(count:number){const cached=transitionCache.get(count);if(cached)return cached;const size=3**count,powers=Array.from({length:count},(_,i)=>3**i),result=Array.from({length:2**count},(_,mask)=>{const row=new Int16Array(size);for(let s=0;s<size;s++){let next=s;for(let j=0;j<count;j++)if(mask&(1<<j)){if(Math.floor(s/powers[j])%3===2){next=-1;break;}next+=powers[j];}row[s]=next;}return row;});transitionCache.set(count,result);return result;}
/** Exact complement count: all tickets have at most two main-number hits.
 * DP tracks six drawn balls and each ticket's hit count, not historical outcomes. */
export function portfolioCoverage(tickets:number[][]){
 if(!tickets.length||tickets.length>5||tickets.some(t=>!validCombination(t))||new Set(tickets.map(t=>t.join(','))).size!==tickets.length)throw Error('서로 다른 유효한 1~5조합이 필요합니다.');
 const count=tickets.length,size=3**count,masks=new Uint8Array(45),table=transitions(count),dp=new Float64Array(7*size);dp[0]=1;
 tickets.forEach((t,j)=>t.forEach(n=>masks[n-1]|=1<<j));
 for(let n=0;n<45;n++){const tr=table[masks[n]];for(let k=Math.min(6,n+1);k>=1;k--){const from=(k-1)*size,to=k*size;for(let s=0;s<size;s++){const next=tr[s];if(next>=0&&dp[from+s])dp[to+next]+=dp[from+s];}}}
 let miss=0;for(let s=0;s<size;s++)miss+=dp[6*size+s];const covered=LOTTO_OUTCOMES-miss;
 return {total:LOTTO_OUTCOMES,covered,probability:covered/LOTTO_OUTCOMES,firstPrizeProbability:count/LOTTO_OUTCOMES,assumption:'공정한 6/45 추첨 · 5등 이상 한 조합이라도 당첨되는 수학적 경우의 수'};
}
